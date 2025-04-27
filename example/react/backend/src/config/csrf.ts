import { doubleCsrf } from "csrf-csrf";
import { EXAMPLE_CSRF_SECRET, IS_PRODUCTION } from "./constants.js";

/*
 * This configuration is for the React SPA.
 * It is assumed the React SPA is going to be hosted cross-site from the backend API.
 * If the React SPA was not being hosted cross-site, or was being served directly by the express
 * app (via static files), then we would want to leave the cookie as strict and we would want to
 * ensure the cookieName has a secure prefix in production.
 *
 * Please note that with the default options secure is set to true in this configuration
 */
export const { doubleCsrfProtection, invalidCsrfTokenError, generateCsrfToken } = doubleCsrf({
  getSecret: () => EXAMPLE_CSRF_SECRET,
  getSessionIdentifier: (req) => {
    // If you were using a JWT as a httpOnly cookie, you would return that here instead
    return req.session.id;
  },
  cookieOptions: { sameSite: "lax" },
  // You always want to prefer a __Host- or __Secure- prefix in production
  cookieName: IS_PRODUCTION ? "__Host-xsrf-token" : "xsrf-token",
});
