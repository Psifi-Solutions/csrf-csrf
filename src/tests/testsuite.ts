import { assert, expect } from "chai";
import { serialize as serializeCookie } from "cookie";
import type { Request, Response } from "express";
import { doubleCsrf } from "../index.js";
import { DoubleCsrfConfigOptions } from "../types";
import { HEADER_KEY, TEST_TOKEN } from "./utils/constants.js";
import { getCookieFromRequest, getCookieFromResponse, switchSecret } from "./utils/helpers.js";
import { generateMocks, generateMocksWithToken, next } from "./utils/mock.js";

type CreateTestsuite = (
  name: string,
  // We will handle options for getSecret inside the test suite
  doubleCsrfOptions: DoubleCsrfConfigOptions,
) => void;

/**
 * This is an over engineered test suite to allow consistent testing for various configurations.
 * It explicitly mocks the bare-minimum Request and Response objects and middleware processing.
 * @param name - The name of the test suite.
 * @param doubleCsrfOptions - The DoubleCsrfConfig.
 */
export const createTestSuite: CreateTestsuite = (name, doubleCsrfOptions) => {
  describe(name, () => {
    // Initialise the package with the passed in test suite settings and a mock secret
    const { invalidCsrfTokenError, generateCsrfToken, validateRequest, doubleCsrfProtection } =
      doubleCsrf(doubleCsrfOptions);

    const {
      cookieName = "__Host-psifi.x-csrf-token",
      csrfTokenDelimiter = ".",
      cookieOptions: { path = "/", secure = true, sameSite = "strict", httpOnly = false } = {},
      errorConfig = {
        statusCode: 403,
        message: "invalid csrf token",
        code: "EBADCSRFTOKEN",
      },
    } = doubleCsrfOptions;

    const generateMocksWithTokenInternal = () =>
      generateMocksWithToken({
        cookieName,
        generateCsrfToken,
        validateRequest,
      });

    it("should initialize error via config options", () => {
      assert.equal(errorConfig.message, invalidCsrfTokenError.message);
      assert.equal(errorConfig.statusCode, invalidCsrfTokenError.statusCode);
      assert.equal(errorConfig.code, invalidCsrfTokenError.code);
    });

    describe("generateCsrfToken", () => {
      it("should attach the csrf token to the response and return a token with random value", () => {
        const { csrfToken, decodedCookieValue, setCookie } = generateMocksWithTokenInternal();

        const expectedSetCookieValue = serializeCookie(cookieName, decodedCookieValue, {
          path,
          httpOnly,
          secure,
          sameSite,
        });

        assert.equal(setCookie, expectedSetCookieValue);
        const [hmacFromCsrfToken, randomValueFromCsrfToken] = csrfToken.split(csrfTokenDelimiter);
        const [hmacFromCookieValue, randomValueFromCookieValue] = decodedCookieValue.split(csrfTokenDelimiter);
        assert.typeOf(hmacFromCsrfToken, "string");
        assert.typeOf(randomValueFromCsrfToken, "string");
        assert.isNotEmpty(hmacFromCsrfToken);
        assert.isNotEmpty(randomValueFromCsrfToken);
        assert.equal(hmacFromCsrfToken, hmacFromCookieValue);
        assert.equal(randomValueFromCsrfToken, randomValueFromCookieValue);
      });

      it("should reuse a csrf token if a csrf cookie is already present, and overwrite is set to false", () => {
        const { mockRequest, mockResponse, csrfToken, cookieValue: oldCookieValue } = generateMocksWithTokenInternal();

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", []);

        // overwrite is false by default
        const generatedToken = generateCsrfToken(mockRequest, mockResponse);
        const newCookieValue = getCookieFromResponse(mockResponse);

        assert.equal(generatedToken, csrfToken);
        assert.equal(newCookieValue, oldCookieValue);
      });

      it("should generate a new token even if a csrf cookie is already present, if overwrite is set to true", () => {
        const { mockRequest, mockResponse, csrfToken, cookieValue: oldCookieValue } = generateMocksWithTokenInternal();

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", []);

        const generatedToken = generateCsrfToken(mockRequest, mockResponse, {
          overwrite: true,
        });
        const newCookieValue = getCookieFromResponse(mockResponse);
        assert.typeOf(oldCookieValue, "string");
        assert.typeOf(newCookieValue, "string");
        assert.isNotEmpty(oldCookieValue);
        assert.isNotEmpty(newCookieValue);
        assert.notEqual(newCookieValue, oldCookieValue);
        assert.notEqual(generatedToken, csrfToken);
      });

      it("should throw if csrf cookie is present and invalid, overwrite is false, and validateOnReuse is enabled", () => {
        const { mockRequest, mockResponse, decodedCookieValue } = generateMocksWithTokenInternal();
        // modify the cookie to make the csrf token invalid
        mockRequest.cookies[cookieName] = `${decodedCookieValue.split("|")[0]}|invalid-hash`;

        expect(() =>
          generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: true,
          }),
        ).to.throw(invalidCsrfTokenError.message);

        // just an invalid value in the cookie
        mockRequest.cookies[cookieName] = "invalid-value";

        expect(() =>
          generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: true,
          }),
        ).to.throw(invalidCsrfTokenError.message);
      });

      it("should not throw if csrf cookie is present and invalid when overwrite is false, and validateOnReuse is disabled", () => {
        const {
          mockRequest,
          mockResponse,
          decodedCookieValue,
          cookieValue: oldCookieValue,
          csrfToken,
        } = generateMocksWithTokenInternal();

        let generatedToken = "";
        let newCookieValue = "";

        mockResponse.setHeader("set-cookie", []);
        // modify the cookie to make the token invalid
        mockRequest.cookies[cookieName] = `${decodedCookieValue.split(csrfTokenDelimiter)[0]}|invalid-token`;
        assert.doesNotThrow(() => {
          generatedToken = generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: false,
          });
        });
        newCookieValue = getCookieFromResponse(mockResponse);
        assert.notEqual(newCookieValue, oldCookieValue);
        assert.notEqual(generatedToken, csrfToken);

        // just an invalid value in the cookie
        mockRequest.cookies[cookieName] = "invalid-value";

        assert.doesNotThrow(() => {
          generatedToken = generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: false,
          });
        });

        newCookieValue = getCookieFromResponse(mockResponse);
        assert.notEqual(newCookieValue, oldCookieValue);
        assert.notEqual(generatedToken, csrfToken);
      });
    });

    describe("validateRequest", () => {
      it("should return false when no token has been generated", () => {
        const { mockRequest } = generateMocks();
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when a token is generated but not received in request", () => {
        const { mockRequest, decodedCookieValue } = generateMocksWithTokenInternal();
        assert.equal(getCookieFromRequest(cookieName, mockRequest), decodedCookieValue);

        // Wipe token
        mockRequest.headers = {};
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when token does not match", () => {
        const { mockRequest } = generateMocksWithTokenInternal();
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when cookie is not present", () => {
        const { mockRequest } = generateMocksWithTokenInternal();
        // Wipe csrf token
        mockRequest.cookies[cookieName] = undefined;
        assert.isFalse(validateRequest(mockRequest));
      });
    });

    describe("doubleCsrfProtection", () => {
      const assertProtectionToThrow = (request: Request, response: Response) => {
        expect(() => doubleCsrfProtection(request, response, next)).to.throw(invalidCsrfTokenError.message);
      };

      const assertProtectionToNotThrow = (request: Request, response: Response) => {
        expect(() => doubleCsrfProtection(request, response, next)).to.not.throw();
      };

      it("should allow requests with an ignored method", () => {
        const { mockRequest, mockResponse } = generateMocks();
        mockRequest.method = "GET";
        expect(() => doubleCsrfProtection(mockRequest, mockResponse, next)).to.not.throw();

        // Show an invalid case
        const { mockResponse: mockResponseWithToken } = generateMocksWithToken({
          cookieName,
          generateCsrfToken,
          validateRequest,
        });
        mockRequest.method = "POST";
        assertProtectionToThrow(mockRequest, mockResponseWithToken);
        // Works as get
        mockRequest.method = "GET";
        assertProtectionToNotThrow(mockRequest, mockResponseWithToken);
      });

      it("should allow a valid request", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        assertProtectionToNotThrow(mockRequest, mockResponse);
      });

      it("should not allow request after secret rotation", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        switchSecret();
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with no cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        mockRequest.cookies[cookieName] = undefined;
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with no token", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        mockRequest.headers[HEADER_KEY] = undefined;
        assert.isUndefined(mockRequest.headers[HEADER_KEY]);
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with a mismatching token and cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should attach generateCsrfToken to request via csrfToken", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        mockRequest.method = "GET";

        assert.isUndefined(mockRequest.csrfToken);
        assertProtectionToNotThrow(mockRequest, mockResponse);
        assert.isFunction(mockRequest.csrfToken);

        mockRequest.method = "POST";
        assertProtectionToNotThrow(mockRequest, mockResponse);
      });
    });
  });
};
