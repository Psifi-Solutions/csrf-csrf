import cookieParser from "cookie-parser";
import Express from "express";
import { EXAMPLE_API_PORT } from "./config/constants.js";
import cors from "./config/cors.js";
import { doubleCsrfProtection, generateCsrfToken } from "./config/csrf.js";
import helmet from "./config/helmet.js";
import session from "./config/session.js";
import counterRouter from "./features/counter/router.js";
import errorHandler from "./middleware/error-handler.js";
import type { CsrfTokenGeneratorRequestUtil } from "csrf-csrf";

const app = Express();

app.use(helmet);
app.use(cors);
app.use(session);
// We aren't using a cookie secret because we don't have any need for signed cookies
// If you have other cookies that do need to be signed, be sure to provide a unique secret
app.use(cookieParser());
app.use(doubleCsrfProtection);

// You might not want to start processing any payloads until after the above protection based middlewares
app.use(Express.json());

app.get("/csrf-token", (req, res) => {
  const csrfToken = generateCsrfToken(req, res, { validateOnReuse: false });
  res.status(200).json({ csrfToken });
});

app.get("/csrf-token-util", (req, res) => {
  // This is just a demonstration doing the same thing as the previous route
  // The type casting here is "safe" as we know this is guaranteed to be after the doubleCsrfProtection middleware
  const csrfToken = (req.csrfToken as CsrfTokenGeneratorRequestUtil)();
  res.status(200).json({ csrfToken });
});

app.use("/", counterRouter);
// Register the custom global error handler last
app.use(errorHandler);

app.listen({ port: EXAMPLE_API_PORT }, () => {
  console.log(`Server is listening at http://localhost:${EXAMPLE_API_PORT}`);
});
