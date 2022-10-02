import 'dotenv/config';

export const PORT = process.env.PORT || 3000;
export const CSRF_SECRET = process.env.CSRF_SECRET || 'super csrf secret';
export const COOKIES_SECRET = process.env.COOKIES_SECRET || 'super cookie secret';
export const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'x-csrf-token';


