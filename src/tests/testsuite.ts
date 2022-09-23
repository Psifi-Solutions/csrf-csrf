/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { assert, expect } from "chai";
import { doubleCsrf, DoubleCsrfConfigOptions } from "../index.js";
import { Request, Response } from "express";
import cookieParser, { signedCookie } from "cookie-parser";
import { parse } from "cookie";
import { serialize as serializeCookie } from "cookie";
import { sign } from "cookie-signature";

type CreateTestsuite = (
  name: string,
  doubleCsrfOptions: DoubleCsrfConfigOptions
) => void;

const COOKIE_SECRET = "some other secret, do not make them the same";

const cookieParserMiddleware = cookieParser(COOKIE_SECRET);

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
    } = doubleCsrf(doubleCsrfOptions);

    const {
      cookieName = "Host__psifi.x-csrf-token",
      cookieOptions: {
        signed = false,
        path = "/",
        httpOnly = true,
        secure = true,
        sameSite = "lax",
      } = {},
    } = doubleCsrfOptions;

    // Returns the cookie value from the request, accommodate signed and unsigned.
    const getCookieFromRequest = (req: Request) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      signed ? req.signedCookies[cookieName] : req.cookies[cookieName];

    // Create some request and response mocks
    const generateMocks = () => {
      const mockRequest = {
        headers: {
          cookie: "",
        },
        cookies: {},
        signedCookies: {},
        secret: COOKIE_SECRET,
      } as unknown as Request;

      // Internally mock the headers as a map.
      const mockResponseHeaders = new Map<string, string | string[]>();
      mockResponseHeaders.set("set-cookie", [] as string[]);

      // Mock bare minimum properties for testing.
      const mockResponse = {
        getHeader: (name: string) => mockResponseHeaders.get(name),
        setHeader: (name: string, value: string) => {
          mockResponseHeaders.set(name, value);
          return mockResponse;
        },
      } as unknown as Response;

      return {
        mockRequest,
        mockResponse,
        mockResponseHeaders,
      };
    };

    /**
     * Parses the response 'Set-Cookie' header.
     * @param res The response object
     * @returns The set-cookie header string and the csrf token hash value
     */
    const getCookieValueFromResponse = (res: Response) => {
      const setCookie = res.getHeader("set-cookie") as string | string[];
      const setCookieString: string = Array.isArray(setCookie)
        ? setCookie[0]
        : setCookie;
      const cookieValue = setCookieString.substring(
        setCookieString.indexOf("=") + 1,
        setCookieString.indexOf(";")
      );

      return {
        setCookie: setCookieString,
        cookieValue,
      };
    };

    // Mock the next callback and allow for error throwing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = (err: any) => {
      if (err) throw err;
    };

    // Generate the request and response mocks.
    // Set them up as if they have been pre-processed in a valid state.
    const generateMocksWithToken = () => {
      const { mockRequest, mockResponse, mockResponseHeaders } =
        generateMocks();

      const csrfToken = generateToken(mockResponse, mockRequest);
      const { setCookie, cookieValue } =
        getCookieValueFromResponse(mockResponse);
      mockRequest.headers.cookie = `${cookieName}=${cookieValue};`;
      const hashedToken = signed
        ? signedCookie(
            parse(mockRequest.headers.cookie)[cookieName],
            mockRequest.secret!
          )
        : cookieValue;
      // Have to delete the cookies object otherwise cookieParser will skip it's parsing.
      delete mockRequest["cookies"];
      cookieParserMiddleware(mockRequest, mockResponse, next);
      assert.equal(getCookieFromRequest(mockRequest), hashedToken);

      mockRequest.headers[HEADER_KEY] = csrfToken;

      // Once a token has ben generated, the request should be setup as valid
      assert.isTrue(validateRequest(mockRequest));

      return {
        csrfToken,
        cookieValue,
        hashedToken,
        mockRequest,
        mockResponse,
        mockResponseHeaders,
        setCookie,
      };
    };

    const HEADER_KEY = "x-csrf-token";
    const TEST_TOKEN = "test token";

    describe("generateToken", () => {
      it("should attach a hashed token to the request and return a token", () => {
        const { mockRequest, hashedToken, setCookie } =
          generateMocksWithToken();

        const cookieHash = signed
          ? `s:${sign(hashedToken as string, mockRequest.secret!)}`
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
        const { mockRequest, hashedToken } = generateMocksWithToken();
        assert.equal(getCookieFromRequest(mockRequest), hashedToken);

        // Wipe token
        mockRequest.headers = {};
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when token does not match", () => {
        const { mockRequest } = generateMocksWithToken();
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assert.isFalse(validateRequest(mockRequest));
      });

      it("should return false when cookie is not present", () => {
        const { mockRequest } = generateMocksWithToken();
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
        const { mockResponse: mockResponseWithToken } =
          generateMocksWithToken();
        mockRequest.method = "POST";
        assertProtectionToThrow(mockRequest, mockResponseWithToken);
        // Works as get
        mockRequest.method = "GET";
        assertProtectionToNotThrow(mockRequest, mockResponseWithToken);
      });

      it("should allow a valid request", () => {
        const { mockResponse, mockRequest } = generateMocksWithToken();
        assertProtectionToNotThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with no cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithToken();
        signed
          ? delete mockRequest.signedCookies[cookieName]
          : delete mockRequest.cookies[cookieName];
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with no token", () => {
        const { mockResponse, mockRequest } = generateMocksWithToken();
        delete mockRequest.headers[HEADER_KEY];
        assert.isUndefined(mockRequest.headers[HEADER_KEY]);
        assertProtectionToThrow(mockRequest, mockResponse);
      });

      it("should not allow a protected request with a mismatching token and cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithToken();
        assertProtectionToNotThrow(mockRequest, mockResponse);
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN;
        assertProtectionToThrow(mockRequest, mockResponse);
      });
    });
  });
};
