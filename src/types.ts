import type { IncomingMessage, ServerResponse } from "node:http";
import type { HttpError } from "http-errors";

export type SameSiteType = boolean | "lax" | "strict" | "none";
export type TokenRetriever<I extends CsrfRequest> = (req: I) => string | null | undefined;
export interface CsrfRequest extends IncomingMessage {
  // biome-ignore lint/suspicious/noExplicitAny: required for supporting transient types
  cookies?: Record<string, any>;
}
export interface CsrfCookieOptions {
  maxAge?: number | undefined;
  signed?: boolean | undefined;
  expires?: Date | undefined;
  httpOnly?: boolean | undefined;
  path?: string | undefined;
  domain?: string | undefined;
  secure?: boolean | undefined;
  encode?: ((val: string) => string) | undefined;
  sameSite?: boolean | "lax" | "strict" | "none" | undefined;
}
export interface CsrfResponse extends ServerResponse {
  cookie(name: string, val: string, options: CsrfCookieOptions): this;
  // biome-ignore lint/suspicious/noExplicitAny: required for supporting transient types
  cookie(name: string, val: any, options: CsrfCookieOptions): this;
  // biome-ignore lint/suspicious/noExplicitAny: required for supporting transient types
  cookie(name: string, val: any): this;
}
// biome-ignore lint/suspicious/noExplicitAny: required for supporting transient types
export type CsrfNextFunction = ((...args: any) => void) | undefined;
export type CsrfTokenCookieOptions = Omit<CsrfCookieOptions, "signed">;
export type CsrfTokenGeneratorRequestUtil<I extends CsrfRequest, O extends CsrfResponse> = (
  options?: GenerateCsrfTokenOptions,
) => ReturnType<CsrfTokenGenerator<I, O>>;

declare module "http" {
  export interface IncomingMessage {
    csrfToken?: CsrfTokenGeneratorRequestUtil<CsrfRequest, CsrfResponse>;
  }
}

export type CsrfSecretRetriever<I extends CsrfRequest> = (req?: I) => string | Array<string>;
export type DoubleCsrfConfigOptions<I extends CsrfRequest> = Partial<DoubleCsrfConfig<I>> & {
  getSecret: CsrfSecretRetriever<I>;
  getSessionIdentifier: (req: I) => string;
};
export type DoubleCsrfProtection<I extends CsrfRequest, O extends CsrfResponse> = (
  req: I,
  res: O,
  next: CsrfNextFunction,
) => void;
export type CsrfRequestMethod = "GET" | "HEAD" | "PATCH" | "PUT" | "POST" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE";
export type CsrfIgnoredRequestMethods = Array<CsrfRequestMethod>;
export type CsrfRequestValidator<I extends CsrfRequest> = (req: I) => boolean;
export type CsrfTokenValidator<I extends CsrfRequest> = (req: I, possibleSecrets: Array<string>) => boolean;
export type CsrfCookieSetter<O extends CsrfResponse> = (
  res: O,
  name: string,
  value: string,
  options: CsrfCookieOptions,
) => void;
export type CsrfTokenGenerator<I extends CsrfRequest, O extends CsrfResponse> = (
  req: I,
  res: O,
  options?: GenerateCsrfTokenOptions,
) => string;
export type CsrfErrorConfig = {
  statusCode: number;
  message: string;
  code: string | undefined;
};
export type CsrfErrorConfigOptions = Partial<CsrfErrorConfig>;
export type GenerateCsrfTokenConfig = {
  overwrite: boolean;
  validateOnReuse: boolean;
  cookieOptions: CsrfTokenCookieOptions;
};
export type GenerateCsrfTokenOptions = Partial<GenerateCsrfTokenConfig>;
export interface DoubleCsrfConfig<I extends CsrfRequest> {
  /**
   * A function that returns a secret or an array of secrets.
   * The first secret should be the newest/preferred secret.
   * You do not need to use the request object, but it is available if you need it.
   * @param req The request object (optional)
   * @returns A secret or an array of secrets
   * @example
   * ```js
   * // with a single secret
   * const getSecret = (req) => {
   *    return req.secret;
   * }
   * // with multiple secrets
   * const getSecret = (req) => {
   *   return ["preferred_secret", "another_secret"];
   * }
   * ```
   */
  getSecret: CsrfSecretRetriever<I>;

  /**
   * A function which takes in the request and returns the unique session identifier for that request.
   * The session identifier will be used when generating a token, this means a CSRF token can only
   * be used by the session for which it was generated.
   * Should return the JWT if you're using that as your session identifier.
   *
   * @param req The request object
   * @returns The unique session identifier for the incoming request
   * @example
   * ```js
   * const getSessionIdentifier = (req) => req.session.id;
   * ```
   */
  getSessionIdentifier: (req: I) => string;

