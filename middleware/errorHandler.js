import { error as logError } from "../utils/logger.js";
import { serverError, errorResponse } from "../utils/apiResponse.js";

// centralized Express error handler
export default function errorHandler(err, req, res, next) {
  // if headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // log structured error
  logError(err.message || String(err), {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // if the error has a status property, use it
  const status = err.status || err.statusCode || 500;
  const message =
    err.message || (status === 500 ? "Internal Server Error" : "Error");

  // for server errors, hide internal details
  if (status >= 500) {
    return serverError(res);
  }

  // Otherwise send the provided status and message
  return errorResponse(res, status, message);
}
