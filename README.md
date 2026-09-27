# ShipChain — Blockchain-Based Shipment Management System

ShipChain is a startup-style shipment management platform for secure logistics tracking, verifiable shipment events and future AI-powered delay prediction.

## Implemented

- Responsive landing page
- Create shipment workflow
- Persistent Node.js/Express REST API
- SQLite database for users, shipments and events
- JWT authentication and role-based registration
- Shipment tracking timeline
- Operations dashboard and statistics API
- Browser-local fallback for static/demo hosting
- Solidity `ShipmentRegistry` smart contract
- Hardhat local blockchain configuration and deployment script
- Blockchain-ready shipment verification model

## Architecture

`Browser → Express API → SQLite` for operational data, with `ShipmentRegistry.sol` providing the tamper-evident blockchain layer. The next integration step is to connect API shipment events to a deployed contract and persist transaction hashes.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

### Local blockchain

Terminal 1:
```bash
npm run chain:node
```

Terminal 2:
```bash
npm run chain:compile
npm run chain:deploy
```

The contract is in `contracts/ShipmentRegistry.sol`.

## API highlights

- `POST /api/auth/register` — create an operator account
- `POST /api/auth/login` — receive a JWT
- `GET /api/shipments` — list shipments
- `GET /api/shipments/:id` — public tracking lookup
- `POST /api/shipments` — authenticated shipment creation
- `PATCH /api/shipments/:id/status` — authenticated milestone update
- `GET /api/stats` — dashboard metrics
- `GET /api/health` — service health check

## Roadmap

1. Connect API events to the deployed smart contract and store transaction hashes
2. QR-code shipment labels and scan workflow
3. Proof of delivery using OTP/signature/photo
4. Python/FastAPI AI delay-risk prediction
5. Notifications and logistics/Maps integrations
6. Cloud deployment with managed PostgreSQL
7. Automated tests and CI/CD

## Security

Never commit passwords, JWT secrets, API keys, wallet private keys or sensitive customer data. Set `JWT_SECRET` in `.env` for production.
