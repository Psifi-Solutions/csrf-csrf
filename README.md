<h1 align="center">
  Double CSRF
</h1>

<h4 align="center">A utility package to help implement stateless CSRF (Cross-Site Request Forgery) protection using the Double Submit Cookie Pattern in express.</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/csrf-csrf">
    <img src="https://img.shields.io/npm/v/csrf-csrf" />
  </a>
  <a href='https://coveralls.io/github/Psifi-Solutions/csrf-csrf?branch=main'>
    <img src='https://coveralls.io/repos/github/Psifi-Solutions/csrf-csrf/badge.svg?branch=main' alt='Coverage Status' />
  </a>
  <a href="https://discord.gg/JddkbuSnUU">
    <img src="https://discordapp.com/api/guilds/643569902866923550/widget.png?style=shield">
  </a>
  <a href="https://ko-fi.com/G2G813S7A0">
    <img width="150px" src="https://ko-fi.com/img/githubbutton_sm.svg" />
  </a>
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#utilities">Utilities</a> •
  <a href="./FAQ.md">FAQ</a> •
  <a href="#support">Support</a>
</p>

<h2 id="background">Background</h2>

<p>
  This module provides the necessary pieces required to implement CSRF protection using the <a href="https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie">Double Submit Cookie Pattern</a>. This is a stateless CSRF protection pattern, if you are using sessions it is highly recommended that you use <a href="https://github.com/Psifi-Solutions/csrf-sync">csrf-sync</a> for the <a href="https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern">Synchroniser Token Pattern</a> instead.
</p>

<p>
  Since <a href="https://github.com/expressjs/csurf">csurf</a> has been deprecated I struggled to find alternative solutions that were accurately implemented and configurable, so I decided to write my own! Thanks to <a href="https://github.com/nextauthjs/next-auth">NextAuth</a> as I referenced their implementation. From experience CSRF protection libraries tend to complicate their configuration, and if misconfigured, can render the protection completely useless.
</o>

<p>
  This is why <code>csrf-csrf</code> aims to provide a simple and targeted implementation to simplify its use.
</p>


<h2 id="getting-started">Getting Started</h2>

<p><b>Version 4 is now live!</b> If you are upgrading from version 3 check the <a href="./CHANGELOG.md">changelog</a>, the <a href="./UPGRADING.md">upgrade guide</a>, and the updated configuration documentation below.</p>

<p>
  Before getting started with <code>csrf-csrf</code> you should consult the <a href="./FAQ.md">FAQ</a> and determine whether you need CSRF protection and whether <code>csrf-csrf</code> is the right choice.
</p>
<p>
  This section will guide you through using the default setup, which sufficiently implements the Double Submit Cookie Pattern. If you would like to customise the configuration, see the <a href="#configuration">configuration</a> section.
</p>
<p>
  You will need to have the <a href="https://github.com/expressjs/cookie-parser">cookie-parser</a> middleware registered before the <code>doubleCsrfProtection</code> middleware. If you are using <code>express-session</code> then it is also best to register the <code>cookie-parser</code> middleware after that.</p>
  
  <p>This utility will set a cookie containing a hmac based CSRF token, the frontend should include this CSRF token in an appropriate request header or in the body. The <code>getTokenFromRequest</code> option should strictly return the CSRF token from either a request header, or the request body. If you have cases where you need to consider both make these as explicit as possible to avoid the same vulnerability as <code>csurf</code>, do not just use fallthroughs (||, ??).
