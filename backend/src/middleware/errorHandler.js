function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(500).json({
    success: false,
    message: "Internal server error.",
    error: process.env.NODE_ENV === "development" ? error.message : undefined
  });
}
module.exports = errorHandler;
