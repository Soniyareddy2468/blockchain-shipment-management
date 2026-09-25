const express = require("express");
const {
  createShipment,
  getAllShipments,
  getShipment,
  getShipmentEvents,
  updateShipmentStatus
} = require("../controllers/shipmentController");

const router = express.Router();

router.post("/", createShipment);
router.get("/", getAllShipments);
router.get("/:id", getShipment);
router.get("/:id/events", getShipmentEvents);
router.patch("/:id/status", updateShipmentStatus);

module.exports = router;
