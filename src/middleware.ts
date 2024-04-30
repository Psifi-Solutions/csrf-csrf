import { createHmac, randomBytes } from "crypto";
import { CsrfTokenAndHashPairValidator, CsrfTokenCreator } from "./types";

export const generateCsrfTokenHash = (hmacAlgorithm: string, secret: string, token: string, sessionIdentifier = '') => {
  return createHmac(hmacAlgorithm, secret)
    .update(`${sessionIdentifier}${token}`)
    .digest("hex");
}

export const validateTokenAndHashPair: CsrfTokenAndHashPairValidator = (
  { hmacAlgorithm, incomingHash, incomingToken, possibleSecrets, sessionIdentifier = '' },
) => {
  if (typeof incomingToken !== "string" || typeof incomingHash !== "string")
    return false;

  for (const secret of possibleSecrets) {
    const expectedHash = generateCsrfTokenHash(hmacAlgorithm, secret, incomingToken, sessionIdentifier);
    if (incomingHash === expectedHash) return true;
  }

  return false;
};

type GenerateTokenAndHashOptions = {
  csrfCookie: string;
  delimiter: string;
  hmacAlgorithm: string;
  invalidCsrfTokenError: Error;
  overwrite: boolean;
  secret: Array<string> | string;
  sessionIdentifier: string;
  size: number;
  validateOnReuse: boolean;
};

export const generateTokenAndHash = (
  {
    csrfCookie,
    delimiter,
    hmacAlgorithm,
    invalidCsrfTokenError,
    overwrite,
    secret,
    sessionIdentifier,
    size,
    validateOnReuse,
  }: GenerateTokenAndHashOptions,
) => {
  const possibleSecrets = Array.isArray(secret)
    ? secret
    : [secret];

  // If ovewrite is true, always generate a new token.
  // If overwrite is false and there is no existing token, generate a new token.
  // If overwrite is false and there is an existin token then validate the token and hash pair
  // the existing cookie and reuse it if it is valid. If it isn't valid, then either throw or
  // generate a new token based on validateOnReuse.
  if (typeof csrfCookie === "string" && !overwrite) {
    const [csrfToken, csrfTokenHash] = csrfCookie.split(delimiter);
    if (
      validateTokenAndHashPair({
        hmacAlgorithm,
        incomingToken: csrfToken,
        incomingHash: csrfTokenHash,
        possibleSecrets,
        sessionIdentifier
      })
    ) {
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
  const resolvedSecret = possibleSecrets[0];

  const csrfTokenHash = generateCsrfTokenHash(hmacAlgorithm, resolvedSecret, csrfToken, sessionIdentifier);
    
  return { csrfToken, csrfTokenHash };
};

export const generateToken: CsrfTokenCreator = (
  req: Request,
  res: Response,
  {
    cookieName,
    delimiter,
    cookieOptions,
    overwrite = false,
    validateOnReuse = true,
  } = {},
) => {
  const { csrfToken, csrfTokenHash } = generateTokenAndHash(req, {
    overwrite,
    validateOnReuse,
  });
  const cookieContent = `${csrfToken}${delimiter}${csrfTokenHash}`;
  res.cookie(cookieName, cookieContent, {
    ...cookieOptions,
  });
  return csrfToken;
};