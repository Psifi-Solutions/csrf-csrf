import { Router } from "express";
import { ensureCounter } from "./middleware.js";

const COUNTER_BASE_PATH = "/counter";

const counterRouter = Router();

counterRouter.use(ensureCounter);

counterRouter.get(COUNTER_BASE_PATH, (req, res) => {
  res.status(200).json({ counter: req.session.counter });
});

counterRouter.put(COUNTER_BASE_PATH, (req, res) => {
  const currentCounter = req.session.counter as number;
  req.session.counter = currentCounter + 1;
  res.status(200).json({ counter: req.session.counter });
});

counterRouter.delete(COUNTER_BASE_PATH, (req, res) => {
  req.session.counter = 0;
  res.status(204).json({ counter: req.session.counter });
});

export default counterRouter;
