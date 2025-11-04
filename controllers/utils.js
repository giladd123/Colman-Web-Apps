import { error as logError, info } from "../utils/logger.js";

// catchAsync catches rejected promises and forwards the error to Express next(err) so a centralized error middleware can handle it.
export const catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      // log the error and forward to the centralized error handler
      logError(err.message || String(err), { stack: err.stack });
      return next(err);
    }
  };
};

export default catchAsync;
