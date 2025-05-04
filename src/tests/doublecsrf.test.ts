import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { doubleCsrf } from "../index.js";
import type { DoubleCsrfConfigOptions } from "../types";
import { createTestSuite } from "./testsuite.js";
import { HEADER_KEY } from "./utils/constants.js";
import { attachResponseValuesToRequest, getMultipleSecrets, getSingleSecret } from "./utils/helpers.js";
import { generateMocks, generateMocksWithToken } from "./utils/mock.js";

declare module "http" {
  export interface IncomingMessage {
    session: {
      id?: string;
    };
  }
}

createTestSuite("csrf-csrf default configuration with single secret", {
  getSecret: getSingleSecret,
  getSessionIdentifier: (req) => req.session.id ?? "",
  skipCsrfProtection: () => false,
});

createTestSuite("csrf-csrf default configuration with multiple secrets", {
  getSecret: getMultipleSecrets,
  getSessionIdentifier: (req) => req.session.id ?? "",
  cookieOptions: {
    sameSite: "lax",
  },
});

createTestSuite("csrf-csrf with custom options, multiple secrets", {
  getSecret: getMultipleSecrets,
  getSessionIdentifier: (req) => req.session.id ?? "",
  cookieOptions: { sameSite: "strict" },
  messageDelimiter: "~",
  csrfTokenDelimiter: "|",
  size: 64,
  cookieName: "__Host.test-the-thing.token",
  errorConfig: {
    statusCode: 401,
    message: "GO AWAY",
    code: "FAKE",
  },
});

describe("csrf-csrf token-rotation", () => {
  // Initialise the package with the passed in test suite settings and a mock secret
  const doubleCsrfOptions: Omit<DoubleCsrfConfigOptions<Request>, "getSecret" | "getSessionIdentifier"> = {};

  const { cookieName = "__Host-psifi.x-csrf-token" } = doubleCsrfOptions;

  const SECRET1 = "secret1";
  const SECRET2 = "secret2";

  const generateMocksWithMultipleSecrets = (secrets: string[] | string) => {
    const { generateCsrfToken, validateRequest } = doubleCsrf({
      ...doubleCsrfOptions,
      getSecret: () => secrets,
      getSessionIdentifier: (req) => req.session.id ?? "",
    });

    return {
      ...generateMocksWithToken({
        cookieName,
        generateCsrfToken,
        validateRequest,
      }),
      validateRequest,
      generateCsrfToken,
    };
  };

  describe("validating requests with combination of different secret/s", () => {
    // Generate request --> CSRF token with secret1
    // We will then match a request with token and secret1 with other combinations of secrets
    const { mockRequest, validateRequest } = generateMocksWithMultipleSecrets(SECRET1);
    expect(validateRequest(mockRequest)).toBe(true);

    it("should be valid with 1 matching secret", () => {
      expect(generateMocksWithMultipleSecrets(SECRET1).validateRequest(mockRequest)).toBe(true);
    });

    it("should be valid with 1/1 matching secret in array", () => {
      expect(generateMocksWithMultipleSecrets([SECRET1]).validateRequest(mockRequest)).toBe(true);
    });

    it("should be valid with 1/2 matching secrets in array, first secret matches", () => {
      expect(generateMocksWithMultipleSecrets([SECRET1, SECRET2]).validateRequest(mockRequest)).toBe(true);
    });

    it("should be valid with 1/2 matching secrets in array, second secret matches", () => {
      expect(generateMocksWithMultipleSecrets([SECRET2, SECRET1]).validateRequest(mockRequest)).toBe(true);
    });

    it("should be invalid with 0/1 matching secret in array", () => {
      expect(generateMocksWithMultipleSecrets([SECRET2]).validateRequest(mockRequest)).toBe(false);
    });

    it("should be invalid with 0/2 matching secrets in array", () => {
      expect(generateMocksWithMultipleSecrets(SECRET2).validateRequest(mockRequest)).toBe(false);
    });

    it("should be invalid with 0/3 matching secrets in array", () => {
      expect(generateMocksWithMultipleSecrets(["invalid0", "invalid1", "invalid2"]).validateRequest(mockRequest)).toBe(
        false,
      );
    });
  });

  describe("should generate tokens correctly, simulating token rotations", () => {
    const getEmptyResponse = () => {
      const { mockResponse } = generateMocks();
      return mockResponse;
    };

    const { validateRequest: validateRequestWithSecret1 } = generateMocksWithMultipleSecrets(SECRET1);

    const { validateRequest: validateRequestWithSecret2 } = generateMocksWithMultipleSecrets(SECRET2);

    const { generateCsrfToken: generateTokenWithSecret1And2 } = generateMocksWithMultipleSecrets([SECRET1, SECRET2]);

    const { generateCsrfToken: generateTokenWithSecret2And1 } = generateMocksWithMultipleSecrets([SECRET2, SECRET1]);

    it("should reuse existing token on request with SECRET1, while current is [SECRET1, SECRET2]", () => {
      const { mockRequest } = generateMocksWithMultipleSecrets(SECRET1);
      const mockResponse = getEmptyResponse();

      const token = generateTokenWithSecret1And2(mockRequest, mockResponse);
      attachResponseValuesToRequest({
        request: mockRequest,
        response: mockResponse,
        headerKey: HEADER_KEY,
        cookieName,
        bodyResponseToken: token,
      });

      expect(validateRequestWithSecret1(mockRequest)).toBe(true);
      expect(validateRequestWithSecret2(mockRequest)).toBe(false);
    });

    it("should reuse existing token on request with SECRET1, while current is [SECRET2, SECRET1]", () => {
      const { mockRequest } = generateMocksWithMultipleSecrets(SECRET1);
      const mockResponse = getEmptyResponse();

      const token = generateTokenWithSecret2And1(mockRequest, mockResponse);
      attachResponseValuesToRequest({
        request: mockRequest,
        response: mockResponse,
        headerKey: HEADER_KEY,
        cookieName,
        bodyResponseToken: token,
      });

      expect(validateRequestWithSecret1(mockRequest)).toBe(true);
      expect(validateRequestWithSecret2(mockRequest)).toBe(false);
    });

    it("should generate new token (with secret 1) on request with SECRET2, while current is [SECRET1, SECRET2], if overwrite is true", () => {
      const { mockRequest } = generateMocksWithMultipleSecrets(SECRET2);

      const mockResponse = getEmptyResponse();

      const token = generateTokenWithSecret1And2(mockRequest, mockResponse, {
        overwrite: true,
      });

      attachResponseValuesToRequest({
        request: mockRequest,
        response: mockResponse,
        headerKey: HEADER_KEY,
        cookieName,
        bodyResponseToken: token,
      });

      expect(validateRequestWithSecret2(mockRequest)).toBe(false);
      expect(validateRequestWithSecret1(mockRequest)).toBe(true);
    });

    it("should generate new token (with secret 2) on request with SECRET2, while current is [SECRET2, SECRET1], if overwrite is true", () => {
      const { mockRequest } = generateMocksWithMultipleSecrets(SECRET2);

      const mockResponse = getEmptyResponse();

      const token = generateTokenWithSecret2And1(mockRequest, mockResponse, {
        overwrite: true,
      });

      attachResponseValuesToRequest({
        request: mockRequest,
        response: mockResponse,
        headerKey: HEADER_KEY,
        cookieName,
        bodyResponseToken: token,
      });

      expect(validateRequestWithSecret2(mockRequest)).toBe(true);
      expect(validateRequestWithSecret1(mockRequest)).toBe(false);
    });
  });
});
