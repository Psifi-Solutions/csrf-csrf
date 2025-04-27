import { RedisStore } from "connect-redis";
import expressSession from "express-session";
import { Redis } from "ioredis";
import { EXAMPLE_REDIS_HOST, EXAMPLE_REDIS_PORT, EXAMPLE_SESSION_SECRET } from "./constants.js";

console.log(`Configuring redis store on ${EXAMPLE_REDIS_HOST}:${EXAMPLE_REDIS_PORT}`);
const redis = new Redis({
  host: EXAMPLE_REDIS_HOST,
  port: EXAMPLE_REDIS_PORT,
});

// For the sake of this example, there is no username or password.
// In a real environment you would want to ensure credentials are also configured.
// If you aren't already using redis, or you're already using some other database.
// I would recommend using the respective store.
// Redis is mostly used here for convenience and to maintain state when server restarts.
const redisStore = new RedisStore({
  client: redis,
  prefix: "csrf-example-session:",
});

const session = expressSession({
  secret: EXAMPLE_SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  // maxAge is 1 hour in ms
  cookie: { secure: false, sameSite: "lax", signed: true, maxAge: 3.6e6 },
  store: redisStore,
});

export default session;
