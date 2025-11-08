const { apiError } = require("../utils/apiResponse");

function imdbErrorHandler(err, req, res, next) {
  if (err && err.name === "IMDB_ACCESS_ERROR") {
    return res.status(503).json(apiError("Unable to access IMDB"));
  }
  next(err);
}

module.exports = imdbErrorHandler;
