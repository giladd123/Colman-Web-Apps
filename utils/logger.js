function withTimestamp(level, msg, meta) {
  const ts = new Date().toISOString();
  const metaStr = meta ? JSON.stringify(meta) : "";
  return `[${level}] ${ts} - ${msg} ${metaStr}`;
}

export function info(msg, meta) {
  console.log(withTimestamp("INFO", msg, meta));
}

export function warn(msg, meta) {
  console.warn(withTimestamp("WARN", msg, meta));
}

export function error(msg, meta) {
  console.error(withTimestamp("ERROR", msg, meta));
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
