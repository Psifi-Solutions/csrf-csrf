import type { NextFunction, Request, Response } from "express";

export const ensureCounter = (req: Request, res: Response, next: NextFunction) => {
  // It's not good to "create" data in a middleware like this this should be explicitly handled in a post request
  // in this context and for the sake of this example it is okay to do in this particular way
  if (typeof req.session?.counter !== "number") {
    req.session.counter = 0;
  }
  next();
};