</p>
<p>If you are using TypeScript, requires TypeScript >= 3.8</p>

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
  generateCsrfToken, // Use this in your routes to provide a CSRF token.
  validateRequest, // Also a convenience if you plan on making your own middleware.
  doubleCsrfProtection, // This is the default CSRF protection middleware.
} = doubleCsrf({
  getSecret = (req) => 'return some cryptographically pseudorandom secret here',
  getSessionIdentifier = (req) => req.session.id // return the requests unique identifier
});
```

<p>
  This will extract the default utilities, you can configure these and re-export them from your own module. Primarily <code>csrf-csrf</code> was built to support Single Page Applications (SPAs), or frontends hosted cross-site to their backend, the default configuration is optimised for this usecase. If you are changing any of the configuration you should ensure you understand the impact of the change. Consult the documentation for the respective configuration option and also consider reading the <a href="./FAQ.md">FAQ</a>.
</p>  

<p>
  To create a route which generates a CSRF token and a cookie containing the CSRF token:
</p>

```js
const myRoute = (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  // You could also pass the token into the context of a HTML response.
  res.json({ csrfToken });
};
const myProtectedRoute = (req, res) =>
  res.json({ unpopularOpinion: "Game of Thrones was amazing" });
```

<p>Instead of importing and using <code>generateCsrfToken</code>, you can also use <code>req.csrfToken</code> any time after the <code>doubleCsrfProtection</code> middleware has executed on a request.</p>

```js
request.csrfToken(); // same as generateCsrfToken(req, res);
```

<p>
  You can also put the token into the context of a templated HTML response.
</p>

```js
// Make sure your session middleware is registered before these
express.use(session);
express.use(cookieParser);
express.get("/csrf-token", myRoute);
express.use(doubleCsrfProtection);
// Any non GET routes registered after this will be considered "protected"
```

<p>
  By default, any requests that are not <code>GET</code>, <code>HEAD</code>, or <code>OPTIONS</code> methods will be protected. You can configure this with the <code>ignoredMethods</code> option. Keep in mind that only requests with side effects need to be protected, it is generally bad practice to have side effects from <code>GET</code> requests.
<p>

<p>
You can also protect routes on a case-to-case basis:
</p>

```js
app.get("/secret-stuff", doubleCsrfProtection, myProtectedRoute);
```

<p>
  Once a route is protected, you will need to ensure the CSRF token cookie is sent along with the request and by default you will need to include the CSRF token in the <code>x-csrf-token</code> header, otherwise you will receive a `403 - ForbiddenError: invalid csrf token`. If your cookie is not being included in your requests be sure to check your <code>withCredentials</code>, CORs configuration, and ensure appropriate <code>sameSite</code> configuration for your use case. For additional information on figuring out the error see the <a href="./FAQ.md#dealing-with-forbiddenerror-invalid-csrf-token">"Dealing with 'ForbiddenError: invalid csrf token'"</a> section of the FAQ.
</p>

<h3>Sessions</h3>

<p>Once again, if you are using sessions, you should be using <a href="https://github.com/Psifi-Solutions/csrf-sync">csrf-sync</a> instead. Sessions have server side state by default.</p>

<p>If you do plan on using <code>express-session</code> with <code>csrf-csrf</code> then ensure your <code>cookie-parser</code> middleware is registered <b>after</b> <code>express-session</code>, as <code>express-session</code> parses its own cookies and may conflict.</p>

<h2>Using asynchronously</h2>

<p><code>csrf-csrf</code> itself will not support promises or async, <b>however</b> there is a way around this. If your CSRF token is stored externally and needs to be retrieved asynchronously, you can register an asynchronous middleware first, which exposes the token.</p>

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

<p>And in this example, your <code>getCsrfTokenFromRequest</code> would look like this:</p>

```js
(req) => req.asyncCsrfToken;
```

<h2 id="configuration">Configuration</h2>

When initialising <code>doubleCsrf</code>, you have a lot of options available for configuration, the only required options are <code>getSecret</code> and <code>getSessionIdentifier</code>, the rest have sensible defaults (shown below).

```js
const doubleCsrfUtilities = doubleCsrf({
  getSecret: () => "Secret", // A function that optionally takes the request and returns a secret
  getSessionIdentifier: (req) => req.session.id, // A function that returns the session identifier for the request
  cookieName: "__Host-psifi.x-csrf-token", // The name of the cookie to be used, recommend using Host prefix.
  cookieOptions: {
    sameSite = "strict",
    path = "/",
    secure = true,
    httpOnly = true,
    ...remainingCookieOptions // See cookieOptions below
  },
  size: 32, // The size of the random value used to construct the message used for hmac generation
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request
  skipCsrfProtection: undefined
});
```

<h3>getSecret</h3>

```ts
(request?: Request) => string | string[]
```

<p><b>Required</b></p>

<p>
This should return a secret key or an array of secret keys to be used for hmac generation. Secret keys should be cryptographically pseudorandomly generated. You should make sure you use a strong and secure secret key. See the <a href="./FAQ.md#how-to-secret">"How to secret?"</a> section of the FAQ.
</p>
<p>In case multiple are provided, the first one will be used for hashing. For validation, all secrets will be tried, preferring the first one in the array. Having multiple valid secrets can be useful when you need to rotate secrets, but you do not want to invalidate the previous secret (which might still be used by some users) right away.</p>
</p>

<h3>getSessionIdentifier</h3>

```ts
(request: Request) => string;
```

<p><b>Required</b></p>

<p>This function should return the session identifier for the incoming request. This is used as part of the <em>message</em> used to generate the hmac, it ensures that generated CSRF tokens can only be used by the sessions that originally requested them.</p>

<p>If you are rotating your sessions (which you should be), you will need to ensure a new CSRF token is generated at the same time. This should typically be done when a session has some sort of authorisation elevation (e.g. signed in, signed out, sudo).</p>

<h3>cookieName</h3>

```ts
string;
```

<p>
  <b>Optional</b><br />
  <b>Default:</b> <code>"__Host-psifi.x-csrf-token"</code><br />
</p>

<p>The name of the cookie that will be used to track the CSRF token. If you change this it is recommend that you continue to use the <code>__Host-</code> or <code>__Secure-</code> <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie">security prefix</a> for production.</p>

<p><b>Change for development</b></p>

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
  sameSite: "strict",
  path: "/",
  secure: true,
  httpOnly: true
}
```

