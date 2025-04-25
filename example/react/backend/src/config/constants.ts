// Used for environment variable exports
export const EXAMPLE_API_PORT = Number(process.env.EXAMPLE_API_PORT);
// You shouldn't really do this forced casting, instead you should check if the environment
// variables are defined, and if they aren't throw an error to prevent starting up a system
// that is misconfigured. Or have some alternative but handled approach.
export const EXAMPLE_ALLOWED_ORIGINS = (process.env.EXAMPLE_ALLOWED_ORIGINS as string).split(",");
export const EXAMPLE_SESSION_SECRET = (process.env.EXAMPLE_SESSION_SECRET as string) ?? "assdafasdf";
export const EXAMPLE_CSRF_SECRET = (process.env.EXAMPLE_CSRF_SECRET as string) ?? "sdfgvsarg35g345";
export const EXAMPLE_REDIS_HOST = process.env.EXAMPLE_REDIS_HOST;
export const EXAMPLE_REDIS_PORT = Number(process.env.EXAMPLE_REDIS_PORT);
export const IS_PRODUCTION = process.env.NODE_ENV !== "development";
