# ShipChain — Blockchain-Based Shipment Management System

ShipChain is a full-stack shipment management platform combining operational tracking, role-based authentication, blockchain verification, proof of delivery and an AI-style delay-risk service.

## Implemented

- Responsive landing page and operations dashboard
- Persistent Node.js/Express REST API
- SQLite database for users, shipments and shipment events
- JWT authentication and role-based registration
- Shipment creation, tracking and milestone updates
- Solidity `ShipmentRegistry` smart contract
- Ethers.js integration for optional on-chain registration and updates
- Transaction-hash persistence and blockchain verification endpoint
- AI delay-risk endpoint with explainable risk score
- QR-ready public tracking page
- Proof of delivery workflow with one-time OTP, receiver confirmation, drawn signature and delivery photo
- SHA-256 photo hash for tamper-evident proof metadata
- Public delivery-photo retrieval endpoint after verification
- OTP expiry and attempt limits
- Browser-local fallback for static/demo hosting
- Hardhat local blockchain configuration

## Proof of delivery flow

1. Shipment reaches `Out for Delivery`.
2. Authenticated receiver/operator requests a one-time 6-digit OTP.
3. OTP is valid for 10 minutes and is limited to five failed attempts.
4. Receiver enters the OTP and signs on the on-screen signature pad.
5. Receiver can capture/upload a delivery photo (maximum 5 MB).
6. API verifies the OTP and stores the signature, photo and SHA-256 photo hash.
7. Shipment becomes `Delivered` and the delivery event is marked verified.
8. Tracking displays the verification timestamp, signature state and photo/hash.

For the demo environment, the generated OTP is returned by the API. In production, replace this with an SMS/email provider and never expose the OTP in the response.

## Architecture

`Browser → Express API → SQLite` handles operational data and proof metadata. `Express API → Ethers.js → ShipmentRegistry.sol` provides the tamper-evident blockchain layer when a wallet, RPC endpoint and deployed contract are configured.

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

After deployment, configure the contract address and RPC/wallet values in `.env`.

## API highlights

- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — receive a JWT
- `GET /api/shipments` — list shipments
- `GET /api/shipments/:id` — public tracking lookup
- `POST /api/shipments` — authenticated shipment creation
- `PATCH /api/shipments/:id/status` — authenticated milestone update and optional blockchain write
- `POST /api/shipments/:id/pod/request-otp` — create a delivery OTP
- `POST /api/shipments/:id/pod/confirm` — verify OTP, signature and optional photo
- `GET /api/shipments/:id/pod` — delivery-proof metadata
- `GET /api/shipments/:id/pod/photo` — verified delivery photo
- `GET /api/shipments/:id/verify` — blockchain verification status
- `GET /api/shipments/:id/risk` — explainable AI-style delay-risk score
- `GET /api/stats` — dashboard metrics
- `GET /api/health` — service health check

## Production roadmap

1. Replace demo OTP response with an SMS/email provider
2. Move uploaded photos from SQLite/base64 storage to secure object storage
3. Add real QR labels/scan workflow to shipment creation
4. Replace heuristic risk service with a trained Python/FastAPI model
5. Add email/SMS notifications and Maps/GPS integrations
6. Move SQLite to managed PostgreSQL
7. Add automated unit/API tests and CI/CD
8. Deploy frontend/API and configure production secrets

## Security

Never commit passwords, JWT secrets, API keys, wallet private keys or sensitive customer data. Use environment variables for production secrets. The blockchain private key must never be placed in frontend code or committed to GitHub. For production, use signed, expiring object-storage URLs rather than serving private delivery photos directly from the API.
