import { createTestSuite } from "./testsuite.js";

const CSRF_SECRET = "test secret thing please never really do this";

createTestSuite("csrf-csrf unsigned", { secret: CSRF_SECRET });
createTestSuite("csrf-csrf signed", {
  secret: CSRF_SECRET,
  cookieOptions: { signed: true },
});
createTestSuite("csrf-csrf signed with custom options", {
  secret: CSRF_SECRET,
  cookieOptions: { signed: true, sameSite: "strict" },
  size: 128,
  cookieName: "__Host.test-the-thing.token",
});
