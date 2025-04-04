import type { CookieOptions, NextFunction, Request, Response } from "express";
import type { HttpError } from "http-errors";

export type SameSiteType = boolean | "lax" | "strict" | "none";
export type TokenRetriever = (req: Request) => string | null | undefined;
export type CsrfTokenCookieOptions = Omit<CookieOptions, "signed">;
declare module "http" {
  interface IncomingHttpHeaders {
    "x-csrf-token"?: string | undefined;
  }
}

declare module "express-serve-static-core" {
  export interface Request {
    csrfToken?: (options?: GenerateCsrfTokenOptions) => ReturnType<CsrfTokenGenerator>;
  }
}

export type CsrfSecretRetriever = (req?: Request) => string | Array<string>;
export type DoubleCsrfConfigOptions = Partial<DoubleCsrfConfig> & {
  getSecret: CsrfSecretRetriever;
  getSessionIdentifier: (req: Request) => string;
};
export type doubleCsrfProtection = (req: Request, res: Response, next: NextFunction) => void;
export type RequestMethod = "GET" | "HEAD" | "PATCH" | "PUT" | "POST" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE";
export type CsrfIgnoredMethods = Array<RequestMethod>;
export type CsrfRequestValidator = (req: Request) => boolean;
export type CsrfTokenValidator = (req: Request, possibleSecrets: Array<string>) => boolean;
export type CsrfCookieSetter = (res: Response, name: string, value: string, options: CookieOptions) => void;
export type CsrfTokenGenerator = (req: Request, res: Response, options?: GenerateCsrfTokenOptions) => string;
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
export interface DoubleCsrfConfig {
  /**
   * A function that returns a secret or an array of secrets.
   * The first secret should be the newest/preferred secret.
   * You do not need to use the request object, but it is available if you need it.
   * @param req The request object
   * @returns a secret or an array of secrets
   * @example
   * ```js
   * // with a single secret
   * const getSecret = (req) => {
   *    return req.secret;
   * }
   * // with multiple secrets
   * const getSecret = (req) => {
   *   return ["preferred_secret" "another_secret"];
   * }
   * ```
   */
  getSecret: CsrfSecretRetriever;

  /**
   * A function which takes in the request and returns the unique session identifier for that request.
   * The session identifier will be used when generating a token, this means a CSRF token can only
   * be used by the session for which it was generated.
   * Can also return a JWT if you're using that as your session identifier.
   *
   * @param req The request object
   * @returns The unique session identifier for the incoming request
   * @example
   * ```js
   * const getSessionIdentifier = (req) => req.session.id;
   * ```
   */
  getSessionIdentifier: (req: Request) => string;

  /**
   * The name of the HTTPOnly cookie that will be set on the response.
   * @default "__Host-psifi.x-csrf-token"
   */
  cookieName: string;

  /**
   * The options for HTTPOnly cookie that will be set on the response.
   * @default { sameSite: "lax", path: "/", secure: true }
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
   * Used to separate the plain token and the token hash in the cookie value.
   */
  delimiter: string;

  /**
   * The methods that will be ignored by the middleware.
   * @default ["GET", "HEAD", "OPTIONS"]
   */
  ignoredMethods: CsrfIgnoredMethods;

  /**
   * A function that should retrieve the csrf token from the request.
   * Common ways to retrieve the token are from the request body or request headers.
   * @param req The request object
   * @returns the csrf token
   * @default (req) => req.headers["x-csrf-token"]
   * @example
   * ```js
   * const getCsrfTokenFromRequest = (req) => {
   *  return req.headers["x-custom-csrf-token-header"];
   * }
   * ```
   */
  getCsrfTokenFromRequest: TokenRetriever;

  /**
   * Configuration for the error that is thrown any time XSRF token validation fails.
   * @default { statusCode: 403, message: "invalid csrf token", code: "EBADCSRFTOKEN" }
   */
  errorConfig: CsrfErrorConfigOptions;
}

export interface DoubleCsrfUtilities {
  /**
   * The error that will be thrown if a request is invalid.
   */
  invalidCsrfTokenError: HttpError;

  /**
   * Generates a token, sets an HTTPOnly cookie with the token and hash pair on the response object, and returns the token.
   * @param req The request object
   * @param res The response object
   * @param overwrite If true, always generate a new token. If false, generate a new token only if there is no existing token.
   * @param validateOnReuse If true, it will throw an error if the existing token is invalid. If false, it will generate a new token.
   * @returns the CSRF token
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
  generateCsrfToken: CsrfTokenGenerator;

  /**
   * Validates the request, assuring that the csrf token and hash pair are valid.
   * @param req
   * @returns true if the request is valid, false otherwise
   */
  validateRequest: CsrfRequestValidator;

  /**
   * Middleware that provides CSRF protection.
   * This should be used in routes or middleware to validate the request.
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
  doubleCsrfProtection: doubleCsrfProtection;
}
