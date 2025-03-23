import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import express from "express";

const app = express();
const port = 5555;

// These settings are only for local development testing.
// Do not use these in production.
// In production, ensure you're using cors and helmet and have proper configuration.
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => "this is a test", // NEVER DO THIS
  cookieName: "x-csrf-test", // Prefer "__Host-" prefixed names if possible
  cookieOptions: { sameSite: false, secure: false }, // not ideal for production, development only
});

app.use(cookieParser("some super secret thing, please do not copy this"));

const myTokenRoute = (req, res) => {
  return res.json({ token: req.csrfToken() });
};

app.use(doubleCsrfProtection);

app.get("/csrf-token", myTokenRoute);

app.post("/csrf-token-test", (req, res) => {
  res.json({ unpopularOpinion: "Game of Thrones was amazing" });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