<p>The options provided to the cookie, see <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie">cookie attributes</a>. If you plan on changing the <code>httpOnly</code> to <em>false</em>, see the <a href="./FAQ.md#does-httponly-have-to-be-true">"Does httpOnly have to be true"</a> section of the FAQ. The remaining options are all undefined by default and consist of:</p>

```ts
  maxAge?: number | undefined;
  expires?: Date | undefined;
  domain?: string | undefined;
  encode?: (val: string) => string
```

<p>Note that the <code>signed</code> cookie option is not available, it is redundant here. The CSRF tokens generated by <code>csrf-csrf</code> are already signed</p>

<h3>messageDelimiter</h3>

```ts
string;
```

<p>
  <b>Optional<br />
  Default: <code>"!"</code></b>
</p>

<p>The <code>messageDelimiter</code> is used when concatenating the message that will be used for hmac generation. This should be different to the <code>csrfTokenDelimiter</code></p>

<h3>csrfTokenDelimiter</h3>

```ts
string;
```

<p>
  <b>Optional<br />
  Default: <code>"."</code></b>
</p>

<p>The <code>csrfTokenDelimiter</code> is used to concatenate the hmac and the random value to construct the CSRF token. The random value portion is used to reconstruct the hmac during validation and helps prevent collisions.</p>

<h3>getCsrfTokenFromRequest</h3>

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

<p>This function should return the token sent by the frontend, either in the request body/payload, or from the <code>x-csrf-token</code> header. <b>Do NOT</b> return the value from the cookie in this function, this would be the same as having no csrf protection at all, see the <a href="./FAQ.md#why-is-using-the-cookie-in-gettokenfromrequest-a-bad-idea">"Why is using the cookie in getTokenFromRequest a bad idea?"</a> section of the FAQ.<p>

<h3>hmacAlgorithm</h3>

```ts
string;
```

<p>
  <b>Optional<br />
  Default: <code>"sha256"</code></b>
