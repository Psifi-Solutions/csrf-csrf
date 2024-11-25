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
  <a href="#utilities">Utilities</a> •
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
    Do follow the <a href="#configuration">recommendations when configuring</a> csrf-csrf.
  </li>
  <li>
    Do join the Discord server and ask questions in the <code>psifi-support</code> channel if you need help.
  </li>
  <li>
    Do follow <code>fastify/csrf-protection</code> <a href="https://github.com/fastify/csrf-protection#securing-the-secret">recommendations for secret security</a>.
  </li>
  <li>
    Do keep <code>secure</code> as true in production.
  </li>
  <li>
    Do make sure you do not compromise your security by not following best practices.
  </li>
  <li>
    <b>Do not</b> use the same secret for csrf-csrf and cookie-parser.
  </li>
  <li>
    <b>Do not</b> use the cookie value within <code>getTokenFromRequest</code>>.
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
  You will need to be using <a href="https://github.com/expressjs/cookie-parser">cookie-parser</a> and the middleware should be registered before Double CSRF. In case you want to use signed CSRF cookies, you <b>will need to</b> provide cookie-parser with a unique secret for cookie signing. This utility will set a cookie containing both the csrf token and a hash of the csrf token and provide the non-hashed csrf token so you can include it within your response.
</p>
<p>If you're using TypeScript, requires TypeScript >= 3.8</p>

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
  generateToken, // Use this in your routes to provide a CSRF hash + token cookie and token.
  validateRequest, // Also a convenience if you plan on making your own middleware.
  doubleCsrfProtection, // This is the default CSRF protection middleware.
} = doubleCsrf(doubleCsrfOptions);
```

<p>
  This will extract the default utilities, you can configure these and re-export them from your own module. You should only transmit your token to the frontend as part of a response payload, <b>do not</b> include the token in response headers or in a cookie, and <b>do not</b> transmit the token hash by any other means.
</O.>
<p>
  To create a route which generates a CSRF token and a cookie containing <code>´${token|tokenHash}´</code>:
</p>

```js
const myRoute = (req, res) => {
  const csrfToken = generateToken(req, res);
  // You could also pass the token into the context of a HTML response.
  res.json({ csrfToken });
};
const myProtectedRoute = (req, res) =>
  res.json({ unpopularOpinion: "Game of Thrones was amazing" });
```

<p>Instead of importing and using <code>generateToken</code>, you can also use <code>req.csrfToken</code> any time after the <code>doubleCsrfProtection</code> middleware has executed on your incoming request.</p>

```js
request.csrfToken(); // same as generateToken(req, res);
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

<h3>Sessions</h3>

<p>If you plan on using <code>express-session</code> then please ensure your <code>cookie-parser</code> middleware is registered <b>after</b> <code>express-session</code>, as express session parses it's own cookies and may conflict.</p>

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

<h2 id="configuration">Configuration</h2>

When creating your doubleCsrf, you have a few options available for configuration, the only required option is <code>getSecret</code>, the rest have sensible defaults (shown below).

```js
const doubleCsrfUtilities = doubleCsrf({
  getSecret: () => "Secret", // A function that optionally takes the request and returns a secret
  getSessionIdentifier: (req) => "", // A function that should return the session identifier for a given request
  cookieName: "__Host-psifi.x-csrf-token", // The name of the cookie to be used, recommend using Host prefix.
  cookieOptions: {
    sameSite = "lax",  // Recommend you make this strict if posible
    path = "/",
    secure = true,
    ...remainingCookieOptions // See cookieOptions below
  },
  size: 64, // The size of the generated tokens in bits
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
  getTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request
});
```

<h3>getSecret</h3>

```ts
(request?: Request) => string | string[]
```

<p><b>Required</b></p>

<p>This should return a secret key or an array of secret keys to be used for hashing the CSRF tokens.</p>
<p>In case multiple are provided, the first one will be used for hashing. For validation, all secrets will be tried, preferring the first one in the array. Having multiple valid secrets can be useful when you need to rotate secrets, but you don't want to invalidate the previous secret (which might still be used by some users) right away.</p>
</p>

<h3>getSessionIdentifier</h3>

```ts
(req: Request) => string;
```

<p>
  <b>Optional</b><br />
  <b>Default:</b> <code>() => ""</code><br />
</p>

