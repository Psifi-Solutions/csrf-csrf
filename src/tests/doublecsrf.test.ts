import { createTestSuite } from "./testsuite.js";
import { getSecret } from "./utils/helpers.js";

createTestSuite("csrf-csrf unsigned", { getSecret });
createTestSuite("csrf-csrf signed", {
  getSecret,
  cookieOptions: { signed: true },
});
createTestSuite("csrf-csrf signed with custom options", {
  getSecret,
  cookieOptions: { signed: true, sameSite: "strict" },
  size: 128,
  cookieName: "__Host.test-the-thing.token",
});
