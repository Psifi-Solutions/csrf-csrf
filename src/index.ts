import { createHmac, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import createHttpError from "http-errors";

import type {
  CsrfLoggerArgs,
  CsrfRequestMethod,
  CsrfRequestValidator,
  CsrfTokenGenerator,
  CsrfTokenValidator,
  DoubleCsrfConfigOptions,
  DoubleCsrfProtection,
  DoubleCsrfUtilities,
  GenerateCsrfTokenConfig,
  GenerateCsrfTokenOptions,
} from "./types";
export { CSRF_LOG_EVENTS } from "./constants";
import { CSRF_LOG_EVENTS } from "./constants";

export function doubleCsrf({
  getSecret,
  getSessionIdentifier,
  cookieName = "__Host-psifi.x-csrf-token",
  cookieOptions: { sameSite = "strict", path = "/", secure = true, httpOnly = true, ...remainingCookieOptions } = {},
  messageDelimiter = "!",
  csrfTokenDelimiter = ".",
  size = 32,
  hmacAlgorithm = "sha256",
  ignoredMethods = ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest = (req) => req.headers["x-csrf-token"],
  errorConfig: { statusCode = 403, message = "invalid csrf token", code = "EBADCSRFTOKEN" } = {},
  skipCsrfProtection,
  logger,
}: DoubleCsrfConfigOptions): DoubleCsrfUtilities {
  const ignoredMethodsSet = new Set(ignoredMethods);
  const defaultCookieOptions = {
    sameSite,
    path,
    secure,
    httpOnly,
    ...remainingCookieOptions,
  };

  const requiresCsrfProtection = (req: Request) => {
    const shouldSkip = typeof skipCsrfProtection === "function" && skipCsrfProtection(req);
    // Explicitly check the return type is boolean so we don't accidentally skip protection for other truthy values
    return !(ignoredMethodsSet.has(req.method as CsrfRequestMethod) || (typeof shouldSkip === "boolean" && shouldSkip));
  };

  const invalidCsrfTokenError = createHttpError(statusCode, message, {
    code: code,
  });

  const internalLogger = (logArgs: CsrfLoggerArgs) => {
    if (logger) {
      logger(logArgs);
    }
  };

  const constructMessage = (req: Request, randomValue: string) => {
    const uniqueIdentifier = getSessionIdentifier(req);
    const messageValues = [uniqueIdentifier.length, uniqueIdentifier, randomValue.length, randomValue];
    return messageValues.join(messageDelimiter);
  };

  const getPossibleSecrets = (req: Request) => {
    const getSecretResult = getSecret(req);
    return Array.isArray(getSecretResult) ? getSecretResult : [getSecretResult];
  };

  const generateHmac = (secret: string, message: string) => {
    return createHmac(hmacAlgorithm, secret).update(message).digest("hex");
  };

  const generateCsrfTokenInternal = (
    req: Request,
    { overwrite, validateOnReuse }: Omit<GenerateCsrfTokenConfig, "cookieOptions">,
  ) => {
    const possibleSecrets = getPossibleSecrets(req);
    // If cookie is not present, this is a new user (no existing csrfToken)
    // If ovewrite is true, always generate a new token.
    // If overwrite is false and there is no existing token, generate a new token.
    // If overwrite is false and there is an existin token then validate the token and hash pair
    // the existing cookie and reuse it if it is valid. If it isn't valid, then either throw or
    // generate a new token based on validateOnReuse.
    if (cookieName in req.cookies && !overwrite) {
      if (validateCsrfToken(req, possibleSecrets)) {
        // If the token is valid, reuse it
        return { csrfToken: getCsrfTokenFromCookie(req), generatedNewToken: false };
      }

      if (validateOnReuse) {
        internalLogger({ logType: CSRF_LOG_EVENTS.CSRF_TOKEN_INVALID_REUSE, request: req, overwrite, validateOnReuse });
        // If the pair is invalid, but we want to validate on generation, throw an error
        // only if the option is set
        throw invalidCsrfTokenError;
      }
    }
    // otherwise, generate a completely new token
    // the 'newest' or preferred secret is the first one in the array
    const secret = possibleSecrets[0];
    const randomValue = randomBytes(size).toString("hex");
    const message = constructMessage(req, randomValue);
    const hmac = generateHmac(secret, message);
    const csrfToken = `${hmac}${csrfTokenDelimiter}${randomValue}`;

    return { csrfToken, generatedNewToken: true };
  };

  // Generates a token, sets the cookie on the response and returns the token.
  // This should be used in routes or middleware to provide users with a token.
  // The value returned from this should ONLY be sent to the client via a response payload.
  // Do NOT send the csrfToken as a cookie, embed it in your HTML response, or as JSON.
  const generateCsrfToken: CsrfTokenGenerator = (
    req: Request,
    res: Response,
    { cookieOptions = defaultCookieOptions, overwrite = false, validateOnReuse = false } = {},
  ) => {
    const parsedCookieOptions = {
      ...defaultCookieOptions,
      ...cookieOptions,
    };
    const { csrfToken, generatedNewToken } = generateCsrfTokenInternal(req, {
      overwrite,
      validateOnReuse,
    });
    res.cookie(cookieName, csrfToken, parsedCookieOptions);
    internalLogger({
      logType: CSRF_LOG_EVENTS.CSRF_TOKEN_GENERATED,
      cookieOptions,
      generatedNewToken,
      request: req,
      overwrite,
      validateOnReuse,
    });
    return csrfToken;
  };

  const getCsrfTokenFromCookie = (req: Request) => req.cookies[cookieName] as string;

  // given an array of secrets, checks whether at least one of the secrets constructs a matching hmac
  const validateCsrfToken: CsrfTokenValidator = (req, possibleSecrets) => {
    const csrfTokenFromCookie = getCsrfTokenFromCookie(req);
    const csrfTokenFromRequest = getCsrfTokenFromRequest(req);
    const isCsrfTokenFromCookieAString = typeof csrfTokenFromCookie === "string";
    const isCsrfTokenFromRequestAString = typeof csrfTokenFromRequest === "string";

    if (!(isCsrfTokenFromCookieAString && isCsrfTokenFromRequestAString)) {
      internalLogger({
        logType: CSRF_LOG_EVENTS.CSRF_TOKEN_MISSING,
        request: req,
        isCsrfTokenFromCookieAString,
        isCsrfTokenFromRequestAString,
      });
      return false;
    }

    const isCsrfTokenFromCookieEmpty = csrfTokenFromCookie === "";
    const isCsrfTokenFromRequestEmpty = csrfTokenFromRequest === "";
    const isCsrfTokenEqual = csrfTokenFromCookie === csrfTokenFromRequest;

    if (isCsrfTokenFromCookieEmpty || isCsrfTokenFromRequestEmpty || !isCsrfTokenEqual) {
      internalLogger({
        logType: CSRF_LOG_EVENTS.REQUEST_CONTENT_INVALID,
        request: req,
        isCsrfTokenFromCookieEmpty,
        isCsrfTokenFromRequestEmpty,
        isCsrfTokenEqual,
      });
      return false;
    }

    const [receivedHmac, randomValue] = csrfTokenFromCookie.split(csrfTokenDelimiter);

    const isReceivedHmacAString = typeof receivedHmac === "string";
    const isRandomValueAString = typeof randomValue === "string";
    const isRandomValueEmpty = randomValue === "";

    if (!(isReceivedHmacAString && isRandomValueAString) || isRandomValueEmpty) {
      internalLogger({
        logType: CSRF_LOG_EVENTS.CSRF_TOKEN_CONTENT_INVALID,
        request: req,
        isReceivedHmacAString,
        isRandomValueAString,
        isRandomValueEmpty,
      });
      return false;
    }

    // The reason it's safe for us to only validate the hmac and random value from the cookie here
    // is because we've already checked above whether the token in the cookie and the token provided
    // by the request are the same.
    const message = constructMessage(req, randomValue);
    for (const secret of possibleSecrets) {
      const hmacForSecret = generateHmac(secret, message);
      if (receivedHmac === hmacForSecret) return true;
    }

    internalLogger({ logType: CSRF_LOG_EVENTS.CSRF_TOKEN_INVALID, request: req });
    return false;
  };

  const validateRequest: CsrfRequestValidator = (req) => {
    const possibleSecrets = getPossibleSecrets(req);
    return validateCsrfToken(req, possibleSecrets);
  };

  const doubleCsrfProtection: DoubleCsrfProtection = (req, res, next) => {
    req.csrfToken = (options?: GenerateCsrfTokenOptions) => generateCsrfToken(req, res, options);
    if (!requiresCsrfProtection(req)) {
      next();
    } else if (validateRequest(req)) {
      next();
    } else {
      next(invalidCsrfTokenError);
    }
  };

  return {
    invalidCsrfTokenError,
    generateCsrfToken,
    validateRequest,
    doubleCsrfProtection,
  };
}