</p>

<p>The algorithm passed to the <code>createHmac</code> call when generating a token.</p>

<h3>ignoredMethods</h3>

```ts
Array<CsrfRequestMethod>;
```

<p>
<b>Optional<br />
Default:</b> <code>["GET", "HEAD", "OPTIONS"]</code>
</p>

<p>An array of request methods that the <code>doubleCsrfProtection</code> middleware will ignore, requests made matching these request methods will not be protected. It is recommended you leave this as the default. If you have <code>GET</code> requests with side effects and need those protected, consider route based protection and/or making use of <code>skipCsrfProtection</code> by skipping for all <code>GET</code> requests except for those that need it.</p>

<h3>size</h3>

```ts
number;
```

<p>
  <b>Optional<br />
  Default:</b> <code>32</code>
</p>

<p>The size in bytes of the random value that will be generated and used for hmac generation.</p>

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

Used to customise the error response <code>statusCode</code>, the contained error <code>message</code>, and its <code>code</code>, the error is constructed via <code>createHttpError</code>. The default values match that of <code>csurf</code> for convenience.

<h3 id="skip-csrf-protection">skipCsrfProtection</h3>

```ts
(req: Request) => boolean;
```

<p><b>Optional - Use this option with extreme caution*</b></p>

<p>Used to determine whether CSRF protection should be skipped for the given request. If this callback is provided and the request is not in the <code>ignoredMethods</code>, then the callback will be called to determine whether or not CSRF token validation should be checked. If it returns <em>true</em> the CSRF protection will be skipped, if it returns <em>false</em> then CSRF protection will be checked.<p>

<p>* It is primarily provided to avoid the need of wrapping the <code>doubleCsrfProtection</code> middleware in your own middleware, allowing you to apply a global logic as to whether or not CSRF protection should be executed based on the incoming request. You should <b>only</b> skip CSRF protection for cases you are 100% certain it is safe to do so, for example, requests you have identified as coming from a native app. You should ensure you are not introducing any vulnerabilities that would allow your web based app to circumvent the protection via CSRF attacks. This option is <b>NOT</b> a solution for CSRF errors.</p>

<h2 id="utilities">Utilities</h2>

<p>Below is the documentation for what doubleCsrf returns.</p>

<h3>doubleCsrfProtection</h3>

```ts
(request: Request, response: Response, next: NextFunction) => void
```

<p>The middleware used to actually protect your routes, see the getting started examples above, or the examples included in the repository.</p>

<h3>generateCsrfToken</h3>

```ts
(
  request: Request,
  response: Response,
  {
    cookieOptions?: CookieOptions, // allows overriding of cookieOptions
    overwrite?: boolean, // Set to true to force a new token to be generated
    validateOnReuse?: boolean, // Set to true to throw an error when overwrite is false and the current CSRF token is invalid
  } // optional
) => string;
```

<p>By default if a <code>csrf-csrf</code> cookie already exists on an incoming request, <code>generateCsrfToken</code> will not overwrite it, it will return the existing token so long as the token is valid. If you wish to force a token generation, you can use the <code>overwrite</code> option of the third parameter:</p>

```ts
generateCsrfToken(req, res, { overwrite: true }); // This will force a new token to be generated, and a new cookie to be set, even if one already exists
```

<p>If the <code>overwrite</code> parameter is set to <em>false</em> (default), the existing token will be re-used and returned. If the current / existing CSRF token is not valid, then a new token will be generated without any error being thrown. If you want the <code>generateCsrfToken</code> to throw an error instead, provide the <code>validateOnReuse: true</code> option.</p>

<p>If <code>overwrite</code> is <em>true</em> a new token will always be generated, even if the current one is invalid.</p>

