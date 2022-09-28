/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { serialize as serializeCookie } from "cookie";
import { createHash, randomBytes } from "crypto";
import createHttpError, { type HttpError } from "http-errors";
import { sign } from "cookie-signature";

export type SameSiteType = boolean | "lax" | "strict" | "none";
export type TokenRetriever = (req: Request) => string | null | undefined;

declare module "http" {
  interface IncomingHttpHeaders {
    "x-csrf-token"?: string | undefined;
  }
}

export type CsrfSecretRetriever = (req?: Request) => string;
export type DoubleCsrfConfigOptions = Partial<DoubleCsrfConfig> & {
  getSecret: CsrfSecretRetriever;
};
export type doubleCsrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
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
  | "TRACE"
  | "PATCH";
export type CsrfIgnoredMethods = RequestMethod[];
export type CsrfRequestValidator = (req: Request) => boolean;
export type CsrfCookieSetter = (
  res: Response,
  name: string,
  value: string,
  options: CookieOptions
) => void;
export type CsrfTokenCreator = (res: Response, req: Request) => string;
export interface CsrfCookieOptions {
  httpOnly: boolean;
  sameSite: SameSiteType;
  path: string;
  secure: boolean;
}

export interface DoubleCsrfConfig {
  getSecret: CsrfSecretRetriever;
  cookieName: string;
  size: number;
  cookieOptions: CookieOptions;
  ignoredMethods: CsrfIgnoredMethods;
  getTokenFromRequest: TokenRetriever;
}

export interface DoubleCsrfUtilities {
  invalidCsrfTokenError: HttpError;
  generateToken: CsrfTokenCreator;
  validateRequest: CsrfRequestValidator;
  doubleCsrfProtection: doubleCsrfProtection;
}

export function doubleCsrf({
  getSecret,
  cookieName = "Host__psifi.x-csrf-token",
  cookieOptions: {
    httpOnly = true,
    sameSite = "lax",
    path = "/",
    secure = true,
    ...remainingCOokieOptions
  } = {},
  size = 64,
  ignoredMethods = ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest = (req) => req.headers["x-csrf-token"],
}: DoubleCsrfConfigOptions): DoubleCsrfUtilities {
  const ignoredMethodsSet = new Set(ignoredMethods);
  const cookieOptions = {
    httpOnly,
    sameSite,
    path,
    secure,
    ...remainingCOokieOptions,
  };

  const invalidCsrfTokenError = createHttpError(403, "invalid csrf token", {
    code: "EBADCSRFTOKEN",
  });

  const generateTokenAndHash = (req: Request) => {
    const csrfToken = randomBytes(size).toString("hex");
    const secret = getSecret(req);
    const csrfTokenHash = createHash("sha256")
      .update(`${csrfToken}${secret}`)
      .digest("hex");

    return { csrfToken, csrfTokenHash };
  };

  const setCookie: CsrfCookieSetter = (res, name, value, options) => {
    const data: string = serializeCookie(name, value, options);

    const previous = res.getHeader("set-cookie") || [];
    const header = Array.isArray(previous)
      ? previous.concat(data)
      : [previous, data];

    res.setHeader("set-cookie", header as string[]);
  };

  // Generates a token, sets the cookie on the response and returns the token.
  // This should be used in routes or middleware to provide users with a token.
  // The value returned from this should ONLY be sent to the client via a response payload.
  // Do NOT send the csrfToken as a cookie, embed it in your HTML response, or as JSON.
  const generateToken = remainingCOokieOptions.signed
    ? (res: Response, req: Request) => {
        const { csrfToken, csrfTokenHash } = generateTokenAndHash(req);
        const signedValue = "s:" + sign(csrfTokenHash, req.secret as string);
        setCookie(res, cookieName, signedValue, cookieOptions);
        return csrfToken;
      }
    : (res: Response, req: Request) => {
        const { csrfToken, csrfTokenHash } = generateTokenAndHash(req);
        setCookie(res, cookieName, csrfTokenHash, cookieOptions);
        return csrfToken;
      };

  const getTokenHashFromRequest = remainingCOokieOptions.signed
    ? (req: Request) => req.signedCookies[cookieName] as string
    : (req: Request) => req.cookies[cookieName] as string;

  const validateRequest: CsrfRequestValidator = (req) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const csrfTokenHash = getTokenHashFromRequest(req);

    // This is the csrfTokenHash previously set on the response cookie via generateToken
    if (typeof csrfTokenHash !== "string") return false;

    // csrf token from the request
    const csrfTokenFromRequest = getTokenFromRequest(req) as string;

    // Hash the token with the provided secret and it should match the previous hash from the cookie
    const expectedCsrfTokenHash = createHash("sha256")
      .update(`${csrfTokenFromRequest}${getSecret(req)}`)
      .digest("hex");

    return csrfTokenHash === expectedCsrfTokenHash;
  };

  const doubleCsrfProtection: doubleCsrfProtection = (req, res, next) => {
    if (ignoredMethodsSet.has(req.method as RequestMethod)) {
      next();
    } else if (validateRequest(req)) {
      next();
    } else {
      next(invalidCsrfTokenError);
    }
  };

  return {
    invalidCsrfTokenError,
    generateToken,
    validateRequest,
    doubleCsrfProtection,
  };
}
