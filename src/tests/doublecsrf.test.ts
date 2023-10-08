/* eslint-disable @typescript-eslint/ban-ts-comment */
import { assert } from "chai";
import { DoubleCsrfConfigOptions, doubleCsrf } from "../index.js";
import { createTestSuite } from "./testsuite.js";
import {
  getSingleSecret,
  getMultipleSecrets,
  getCookieValueFromResponse,
} from "./utils/helpers.js";
import { generateMocks, generateMocksWithToken } from "./utils/mock.js";
import { Request, Response } from "express";
import { HEADER_KEY } from "./utils/constants.js";

createTestSuite("csrf-csrf unsigned, single secret", {
  getSecret: getSingleSecret,
});
createTestSuite("csrf-csrf signed, single secret", {
  cookieOptions: { signed: true },
  getSecret: getSingleSecret,
});
createTestSuite("csrf-csrf signed with custom options, single secret", {
  getSecret: getSingleSecret,
  cookieOptions: { signed: true, sameSite: "strict" },
  size: 128,
  cookieName: "__Host.test-the-thing.token",
});

createTestSuite("csrf-csrf unsigned, multiple secrets", {
  getSecret: getMultipleSecrets,
});
createTestSuite("csrf-csrf signed, multiple secrets", {
  cookieOptions: { signed: true },
  getSecret: getMultipleSecrets,
});
createTestSuite("csrf-csrf signed with custom options, multiple secrets", {
  getSecret: getMultipleSecrets,
  cookieOptions: { signed: true, sameSite: "strict" },
  size: 128,
  cookieName: "__Host.test-the-thing.token",
});

describe("csrf-csrf token-rotation", () => {
  // Initialise the package with the passed in test suite settings and a mock secret
  const doubleCsrfOptions: Omit<DoubleCsrfConfigOptions, "getSecret"> = {};

  const {
    cookieName = "__Host-psifi.x-csrf-token",
    cookieOptions: { signed = false } = {},
  } = doubleCsrfOptions;

  const SECRET1 = "secret1";
  const SECRET2 = "secret2";

  const generateMocksWithMultipleSecrets = (secrets: string[] | string) => {
    const { generateToken, validateRequest } = doubleCsrf({
      ...doubleCsrfOptions,
      getSecret: () => secrets,
    });

    return {
      ...generateMocksWithToken({
        cookieName,
        signed,
        generateToken,
        validateRequest,
      }),
      validateRequest,
      generateToken,
    };
  };

  it("combination of different secret/s", () => {
    // Generate request --> CSRF token with secret1
    // We will then match a request with token and secret1 with other combinations of secrets
    const { mockRequest } = generateMocksWithMultipleSecrets(SECRET1);

    // Should be valid with 1 matching secret
    assert.isTrue(
      generateMocksWithMultipleSecrets(SECRET1).validateRequest(mockRequest)
    );

    // Should be valid with 1/1 matching secret in array
    assert.isTrue(
      generateMocksWithMultipleSecrets([SECRET1]).validateRequest(mockRequest)
    );

    // Should be valid with 1/2 matching secrets in array, first secret matches
    assert.isTrue(
      generateMocksWithMultipleSecrets([SECRET1, SECRET2]).validateRequest(
        mockRequest
      )
    );

    // Should be valid with 1/2 matching secrets in array, second secret matches
    assert.isTrue(
      generateMocksWithMultipleSecrets([SECRET2, SECRET1]).validateRequest(
        mockRequest
      )
    );

    // Should be invalid with 0/1 matching secret in array
    assert.isFalse(
      generateMocksWithMultipleSecrets([SECRET2]).validateRequest(mockRequest)
    );

    // Should be invalid with no matching secret
    assert.isFalse(
      generateMocksWithMultipleSecrets(SECRET2).validateRequest(mockRequest)
    );

    // Extra: Should be invalid with 0/3 matching secrets in array
    assert.isFalse(
      generateMocksWithMultipleSecrets([
        "invalid0",
        "invalid1",
        "invalid2",
      ]).validateRequest(mockRequest)
    );
  });

  it("combination of different secret/s, with token rotation", () => {
    const assignResponseInfoRequest = (
      mockRequest: Request,
      mockResponse: Response,
      token: string
    ) => {
      const { cookieValue } = getCookieValueFromResponse(mockResponse);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockRequest.cookies[cookieName] = decodeURIComponent(cookieValue);
      mockRequest.headers.cookie = `${cookieName}=${cookieValue};`;

      mockRequest.headers[HEADER_KEY] = token;
    };

    const getEmptyResponse = () => {
      const { mockResponse } = generateMocks();
      return mockResponse;
    };

    // Now test generation of token with multiple secrets
    const {
      mockRequest: mockRequestWithSecret1,
      mockResponse: mockResponseWithSecret1,
      validateRequest: validateRequestWithSecret1,
    } = generateMocksWithMultipleSecrets(SECRET1);

    let {
      mockRequest: mockRequestWithSecret2,
      mockResponse: mockResponseWithSecret2,
      validateRequest: validateRequestWithSecret2,
    } = generateMocksWithMultipleSecrets(SECRET2);

    const { generateToken: generateTokenWithSecret1And2 } =
      generateMocksWithMultipleSecrets([SECRET1, SECRET2]);

    // If there is already an existing token with secret 1, it should be reused
    generateTokenWithSecret1And2(
      mockRequestWithSecret1,
      mockResponseWithSecret1
    );
    assert.isTrue(validateRequestWithSecret1(mockRequestWithSecret1));
    assert.isFalse(validateRequestWithSecret2(mockRequestWithSecret1));

    // If there is already an existing token with secret 2, it should be reused (even if secret1 is not first in the list)
    generateTokenWithSecret1And2(
      mockRequestWithSecret2,
      mockResponseWithSecret2
    );
    assert.isTrue(validateRequestWithSecret2(mockRequestWithSecret2));
    assert.isFalse(validateRequestWithSecret1(mockRequestWithSecret2));

    // Generate request with secret 2
    const new_ = generateMocksWithMultipleSecrets(SECRET2);

    mockRequestWithSecret2 = new_.mockRequest;
    mockResponseWithSecret2 = new_.mockResponse;
    validateRequestWithSecret2 = new_.validateRequest;

    // New obj with 2 secrets
    const g = generateMocksWithMultipleSecrets([SECRET1, SECRET2]);

    console.log("mockRequestWithSecret2", mockRequestWithSecret2);
    // response should have secret 1 since we passed true to overwrite
    const response = getEmptyResponse();
    const tok = g.generateToken(mockRequestWithSecret2, response, true);

    // request should have secret 1
    assignResponseInfoRequest(mockRequestWithSecret2, response, tok);

    console.log("mockRequestWithSecret2", mockRequestWithSecret2);
    assert.isFalse(validateRequestWithSecret2(mockRequestWithSecret2));
    assert.isTrue(validateRequestWithSecret1(mockRequestWithSecret2));
  });
});
