/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { assert, expect } from "chai";
import { doubleCsrf } from "../index.js";
import {
  generateMocksWithToken,
  next,
  RequestWithSessionId,
} from "./utils/mock.js";
import {
  getSingleSecret,
  attachResponseValuesToRequest,
} from "./utils/helpers.js";

describe("csrf-csrf with getSessionIdentifier", () => {
  const cookieName = "xsrf-protection";
  const sessionIdentifier = "asdf68236tr3g34fgds9fgsd9g23grb3";

  const {
    invalidCsrfTokenError,
    generateToken,
    validateRequest,
    doubleCsrfProtection,
  } = doubleCsrf({
    cookieName,
    getSecret: getSingleSecret,
    getSessionIdentifier: (req) =>
      (req as RequestWithSessionId).session.id ?? "",
  });

  it("should have a valid CSRF token for the session it was generated for", () => {
    const { mockRequest, mockResponse } = generateMocksWithToken({
      cookieName,
      generateToken,
      validateRequest,
      signed: false,
      sessionIdentifier,
    });

    expect(() => {
      doubleCsrfProtection(mockRequest, mockResponse, next);
    }, "CSRF protection should be valid").not.to.throw(invalidCsrfTokenError);
  });

  it("should not be a valid CSRF token for a session it was not generated for", () => {
    const { mockRequest, mockResponse } = generateMocksWithToken({
      cookieName,
      generateToken,
      validateRequest,
      signed: false,
      sessionIdentifier,
    });

    (mockRequest as RequestWithSessionId).session.id = "sdf9342dfa245r13tgvrf";

    expect(() => {
      doubleCsrfProtection(mockRequest, mockResponse, next);
    }, "CSRF protection should be invalid").to.throw(invalidCsrfTokenError);
  });

  it("should throw when validateOnReuse is true and session has been rotated", () => {
    const { mockRequest, mockResponse } = generateMocksWithToken({
      cookieName,
      generateToken,
      validateRequest,
      signed: false,
      sessionIdentifier,
    });

    (mockRequest as RequestWithSessionId).session.id = "sdf9342dfa245r13tgvrf";

    assert.isFalse(validateRequest(mockRequest));
    expect(() =>
      generateToken(mockRequest, mockResponse, {
        overwrite: false,
        validateOnReuse: true,
      }),
    ).to.throw(invalidCsrfTokenError);
  });

  it("should generate a new valid token after session has been rotated", () => {
    const { csrfToken, mockRequest, mockResponse } = generateMocksWithToken({
      cookieName,
      generateToken,
      validateRequest,
      signed: false,
      sessionIdentifier,
    });

    (mockRequest as RequestWithSessionId).session.id = "sdf9342dfa245r13tgvrf";
    console.log("generating a new token");
    const newCsrfToken = generateToken(mockRequest, mockResponse, {
      overwrite: true,
    });
    console.log("new token generated");
    assert.notEqual(
      newCsrfToken,
      csrfToken,
      "New token and original token should not match",
    );
    attachResponseValuesToRequest({
      request: mockRequest,
      response: mockResponse,
      bodyResponseToken: newCsrfToken,
      cookieName,
    });
    assert.isTrue(validateRequest(mockRequest));
    expect(() =>
      doubleCsrfProtection(mockRequest, mockResponse, next),
    ).not.to.throw();
  });
});
