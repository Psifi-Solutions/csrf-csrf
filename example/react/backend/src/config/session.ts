import expressSession from "express-session";
import { EXAMPLE_SESSION_SECRET } from "./constants.js";

const session = expressSession({
  secret: EXAMPLE_SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  // maxAge is 1 hour in ms
  cookie: { secure: false, sameSite: "lax", signed: true, maxAge: 3.6e6 },
  // No session store configured is bad, this is not representative of a production config
});

export default session;
