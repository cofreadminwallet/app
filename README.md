# CofreAdmin 🔐

> **Self-Custodial Web3 Personal Finance**
> Web3 Smart Wallet & Vault Manager on the Base Network (Ethereum L2) 
> Licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

---

## 📬 Support & User Contact

In full compliance with the AGPL-3.0-or-later terms and our commitment to the open-source community:
- **Official Support Email:** [cofreadminwallet@gmail.com](mailto:cofreadminwallet@gmail.com)
- **Official Discord:** @cofreadmin
- **Official Feedback:** [Submit Feedback](https://forms.gle/MBpyniv5zf795wi97)
- **Full License Terms:** Review the [`LICENSE.md`](./LICENSE.md) file in the root directory.

---

## 🛡️ Security Architecture & Anti-Leak Policy (Zero Leaks)

This repository strictly complies with modern security and open-source hygiene standards:
1. **Zero Hardcoded Secrets:** No API tokens, private keys, database passwords, or credentials are hardcoded in source code files.
2. **Environment Isolation:** All runtime configuration is strictly loaded via environment variables (`.env` during local development; App Hosting secrets/variables in production).
3. **Strict `.gitignore` Protection:** Sensitive files (`.env`, `.env.local`, `*.key`, `*.secret`, `firebase-applet-config.json`, etc.) are permanently ignored and will never be pushed to git.
4. **Web Security Hardening:** The Express backend and React SPA enforce standard protections against XSS, CSRF, parameter tampering, and unauthorized access.

---

## 🛠️ Tech Stack

- **Language & Runtime:** TypeScript (`~5.8`), Node.js (`>=20`)
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Web3 & Blockchain:** Viem 2 (EVM / Base Network L2)
- **Backend & Bundler:** Express 4, esbuild
- **Hosting & Cloud:** 

---

## 🚀 Getting Started & Self-Hosting Guide

Anyone cloning or forking this repository can launch their own fully independent instance with their own backend and configuration. Follow the setup steps below:

### 1. Clone the Repository and Install Dependencies

```bash
git clone https://github.com/cofreadminwallet/app.git
cd app
npm install
```

### 2. Configure Environment Variables

The public `.env.example` file contains all necessary configuration variables as a clean template. Create your local `.env` file:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure your credentials:

#### A. Connect Your Own Firebase Project (Firestore & Authentication):
1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Register a new **Web App**.
3. Enable **Cloud Firestore** and **Authentication** (Firebase Auth).
4. Copy your Web App configuration into your `.env`:
   ```bash
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

#### B. Configure Base Network Fees & Gas Relayers:
- `DEV_FEE_RECIPIENT_ADDRESS`: Your EVM wallet address to receive protocol fees (0.2% fee, $0.05 USDC minimum).
- `EXPECTED_GAS_RELAYER`: Public EVM address of your designated transaction gas relayer.
- `CIRCLE_API_KEY`: *(Optional)* Circle developer API key for enhanced RPC access and paymaster operations.

#### C. Discord OAuth Setup *(Optional)*:
1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an application, open the **OAuth2** tab, and copy your `Client ID` and `Client Secret`.
3. Add the redirect URL: `https://<your-domain>/api/auth/discord/callback`.
4. Enter them into `.env`:
   ```bash
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   ```

---

## ☁️ Deployment on Firebase App Hosting (100% Compatible)

This project is fully structured and verified for continuous deployment via **Firebase App Hosting**:

1. Link your GitHub repository in the Firebase App Hosting console.
2. Under **App Hosting** > **Environment settings**:
   - Register the environment variables defined in `.env.example`.
   - The repository includes a preconfigured `apphosting.yaml` that builds (`npm run build`) and serves (`npm run start` on port 3000) automatically.
3. Every push to your repository triggers an automated, zero-downtime deployment without exposing your secrets or credentials in the public codebase.

---

## 💻 Local Development

To run the application locally with live reload:

```bash
npm run dev
```

The application will be accessible at: `http://localhost:3000`

To build and verify a production release locally:

```bash
npm run build
npm run start
```

---

## 📜 License (AGPL-3.0-or-later)

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License as published by the Free Software Foundation**, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of **MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE**. See the [`LICENSE.md`](./LICENSE.md) file for more details.