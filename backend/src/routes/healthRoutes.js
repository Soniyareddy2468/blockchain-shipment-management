const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    service: "ShipChain Backend",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
