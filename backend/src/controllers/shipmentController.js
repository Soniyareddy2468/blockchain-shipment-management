const pool = require("../config/database");
const generateShipmentCode = require("../utils/shipmentCode");
const { v4: uuidv4 } = require("uuid");

async function createShipment(req, res, next) {
  const client = await pool.connect();
  try {
    const { senderName, receiverName, productName, source, destination, transportMode, expectedDelivery } = req.body;
    if (!senderName || !receiverName || !productName || !source || !destination || !transportMode || !expectedDelivery) {
      return res.status(400).json({ success:false, message:"All shipment fields are required." });
    }
    const shipmentCode = generateShipmentCode();
    await client.query("BEGIN");
    const shipmentResult = await client.query(
      `INSERT INTO shipments (id, shipment_code, sender_name, receiver_name, product_name, source, destination, transport_mode, expected_delivery, current_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuidv4(), shipmentCode, senderName, receiverName, productName, source, destination, transportMode, expectedDelivery, "CREATED"]
    );
    const shipment = shipmentResult.rows[0];
    await client.query(
      `INSERT INTO shipment_events (id, shipment_id, status, location, description)
       VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), shipment.id, "CREATED", source, "Shipment created successfully."]
    );
    await client.query("COMMIT");
    res.status(201).json({ success:true, message:"Shipment created successfully.", shipment });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally { client.release(); }
}

async function getAllShipments(req, res, next) {
  try {
    const result = await pool.query("SELECT * FROM shipments ORDER BY created_at DESC");
    res.json({ success:true, count:result.rows.length, shipments:result.rows });
  } catch (error) { next(error); }
}

async function getShipment(req, res, next) {
  try {
    const { id } = req.params;
    const shipmentResult = await pool.query("SELECT * FROM shipments WHERE shipment_code = $1", [id]);
    if (!shipmentResult.rows.length) return res.status(404).json({ success:false, message:"Shipment not found." });
    const shipment = shipmentResult.rows[0];
    const eventsResult = await pool.query("SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY created_at ASC", [shipment.id]);
    res.json({ success:true, shipment, events:eventsResult.rows });
  } catch (error) { next(error); }
}

async function getShipmentEvents(req, res, next) {
  try {
    const { id } = req.params;
    const shipmentResult = await pool.query("SELECT id FROM shipments WHERE shipment_code = $1", [id]);
    if (!shipmentResult.rows.length) return res.status(404).json({ success:false, message:"Shipment not found." });
    const result = await pool.query("SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY created_at ASC", [shipmentResult.rows[0].id]);
    res.json({ success:true, events:result.rows });
  } catch (error) { next(error); }
}

async function updateShipmentStatus(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, location, description } = req.body;
    const allowedStatuses = ["CREATED","PICKED_UP","IN_TRANSIT","ARRIVED_AT_HUB","OUT_FOR_DELIVERY","DELIVERED"];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ success:false, message:"Invalid shipment status." });
    await client.query("BEGIN");
    const shipmentResult = await client.query("SELECT * FROM shipments WHERE shipment_code = $1 FOR UPDATE", [id]);
    if (!shipmentResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success:false, message:"Shipment not found." });
    }
    const shipment = shipmentResult.rows[0];
    const updated = await client.query(
      "UPDATE shipments SET current_status=$1, updated_at=CURRENT_TIMESTAMP WHERE shipment_code=$2 RETURNING *",
      [status, id]
    );
    await client.query(
      `INSERT INTO shipment_events (id, shipment_id, status, location, description)
       VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), shipment.id, status, location || null, description || `Shipment status changed to ${status}.`]
    );
    await client.query("COMMIT");
    res.json({ success:true, message:"Shipment status updated.", shipment:updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally { client.release(); }
}

module.exports = { createShipment, getAllShipments, getShipment, getShipmentEvents, updateShipmentStatus };
