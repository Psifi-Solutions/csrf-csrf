import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import express from "express";
import session from "express-session";

import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secrets and important params are usually set as environment variables
// in this case you can set and change this values for testing purposes
const PORT = 3000;
const CSRF_SECRET = "super csrf secret";
const COOKIES_SECRET = "super cookie secret";
const SESSION_SECRET = "stupid session secret";

const app = express();
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    // maxAge is 1 hour in ms
    cookie: { secure: false, sameSite: "lax", signed: true, maxAge: 3.6e6 },
    // No session store configured is bad, this is not representative of a production config
  }),
);

// The cookie secret isn't needed for csrf-csrf, but is needed if you want to use
// cookie-parser to set signed cookies
app.use(cookieParser(COOKIES_SECRET));

// These settings are only for local development testing.
// Do not use these in production.
// In production, ensure you're using cors and helmet and have proper configuration.
const { invalidCsrfTokenError, generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: "xsrf_token",
  cookieOptions: { sameSite: "strict", secure: false },
});

// Error handling, validation error interception
const csrfErrorHandler = (error, req, res, next) => {
  if (error === invalidCsrfTokenError) {
    res.status(403).json({
      error: "csrf validation error",
    });
  } else {
    next();
  }
};

// Check out the index.html file to change parameters to the client requests
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/csrf-token", (req, res) => {
  return res.json({
    token: generateCsrfToken(req, res),
  });
});

app.post("/protected_endpoint", doubleCsrfProtection, csrfErrorHandler, (req, res) => {
  console.log(req.body);
  res.json({
    protected_endpoint: "form processed successfully",
  });
});

// Try with a HTTP client (is not protected from a CSRF attack)
app.post("/unprotected_endpoint", (req, res) => {
  console.log(req.body);
  res.json({
    unprotected_endpoint: "form processed successfully",
  });
});

app.listen(PORT, () => {
  // Open in your browser
  console.log(`listen on http://127.0.0.1:${PORT}`);
});
