const crypto = require("crypto");

function requireHubApiKey(req, res, next) {
  const configuredKey = process.env.HUB_API_KEY;
  const authorization = req.get("authorization") || "";
  const suppliedKey = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!configuredKey || !suppliedKey) {
    return res.status(configuredKey ? 401 : 503).json({
      success: false,
      message: configuredKey
        ? "Integration authentication required."
        : "Integration API is not configured.",
    });
  }

  const expected = crypto.createHash("sha256").update(configuredKey).digest();
  const actual = crypto.createHash("sha256").update(suppliedKey).digest();

  if (!crypto.timingSafeEqual(expected, actual)) {
    return res.status(401).json({
      success: false,
      message: "Invalid integration credentials.",
    });
  }

  return next();
}

module.exports = { requireHubApiKey };