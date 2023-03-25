/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { assert, expect } from "chai";
import { doubleCsrf, DoubleCsrfConfigOptions } from "../index.js";
import type { Request, Response } from "express";
import { serialize as serializeCookie } from "cookie";
import { sign } from "cookie-signature";
import { generateMocks, generateMocksWithToken, next } from "./utils/mock.js";
import { HEADER_KEY, TEST_TOKEN } from "./utils/constants.js";
import { getCookieFromRequest, switchSecret } from "./utils/helpers.js";

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
        httpOnly = true,
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
      it("should attach a hashed token to the request and return a token", () => {
        const { mockRequest, hashedToken, setCookie } =
          generateMocksWithTokenIntenral();

        const cookieHash = signed
          ? `s:${sign(hashedToken as string, mockRequest.secret as string)}`
          : hashedToken;

        const expectedSetCookieValue = serializeCookie(
          cookieName,
          cookieHash as string,
          {
            path,
            httpOnly,
            secure,
            sameSite,
          }
        );
        assert.equal(setCookie, expectedSetCookieValue);
      });
    });

    describe("validateRequest", () => {
      it("should return false when no token has been generated", () => {
        const { mockRequest } = generateMocks();
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when a token is generated but not received in request", () => {
        const { mockRequest, hashedToken } = generateMocksWithTokenIntenral();
        assert.equal(
          getCookieFromRequest(cookieName, signed, mockRequest),
          hashedToken
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
