import { createTestSuite } from "./testsuite.js";

createTestSuite("csrf-csrf unsigned", {});
createTestSuite("csrf-csrf signed", {
  cookieOptions: { signed: true },
});
createTestSuite("csrf-csrf signed with custom options", {
  cookieOptions: { signed: true, sameSite: "strict" },
  size: 128,
  cookieName: "__Host.test-the-thing.token",
});
