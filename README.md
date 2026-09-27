# ShipChain — Blockchain-Based Shipment Management System

ShipChain is a full-stack shipment management platform combining operational tracking, role-based authentication, blockchain verification and an AI-style delay-risk service.

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
- Browser-local fallback for static/demo hosting
- Hardhat local blockchain configuration

## Architecture

`Browser → Express API → SQLite` handles operational data. `Express API → Ethers.js → ShipmentRegistry.sol` provides the tamper-evident blockchain layer when a wallet, RPC endpoint and deployed contract are configured.

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
- `GET /api/shipments/:id/verify` — blockchain verification status
- `GET /api/shipments/:id/risk` — explainable AI-style delay-risk score
- `GET /api/stats` — dashboard metrics
- `GET /api/health` — service health check

## Production roadmap

1. Add proof of delivery with OTP, signature and photo upload
2. Add real QR labels/scan workflow to shipment creation
3. Replace heuristic risk service with a trained Python/FastAPI model
4. Add email/SMS notifications and Maps/GPS integrations
5. Move SQLite to managed PostgreSQL
6. Add automated unit/API tests and CI/CD
7. Deploy frontend/API and configure production secrets

## Security

Never commit passwords, JWT secrets, API keys, wallet private keys or sensitive customer data. Use environment variables for production secrets. The blockchain private key must never be placed in frontend code or committed to GitHub.
