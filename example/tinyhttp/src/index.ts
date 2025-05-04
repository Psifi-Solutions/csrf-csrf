import { App } from "@tinyhttp/app";
import { cookieParser } from "@tinyhttp/cookie-parser";
import { logger } from "@tinyhttp/logger";
import { doubleCsrf } from "csrf-csrf";

const app = new App();
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => "some secret",
  getSessionIdentifier: () => "some session id",
});

app
  .use(logger())
  .use(cookieParser())
  .use(doubleCsrfProtection)
  .get(
    "/",
    (_, res) =>
      void res.format({
        html: () => res.send("<h1>Hello World</h1>"),
        text: () => res.send("Hello World"),
      }),
  )
  .get("/page/:page/", (req, res, next) => {
    res.status(200).send(`
    <h1>Some cool page</h1>
    <h2>URL</h2>
    ${req.url}
    <h2>Params</h2>
    ${JSON.stringify(req.params, null, 2)}
  `);
  })
  .listen(3000, () => console.log("Listening on http://localhost:3000"));
