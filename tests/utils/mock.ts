import type { CsrfRequestValidator, CsrfTokenCreator } from "@/types.js"
import type { Request, Response } from "@tinyhttp/app"
import { parse } from "@tinyhttp/cookie"
import { cookieParser, signedCookie } from "@tinyhttp/cookie-parser"
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert } from "chai"
import { COOKIE_SECRET, HEADER_KEY } from "./constants.js"
import { getCookieFromRequest, getCookieValueFromResponse } from "./helpers.js"

// Create some request and response mocks
export const generateMocks = () => {
  const mockRequest = {
    headers: {
      cookie: "",
    },
    cookies: {},
    signedCookies: {},
    secret: COOKIE_SECRET,
  } satisfies Partial<Request> as Request

  // Internally mock the headers as a map.
  const mockResponseHeaders = new Map<string, string | string[]>()
  mockResponseHeaders.set("set-cookie", [] as string[])

  // Mock bare minimum properties for testing.
  const mockResponse = {
    getHeader: (name: string) => mockResponseHeaders.get(name),
    setHeader: (name: string, value: string) => {
      mockResponseHeaders.set(name, value)
      return mockResponse
    },
  } satisfies Partial<Response> as Response

  return {
    mockRequest,
    mockResponse,
    mockResponseHeaders,
  }
}

export const next = () => undefined

export const cookieParserMiddleware = cookieParser(COOKIE_SECRET)

export type GenerateMocksWithTokenOptions = {
  cookieName: string
  signed: boolean
  generateToken: CsrfTokenCreator
  validateRequest: CsrfRequestValidator
}

// Generate the request and response mocks.
// Set them up as if they have been pre-processed in a valid state.
export const generateMocksWithToken = ({
  cookieName,
  signed,
  generateToken,
  validateRequest,
}: GenerateMocksWithTokenOptions) => {
  const { mockRequest, mockResponse, mockResponseHeaders } = generateMocks()

  const csrfToken = generateToken(mockRequest, mockResponse)
  const { setCookie, cookieValue } = getCookieValueFromResponse(mockResponse)
  mockRequest.headers.cookie = `${cookieName}=${cookieValue};`
  const decodedCookieValue = signed
    ? signedCookie(parse(mockRequest.headers.cookie)[cookieName], mockRequest.secret as string)
    : // signedCookie already decodes the value, but we need it if it's not signed.
      decodeURIComponent(cookieValue)
  // Have to delete the cookies object otherwise cookieParser will skip it's parsing.
  mockRequest.cookies = undefined
  cookieParserMiddleware(mockRequest, mockResponse, next)
  assert.equal(getCookieFromRequest(cookieName, signed, mockRequest), decodedCookieValue)

  mockRequest.headers[HEADER_KEY] = csrfToken

  // Once a token has been generated, the request should be setup as valid
  assert.isTrue(validateRequest(mockRequest))
  return {
    csrfToken,
    cookieValue,
    decodedCookieValue,
    mockRequest,
    mockResponse,
    mockResponseHeaders,
    setCookie,
  }
}
