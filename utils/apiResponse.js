export function errorResponse(res, status, message) {
  if (!res || typeof res.status !== "function") return;
  return res.status(status).json({ error: message });
}

export function badRequest(res, message) {
  return errorResponse(res, 400, message);
}

export function notFound(res, message) {
  return errorResponse(res, 404, message);
}

export function serverError(res, message) {
  return errorResponse(res, 500, message || "Internal Server Error");
}

export function created(res, payload) {
  return res.status(201).json(payload);
}

export function ok(res, payload) {
  return res.status(200).json(payload);
}

export default {
  errorResponse,
  badRequest,
  notFound,
  serverError,
  created,
  ok,
};
