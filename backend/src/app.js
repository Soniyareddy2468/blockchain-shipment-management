const express = require("express");
const cors = require("cors");
const shipmentRoutes = require("./routes/shipmentRoutes");
const healthRoutes = require("./routes/healthRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ service: "ShipChain API", version: "1.0.0", status: "running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/shipments", shipmentRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found." });
});

app.use(errorHandler);

module.exports = app;
