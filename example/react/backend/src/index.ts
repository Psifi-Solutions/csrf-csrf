import cookieParser from "cookie-parser";
import Express from "express";
import { EXAMPLE_API_PORT } from "./config/constants.js";
import cors from "./config/cors.js";
import { doubleCsrfProtection } from "./config/csrf.js";
import helmet from "./config/helmet.js";
import session from "./config/session.js";
import counterRouter from "./features/counter/router.js";
import errorHandler from "./middleware/error-handler.js";

const app = Express();

app.use(helmet);
app.use(cors);
app.use(session);
// We aren't using a cookie secret because we don't have any need for signed cookies
app.use(cookieParser());
app.use(doubleCsrfProtection);

// You might not want to start processing any payloads until after the above protection based middlewares
// To simplify things, instead of having multiple projects, this example demonstrates different approaches
// on a per router basis.
app.use(Express.json());

app.get("/csrf-token", (req, res) => {
  const csrfToken = req.csrfToken?.({ validateOnReuse: false });
  res.status(200).json({ csrfToken });
});

app.use("/", counterRouter);

// Register the custom global error handler last
app.use(errorHandler);

app.listen({ port: EXAMPLE_API_PORT }, () => {
  console.log(`Server is listening at http://localhost:${EXAMPLE_API_PORT}`);
});
