import expressCors from "cors";
import { EXAMPLE_ALLOWED_ORIGINS } from "./constants.js";

console.log(`Configuring cors with origin: '${EXAMPLE_ALLOWED_ORIGINS}'`);

const cors = expressCors({
  origin: EXAMPLE_ALLOWED_ORIGINS,
  credentials: true,
});

export default cors;
