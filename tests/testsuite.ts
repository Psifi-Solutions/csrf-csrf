import { doubleCsrf } from "@/index"
import type { DoubleCsrfConfig } from "@/types"
import type { Request, Response } from "@tinyhttp/app"
import { serialize as serializeCookie } from "@tinyhttp/cookie"
import { sign } from "@tinyhttp/cookie-signature"
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { assert, describe, expect, it } from "vitest"

import { HEADER_KEY, TEST_TOKEN } from "./utils/constants"
import { getCookieFromRequest, getCookieFromResponse, switchSecret } from "./utils/helpers"
import { generateMocks, generateMocksWithToken, next } from "./utils/mock"

type CreateTestSuite = (
  name: string,
  // We will handle options for getSecret inside the test suite
  doubleCsrfOptions: DoubleCsrfConfig,
) => void

/**
 * This is an over engineered test suite to allow consistent testing for various configurations.
 * It explicitly mocks the bare-minimum Request and Response objects and middleware processing.
 * @param name - The name of the test suite.
 * @param doubleCsrfOptions - The DoubleCsrfConfig.
 */
export const createTestSuite: CreateTestSuite = (name, doubleCsrfOptions) => {
  describe(name, () => {
    // Initialise the package with the passed in test suite settings and a mock secret
    const { invalidCsrfTokenError, generateToken, validateRequest, doubleCsrfProtection } = doubleCsrf({
      ...doubleCsrfOptions,
    })

    const {
      cookieOptions: {
        name: cookieName = "__Host-otter.x-csrf-token",
        signed = false,
        path = "/",
        secure = true,
        sameSite = "lax",
      } = {},
      errorConfig = {
        statusCode: 403,
        message: "invalid csrf token",
        code: "ERR_BAD_CSRF_TOKEN",
      },
    } = doubleCsrfOptions

    const generateMocksWithTokenInternal = () =>
      generateMocksWithToken({
        cookieName,
        signed,
        generateToken,
        validateRequest,
      })

    it("should initialize error via config options", () => {
      console.log(invalidCsrfTokenError)
      assert.equal(errorConfig.message, invalidCsrfTokenError.message)
      assert.equal(errorConfig.statusCode, invalidCsrfTokenError.statusCode)
      assert.equal(errorConfig.code, invalidCsrfTokenError.code)
    })

    describe("generateToken", () => {
      it("should attach both a token and its hash to the response and return a token", () => {
        const { mockRequest, decodedCookieValue, setCookie } = generateMocksWithTokenInternal()
        const cookieValue = signed
          ? `s:${sign(decodedCookieValue as string, mockRequest.secret as string)}`
          : decodedCookieValue

        const expectedSetCookieValue = serializeCookie(cookieName, cookieValue as string, {
          path,
          httpOnly: true,
          secure,
          sameSite,
        })
        assert.equal(setCookie, expectedSetCookieValue)
      })

      it("should reuse a csrf token if a csrf cookie is already present, and overwrite is set to false", () => {
        const { mockRequest, mockResponse, csrfToken, cookieValue: oldCookieValue } = generateMocksWithTokenInternal()

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", [])

        // overwrite is false by default
        const generatedToken = generateToken(mockRequest, mockResponse)
        const newCookieValue = getCookieFromResponse(mockResponse)

        assert.equal(generatedToken, csrfToken)
        assert.equal(newCookieValue, oldCookieValue)
      })

      it("should generate a new token even if a csrf cookie is already present, if overwrite is set to true", () => {
        const { mockRequest, mockResponse, csrfToken, cookieValue: oldCookieValue } = generateMocksWithTokenInternal()

        // reset the mock response to have no cookies (in reality this would just be a new instance of Response)
        mockResponse.setHeader("set-cookie", [])

        const generatedToken = generateToken(mockRequest, mockResponse, {
          overwrite: true,
        })
        const newCookieValue = getCookieFromResponse(mockResponse)

        assert.notEqual(newCookieValue, oldCookieValue)
        assert.notEqual(generatedToken, csrfToken)
      })

      it("should throw if csrf cookie is present and invalid, overwrite is false, and validateOnReuse is enabled", () => {
        const { mockRequest, mockResponse, decodedCookieValue } = generateMocksWithTokenInternal()
        // modify the cookie to make the token/hash pair invalid
        const cookieJar = signed ? mockRequest.signedCookies : mockRequest.cookies
        cookieJar[cookieName] = signed
          ? `s:${sign(`${(decodedCookieValue as string).split("|")[0]}|invalid-hash`, mockRequest.secret as string)}`
          : `${(decodedCookieValue as string).split("|")[0]}|invalid-hash`

        expect(() =>
          generateToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: true,
          }),
        ).to.throw(invalidCsrfTokenError.message)

        // just an invalid value in the cookie
        cookieJar[cookieName] = signed ? `s:${sign("invalid-value", mockRequest.secret as string)}` : "invalid-value"

        expect(() =>
          generateToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: true,
          }),
        ).to.throw(invalidCsrfTokenError.message)
      })

      it("should not throw if csrf cookie is present and invalid when overwrite is false, and validateOnReuse is disabled", () => {
        const {
          mockRequest,
          mockResponse,
          decodedCookieValue,
          cookieValue: oldCookieValue,
          csrfToken,
        } = generateMocksWithTokenInternal()

        let generatedToken = ""
        let newCookieValue = ""

        mockResponse.setHeader("set-cookie", [])
        // modify the cookie to make the token/hash pair invalid
        const cookieJar = signed ? mockRequest.signedCookies : mockRequest.cookies
        cookieJar[cookieName] = signed
          ? `s:${sign(`${(decodedCookieValue as string).split("|")[0]}|invalid-hash`, mockRequest.secret as string)}`
          : `${(decodedCookieValue as string).split("|")[0]}|invalid-hash`

        assert.doesNotThrow(() => {
          generatedToken = generateToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: false,
          })
        })
        newCookieValue = getCookieFromResponse(mockResponse)
        assert.notEqual(newCookieValue, oldCookieValue)
        assert.notEqual(generatedToken, csrfToken)

        // just an invalid value in the cookie
        cookieJar[cookieName] = signed ? `s:${sign("invalid-value", mockRequest.secret as string)}` : "invalid-value"

        assert.doesNotThrow(() => {
          generatedToken = generateToken(mockRequest, mockResponse, {
            overwrite: false,
            validateOnReuse: false,
          })
        })

        newCookieValue = getCookieFromResponse(mockResponse)
        assert.notEqual(newCookieValue, oldCookieValue)
        assert.notEqual(generatedToken, csrfToken)
      })
    })

    describe("validateRequest", () => {
      it("should return false when no token has been generated", () => {
        const { mockRequest } = generateMocks()
        assert.isFalse(validateRequest(mockRequest))
      })

      it("should return false when a token is generated but not received in request", () => {
        const { mockRequest, decodedCookieValue } = generateMocksWithTokenInternal()
        assert.equal(getCookieFromRequest(cookieName, signed, mockRequest), decodedCookieValue)

        // Wipe token
        mockRequest.headers = {}
        assert.isFalse(validateRequest(mockRequest))
      })

      it("should return false when token does not match", () => {
        const { mockRequest } = generateMocksWithTokenInternal()
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN
        assert.isFalse(validateRequest(mockRequest))
      })

      it("should return false when cookie is not present", () => {
        const { mockRequest } = generateMocksWithTokenInternal()
        // Wipe hash
        signed ? delete mockRequest.signedCookies[cookieName] : delete mockRequest.cookies[cookieName]
        assert.isFalse(validateRequest(mockRequest))
      })
    })

    describe("doubleCsrfProtection", () => {
      const assertProtectionToThrow = (request: Request, response: Response) => {
        expect(() => doubleCsrfProtection(request, response, next)).to.throw(invalidCsrfTokenError.message)
      }

      const assertProtectionToNotThrow = (request: Request, response: Response) => {
        expect(() => doubleCsrfProtection(request, response, next)).to.not.throw()
      }

      it("should allow requests with an ignored method", () => {
        const { mockRequest, mockResponse } = generateMocks()
        mockRequest.method = "GET"
        expect(() => doubleCsrfProtection(mockRequest, mockResponse, next)).to.not.throw()

        // Show an invalid case
        const { mockResponse: mockResponseWithToken } = generateMocksWithToken({
          cookieName,
          signed,
          generateToken,
          validateRequest,
        })
        mockRequest.method = "POST"
        assertProtectionToThrow(mockRequest, mockResponseWithToken)
        // Works as get
        mockRequest.method = "GET"
        assertProtectionToNotThrow(mockRequest, mockResponseWithToken)
      })

      it("should allow a valid request", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal()
        assertProtectionToNotThrow(mockRequest, mockResponse)
      })

      it("should not allow request after secret rotation", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal()
        assertProtectionToNotThrow(mockRequest, mockResponse)
        switchSecret()
        assertProtectionToThrow(mockRequest, mockResponse)
      })

      it("should not allow a protected request with no cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal()
        signed ? delete mockRequest.signedCookies[cookieName] : delete mockRequest.cookies[cookieName]
        assertProtectionToThrow(mockRequest, mockResponse)
      })

      it("should not allow a protected request with no token", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal()
        delete mockRequest.headers[HEADER_KEY]
        assert.isUndefined(mockRequest.headers[HEADER_KEY])
        assertProtectionToThrow(mockRequest, mockResponse)
      })

      it("should not allow a protected request with a mismatching token and cookie", () => {
        const { mockResponse, mockRequest } = generateMocksWithTokenInternal()
        assertProtectionToNotThrow(mockRequest, mockResponse)
        mockRequest.headers[HEADER_KEY] = TEST_TOKEN
        assertProtectionToThrow(mockRequest, mockResponse)
      })
    })
  })
}
