import { assert } from "chai";
import { DoubleCsrfConfigOptions, doubleCsrf } from "../index.js";
import { createTestSuite } from "./testsuite.js";
import { getSingleSecret, getMultipleSecrets } from "./utils/helpers.js";
import { generateMocksWithToken } from "./utils/mock.js";

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

it("should validate correctly on secret rotation", () => {
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

    const g = generateMocksWithToken({
      cookieName,
      signed,
      generateToken,
      validateRequest,
    });

    return {
      ...g,
      validateRequest,
    };
  };

  // Generate request --> CSRF token with secret1
  const { mockRequest } = generateMocksWithMultipleSecrets(SECRET1);

  // Should be valid with secret1
  const { validateRequest: validateRequest0 } =
    generateMocksWithMultipleSecrets([SECRET1]);
  assert.isTrue(validateRequest0(mockRequest));

  const { validateRequest: validateRequest1 } =
    generateMocksWithMultipleSecrets(SECRET1);
  assert.isTrue(validateRequest1(mockRequest));

  // Should be valid with 1 matching secret
  const { validateRequest: validateRequest2 } =
    generateMocksWithMultipleSecrets([SECRET1, SECRET2]);
  assert.isTrue(validateRequest2(mockRequest));

  const { validateRequest: validateRequest3 } =
    generateMocksWithMultipleSecrets([SECRET2, SECRET1]);
  assert.isTrue(validateRequest3(mockRequest));

  // Should be invalid with no matching secrets
  const { validateRequest: validateRequest4 } =
    generateMocksWithMultipleSecrets([SECRET2]);
  assert.isFalse(validateRequest4(mockRequest));

  const { validateRequest: validateRequest5 } =
    generateMocksWithMultipleSecrets(SECRET2);
  assert.isFalse(validateRequest5(mockRequest));

  const { validateRequest: validateRequest6 } =
    generateMocksWithMultipleSecrets(["invalid", "invalid2", "invalid3"]);
  assert.isFalse(validateRequest6(mockRequest));
});
