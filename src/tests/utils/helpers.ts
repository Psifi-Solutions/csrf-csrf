import type { Request, Response } from "express";

// We do this to create a closure where we can externally switch the boolean value
export const { getSecret, switchSecret } = (() => {
  let secretSwitcher = false;

  return {
    getSecret: () =>
      secretSwitcher
        ? "secrets must be unique and must not"
        : "be used elsewhere, nor be sentences",
    switchSecret: () => (secretSwitcher = !secretSwitcher),
  };
})();

/**
 * Parses the response 'Set-Cookie' header.
 * @param res The response object
 * @returns The set-cookie header string and the cookie value containing both the csrf token and its hash
 */
export const getCookieValueFromResponse = (res: Response) => {
  const setCookie = res.getHeader("set-cookie") as string | string[];
  const setCookieString: string = Array.isArray(setCookie)
    ? setCookie[0]
    : setCookie;
  const cookieValue = setCookieString.substring(
    setCookieString.indexOf("=") + 1,
    setCookieString.indexOf(";")
  );

  return {
    setCookie: setCookieString,
    cookieValue,
  };
};

// Returns the cookie value from the request, accommodate signed and unsigned.
export const getCookieFromRequest = (
  cookieName: string,
  signed: boolean,
  req: Request
) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  signed ? req.signedCookies[cookieName] : req.cookies[cookieName];
