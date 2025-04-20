import { assert, expect } from "chai";
import { doubleCsrf } from "../index.js";
import { getSingleSecret } from "./utils/helpers.js";
import { generateMocks, next } from "./utils/mock.js";

describe("csrf-csrf with skipCsrfProtection", () => {
  it("should skip CSRF protection when skipCsrfProtection returns true", () => {
    const { doubleCsrfProtection } = doubleCsrf({
      getSecret: getSingleSecret,
      skipCsrfProtection: () => true,
    });

    const { mockResponse, mockRequest } = generateMocks();
    mockRequest.method = "POST";
    assert.isUndefined(mockRequest.csrfToken);
    expect(() =>
      doubleCsrfProtection(mockRequest, mockResponse, next),
    ).to.not.throw();
    assert.isFunction(mockRequest.csrfToken);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testSkipCsrfProtectionFalsey = (skipCsrfProtection?: any) => {
    const { doubleCsrfProtection } = doubleCsrf({
      getSecret: getSingleSecret,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      skipCsrfProtection,
    });

    const { mockResponse, mockRequest } = generateMocks();
    mockRequest.method = "POST";

    assert.isUndefined(mockRequest.csrfToken);
    expect(() =>
      doubleCsrfProtection(mockRequest, mockResponse, next),
    ).to.throw();
    assert.isFunction(mockRequest.csrfToken);
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
