import { expect, describe, it } from "vitest";
import { doubleCsrf } from "../index.js";
import { getSingleSecret } from "./utils/helpers.js";
import { generateMocks, generateMocksWithToken, next } from "./utils/mock.js";

describe("csrf-csrf with skipCsrfProtection", () => {
  it("should skip CSRF protection when skipCsrfProtection returns true", () => {
    const { doubleCsrfProtection } = doubleCsrf({
      getSecret: getSingleSecret,
      getSessionIdentifier: (req) => req.session.id!,
      skipCsrfProtection: () => true,
    });

    const { mockResponse, mockRequest } = generateMocks();
    mockRequest.method = "POST";
    expect(mockRequest.csrfToken).toBeUndefined();
    expect(() => doubleCsrfProtection(mockRequest, mockResponse, next)).not.toThrow();
    expect(mockRequest.csrfToken).toBeTypeOf("function");
  });

  const testSkipCsrfProtectionFalsey = (skipCsrfProtection?: any) => {
    const { doubleCsrfProtection, generateCsrfToken, validateRequest } = doubleCsrf({
      getSecret: getSingleSecret,
      getSessionIdentifier: (req) => req.session.id!,
      skipCsrfProtection,
    });

    const { mockResponse, mockRequest } = generateMocksWithToken({
      cookieName: "__Host-psifi.x-csrf-token",
      generateCsrfToken,
      validateRequest,
    });
    mockRequest.method = "POST";

    expect(mockRequest.csrfToken).toBeUndefined();
    expect(() => doubleCsrfProtection(mockRequest, mockResponse, next)).not.toThrow();
    expect(mockRequest.csrfToken).toBeTypeOf("function");
  };

  it("should not skip CSRF protection when skipCsrfProtection returns false", () => {
    testSkipCsrfProtectionFalsey(() => false);
  });

  it("should not skip CSRF protection when skipCsrfProtection returns null", () => {
    testSkipCsrfProtectionFalsey(() => null);
  });

  it("should not skip CSRF protection when skipCsrfProtection returns undefined", () => {
    testSkipCsrfProtectionFalsey(() => undefined);
  });

  it("should not skip CSRF protection when skipCsrfProtection returns empty string", () => {
    testSkipCsrfProtectionFalsey(() => "");
  });

  it("should not skip CSRF protection when skipCsrfProtection returns empty object", () => {
    testSkipCsrfProtectionFalsey(() => ({}));
  });

  it("should not skip CSRF protection when skipCsrfProtection returns 1", () => {
    testSkipCsrfProtectionFalsey(() => 1);
  });

  it("should not skip CSRF protection when skipCsrfProtection is null", () => {
    testSkipCsrfProtectionFalsey(null);
  });

  it("should not skip CSRF protection when skipCsrfProtection is undefined", () => {
    testSkipCsrfProtectionFalsey(undefined);
  });
});
