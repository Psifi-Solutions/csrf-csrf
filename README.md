<h1 align="center">
  Double CSRF
</h1>

<h4 align="center">A utility package to help implement stateless CSRF protection using the Double Submit Cookie Pattern in express.</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/csrf-csrf">
    <img src="https://img.shields.io/npm/v/csrf-csrf" />
  </a>
  <a href="https://discord.gg/JddkbuSnUU">
    <img src="https://discordapp.com/api/guilds/643569902866923550/widget.png?style=shield">
  </a>
  <a href="https://patreon.com/Psibean">
    <img src="https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3DPsibean%26type%3Dpatrons&style=flat" />
  </a>
</p>

<p align="center">
  <a href="#dos-and-donts">Dos and Don'ts</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#support">Support</a>
</p>

<h2 id="background"> Background</h2>

<p>
  This module provides the necessary pieces required to implement CSRF protection using the <a href="https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie">Double Submit Cookie Pattern</a>. This is a stateless CSRF protection pattern, if you are using sessions and would prefer a stateful CSRF strategy, please see <a href="https://github.com/Psifi-Solutions/csrf-sync">csrf-sync</a> for the <a href="https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern">Synchroniser Token Pattern</a>.
</p>

<p>
  Since <a href="https://github.com/expressjs/csurf">csurf</a> has been deprecated I struggled to find alternative solutions that were accurately implemented and configurable, so I decided to write my own! Thanks to <a href="https://github.com/nextauthjs/next-auth">NextAuth</a> as I referenced their implementation. From experience CSRF protection libraries tend to complicate their configuration, and if misconfigured, can render the protection completely useless.
</o>

<p>
  This is why csrf-csrf aims to provide a simple and targeted implementation to simplify it's use.
</p>

<h2 id="dos-and-donts">Dos and Don'ts</h2>
<ul>
  <li>
    Do read the <a href="https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html">OWASP - Cross-Site Request Forgery Prevention Cheat Sheet</a>
  </li>
  <li>
    Do read the <a href="  https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html">OWASP - Secrets Management Cheat Sheet</a>
  </li>
  <li>
    Do follow the <a href="#configuration">recommendations when configuring</a> csrf-double.
  </li>
  <li>
    Do join the Discord server and ask questions in the <code>psifi-support</code> channel if you need help.
  </li>
  <li>
    Do follow <code>fastify/csrf-protection</code> <a href="https://github.com/fastify/csrf-protection#securing-the-secret">recommendations for secret security</a>.
  </li>
  <li>
    Do keep <code>secure</code> and <code>signed</code> as true in production.
  </li>
  <li>
    Do make sure you do not compromise your security by not following best practices.
  </li>
  <li>
    <b>Do not</b> use the same secret for csrf-csrf and cookie-parser.
  </li>
  <li>
    <b>Do not</b> transmit your CSRF token by cookies.
  </li>
  <li>
    <b>Do not</b> expose your CSRF tokens or hash in any log output or transactions other than the CSRF exchange.
  </li>
  <li>
    <b>Do not</b> transmit the token hash by any other means.
  </li>
</ul>

<h2 id="getting-started">Getting Started</h2>
<p>
  This section will guide you through using the default setup, which does sufficiently implement the Double Submit Cookie Pattern. If you'd like to customise the configuration, see the <a href="#configuration">configuration</a> section.
</p>
<p>
  You will need to be using <a href="https://github.com/expressjs/cookie-parser">cookie-parser</a> and the middleware should be registered before Double CSRF. This utility will set a cookie containing a hash of the csrf token and provide the non-hashed csrf token so you can include it within your response.
</p>
<p>Requires TypeScript >= 3.8</p>

```
npm install cookie-parser csrf-csrf
```

```js
// ESM
import { doubleCsrf } from "csrf-csrf";

// CommonJS
const { doubleCsrf } = require("csrf-csrf");
```

```js
const {
  invalidCsrfTokenError, // This is just for convenience if you plan on making your own middleware.
  generateToken, // Use this in your routes to provide a CSRF hash cookie and token.
  validateRequest, // Also a convenience if you plan on making your own middleware.
  doubleCsrfProtection, // This is the default CSRF protection middleware.
} = doubleCsrf(doubleCsrfOptions);
```

