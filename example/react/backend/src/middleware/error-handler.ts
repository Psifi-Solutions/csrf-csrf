import type { NextFunction, Request, Response } from "express";
import { invalidCsrfTokenError } from "../config/csrf.js";

export default (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error === invalidCsrfTokenError) {
    res.status(error.statusCode).json(error);
  } else {
    next(error);
  }
};
