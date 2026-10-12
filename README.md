# CofreAdmin 🔐

> **Self-Custodial Web3 Personal Finance** <br>
> USDC Vault Manager on Base Network <br>
> Docs: **[Resources & Documentation](https://github.com/cofreadminwallet/docs)** <br>
> Licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

---

## 📖 Overview

**CofreAdmin** is an open-source, self-custodial personal finance web application and digital dollar wallet built on the **Base network (Ethereum Layer 2)**. 

Designed with the familiarity and responsiveness of modern consumer banking apps, CofreAdmin eliminates Web3 friction: users can save in digital dollar vaults, send and receive payments, and organize their finances with human-friendly transaction memos—all while retaining **100% cryptographic self-custody** over their private keys.

---

## ✨ Key Features

- 🛡️ **True Self-Custody:** Private keys are generated locally via the browser Web Crypto API and encrypted at rest with **AES-GCM 256-bit**. Servers never see or store your private keys.
- 💵 **Digital Dollar Savings (USDC on Base):** Create themed savings vaults with custom target amounts and deadlines to separate spendable funds from savings.
- ⛽ **Zero-ETH Gasless Experience:** Pay transaction fees directly with your USDC balance using Circle Paymaster and ERC-4337 account abstraction rails—no native ETH required.
- ⚡ **Instant Pay & Receive:** Scan QR codes with your device camera or share high-contrast branded receive cards with EIP-55 checksum validation.
- 🏷️ **Smart Ledger & Human Memos:** Transform raw, cryptic blockchain hashes (`0x3f...`) into human-readable named entries (e.g., *"Groceries"*, *"Freelance invoice"*) with customizable categories.
- 📊 **Financial Insights & PDF Export:** Track daily spending pace, review category breakdowns, and export clean, accountant-ready PDF and CSV reports in one click.
- 📱 **Progressive Web App (PWA):** Installs directly to iOS and Android home screens as a native-feeling standalone app with offline caching and zero app store middlemen.

---

## 🛠️ Tech Stack

- **Language & Runtime:** TypeScript (`~5.8`), Node.js (`>=20`)
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Web3 & Blockchain:** Viem 2 (EVM / Base Network L2)
- **Backend & Bundler:** Express 4, esbuild
- **Hosting & Cloud:** *(Deployable to any cloud provider; preconfigured for Firebase App Hosting)*

---

## 📋 Prerequisites

Before installing, ensure your environment meets these requirements:

- **Node.js:** `v20.0.0` or higher (`v22.x` recommended)
- **npm:** `v10.0.0` or higher
- **Git**

---

## 🚀 Installation & Local Development

Follow these steps to run a fully functional independent instance locally:

### 1. Clone the Repository

```bash
git clone https://github.com/cofreadminwallet/app.git
cd app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment Configuration

Copy the template `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

### 4. Start the Development Server

```bash
npm run dev
```

The app will start at `http://localhost:3000` with hot-reloading enabled.

### 5. Build for Production Locally

```bash
npm run build
npm run start
```

---

## ⚙️ Environment Variables & Configuration (`.env`)

All configuration is isolated in environment variables. Open your `.env` file to customize the following settings:

### A. Firebase Setup (Cloud Database & Google Authentication)

Firebase powers cloud database synchronization and Google Social Login. *(Guest / Offline mode works 100% locally without Firebase)*.

> **💡 Enabling Google Sign-In:** In your [Firebase Console](https://console.firebase.google.com/), navigate to **Authentication** > **Sign-in method**, click **Add new provider**, and enable **Google**. No additional `GOOGLE_CLIENT_ID` environment variable is needed—Firebase manages the authentication handshake automatically via the Firebase config variables below.

| Variable | Description | Where to find |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console > Project Settings > Web App |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (e.g. `your-app.firebaseapp.com`) | Firebase Console > Project Settings > Web App |
| `VITE_FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID | Firebase Console > Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket URL | Firebase Console > Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging Sender ID | Firebase Console > Project Settings |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID | Firebase Console > Project Settings |
| `VITE_FIREBASE_DATABASE_ID` | *(Optional)* Named Firestore Database ID | Leave empty to use `(default)` |

### B. Web3 & Base Network Settings

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DEV_FEE_RECIPIENT_ADDRESS` | Public EVM address to receive protocol fees (0.2% fee, $0.05 min) | `0xD4875cCF...` |
| `VITE_DEV_FEE_RECIPIENT_ADDRESS` | Client-side mirror of the fee recipient address | `0xD4875cCF...` |
| `EXPECTED_GAS_RELAYER` | Public EVM address of designated gas relayer | `0x31b7BafB...` |
| `VITE_EXPECTED_GAS_RELAYER` | Client-side mirror of the gas relayer address | `0x31b7BafB...` |
| `CIRCLE_API_KEY` | *(Optional)* Circle developer key for paymaster operations | Leave empty for permissionless mode |
| `RELAYER_PRIVATE_KEY` | *(Optional / Server-only)* Private key if running a custom relayer | **Never commit to Git** |

> **💡 Modifying the Protocol Fee Rate:** By default, outgoing transfers route a 0.2% fee (with a $0.05 USDC floor) to the `DEV_FEE_RECIPIENT_ADDRESS`. To change this percentage or adjust the minimum floor, update `DEV_PROTOCOL_FEE_PERCENT` and `DEV_PROTOCOL_FEE_MIN_USD` in [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts).

> **💡 Zero-Cost RPCs & Native USDC:** Out of the box, the app connects directly to Base's official public RPC endpoint (`https://mainnet.base.org`) and interacts with official native Circle USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), requiring zero paid third-party infrastructure keys.


### C. Discord Social Login *(Optional)*

Enable Discord authentication under Discord Developer Portal > OAuth2:

| Variable | Description |
| :--- | :--- |
| `DISCORD_CLIENT_ID` | Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret |

*Redirect URI to configure in Discord:* `https://<your-domain>/api/auth/discord/callback`

---

## 🎨 Customizing Branding, Support & Contacts in the App

If you are self-hosting or rebranding the application, you can customize the contact channels and support links either via environment variables or directly in the code:

### 1. Via Environment Variables (`.env`)

| Variable | Default Value | What it Changes in the App |
| :--- | :--- | :--- |
| `VITE_SUPPORT_EMAIL` | `cofreadminwallet@gmail.com` | Changes the support email linked in Settings and diagnostic mailto links |
| `VITE_FEEDBACK_URL` | `https://forms.gle/MBpyniv5zf795wi97` | Changes the destination of the **Feedback** button in Settings |

### 2. Via Source Files

If you wish to update hardcoded default fallbacks directly in source files:

- **Support Email & Diagnostic Mailer:** [`src/utils/supportEmail.ts`](./src/utils/supportEmail.ts) (variable `SUPPORT_EMAIL`)
- **Feedback Link:** [`src/components/ProfileSettingsScreen.tsx`](./src/components/ProfileSettingsScreen.tsx)
- **Legal Terms & Documentation Link:** [`src/components/LegalTermsModal.tsx`](./src/components/LegalTermsModal.tsx)
- **App Version & Display Label:** [`src/config/version.ts`](./src/config/version.ts) (`APP_VERSION` and `APP_VERSION_LABEL`)
- **Protocol Fee Percentage & Minimum Floor (0.2% / $0.05 USDC):** [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts) (constants `DEV_PROTOCOL_FEE_PERCENT` and `DEV_PROTOCOL_FEE_MIN_USD`)
- **High-Value Security Guard (Anti-Drain Cool-down Threshold):** [`src/components/CryptoSendModal.tsx`](./src/components/CryptoSendModal.tsx) (variable `isHighValue`, defaults to $\ge \$100\text{ USDC}$ or $\ge \text{R\$} 500$)
- **Default Budget Categories & Emojis:** [`src/utils/initialData.ts`](./src/utils/initialData.ts) (array `DEFAULT_CATEGORIES`)
- **Supported Fiat Currencies & Fallback Exchange Rates:** [`src/utils/currencies.ts`](./src/utils/currencies.ts) (array `TOP_CURRENCIES`)
- **Native USDC Contracts & Public Base RPCs:** [`src/services/web3Service.ts`](./src/services/web3Service.ts) (`BASE_USDC_MAINNET`, `BASE_PUBLIC_RPC`)

---

## ☁️ Production Deployment

### Option 1: Firebase App Hosting (Preconfigured)

This project is 100% preconfigured for continuous deployment via **Firebase App Hosting**:

1. Link your GitHub repository in the **Firebase Console** under **App Hosting**.
2. In **App Hosting** > **Environment settings**, add the variables defined in your `.env`.
3. The included [`apphosting.yaml`](./apphosting.yaml) file automatically handles:
   - Build command: `npm run build`
   - Run command: `npm run start` (serves the bundled backend on port 8080/3000)
4. Every push to your `main` branch triggers an automated zero-downtime build and deployment.

### Option 2: Any Other Cloud Provider, Container, or VPS (Cloud-Agnostic)

Because CofreAdmin compiles into a standard standalone Node.js / Express bundle (`dist/server.cjs`), you are **not locked into Firebase**. You can host it on any cloud provider, container service, or Linux VPS (Docker, Render, Railway, Fly.io, AWS, Google Cloud Run, DigitalOcean, etc.):

- **Build Command:** `npm run build`
- **Run Command:** `npm run start` *(automatically binds to the system `PORT` environment variable)*


---

## 🛡️ Security & Zero-Leak Policy

- **No Secrets in Code:** Zero API keys, database passwords, or private keys are hardcoded in the repository.
- **Strict `.gitignore`:** Files matching `.env*`, `*.key`, `service-account*.json`, and private metadata are strictly excluded from commits.
- **Web Security Hardening:** The Express backend implements OWASP defense headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `strict-origin-when-cross-origin`).

---

## 📬 Contact

In compliance with the AGPL-3.0-or-later terms:

- **Official Support Email:** [cofreadminwallet@gmail.com](mailto:cofreadminwallet@gmail.com)
- **Official Discord:** `@cofreadmin`
- **Official Feedback Form:** [Submit Feedback](https://forms.gle/MBpyniv5zf795wi97)
- **Documentation & Resources:** [GitHub Docs Repository](https://github.com/cofreadminwallet/docs)
- **Product Lifecycle & UX Flow:** [`GitHub Docs Repository/.. product-flow.md`](https://github.com/cofreadminwallet/docs/blob/main/en-us/product-flow.md)

---

## 📜 License (AGPL-3.0-or-later)

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License as published by the Free Software Foundation**, either version 3 of the License, or (at your option) any later version.

See the [`LICENSE.md`](./LICENSE.md) file for full details.

---

<small>
💖 Support / Donate

Support the development of **CofreAdmin**:

- **Fiat:** [GitHub Sponsors](https://github.com/sponsors/erissontech)
- **Crypto (USDC on Base):** [`0x4d2550551bdade10f9168c5930E2F787f983BBBc`](https://basescan.org/address/0x4d2550551bdade10f9168c5930E2F787f983BBBc)
</small>
