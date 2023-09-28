import { createTestSuite } from "./testsuite.js";
import { getSingleSecret, getMultipleSecrets } from "./utils/helpers.js";
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
