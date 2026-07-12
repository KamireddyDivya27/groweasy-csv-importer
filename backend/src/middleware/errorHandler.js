const multer = require("multer");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error("[error]", err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large. Max size is 5MB." });
    }
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  const message =
    status === 500 ? "Internal server error. Please try again." : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
