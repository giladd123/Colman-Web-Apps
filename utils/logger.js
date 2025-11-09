import Log from "../models/log.js";

function withTimestamp(level, msg, meta) {
  const ts = new Date().toISOString();
  const metaStr = meta ? JSON.stringify(meta) : "";
  return `[${level}] ${ts} - ${msg} ${metaStr}`;
}

function normalizeOptions(flagOrOptions) {
  if (flagOrOptions === true) return { toDB: true };
  if (flagOrOptions === false || flagOrOptions === undefined)
    return { toDB: false };
  if (typeof flagOrOptions === "object" && flagOrOptions !== null) {
    return {
      toDB: Boolean(flagOrOptions.toDB),
      userId: flagOrOptions.userId,
    };
  }
  return { toDB: false };
}

function persistLog(type, msg, meta, options) {
  const { toDB, userId } = normalizeOptions(options);
  if (!toDB) return;
  const payload = { type: type, content: msg, meta: meta };
  // prefer userId from meta, then options.userId; attach only if present
  const uid = meta?.userId ?? userId;
  if (uid) payload.userId = uid;
  Log.create(payload).catch((err) => {
    console.error(
      withTimestamp("LOGGER", "failed to persist log", {
        originalMessage: msg,
        error: err.message,
      })
    );
  });
}

export function info(msg, meta, options) {
  console.log(withTimestamp("INFO", msg, meta));
  persistLog("INFO", msg, meta, options);
}

export function warn(msg, meta, options) {
  console.warn(withTimestamp("WARNING", msg, meta));
  persistLog("WARNING", msg, meta, options);
}

export function error(msg, meta, options) {
  console.error(withTimestamp("ERROR", msg, meta));
  persistLog("ERROR", msg, meta, options);
}

// Decorator to add entry/exit logging to async route handlers
export function withLogging(fn, label) {
  const name = label || fn.name || "handler";
  return async function (req, res, next) {
    try {
      info(`enter ${name}`, { path: req.path, method: req.method });
      const result = await fn(req, res, next);
      info(`exit ${name}`, { path: req.path, method: req.method });
      return result;
    } catch (err) {
      error(`exception in ${name}: ${err.message}`, { stack: err.stack });
      return next ? next(err) : undefined;
    }
  };
}

export default { info, warn, error, withLogging };
