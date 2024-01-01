import type { CookieOptions, NextFunction, Request, Response } from "express";
import type { HttpError } from "http-errors";

export type SameSiteType = boolean | "lax" | "strict" | "none";
export type TokenRetriever = (req: Request) => string | null | undefined;
export type DoubleCsrfCookieOptions = Omit<CookieOptions, "httpOnly">;
declare module "http" {
  interface IncomingHttpHeaders {
    "x-csrf-token"?: string | undefined;
  }
}

declare module "express-serve-static-core" {
  export interface Request {
    csrfToken?: (overwrite?: boolean) => ReturnType<CsrfTokenCreator>;
  }
}

export type CsrfSecretRetriever = (req?: Request) => string | Array<string>;
export type DoubleCsrfConfigOptions = Partial<DoubleCsrfConfig> & {
  getSecret: CsrfSecretRetriever;
};
export type doubleCsrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
export type RequestMethod =
  | "GET"
  | "HEAD"
  | "PATCH"
  | "PUT"
  | "POST"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE";
export type CsrfIgnoredMethods = Array<RequestMethod>;
export type CsrfRequestValidator = (req: Request) => boolean;
export type CsrfTokenAndHashPairValidator = (
  token: string,
  hash: string,
  possibleSecrets: Array<string>,
) => boolean;
export type CsrfCookieSetter = (
  res: Response,
  name: string,
  value: string,
  options: DoubleCsrfCookieOptions,
) => void;
export type CsrfTokenCreator = (
  req: Request,
  res: Response,
  ovewrite?: boolean,
  validateOnReuse?: boolean,
) => string;

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
   * The name of the HTTPOnly cookie that will be set on the response.
   * @default "__Host-psifi.x-csrf-token"
   */
  cookieName: string;

  /**
   * The size in bytes of the generated token.
   * @default 64
   */
  size: number;

  /**
   * The options for HTTPOnly cookie that will be set on the response.
   * @default { sameSite: "lax", path: "/", secure: true }
   */
  cookieOptions: DoubleCsrfCookieOptions;

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
   * const getTokenFromRequest = (req) => {
   *  return req.headers["x-custom-csrf-token-header"];
   * }
   * ```
   */
  getTokenFromRequest: TokenRetriever;
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
   * @see {@link https://github.com/Psifi-Solutions/csrf-csrf#generatetoken}
   * @example
   * ```js
   * app.get("/csrf-token", (req, res) => {
   *  const token = generateToken(req, res);
   *  res.send({ token });
   *  // res will have an HTTPOnly cookie set with the form {token}|{hash}
   * });
   * ```
   */
  generateToken: CsrfTokenCreator;

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
