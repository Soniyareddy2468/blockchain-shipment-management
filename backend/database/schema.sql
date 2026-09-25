CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_role_check CHECK (role IN ('ADMIN','SELLER','WAREHOUSE','TRANSPORTER','HUB','DELIVERY_AGENT','CUSTOMER'))
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_code VARCHAR(20) UNIQUE NOT NULL,
  sender_name VARCHAR(150) NOT NULL,
  receiver_name VARCHAR(150) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  source VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  transport_mode VARCHAR(50) NOT NULL,
  expected_delivery DATE NOT NULL,
  current_status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT shipment_status_check CHECK (current_status IN ('CREATED','PICKED_UP','IN_TRANSIT','ARRIVED_AT_HUB','OUT_FOR_DELIVERY','DELIVERED'))
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT event_status_check CHECK (status IN ('CREATED','PICKED_UP','IN_TRANSIT','ARRIVED_AT_HUB','OUT_FOR_DELIVERY','DELIVERED'))
);

CREATE INDEX IF NOT EXISTS idx_shipments_code ON shipments(shipment_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_created ON shipments(created_at);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_created ON shipment_events(created_at);

INSERT INTO shipments (shipment_code,sender_name,receiver_name,product_name,source,destination,transport_mode,expected_delivery,current_status)
VALUES ('SHP-DEMO01','Demo Seller','Demo Customer','Electronics Package','Bengaluru','Mysuru','Road',CURRENT_DATE + INTERVAL '3 days','IN_TRANSIT')
ON CONFLICT (shipment_code) DO NOTHING;

INSERT INTO shipment_events (shipment_id,status,location,description)
SELECT id,'IN_TRANSIT','Bengaluru','Shipment is currently in transit.'
FROM shipments
WHERE shipment_code='SHP-DEMO01'
AND NOT EXISTS (SELECT 1 FROM shipment_events WHERE shipment_id=shipments.id);