  /**
   * The name of the cookie to contain the CSRF token.
   * You should always use the __Host- or __Secure- prefix in production.
   * @default "__Host-psifi.x-csrf-token"
   */
  cookieName: string;

  /**
   * The options for HTTPOnly cookie that will be set on the response.
   * @default { sameSite: "strict", path: "/", secure: true, httpOnly: true }
   */
  cookieOptions: CsrfTokenCookieOptions;

  /**
   * Used to separate the contents of the message used for hmac generation.
   * The messageDelimiter is used to join an array of:
   * [uniqueIdentifier.length, uniqueIdentifier, randomValue.length, randomValue]
   * This should be different to the csrfTokenDelimiter.
   * @default "!"
   */
  messageDelimiter: string;
  /**
   * Used to separate the hmac and the randomValue to construct the csrfToken.
   * The csrfToken will be in the format:
   *     ${hmac}${csrfTokenDelimiter}${randomValue}
   * This should be different to the messageDelimiter.
   * @default "."
   */
  csrfTokenDelimiter: string;
  /**
   * The size in bytes of the random value used as part of the message
   * to generate the hmac.
   * @default 32
   */
  size: number;

  /**
   * The hmac algorithm to use when calling createHmac.
   * @default "sha256"
   */
  hmacAlgorithm: string;

  /**
   * The methods that will be ignored by the middleware.
   * @default ["GET", "HEAD", "OPTIONS"]
   */
  ignoredMethods: CsrfIgnoredRequestMethods;

  /**
   * A function that should retrieve the csrf token from the request.
   * Common ways to retrieve the token are from the request body or request headers.
   * @param req The request object
   * @returns The CSRF token sent by the client on the incoming request
   * @default (req) => req.headers["x-csrf-token"]
   * @example
   * ```js
   * const getCsrfTokenFromRequest = (req) => {
   *  return req.headers["x-custom-csrf-token-header"];
   * }
   * ```
   */
  getCsrfTokenFromRequest: TokenRetriever<I>;

  /**
   * Configuration for the error that is thrown any time XSRF token validation fails.
   * @default { statusCode: 403, message: "invalid csrf token", code: "EBADCSRFTOKEN" }
   */
  errorConfig: CsrfErrorConfigOptions;

  /**
   * A function that returns true or false to determine whether the request requires CSRF
   * protection. Use this with extreme caution, for example, use it to avoid CSRF protection
   * for a native app but still have it for the web app. It's crucial you know when skipping CSRF
   * protection is safe for your use case.
   * @param req The request object
   * @returns true if the request does not need csrf protection, false if it does
   * @default undefined
   * @example
   * ```js
   * const skipCsrfProtection = (req) => isNativeApp(req);
   * ```
   */
  skipCsrfProtection: (req: I) => boolean;
}

export interface DoubleCsrfUtilities<I extends CsrfRequest, O extends CsrfResponse> {
  /**
   * The error that will be thrown if a request is invalid.
   */
  invalidCsrfTokenError: HttpError;

  /**
   * Generates a token, sets a cookie with the token on the response object, and returns the token.
   * The cookie will use the cookieOptions passed in to this function will override the ones originally configured.
   * @param req The request object
   * @param res The response object
   * @param options Options for token generation
   * @param options.overwrite If true, always generate a new token. If false, generate a new token only if there is no existing token.
   * @param options.validateOnReuse If true, and overwrite is false, it will throw an error if the existing token is invalid. If false, a new token will be generated without throwing an error.
   * @param options.cookieOptions Custom cookie options that override the originally configured options
   * @returns The CSRF token generated for the request
   * @see {@link https://github.com/Psifi-Solutions/csrf-csrf#generateCsrfToken}
   * @example
   * ```js
   * app.get("/csrf-token", (req, res) => {
   *  const token = generateCsrfToken(req, res);
   *  res.send({ token });
   *  // res will have an HTTPOnly cookie set with the form {token}|{hash}
   * });
   * ```
   */
  generateCsrfToken: CsrfTokenGenerator<I, O>;

  /**
   * Validates the request, assuring that the csrf token and hash pair are valid.
   * @param req
   * @returns true if the request is valid, false otherwise
   */
  validateRequest: CsrfRequestValidator<I>;

  /**
   * Middleware that provides CSRF protection.
   * This should typically be registered as a global middleware.
   * Ensure this is registered after cookie-parser middleware.
   * @param req The request object
   * @param res The response object
   * @param next The next function
   *
   * @example
   * ```js
   * app.post("/csrf-protected-route", doubleCsrfProtection, (req, res) => {
   *  res.send({ message: "success" });
   * });
   * ```
   */
  doubleCsrfProtection: DoubleCsrfProtection<I, O>;
}
