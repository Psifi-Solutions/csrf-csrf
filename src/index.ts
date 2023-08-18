/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import createHttpError from "http-errors";
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
export type CsrfTokenAndHashPairValidator = (
  token: string,
  hash: string,
  secret: string
) => boolean;
export type CsrfCookieSetter = (
  res: Response,
  name: string,
  value: string,
  options: DoubleCsrfCookieOptions
) => void;
export type CsrfTokenCreator = (
  req: Request,
  res: Response,
  ovewrite?: boolean
) => string;

export interface DoubleCsrfConfig {
  getSecret: CsrfSecretRetriever;
  cookieName: string;
  size: number;
  cookieOptions: DoubleCsrfCookieOptions;
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
  cookieName = "__Host-psifi.x-csrf-token",
  cookieOptions: {
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
    sameSite,
    path,
    secure,
    ...remainingCOokieOptions,
  };

  const invalidCsrfTokenError = createHttpError(403, "invalid csrf token", {
    code: "EBADCSRFTOKEN",
  });

  const generateTokenAndHash = (req: Request, overwrite = false) => {
    const csrfCookie = getCsrfCookieFromRequest(req);
    // if ovewrite is set, then even if there is already a csrf cookie, do not reuse it
    // if csrfCookie is present, it means that there is already a session, so we extract
    // the hash/token from it, validate it and reuse the token. This makes possible having
    // multiple tabs open at the same time
    if (typeof csrfCookie === "string" && !overwrite) {
      const [csrfToken, csrfTokenHash] = csrfCookie.split("|");
      const csrfSecret = getSecret(req);
      if (!validateTokenAndHashPair(csrfToken, csrfTokenHash, csrfSecret)) {
        // if the pair is not valid, then the cookie has been modified by a third party
        throw invalidCsrfTokenError;
      }
      return { csrfToken, csrfTokenHash };
    }
    // else, generate the token and hash from scratch
    const csrfToken = randomBytes(size).toString("hex");
    const secret = getSecret(req);
    const csrfTokenHash = createHash("sha256")
      .update(`${csrfToken}${secret}`)
      .digest("hex");

    return { csrfToken, csrfTokenHash };
  };

  // Generates a token, sets the cookie on the response and returns the token.
  // This should be used in routes or middleware to provide users with a token.
  // The value returned from this should ONLY be sent to the client via a response payload.
  // Do NOT send the csrfToken as a cookie, embed it in your HTML response, or as JSON.

  const generateToken: CsrfTokenCreator = (
    req: Request,
    res: Response,
    overwrite?: boolean
  ) => {
    const { csrfToken, csrfTokenHash } = generateTokenAndHash(req, overwrite);
    const cookieContent = `${csrfToken}|${csrfTokenHash}`;
    res.cookie(cookieName, cookieContent, { ...cookieOptions, httpOnly: true });
    return csrfToken;
  };

  const getCsrfCookieFromRequest = remainingCOokieOptions.signed
    ? (req: Request) => req.signedCookies[cookieName] as string
    : (req: Request) => req.cookies[cookieName] as string;

  // validates if a token and its hash matches, given the secret that was originally included in the hash
  const validateTokenAndHashPair: CsrfTokenAndHashPairValidator = (
    token,
    hash,
    secret
  ) => {
    if (typeof token !== "string" || typeof hash !== "string") return false;

    const expectedHash = createHash("sha256")
      .update(`${token}${secret}`)
      .digest("hex");

    return expectedHash === hash;
  };

  const validateRequest: CsrfRequestValidator = (req) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const csrfCookie = getCsrfCookieFromRequest(req);
    if (typeof csrfCookie !== "string") return false;

    // cookie has the form {token}|{hash}
    const [csrfToken, csrfTokenHash] = csrfCookie.split("|");

    // csrf token from the request
    const csrfTokenFromRequest = getTokenFromRequest(req) as string;

    const csrfSecret = getSecret(req);

    return (
      csrfToken === csrfTokenFromRequest &&
      validateTokenAndHashPair(csrfTokenFromRequest, csrfTokenHash, csrfSecret)
    );
  };

  const doubleCsrfProtection: doubleCsrfProtection = (req, res, next) => {
    req.csrfToken = (overwrite?: boolean) => generateToken(req, res, overwrite);
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