<p>A function that takes in the request and returns the unique session identifier for that request. For example:</p>

```ts
(req: Request) => req.session.id;
```

<p>This will ensure that CSRF tokens are signed with the unique identifier included, this means tokens will only be valid for the session that they were requested by and generated for.</p>

<h3>cookieName</h3>

```ts
string;
```

<p>
  <b>Optional</b><br />
  <b>Default:</b> <code>"__Host-psifi.x-csrf-token"</code><br />
</p>

<p><b>Optional:</b> The name of the httpOnly cookie that will be used to track CSRF protection. If you change this it is recommend that you continue to use the <code>__Host-</code> or <code>__Secure-</code> <a target="_blank" href="developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie">security prefix</a>.</p>

<p><b>Change for development</b></p>
f
<p>The security prefix requires the secure flag to be true and requires requests to be received via HTTPS, unless you have your local instance running via HTTPS, you will need to change this value in your development environment.</p>

<h3>cookieOptions</h3>

```ts
{
  sameSite?: string;
  path?: string;
  secure?: boolean
  ...remainingCookieOptions // See below.
}
```

<p>
  <b>Optional<br />
  <b>Default:</b>
</p>

```ts
{
  sameSite: "lax",
  path: "/",
  secure: true
}
```

<p>The options provided to the cookie, see <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie">cookie attributes</a>. The remaining options are all undefined by default and consist of:</p>

```ts
  maxAge?: number | undefined;
  signed?: boolean | undefined;
  expires?: Date | undefined;
  domain?: string | undefined;
  encode?: (val: string) => string
```

<p><b>Change for development</b></p>

<p>For development you will need to set <code>secure</code> to false unless you're running HTTPS locally. Ensure secure is true in your live environment by using environment variables.</b></p>

<h3>delimiter</h3>

```ts
string;
```

<p>
  <b>Optional<br />
  Default: <code>"|"</code></b>
</p>

<p>The delimiter is used when concatenating the plain CSRF token with the hash, constructing the value for the cookie. It is also used when splitting the cookie value. This is how a token can be reused when there is no state. Note that the plain token value within the cookie is only intended to be used for token re-use, it is not used as the source for token validation.</p>

<h3>getTokenFromRequest</h3>

```ts
(req: Request) => string | null | undefined;
```

<p>
  <b>Optional<br />
  Default:</b>
</p>

```ts
(req: Request) => req.headers["x-csrf-token"];
```

<p>This function should return the token sent by the frontend, either in the request body/payload, or from the `x-csrf-token` header. <b>Do NOT</b> return the value from the cookie in this function, this would be the same as having no csrf protection at all. The doubleCsrfProtection middleware will validate the value returned by this function against the value in the cookie.</p>

<h3>ignoredMethods</h3>

```ts
Array<RequestMethod>;
```

<p>
<b>Optional<br />
Default:</b> <code>["GET", "HEAD", "OPTIONS"]</code>
</p>

<p>An array of request types that the doubleCsrfProtection middleware will ignore, requests made matching these request methods will not be protected. It is recommended you leave this as the default.</p>

<h3>size</h3>

```ts
number;
```

<p>
  <b>Optional<br />
  Default:</b> <code>64</code>
</p>

<p>The size in bytes of the tokens that will be generated, if you plan on re-generating tokens consider dropping this to 32.</p>

<h3 id="configuration-error-config">errorConfig</h3>

```ts
statusCode?: number;
message?: string;
code?: string | undefined;
```

<p>
  <b>Optional<br />
  Default:</b>
</p>

```ts
{
  statusCode: 403,
  message: "invalid csrf token",
  code: "EBADCSRFTOKEN"
}
```

Used to customise the error response <code>statusCode</code>, the contained error <code>message</code>, and it's <code>code</code>, the error is constructed via <code>createHttpError</code>. The default values match that of <code>csurf</code> for convenience.

<h2 id="utilities">Utilities</h2>

<p>Below is the documentation for what doubleCsrf returns.</p>

<h3>doubleCsrfProtection</h3>

```ts
(request: Request, response: Response, next: NextFunction) => void
```

<p>The middleware used to actually protect your routes, see the getting started examples above, or the examples included in the repository.</p>

<h3>generateToken</h3>

