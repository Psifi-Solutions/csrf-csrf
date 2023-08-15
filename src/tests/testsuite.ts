/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { assert, expect } from "chai";
import { doubleCsrf, DoubleCsrfConfigOptions } from "../index.js";
import type { Request, Response } from "express";
import { serialize as serializeCookie } from "cookie";
import { sign } from "cookie-signature";
import { generateMocks, generateMocksWithToken, next } from "./utils/mock.js";
import { HEADER_KEY, TEST_TOKEN } from "./utils/constants.js";
import {
  getCookieFromRequest,
  getCookieFromResponse,
  switchSecret,
} from "./utils/helpers.js";

type CreateTestsuite = (
  name: string,
  doubleCsrfOptions: DoubleCsrfConfigOptions
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
    const {
      invalidCsrfTokenError,
      generateToken,
      validateRequest,
      doubleCsrfProtection,
    } = doubleCsrf({ ...doubleCsrfOptions });

    const {
      cookieName = "__Host-psifi.x-csrf-token",
      cookieOptions: {
        signed = false,
        path = "/",
        secure = true,
        sameSite = "lax",
      } = {},
    } = doubleCsrfOptions;

    const generateMocksWithTokenIntenral = () =>
      generateMocksWithToken({
        cookieName,
        signed,
        generateToken,
        validateRequest,
      });

    describe("generateToken", () => {
      it("should attach both a token and its hash to the response and return a token", () => {
        const { mockRequest, decodedCookieValue, setCookie } =
          generateMocksWithTokenIntenral();
        const cookieValue = signed
          ? `s:${sign(
              decodedCookieValue as string,
              mockRequest.secret as string
            )}`
          : decodedCookieValue;

        const expectedSetCookieValue = serializeCookie(
          cookieName,
          cookieValue as string,
          {
            path,
            httpOnly: true,
            secure,
            sameSite,
          }
        );
        assert.equal(setCookie, expectedSetCookieValue);
      });

      it("should reuse a csrf token if a csrf cookie is already present, and overwrite is set to false", () => {
        const {
          mockRequest,
          mockResponse,
          csrfToken,
          cookieValue: oldCookieValue,
        } = generateMocksWithTokenIntenral();

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", []);

        const generatedToken = generateToken(mockResponse, mockRequest, false);
        const newCookieValue = getCookieFromResponse(mockResponse);

        assert.equal(generatedToken, csrfToken);
        assert.equal(newCookieValue, oldCookieValue);
      });

      it("should generate a new token even if a csrf cookie is already present, if overwrite is set to true", () => {
        const {
          mockRequest,
          mockResponse,
          csrfToken,
          cookieValue: oldCookieValue,
        } = generateMocksWithTokenIntenral();

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", []);

        // overwrite is true by default
        const generatedToken = generateToken(mockResponse, mockRequest);
        const newCookieValue = getCookieFromResponse(mockResponse);

        assert.notEqual(newCookieValue, oldCookieValue);
        assert.notEqual(generatedToken, csrfToken);
      });

      it("should throw if csrf cookie is present, it is invalid (wrong token + hash pair, or not a correct value) and overwrite is false", () => {
        const { mockRequest, mockResponse, decodedCookieValue } =
          generateMocksWithTokenIntenral();
        // modify the cookie to make the token/hash pair invalid
        signed
          ? (mockRequest.signedCookies[cookieName] = `s:${sign(
              (decodedCookieValue as string).split("|")[0] + "|invalid-hash",
              mockRequest.secret as string
            )}`)
          : (mockRequest.cookies[cookieName] =
              (decodedCookieValue as string).split("|")[0] + "|invalid-hash");

        expect(() => generateToken(mockResponse, mockRequest, false)).to.throw(
          invalidCsrfTokenError.message
        );

        // just an invalid value in the cookie
        signed
          ? (mockRequest.signedCookies[cookieName] = `s:${sign(
              "invalid-value",
              mockRequest.secret as string
            )}`)
          : (mockRequest.cookies[cookieName] = "invalid-value");

        expect(() => generateToken(mockResponse, mockRequest, false)).to.throw(
          invalidCsrfTokenError.message
        );
      });
    });

    describe("validateRequest", () => {
      it("should return false when no token has been generated", () => {
        const { mockRequest } = generateMocks();
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when a token is generated but not received in request", () => {
        const { mockRequest, decodedCookieValue } =
          generateMocksWithTokenIntenral();
        assert.equal(
          getCookieFromRequest(cookieName, signed, mockRequest),
          decodedCookieValue
        );

        // Wipe token
        mockRequest.headers = {};
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when token does not match", () => {
        const { mockRequest } = generateMocksWithTokenIntenral();
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when cookie is not present", () => {
        const { mockRequest } = generateMocksWithTokenIntenral();
        // Wipe hash
        signed
          ? delete mockRequest.signedCookies[cookieName]
          : delete mockRequest.cookies[cookieName];
        assert.isFalse(validateRequest(mockRequest));
      });
    });

    describe("doubleCsrfProtection", () => {
      const assertProtectionToThrow = (
        request: Request,
        response: Response
      ) => {
        expect(() => doubleCsrfProtection(request, response, next)).to.throw(
          invalidCsrfTokenError.message
        );
      };

      const assertProtectionToNotThrow = (
        request: Request,
        response: Response
      ) => {
        expect(() =>
          doubleCsrfProtection(request, response, next)
        ).to.not.throw();
      };

      it("should allow requests with an ignored method", () => {
        const { mockRequest, mockResponse } = generateMocks();
        mockRequest.method = "GET";
        expect(() =>
          doubleCsrfProtection(mockRequest, mockResponse, next)
        ).to.not.throw();

        // Show an invalid case
        const { mockResponse: mockResponseWithToken } = generateMocksWithToken({
          cookieName,
          signed,
          generateToken,
          validateRequest,
        });
        mockRequest.method = "POST";
        assertProtectionToThrow(mockRequest, mockResponseWithToken);
        // Works as get
        mockRequest.method = "GET";
        assertProtectionToNotThrow(mockRequest, mockResponseWithToken);
      });

      it("should allow a valid request", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenIntenral();
        assertProtectionToNotThrow(mockRequest, mockResponse);
      });

      it("should not allow request after secret rotation", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenIntenral();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        switchSecret();
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with no cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenIntenral();
        signed
          ? delete mockRequest.signedCookies[cookieName]
          : delete mockRequest.cookies[cookieName];
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with no token", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenIntenral();
        delete mockRequest.headers[HEADER_KEY];
        assert.isUndefined(mockRequest.headers[HEADER_KEY]);
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with a mismatching token and cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenIntenral();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should attach generateToken to request via csrfToken", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenIntenral();
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
