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

export type CsrfSecretRetriever = (req?: Request) => string | Array<string>;
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
export type CsrfIgnoredMethods = Array<RequestMethod>;
export type CsrfRequestValidator = (req: Request) => boolean;
export type CsrfTokenAndHashPairValidator = (
  token: string,
  hash: string,
  possibleSecrets: Array<string>
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
  ovewrite?: boolean,
  validateOnReuse?: boolean
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

  const generateTokenAndHash = (
    req: Request,
    overwrite: boolean,
    validateOnReuse: boolean
  ) => {
    const getSecretResult = getSecret(req);
    const possibleSecrets = Array.isArray(getSecretResult)
      ? getSecretResult
      : [getSecretResult];

    const csrfCookie = getCsrfCookieFromRequest(req);
    // If ovewrite is true, always generate a new token.
    // If overwrite is false and there is no existing token, generate a new token.
    // If overwrite is false and there is an existin token then validate the token and hash pair
    // the existing cookie and reuse it if it is valid. If it isn't valid, then either throw or
    // generate a new token based on validateOnReuse.
    if (typeof csrfCookie === "string" && !overwrite) {
      const [csrfToken, csrfTokenHash] = csrfCookie.split("|");
      if (validateTokenAndHashPair(csrfToken, csrfTokenHash, possibleSecrets)) {
        // If the pair is valid, reuse it
        return { csrfToken, csrfTokenHash };
      } else if (validateOnReuse) {
        // If the pair is invalid, but we want to validate on generation, throw an error
        // only if the option is set
        throw invalidCsrfTokenError;
      }
    }
    // otherwise, generate a completely new token
    const csrfToken = randomBytes(size).toString("hex");
    // the 'newest' or preferred secret is the first one in the array
    const secret = possibleSecrets[0];
    const csrfTokenHash = createHash("sha256")
      .update(`${csrfToken}${secret}`)
      .digest("hex");

    return { csrfToken, csrfTokenHash };
  };

  // Generates a token, sets the cookie on the response and returns the token.
  // This should be used in routes or middleware to provide users with a token.
  // The value returned from this should ONLY be sent to the client via a response payload.
  // Do NOT send the csrfToken as a cookie, embed it in your HTML response, or as JSON.
  // TODO: next major update, breaking change, combine extra params as a singl eobject parameter
  const generateToken: CsrfTokenCreator = (
    req: Request,
    res: Response,
    overwrite = false,
    validateOnReuse = true
  ) => {
    const { csrfToken, csrfTokenHash } = generateTokenAndHash(
      req,
      overwrite,
      validateOnReuse
    );
    const cookieContent = `${csrfToken}|${csrfTokenHash}`;
    res.cookie(cookieName, cookieContent, { ...cookieOptions, httpOnly: true });
    return csrfToken;
  };

  const getCsrfCookieFromRequest = remainingCOokieOptions.signed
    ? (req: Request) => req.signedCookies[cookieName] as string
    : (req: Request) => req.cookies[cookieName] as string;

  // given a secret array, iterates over it and checks whether one of the secrets makes the token and hash pair valid
  const validateTokenAndHashPair: CsrfTokenAndHashPairValidator = (
    token,
    hash,
    possibleSecrets
  ) => {
    if (typeof token !== "string" || typeof hash !== "string") return false;

    for (const secret of possibleSecrets) {
      const expectedHash = createHash("sha256")
        .update(`${token}${secret}`)
        .digest("hex");
      if (hash === expectedHash) return true;
    }

    return false;
  };

  const validateRequest: CsrfRequestValidator = (req) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const csrfCookie = getCsrfCookieFromRequest(req);
    if (typeof csrfCookie !== "string") return false;

    // cookie has the form {token}|{hash}
    const [csrfToken, csrfTokenHash] = csrfCookie.split("|");

    // csrf token from the request
    const csrfTokenFromRequest = getTokenFromRequest(req) as string;

    const getSecretResult = getSecret(req);
    const possibleSecrets = Array.isArray(getSecretResult)
      ? getSecretResult
      : [getSecretResult];

    return (
      csrfToken === csrfTokenFromRequest &&
      validateTokenAndHashPair(
        csrfTokenFromRequest,
        csrfTokenHash,
        possibleSecrets
      )
    );
  };

  const doubleCsrfProtection: doubleCsrfProtection = (req, res, next) => {
    // TODO: next major update, breaking change, make a single object parameter
    req.csrfToken = (overwrite?: boolean, validateOnReuse?: boolean) =>
      generateToken(req, res, overwrite, validateOnReuse);
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
