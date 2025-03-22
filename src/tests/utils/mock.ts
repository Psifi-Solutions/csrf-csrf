import { assert } from "chai";
import type { CookieOptions, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { serialize as serializeCookie } from "cookie";
import type { CsrfRequestValidator, CsrfTokenGenerator } from "../../types.js";
import { COOKIE_SECRET, HEADER_KEY } from "./constants.js";
import { getCookieFromRequest, getCookieValueFromResponse } from "./helpers.js";

// Create some request and response mocks
export const generateMocks = (sessionIdentifier?: string) => {
  const mockRequest = {
    headers: {
      cookie: "",
    },
    cookies: {},
    secret: COOKIE_SECRET,
    session: {
      id: "f5d7e7d1-a0dd-cf55-c0bb-5aa5aabe441f",
    },
  } as unknown as Request;

  if (sessionIdentifier) {
    (mockRequest as RequestWithSessionId).session = { id: sessionIdentifier };
  }
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
    const data: string = serializeCookie(name, value, options);
    const previous = mockResponse.getHeader("set-cookie") || [];
    let header;
    if (Array.isArray(previous)) {
      header = previous
        .filter((header) => !header.startsWith(name))
        .concat(data);
    } else if (typeof previous === "string" && previous.startsWith(name)) {
      header = [data];
    } else {
      header = [previous, data];
    }

    mockResponse.setHeader("set-cookie", header as string[]);
    return mockResponse;
  };

  return {
    mockRequest,
    mockResponse,
    mockResponseHeaders,
  };
};

export type RequestWithSessionId = Request & {
  session: {
    id?: string;
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
  generateCsrfToken: CsrfTokenGenerator;
  validateRequest: CsrfRequestValidator;
  sessionIdentifier?: string;
};

// Generate the request and response mocks.
// Set them up as if they have been pre-processed in a valid state.
export const generateMocksWithToken = ({
  cookieName,
  generateCsrfToken,
  validateRequest,
  sessionIdentifier,
}: GenerateMocksWithTokenOptions) => {
  const { mockRequest, mockResponse, mockResponseHeaders } =
    generateMocks(sessionIdentifier);

  const csrfToken = generateCsrfToken(mockRequest, mockResponse);
  const { setCookie, cookieValue } = getCookieValueFromResponse(mockResponse);
  mockRequest.headers.cookie = `${cookieName}=${cookieValue};`;
  const decodedCookieValue = decodeURIComponent(cookieValue);
  // Have to delete the cookies object otherwise cookieParser will skip it's parsing.
  delete mockRequest["cookies"];
  cookieParserMiddleware(mockRequest, mockResponse, next);
  assert.equal(
    getCookieFromRequest(cookieName, mockRequest),
    decodedCookieValue,
  );

  mockRequest.headers[HEADER_KEY] = csrfToken;

  // Once a token has been generated, the request should be setup as valid
  assert.isTrue(
    validateRequest(mockRequest),
    "mockRequest should be valid after being setup with a token",
  );
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
