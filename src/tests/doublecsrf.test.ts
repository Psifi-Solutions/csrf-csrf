import { createTestSuite } from "./testsuite.js";

const CSRF_SECRET = () => "test secret thing please never really do this";

createTestSuite("csrf-csrf unsigned", { getSecret: CSRF_SECRET });
createTestSuite("csrf-csrf signed", {
  getSecret: CSRF_SECRET,
  cookieOptions: { signed: true },
});
createTestSuite("csrf-csrf signed with custom options", {
  getSecret: CSRF_SECRET,
  cookieOptions: { signed: true, sameSite: "strict" },
  size: 128,
  cookieName: "__Host.test-the-thing.token",
});