<p>
  This will extract the default utilities, you can configure these and re-export them from your own module. You should only transmit your token to the frontend as part of a response payload, <b>do not</b> include the token in response headers or in a cookie, and <b>do not</b> transmit the token hash by any other means.
</O.>
<p>
  To create a route which generates a CSRF token and hash cookie:
</p>

```js
const myRoute = (request, response) => {
  const csrfToken = generateToken(response, request);
  // You could also pass the token into the context of a HTML response.
  res.json({ csrfToken });
};
const myProtectedRoute = (req, res) =>
  res.json({ unpopularOpinion: "Game of Thrones was amazing" });
```

<p>Instead of importing and using <code>generateToken</code>, you can also use <code>req.csrfToken</code> any time after the <code>doubleCsrfProtection</code> middleware has executed on your incoming request.</p>

```js
requqest.csrfToken(); // same as generateToken(res, req);
```

<p>
  You can also put the token into the context of a templated HTML response. Just make sure you register this route before registering the middleware so you don't block yourself from getting a token.
</p>

```js
// Make sure your session middleware is registered before these
express.use(session);
express.get("/csrf-token", myRoute);
express.use(doubleCsrfProtection);
// Any non GET routes registered after this will be considered "protected"
```

<p>
  By default, any request that are not <code>GET</code>, <code>HEAD</code>, or <code>OPTIONS</code> methods will be protected. You can configure this with the <code>ignoredMethods</code> option.
<p>

<p>
You can also protect routes on a case-to-case basis:
</p>

```js
app.get("/secret-stuff", doubleCsrfProtection, myProtectedRoute);
```

<p>
  Once a route is protected, you will need to ensure the hash cookie is sent along with the request and by default you will need to include the generated token in the <code>x-csrf-token</code> header, otherwise you'll receive a `403 - ForbiddenError: invalid csrf token`. If your cookie is not being included in your requests be sure to check your <code>withCredentials</code> and CORS configuration.
</p>

<h2 id="configuration">Configuration</h2>

When creating your doubleCsrf, you have a few options available for configuration, the only required option is <code>getSecret</code>, the rest have sensible defaults (shown below).

```js
const doubleCsrfUtilities = doubleCsrf({
  getSecret: () => "Secret", // A function that optionally takes the request and returns a secret
  cookieName: "__Host-psifi.x-csrf-token", // The name of the cookie to be used, recommend using Host prefix.
  cookieOptions: {
    sameSite = "lax",  // Recommend you make this strict if posible
    path = "/",
    secure = true,
    ...remainingCOokieOptions // Additional options supported: domain, maxAge, expires
  },
  size: 64, // The size of the generated tokens in bits
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
  getTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request
});
```

<h3>Sessions</h3>

<p>If you plan on using <code>express-session</code> then please ensure your <code>cookie-parser</code> middleware is registered <b>after</b> <code>express-session</code>, as express session parses it's own cookies and may cionflict.</p>

<h3>getSecret</h3>

```ts
(request: Request) => string;
```

<p>
This should return a secret key for hashing, using a hard coded string return works:
</p>

```ts
() => "my key";
```

<p>
However it is highly recommend you implement some rotating secret key so that tokens become invalidated after a certain period of time. For example, you could use sessions, or some server side state attached to the request (via middleware). You could then have some external means of updating and rotating what your <code>getSecret</code> returns and you could then use that:
</p>

```ts
(req) => req.secret;
// or
(req) => req.session.secret;
// or some other externally rotated secret key
```

<h2>Using asynchronously</h2>

<p>csrf-csrf itself will not support promises or async, <b>however</b> there is a way around this. If your csrf token is stored externally and needs to be retrieved asynchronously, you can register an asynchronous middleware first, which exposes the token.</p>

```js
(req, res, next) => {
  getCsrfTokenAsync(req)
    .then((token) => {
      req.asyncCsrfToken = token;
      next();
    })
    .catch((error) => next(error));
};
```

<p>And in this example, your <code>getTokenFromRequest</code> would look like this:</p>

```js
(req) => req.asyncCsrfToken;
```

<h2 id="support"> Support</h2>

<ul>
  <li>
    Join the <a href="https://discord.gg/JddkbuSnUU">Discord</a> and ask for help in the <code>psifi-support</code> channel.
  </li>
  <li>
    Pledge your support through the <a href="">Patreon</a>
  </li>
</ul>

<a href="https://www.buymeacoffee.com/psibean" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
