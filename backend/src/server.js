require("dotenv").config();
const app = require("./app");
const pool = require("./config/database");
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully.");
    app.listen(PORT, () => {
      console.log(`ShipChain backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