```ts
generateCsrfToken(req, res, { overwrite: true }); // As overwrite is true, an error will never be thrown.
generateCsrfToken(req, res, { overwrite: false }); // As validateOnReuse is false (default), if the current CSRF token from the cookie is invalid, a new token will be generated without any error being thrown.
generateCsrfToken(req, res); // same as previous
generateCsrfToken(req, res, { overwrite: false, validateOnReuse: true }); // As validateOnReuse is true, if the CSRF token from the cookie is invalid, a new token will be generated without an error being thrown.
```

<p>Instead of importing and using <code>generateCsrfToken</code>, you can also use <code>req.csrfToken</code> any time after the <code>doubleCsrfProtection</code> middleware has executed on your incoming request.</p>

```ts
req.csrfToken(); // same as generateCsrfToken(req, res);
req.csrfToken({ overwrite: true }); // same as generateCsrfToken(req, res, { overwrite: true, validateOnReuse });
req.csrfToken({ overwrite: false, validateOnReuse: false }); // same as generateCsrfToken(req, res, { overwrite: false, validateOnReuse: false });
req.csrfToken(req, res, { overwrite: false });
req.csrfToken(req, res, { overwrite: false, validateOnReuse: false });
```

<p>The <code>generateCsrfToken</code> function serves the purpose of establishing a CSRF protection mechanism by generating a token and an associated cookie. This function also provides the option to utilise a third parameter called <code>overwrite</code>, and a fourth parameter called <code>validateOnReuse</code>. By default, <code>overwrite</code> and <code>validateOnReuse</code> are both set to <em>false</em>.</p>
<p>It returns a CSRF token and attaches a cookie to the response object. The cookie content is <code>`${hmac}${csrfTokenDelimiter}${randomValue}`</code>.</p>
<p>In some cases you should only transmit your token to the frontend as part of a response payload. Consult the <a href="./FAQ.md#do-i-need-csrf-csrf">"Do I need csrf-csrf?"</a> and <a href="./FAQ.md#does-httponly-have-to-be-true">"Does httpOnly have to be true?"</a> sections of the FAQ.</p>    
<p>When <code>overwrite</code> is set to <em>false</em>, the function behaves in a way that preserves the existing CSRF token. In other words, if a valid CSRF token is already present in the incoming request cookie, the function will reuse the existing CSRF token.</p>
<p>If <code>overwrite</code> is set to <em>true</em>, the function will generate a new token and cookie each time it is invoked. This behavior can potentially lead to certain complications, particularly when multiple tabs are being used to interact with your web application. In such scenarios, the creation of new cookies with every call to the function can disrupt the proper functioning of your web app across different tabs, as the changes might not be synchronised effectively (you would need to write your own synchronisation logic).</p>
<p>If overwrite is set to <em>false</em>, the function will also validate the existing cookie information. If the information is found to be invalid, a new token will be generated and returned. If you want an error to be thrown when validation fails during generation you can set the <code>validateOnReuse</code> (by default, <em>false</em>) to <em>true</em>. If it is <em>true</em> then an error will be thrown instead of a new token being generated.</p>

<h3>invalidCsrfTokenError</h3>

<p>This is the error instance that gets passed as an error to the <code>next</code> call, by default this will be handled by the <a target="_blank" href="https://expressjs.com/en/guide/error-handling.html">default error handler</a>. This error is customisable via the <a href="#configuration-error-config">errorConfig</a>.</p>

<h3>validateRequest</h3>

```ts
(req: Request) => boolean;
```

<p>This function is used by the <code>doubleCsrfProtection</code> middleware to determine whether an incoming request has a valid CSRF token. You can use this to make your own custom middleware (not recommended).</p>

<h2 id="support">Support</h2>

<ul>
  <li>
    Join the <a href="https://discord.gg/JddkbuSnUU">Discord</a> and ask for help in the <code>psifi-support</code> channel.
  </li>
  <li>
    Pledge your support through the <a href="https://patreon.com/Psibean">Patreon</a>
  </li>
</ul>

<a href="https://ko-fi.com/G2G813S7A0" target="_blank"><img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" border="0" alt="Buy Me a Coffee at ko-fi.com" /></a>
