# @otterjs/csrf-csrf

**Double-submit cookie pattern CSRF protection middleware for modern Node.js.**

> :pushpin: This project is a fork of [Psifi-Solutions/csrf-csrf](https://github.com/Psifi-Solutions/csrf-csrf).

[![npm][npm-img]][npm-url]
[![GitHub Workflow Status][gh-actions-img]][github-actions]
[![Coverage][cov-img]][cov-url]

<p>
  <a href="#dos-and-donts">Dos and Don'ts</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#utilities">Utilities</a> •
  <a href="#support">Support</a>
</p>

## Background

This module provides the necessary pieces required to implement CSRF protection using the
[Double Submit Cookie Pattern][owasp-csrf-dsc]. This is a stateless CSRF protection pattern, if you are using
sessions and would prefer a stateful CSRF strategy, please see [csrf-sync](https://github.com/Psifi-Solutions/csrf-sync)
for the [Synchroniser Token Pattern][owasp-csrf-st].

<h2 id="dos-and-donts">Dos and Don'ts</h2>

- **Do** read the [OWASP - Cross-Site Request Forgery Prevention Cheat Sheet][owasp-csrf].
- **Do** follow the [configuration recommendations](#configuration).
- **Do** follow `fastify/csrf-protection` [recommendations for secret security][fastify-csrf-secret-security].
- **Do** ensure your cookies are set to `secure: true` in production.
- **Do** make sure you follow best practises to avoid compromising your security.
- **Do not** use the same secret for `csrf-csrf` and `cookie-parser`.
- **Do not** transmit your CSRF token by cookies.
- **Do not** expose your CSRF tokens or has in any log output or transactions other than the CSRF exchange.
- **Do not** transmit the token hash by any means other than the cookie issued by the CSRF exchange.

<h2 id="getting-started">Getting Started</h2>

This section will guide you through using the default setup, which does sufficiently implement the
Double Submit Cookie Pattern. If you'd like to customise the configuration, see [configuration](#configuration).

You will need to be using [tinyhttp/cookie-parser](https://github.com/tinyhttp/cookie-parser) whose middleware
should be registered before `csrf-csrf`.
In case you want to use signed CSRF cookies, you **will need to** provide `cookie-parser` with a unique secret
for cookie signing.
This utility will (1) set a cookie containing both the csrf token and a hash of the csrf token, and
(2) provide the plain csrf token.
You are then responsible for including the CSRF token within your response however you choose.

```
npm install @tinyhttp/cookie-parser @otterjs/csrf-csrf
```

```js
// ESM
import { doubleCsrf } from "@otterjs/csrf-csrf";

// CommonJS
const { doubleCsrf } = require("@otterjs/csrf-csrf");
```

```js
const {
  invalidCsrfTokenError, // This is just for convenience if you plan on making your own middleware.
  generateToken, // Use this in your routes to provide a CSRF hash + token cookie and token.
  validateRequest, // Also a convenience if you plan on making your own middleware.
  doubleCsrfProtection, // This is the default CSRF protection middleware.
} = doubleCsrf(doubleCsrfOptions);
```

The `doubleCsrf` method will provide the default utilities, you can configure these and re-export them from your own module.
You should only transmit your token to the frontend as part of a response body, **do not** include the token in
response headers or in a cookie, and **do not** transmit the token hash by any other means.

To create a route which generates a CSRF token and a cookie containing `´${token|tokenHash}´`:

```js
const myCsrfExchangeRoute = (req, res) => {
  const csrfToken = generateToken(req, res);
  // You could also pass the token into the context of a HTML template response.
  return res.json({ csrfToken });
}
```

You can also put the token into the context of a templated HTML response.
If you use an HTTP verb other than `GET`, make sure you register this route before registering the
`doubleCsrfProtection` middleware so you don't block yourself from getting a token.

```js
// Make sure your session middleware is registered before these
express.use(session);
express.get("/csrf-token", myRoute);
express.use(doubleCsrfProtection);
// Any non GET routes registered after this will be considered "protected"
```

<p>
  By default, any request that are not <code>GET</code>, <code>HEAD</code>, or <code>OPTIONS</code> methods will be
  protected. You can configure this with the <code>ignoredMethods</code> option.
<p>

<p>
  You can also protect routes on a case-to-case basis:
</p>

```js
app.get("/secret-stuff", doubleCsrfProtection, myProtectedRoute);
```

Once a route is protected, you will need to ensure the hash cookie is sent along with the request and by default
you will need to include the generated token in the `x-csrf-token` header, otherwise you'll receive
a `403 - ForbiddenError: invalid csrf token`. If your cookie is not being included in your requests be sure to
check your `withCredentials` and CORS configuration.

### Sessions

If you plan on using session middleware then please ensure your cookie-parsing middleware is
registered *after* your session middleware.
Your session middleware may parse its own cookies and therefore may conflict with your cookie parsing middleware.

<h2 id="configuration">Configuration</h2>

When configuring, the only required options are `getSecret` and `getSessionIdentifier`, the rest have sensible
defaults (shown below).

```js
const doubleCsrfUtilities = doubleCsrf({
  getSecret: () => "Secret", // A function that optionally takes the request and returns a secret
  getSessionIdentifier: (req) => req.session.id, // A function that returns the session identifier for the request
  cookieOptions: {
    name: "__Host-otter.x-csrf-token", // The name of the cookie to be used, recommend using __Host prefix
    sameSite: "lax",  // Recommend you make this strict if posible
    path: "/",
    secure: true,
    ...remainingCookieOptions // See cookieOptions below
  },
  size: 64, // The size of the generated tokens in bits
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
  getTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request
});
```

### `getSecret`

```ts
type GetSecretType = (request?: Request) => string | string[]
```

<p><b>Required</b></p>

This should return a secret key or an array of secret keys to be used for hashing the CSRF tokens.

In case multiple are provided, the first one will be used for hashing.
For validation, all secrets will be tried, preferring the first one in the array.
Having multiple valid secrets can be useful when you need to rotate secrets, but you don't want to invalidate
the previous secret (which might still be used by some users) right away.

### `getSessionIdentifier`

```ts
type GetSessionIdentifierType = (request: Request) => string;
```

<p><b>Required</b></p>

This function should return the session identifier for the incoming request.
This is used as part of the CSRF token hash to ensure generated tokens can only be used by the sessions that
originally requested them.

If you are rotating your sessions, you will need to ensure a new CSRF token is generated at the same time.
This should typically be done when a session has some sort of authorization elevation (e.g. signed in, signed out, sudo).

### `cookieOptions`

```ts
type CookieOptions = SerializeOptions & {
  name?: string
  sameSite?: string;
  path?: string;
  secure?: boolean;
  signed?: boolean;
}
```

<p>
  <b>Optional</b><br/>
  <b>Default:</b>
</p>

```ts
const defaultCookieOptions = {
  name: "__Host-otter.x-csrf-token",
  sameSite: "lax",
  path: "/",
  secure: true,
  signed: false,
}
```

The options used when serializing the CSRF exchange cookie
(see [cookie attributes]("https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie")).

<details>
<summary><code>name</code></summary>

The name of the cookie that will be used to track CSRF protection.
If you change this it is recommended that you continue to use the `__Host` or `__Secure`
[security prefix]("https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie").

<hr/>
</details>

<details>
<summary><code>signed</code></summary>

Whether to sign CSRF exchange cookies.

When this option is enabled, you also need to provide your cookie parsing middleware with a unique secret for
cookie signing.

<hr/>
</details>

<details>
<summary><b>Development environments without HTTPS</b></summary>

The `__Host` security prefix requires the `secure` flag to be `true` and requires requests to be served via HTTPS.
Unless you have your local instance running via HTTPS, you will need to change the cookie `name` in your
development environment to omit the security prefix.

You will need to set `secure` to false unless you're running HTTPS locally.
Ensure `secure` is true in your live environment by using environment variables.

<hr />
</details>

The remaining options are all undefined by default and consist of (at least):

```ts
type RemainingCookieOptions = {
  maxAge?: number | undefined;
  expires?: Date | undefined;
  domain?: string | undefined;
  encode?: (val: string) => string
}
```

### `delimiter`

```ts
type DelimiterType = string;
```

<p>
  <b>Optional</b><br/>
  <b>Default:</b> <code>"|"</code>
</p>

<p>The delimiter is used when concatenating the plain CSRF token with the hash, constructing the value for the cookie. It is also used when splitting the cookie value. This is how a token can be reused when there is no state. Note that the plain token value within the cookie is only intended to be used for token re-use, it is not used as the source for token validation.</p>

### `getTokenFromRequest`

```ts
(req: Request) => string | null | undefined;
```

<p>
  <b>Optional</b><br />
  <b>Default:</b>
</p>

```ts
(req: Request) => req.headers["x-csrf-token"];
```

<p>This function should return the token sent by the frontend, the doubleCsrfProtection middleware will validate the value returned by this function against the value in the cookie.</p>

### `hmacAlgorithm`

```ts
type HmacAlgorithmType = string;
```

<p>
  <b>Optional<br />
  Default: <code>"sha256"</code></b>
</p>

<p>The algorithm passed to the <code>createHmac</code> call when generating a token.</p>

### `ignoredMethods`

```ts
type IgnoredMethodsType = Array<RequestMethod>;
```

<p>
<b>Optional</b><br />
<b>Default:</b> <code>["GET", "HEAD", "OPTIONS"]</code>
</p>

An array of request types that the `doubleCsrfProtection` middleware will ignore.
Requests made matching these request methods will not be protected.
It is recommended you leave this as the default.


### `size`

```ts
type SizeType = number;
```

<p>
  <b>Optional</b><br />
  <b>Default:</b> <code>64</code>
</p>

The size in bytes of the tokens that will be generated.
If you plan on re-generating tokens, consider reducing this to 32.

<h3 id="configuration-error-config"><code>errorConfig</code></h3>

```ts
type ErrorConfigType = {
  statusCode?: number;
  message?: string;
  code?: string | undefined;
}
```

<p>
  <b>Optional<br />
  Default:</b>
</p>

```ts
const defaultErrorConfig = {
  statusCode: 403,
  message: "invalid csrf token",
  code: "ERR_BAD_CSRF_TOKEN"
}
```

Used to customise the error response `statusCode`, the contained error `message`, and its `code`.
The error is constructed with `createHttpError`.

<h2 id="utilities">Utilities</h2>

Below is the documentation for what doubleCsrf returns.

### `doubleCsrfProtection`

```ts
type DoubleCsrfProtection = (request: Request, response: Response, next: () => void) => void
```

The middleware used to actually protect your routes (see the 'getting started' examples above
, or the examples included in the repository).

### `generateToken`

```ts
type GenerateTokenType = (
  request: Request,
  response: Response,
  options?: {
    cookieOptions?: CookieOptions, // overrides cookieOptions previously configured just for this call
    overwrite?: boolean, // Set to true to force a new token to be generated
    validateOnReuse?: boolean, // Set to false to generate a new token if token re-use is invalid
  }
) => string;
```

The function that establishes a CSRF (Cross-Site Request Forgery) protection mechanism by generating a token and issuing a cookie.

It returns a CSRF token and attaches a cookie to the response object.
The cookie content is `${token}${delimiter}${tokenHash}`.

You should only transmit your token to the frontend as part of a response payload.
Do not include the token in response headers or in a cookie, and do not transmit the token *hash* by
any means other than the CSRF exchange cookie.

By default, if a `csrf-csrf` cookie already exists on an incoming request, `generateToken` will not overwrite it.
Instead, it will return the existing token so long as the token is valid.
If you wish to force a token generation, you can set the `overwrite` option:

```ts
generateToken(req, res, { overwrite: true }); // This will force a new token to be generated, and a new cookie to be set, even if one already exists
```

If the 'overwrite' parameter is set to false (default), the existing token will be re-used and returned.
However, the cookie value will still be validated.
If the validation fails, an error will be thrown.
If you don't want an error to be thrown, you can set the `validateOnReuse` option to `false` (it is `true` by default).
In this case, a new token will be generated and returned to replace the invalid token.

```ts
generateToken(req, res, { overwrite: true }); // As overwrite is true, an error will never be thrown.
generateToken(req, res, { overwrite: false }); // As validateOnReuse is true (default), an error will be thrown if the cookie is invalid.
generateToken(req, res, { overwrite: false, validateOnReuse: false }); // As validateOnReuse is false, if the cookie is invalid a new token will be generated without any error being thrown and despite overwrite being false
```

### `invalidCsrfTokenError`

```ts
type InvalidCsrfTokenError = Error & {
  code: string
}
```

This is the error instance that will be thrown should CSRF token verification fail.
This error is customizable via [`errorConfig`](#configuration-error-config)</a>.

### `validateToken`

```ts
type ValidateToken = (req: Request) => boolean;
```

This function is used by the doubleCsrfProtection middleware to determine whether an incoming request has a valid
CSRF token. You can use this to make your own custom middleware (not recommended).

[npm-url]: https://npmjs.com/package/@otterjs/csrf-csrf
[npm-img]: https://img.shields.io/npm/dt/@otterjs/csrf-csrf?style=for-the-badge&color=blueviolet
[github-actions]: https://github.com/otterjs/csrf-csrf/actions
[gh-actions-img]: https://img.shields.io/github/actions/workflow/status/otterjs/csrf-csrf/ci.yml?style=for-the-badge&logo=github&label=&color=blueviolet
[cov-url]: https://coveralls.io/github/OtterJS/csrf-csrf
[cov-img]: https://img.shields.io/coveralls/github/OtterJS/csrf-csrf?style=for-the-badge&color=blueviolet
[owasp-csrf-dsc]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
[owasp-csrf-st]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern
[fastify-csrf-secret-security]: https://github.com/fastify/csrf-protection#securing-the-secret
