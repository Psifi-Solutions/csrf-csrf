import { assert } from "chai";
import type { CookieOptions, Request, Response } from "express";
import cookieParser, { signedCookie } from "cookie-parser";
import { parse, serialize as serializeCookie } from "cookie";
import { sign } from "cookie-signature";
import type { CsrfRequestValidator, CsrfTokenCreator } from "../../types.js";
import { COOKIE_SECRET, HEADER_KEY } from "./constants.js";
import { getCookieFromRequest, getCookieValueFromResponse } from "./helpers.js";

// Create some request and response mocks
export const generateMocks = () => {
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

  mockResponse.cookie = (
    name: string,
    value: string,
    options?: CookieOptions,
  ) => {
    const parsesValue = options?.signed
      ? "s:" + sign(value, COOKIE_SECRET)
      : value;
    const data: string = serializeCookie(name, parsesValue, options);
    const previous = mockResponse.getHeader("set-cookie") || [];
    const header = Array.isArray(previous)
      ? previous.concat(data)
      : [previous, data];

    mockResponse.setHeader("set-cookie", header as string[]);
    return mockResponse;
  };

  return {
    mockRequest,
    mockResponse,
    mockResponseHeaders,
  };
};

// Mock the next callback and allow for error throwing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const next = (err: any) => {
  if (err) throw err;
};

export const cookieParserMiddleware = cookieParser(COOKIE_SECRET);

export type GenerateMocksWithTokenOptions = {
  cookieName: string;
  signed: boolean;
  generateToken: CsrfTokenCreator;
  validateRequest: CsrfRequestValidator;
};

// Generate the request and response mocks.
// Set them up as if they have been pre-processed in a valid state.
export const generateMocksWithToken = ({
  cookieName,
  signed,
  generateToken,
  validateRequest,
}: GenerateMocksWithTokenOptions) => {
  const { mockRequest, mockResponse, mockResponseHeaders } = generateMocks();

  const csrfToken = generateToken(mockRequest, mockResponse);
  const { setCookie, cookieValue } = getCookieValueFromResponse(mockResponse);
  mockRequest.headers.cookie = `${cookieName}=${cookieValue};`;
  const decodedCookieValue = signed
    ? signedCookie(
        parse(mockRequest.headers.cookie)[cookieName],
        mockRequest.secret as string,
      )
    : // signedCookie already decodes the value, but we need it if it's not signed.
      decodeURIComponent(cookieValue);
  // Have to delete the cookies object otherwise cookieParser will skip it's parsing.
  delete mockRequest["cookies"];
  cookieParserMiddleware(mockRequest, mockResponse, next);
  assert.equal(
    getCookieFromRequest(cookieName, signed, mockRequest),
    decodedCookieValue,
  );

  mockRequest.headers[HEADER_KEY] = csrfToken;

  // Once a token has been generated, the request should be setup as valid
  assert.isTrue(validateRequest(mockRequest));
  return {
    csrfToken,
    cookieValue,
    decodedCookieValue,
    mockRequest,
    mockResponse,
    mockResponseHeaders,
    setCookie,
  };
};