```ts
(
  request: Request,
  response: Response,
  overwrite?: boolean, // Set to true to force a new token to be generated
  validateOnReuse?: boolean, // Set to false to generate a new token if token re-use is invalid
) => string;
```

<p>By default if a csrf-csrf cookie already exists on an incoming request, generateToken will not overwrite it, it will simply return the existing token so long as the token is valid. If you wish to force a token generation, you can use the third parameter:</p>

```ts
generateToken(req, res, true); // This will force a new token to be generated, and a new cookie to be set, even if one already exists
```

<p>If the 'overwrite' parameter is set to false (default), the existing token will be re-used and returned. However, the cookie value will also be validated. If the validation fails an error will be thrown. If you don't want an error to be thrown, you can set the 'validateOnReuse' (by default, true) to false. In this case instead of throwing an error, a new token will be generated and returned.
</p>

```ts
generateToken(req, res, true); // As overwrite is true, an error will never be thrown.
generateToken(req, res, false); // As validateOnReuse is true (default), an error will be thrown if the cookie is invalid.
generateToken(req, res, false, false); // As validateOnReuse is false, an error will never be thrown, even if the cookie is invalid. Instead, a new cookie will be generated if it is found to be invalid.
```

<p>Instead of importing and using generateToken, you can also use req.csrfToken any time after the doubleCsrfProtection middleware has executed on your incoming request.</p>

```ts
req.csrfToken(); // same as generateToken(req, res) and generateToken(req, res, false);
req.csrfToken(true); // same as generateToken(req, res, true);
req.csrfToken(false, false); // same as generateToken(req, res, false, false);
```

<p>The <code>generateToken</code> function serves the purpose of establishing a CSRF (Cross-Site Request Forgery) protection mechanism by generating a token and an associated cookie. This function also provides the option to utilize a third parameter called <code>overwrite</code>, and a fourth parameter called <code>validateOnReuse</code>. By default, <code>overwrite</code> is set to <em>false</em>, and <code>validateOnReuse</code> is set to <em>true</em>.</p>
<p>It returns a CSRF token and attaches a cookie to the response object. The cookie content is <code>`${token}|${tokenHash}`</code>.</p>
<p>You should only transmit your token to the frontend as part of a response payload, do not include the token in response headers or in a cookie, and <b>do not</b> transmit the token hash by any other means.</p>
<p>When <code>overwrite</code> is set to <em>false</em>, the function behaves in a way that preserves the existing CSRF cookie and its corresponding token and hash. In other words, if a valid CSRF cookie is already present in the incoming request, the function will reuse this cookie along with its associated token.</p>
<p>On the other hand, if <code>overwrite</code> is set to <em>true</em>, the function will generate a new token and cookie each time it is invoked. This behavior can potentially lead to certain complications, particularly when multiple tabs are being used to interact with your web application. In such scenarios, the creation of new cookies with every call to the function can disrupt the proper functioning of your web app across different tabs, as the changes might not be synchronized effectively (you would need to write your own synchronization logic).</p>
<p>If overwrite is set to <em>false</em>, the function will also validate the existing cookie information. If the information is found to be invalid (for instance, if the secret has been changed from the time the cookie was generated), an error will be thrown. If you don't want an error to be thrown, you can set the <code>validateOnReuse</code> (by default, <em>true</em>) to <em>false</em>. If it is <em>false</em>, instead of throwing an error, a new cookie will be generated.</p>

<h3>invalidCsrfTokenError</h3>

<p>This is the error instance that gets passed as an error to the <code>next</code> call, by default this will be handled by the <a target="_blank" href="https://expressjs.com/en/guide/error-handling.html">default error handler</a>. This error is customizable via the <a href="#configuration-error-config">errorConfig</a>.</p>

<h3>validateToken</h3>

```ts
(req: Request) => boolean;
```

<p>This function is used by the doubleCsrfProtection middleware to determine whether an incoming request has a valid CSRF token. You can use this to make your own custom middleware (not recommended).</p>

<h2 id="support">Support</h2>

<ul>
  <li>
    Join the <a href="https://discord.gg/JddkbuSnUU">Discord</a> and ask for help in the <code>psifi-support</code> channel.
  </li>
  <li>
    Pledge your support through the <a href="">Patreon</a>
  </li>
</ul>

<a href="https://www.buymeacoffee.com/psibean" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
