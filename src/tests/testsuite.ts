import { serialize as serializeCookie } from "cookie";
import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { doubleCsrf } from "../index.js";
import type { CsrfRequest, CsrfTokenGeneratorRequestUtil, DoubleCsrfConfigOptions } from "../types";
import { HEADER_KEY, TEST_TOKEN } from "./utils/constants.js";
import {
  getCookieFromRequest,
  getCookieFromResponse,
  getCookieValueFromResponse,
  switchSecret,
} from "./utils/helpers.js";
import { generateMocks, generateMocksWithToken, next } from "./utils/mock.js";

type CreateTestsuite = (
  name: string,
  // We will handle options for getSecret inside the test suite
  doubleCsrfOptions: DoubleCsrfConfigOptions<Request>,
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
      cookieOptions: { path = "/", secure = true, sameSite = "strict", httpOnly = true, maxAge } = {},
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
      expect(errorConfig.message).toBe(invalidCsrfTokenError.message);
      expect(errorConfig.statusCode).toBe(invalidCsrfTokenError.statusCode);
      expect(errorConfig.code).toBe(invalidCsrfTokenError.code);
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

        expect(setCookie).toBe(expectedSetCookieValue);
        const [hmacFromCsrfToken, randomValueFromCsrfToken] = csrfToken.split(csrfTokenDelimiter);
        const [hmacFromCookieValue, randomValueFromCookieValue] = decodedCookieValue.split(csrfTokenDelimiter);
        expect(hmacFromCsrfToken).toBeTypeOf("string");
        expect(randomValueFromCsrfToken).toBeTypeOf("string");
        expect(hmacFromCsrfToken).not.toBe("");
        expect(randomValueFromCsrfToken).not.toBe("");
        expect(hmacFromCsrfToken).toBe(hmacFromCookieValue);
        expect(randomValueFromCsrfToken).toBe(randomValueFromCookieValue);
      });

      it("should reuse a csrf token if a csrf cookie is already present, and overwrite is set to false", () => {
        const { mockRequest, mockResponse, csrfToken, cookieValue: oldCookieValue } = generateMocksWithTokenInternal();

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", []);

        // overwrite is false by default
        const generatedToken = generateCsrfToken(mockRequest, mockResponse);
        const newCookieValue = getCookieFromResponse(mockResponse);

        expect(generatedToken).toBe(csrfToken);
        expect(newCookieValue).toBe(oldCookieValue);
      });

      it("should generate a new token even if a csrf cookie is already present, if overwrite is set to true", () => {
        const { mockRequest, mockResponse, csrfToken, cookieValue: oldCookieValue } = generateMocksWithTokenInternal();

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", []);

        const generatedToken = generateCsrfToken(mockRequest, mockResponse, {
          overwrite: true,
        });
        const newCookieValue = getCookieFromResponse(mockResponse);
        expect(oldCookieValue).toBeTypeOf("string");
        expect(newCookieValue).toBeTypeOf("string");
        expect(oldCookieValue).not.toBe("");
        expect(newCookieValue).not.toBe("");
        expect(newCookieValue).not.toBe(oldCookieValue);
        expect(generatedToken).not.toBe(csrfToken);
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
        ).toThrow(invalidCsrfTokenError.message);

        // just an invalid value in the cookie
        mockRequest.cookies[cookieName] = "invalid-value";

        expect(() =>
          generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: true,
          }),
        ).toThrow(invalidCsrfTokenError.message);
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
        expect(() => {
          generatedToken = generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: false,
          });
        }).not.toThrow();
        newCookieValue = getCookieFromResponse(mockResponse);
        expect(newCookieValue).not.toBe(oldCookieValue);
        expect(generatedToken).not.toBe(csrfToken);

        // just an invalid value in the cookie
        mockRequest.cookies[cookieName] = "invalid-value";

        expect(() => {
          generatedToken = generateCsrfToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: false,
          });
        }).not.toThrow();

        newCookieValue = getCookieFromResponse(mockResponse);
        expect(newCookieValue).not.toBe(oldCookieValue);
        expect(generatedToken).not.toBe(csrfToken);
      });

      it("should return a new token if cookies do not exist on request and validateOnReuse is false", () => {
        const { mockRequest, mockResponse } = generateMocksWithTokenInternal();
        const responseCookie = getCookieValueFromResponse(mockResponse).cookieValue;
        (mockRequest as CsrfRequest).cookies = undefined;
        expect(responseCookie).toBeDefined();
        expect(() => generateCsrfToken(mockRequest, mockResponse)).not.toThrow();
        expect(responseCookie).not.toBe(getCookieValueFromResponse(mockResponse).cookieValue);
      });
    });

    describe("validateRequest", () => {
      it("should return false when no token has been generated", () => {
        const { mockRequest } = generateMocks();
        expect(validateRequest(mockRequest)).toBe(false);
      });

      it("should return false when a token is generated but not received in request", () => {
        const { mockRequest, decodedCookieValue } = generateMocksWithTokenInternal();
        expect(getCookieFromRequest(cookieName, mockRequest)).toBe(decodedCookieValue);

        // Wipe token
        mockRequest.headers = {};
        expect(validateRequest(mockRequest)).toBe(false);
      });

      it("should return false when token does not match", () => {
        const { mockRequest } = generateMocksWithTokenInternal();
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        expect(validateRequest(mockRequest)).toBe(false);
      });

      it("should return false when cookie is not present", () => {
        const { mockRequest } = generateMocksWithTokenInternal();
        // Wipe csrf token
        mockRequest.cookies[cookieName] = undefined;
        expect(validateRequest(mockRequest)).toBe(false);
      });

      it("should return false when the tokens match and the hmac is empty", () => {
        const { mockRequest, decodedCookieValue } = generateMocksWithTokenInternal();
        const [_, randomValue] = decodedCookieValue.split(csrfTokenDelimiter);
        const invalidToken = `${csrfTokenDelimiter}${randomValue}`;
        mockRequest.cookies[cookieName] = invalidToken;
        mockRequest.headers["x-csrf-token"] = invalidToken;
        expect(validateRequest(mockRequest)).toBe(false);
      });

      it("should return false when the tokens match and the randomValue is empty", () => {
        const { mockRequest, decodedCookieValue } = generateMocksWithTokenInternal();
        const [hmac] = decodedCookieValue.split(csrfTokenDelimiter);
        const invalidToken = `${hmac}${csrfTokenDelimiter}`;
        mockRequest.cookies[cookieName] = invalidToken;
        mockRequest.headers["x-csrf-token"] = invalidToken;
        expect(validateRequest(mockRequest)).toBe(false);
      });

      it("should override originally configured cookie options", () => {
        const { mockRequest, mockResponse, cookieValue } = generateMocksWithTokenInternal();
        const { setCookie } = getCookieValueFromResponse(mockResponse);
        const setCookiePrefix = `${cookieName}=${cookieValue};`;

        expect(setCookie).toBeTypeOf("string");
        expect(setCookie.startsWith(setCookiePrefix)).toBe(true);
        expect(setCookie.includes("HttpOnly;")).toBe(httpOnly);
        expect(setCookie.includes("Secure;")).toBe(secure);
        expect(setCookie).toContain(`Path=${path};`);

        mockRequest.method = "GET";
        doubleCsrfProtection(mockRequest, mockResponse, next);

        const overridePath = "/override";
        const overrideSecure = !secure;
        const overrideHttpOnly = !httpOnly;
        const maxAgeOverride = 1000 * 60 * 60 * 24;

        (mockRequest.csrfToken as CsrfTokenGeneratorRequestUtil<Request, Response>)({
          cookieOptions: {
            path: overridePath,
            secure: overrideSecure,
            httpOnly: overrideHttpOnly,
            maxAge: maxAgeOverride,
          },
        });

        const { setCookie: setCookieOverride } = getCookieValueFromResponse(mockResponse);
        expect(setCookieOverride.startsWith(setCookiePrefix)).toBe(true);
        expect(setCookieOverride).not.toBe(setCookie);
        expect(setCookieOverride.includes("HttpOnly;")).toBe(overrideHttpOnly);
        expect(setCookieOverride.includes("Secure;")).toBe(overrideSecure);
        expect(setCookieOverride).toContain(`Path=${overridePath};`);
        expect(setCookieOverride).toContain(`Max-Age=${maxAgeOverride};`);
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
        expect(mockRequest.headers[HEADER_KEY]).toBeUndefined();
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with a mismatching token and cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should attach generateCsrfToken to request via csrfToken", () => {
        const { decodedCookieValue, mockResponse, mockRequest } = generateMocksWithTokenInternal();
        mockRequest.method = "GET";

        expect(mockRequest.csrfToken).toBeUndefined();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        expect(mockRequest.csrfToken).toBeTypeOf("function");

        const csrfTokenFromRequestUtility = (
          mockRequest.csrfToken as CsrfTokenGeneratorRequestUtil<Request, Response>
        )();
        expect(csrfTokenFromRequestUtility, decodedCookieValue);
        mockRequest.method = "POST";
        assertProtectionToNotThrow(mockRequest, mockResponse);
      });
    });
  });
};
