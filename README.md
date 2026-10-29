# CofreAdmin Wallet 🔐💰

> **Self-Custodial Web3 Personal Finance** <br>
> USDC Vault Manager on Base Network <br>
> Version: **v1.0.5** • Docs: **[Resources & Documentation](https://github.com/cofreadminwallet/app/tree/main/docs)**; **[Changelog](./CHANGELOG.md)** <br>
> Licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

---

## 📖 Overview

**CofreAdmin** is an open-source, self-custodial personal finance web application and digital dollar wallet built on the **Base network (Ethereum Layer 2)**. 

Designed with the familiarity and responsiveness of modern consumer banking apps, CofreAdmin eliminates Web3 friction: users can save in digital dollar vaults, send and receive payments, and organize their finances with human-friendly transaction memos—all while retaining **100% cryptographic self-custody** over their private keys.

---

## ✨ Key Features

- 🛡️ **True Self-Custody (BIP-39 + Versioned WebCrypto Vault):** Wallets are generated locally using **BIP-39 12-word mnemonics** (`generateMnemonic` + `mnemonicToAccount` HD derivation) and encrypted at rest with **AES-GCM 256-bit** powered by a **non-extractable (`extractable: false`) IndexedDB `CryptoKey`** (`v3` envelope) or **PBKDF2 100k iterations** (`v2` envelope). Servers and cloud databases never see or store your private keys or mnemonics.
- 🔄 **Continuous Crypto-Agility & Multi-Generation Account Upgrade Engine:** Built with a forward-compatible, versioned wallet architecture (`v1` → `v2` → `v3`+) that automatically detects balances from previous wallet generations on Base L2, guides a 1-click on-chain sweep to the latest cryptographic standard, and enforces mandatory recovery backup—ensuring **zero fund loss** across current and future security upgrades.
- 💵 **Digital Dollar Savings (USDC on Base):** Create themed savings vaults with custom target amounts and deadlines to separate spendable funds from savings.
- ⛽ **Zero-ETH Gasless Experience:** Pay transaction fees directly with your USDC balance using Circle Paymaster and EIP-3009 (`TransferWithAuthorization`) meta-transaction rails—no native ETH required.
- 📇 **Contact Book, Basenames (`.base.eth`) & First-Time Recipient Protection:** Save trusted contacts, resolve `.base.eth` (Base L2 Resolver) and `.eth` (ENS) names with anti-homograph spoofing protection, and receive automatic security warnings when transferring to an unfamiliar address for the first time.
- ⚡ **Instant Pay, Pre-Filled Payment Links & Verifiable Receipts:** Scan QR codes, generate 1-click payment request links (EIP-681 + Web Deep Links) with pre-filled amounts in USDC or local currency (`R$`), and share high-resolution on-chain receipt cards containing a direct BaseScan audit QR code.
- 🏷️ **Smart Ledger, Human Memos & 1-Tap Quick Categorization:** Transform raw, cryptic blockchain hashes (`0x3f...`) into human-readable named entries (e.g., *"Groceries"*, *"Freelance invoice"*) with customizable categories, and categorize incoming USDC transfers in **1 tap directly from the real-time receive notification banner** without opening the statement screen.
- 🔒 **Instant App Lock & Tactile 4-Digit PIN (Trust Wallet-Style UX):** Protect vault access with a responsive on-screen numeric keypad, dynamic 4-dot indicators, device-salted SHA-256 local PIN hashing, and direct 1-tap hardware biometrics (Fingerprint / Face ID) configured with zero passkey selection dialog latency.
- 📊 **Financial Insights & Official PDF Statements:** Track daily spending pace, review category breakdowns, and export clean, accountant-ready PDF statements featuring official brand vault badges, titular Base wallet indicators, and dynamic bilingual page numbering.
- 📱 **Progressive Web App (PWA):** Installs directly to iOS and Android home screens as a native-feeling standalone app with offline caching and zero app store middlemen.

---

## 🛠️ Tech Stack

- **Language & Runtime:** TypeScript (`~5.8`), Node.js (`>=20`)
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Architecture & Data Layer:** Clean Architecture **Repository Pattern / Service Layer** (`IDatabaseService`, `IAuthService`, `IBillingService` in `src/services/`) with hybrid Local + Cloud synchronization and 1-line database provider swapping
- **Web3 & Blockchain:** Viem 2 (EVM / Base Network L2, BIP-39 HD Accounts, EIP-3009)
- **Backend & Bundler:** Express 4, esbuild
- **Hosting & Cloud:** *(Deployable to any cloud provider; preconfigured for Firebase App Hosting)*

---

## 🏗️ Clean Architecture & Database Repository Layer (`src/services/`)

CofreAdmin's data persistence and authentication are 100% decoupled from React UI components using the **Repository Pattern (Service Layer)**. Zero React screens import `firebase/*` or access `localStorage` directly for business entities:

| File | Responsibility |
| :--- | :--- |
| [`src/services/types.ts`](./src/services/types.ts) | Strongly-typed domain models (`UserProfile`, `Vault`, `Transaction`, `Category`, `SavedContact`, `OnChainLedgerEntry`, multi-tenant `userId`/`doctorId` support) and service contracts (`IDatabaseService`, `IAuthService`, `IBillingService`). |
| [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts) | `LocalStorageDatabaseService` — complete local/offline persistence, per-account storage isolation, transaction sanitization, and session management. |
| [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) | `FirebaseDatabaseService` & `FirebaseAuthService` — isolates 100% of `firebase/app`, `firebase/auth`, and `firebase/firestore` SDK calls, with conditional env-var initialization (`isFirebaseConfigured`) that safely falls back to Local Mode when `.env` keys are omitted. |
| [`src/services/currentDb.ts`](./src/services/currentDb.ts) | `HybridDatabaseService` — implements `IDatabaseService` and `IBillingService`, combining instant local reads/writes with background Cloud Firestore synchronization and conflict-free merging (`mergeLocalAndCloudData`). |
| [`src/services/index.ts`](./src/services/index.ts) | **Single Point of Dependency Injection** exporting `db`, `authService`, and `billingService`. Allows switching the entire database backend (e.g., to Supabase, PostgreSQL/Cloud SQL, or REST API) by changing **a single line**. |

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

Firebase powers cloud database synchronization and Google Social Login. *(Guest / Offline mode works 100% locally without Firebase—if `VITE_FIREBASE_API_KEY` is left empty, `src/services/firebaseDb.ts` automatically disables cloud initialization without errors and runs in Local Mode)*.

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
| `OAUTH_STATE_SECRET` | *(Optional)* Server-side secret used to HMAC-sign OAuth2 anti-CSRF `state` tokens (auto-derived if omitted) |

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

- **Database & Auth Dependency Injection Point (1-Line Provider Swap):** [`src/services/index.ts`](./src/services/index.ts) (`db`, `authService`, `billingService`)
- **Repository Contracts & Domain Models:** [`src/services/types.ts`](./src/services/types.ts) (`IDatabaseService`, `IAuthService`, `IBillingService`)
- **Hybrid Data Service, Cloud Firestore & Local Storage Repositories:** [`src/services/currentDb.ts`](./src/services/currentDb.ts), [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts), and [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts)
- **Support Email & Diagnostic Mailer:** [`src/utils/supportEmail.ts`](./src/utils/supportEmail.ts) (variable `SUPPORT_EMAIL`)
- **Feedback Link:** [`src/components/ProfileSettingsScreen.tsx`](./src/components/ProfileSettingsScreen.tsx)
- **Legal Terms & Documentation Link:** [`src/components/LegalTermsModal.tsx`](./src/components/LegalTermsModal.tsx)
- **Immutable Legal Audit & Global Privacy Erasure Certificates (Brazil LGPD, EU GDPR, US CCPA/CPRA):** [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) (`logWalletBackupAcknowledgment`, `deleteFromCloud`) and [`firestore.rules`](./firestore.rules)
- **App Version & Automatic Build Sync:** [`src/config/version.ts`](./src/config/version.ts) (`APP_VERSION` and `APP_VERSION_LABEL`, automatically synchronized into `package.json`, `package-lock.json`, and `/api/version` via [`scripts/patch-firebase.cjs`](./scripts/patch-firebase.cjs))
- **Versioned Cryptographic Vault (`v2` PBKDF2 / `v3` IndexedDB Non-Extractable `CryptoKey`):** [`src/utils/cryptoVault.ts`](./src/utils/cryptoVault.ts) (`CURRENT_VAULT_ENVELOPE_VERSION`, `needsVaultEnvelopeUpgrade`)
- **Native USDC Contracts, BIP-39 Wallet Engine, Public Base RPCs & Future Generation Rotation:** [`src/services/web3Service.ts`](./src/services/web3Service.ts) (`BASE_USDC_MAINNET`, `BASE_PUBLIC_RPC`, `CURRENT_WALLET_GENERATION`, `generateMnemonicWallet`, `stageWalletForMigration`, `getPendingMigrationWallet`)
- **Future Protocol Key Rotation & Mandatory Backup Modals:** [`src/components/WalletMigrationModal.tsx`](./src/components/WalletMigrationModal.tsx) and [`src/components/WalletBackupModal.tsx`](./src/components/WalletBackupModal.tsx)
- **1-Tap Quick Categorization on Incoming Payment Toast:** [`src/components/QuickCategorizeReceiveToast.tsx`](./src/components/QuickCategorizeReceiveToast.tsx)
- **Instant App Lock & WebAuthn Device Security:** [`src/services/webAuthnService.ts`](./src/services/webAuthnService.ts) and [`src/components/AppLockScreen.tsx`](./src/components/AppLockScreen.tsx)
- **Accountant-Ready PDF Statement Export Engine:** [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts) and [`src/components/ExportDataModal.tsx`](./src/components/ExportDataModal.tsx)
- **Protocol Fee Percentage & Minimum Floor (0.2% / $0.05 USDC):** [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts) (constants `DEV_PROTOCOL_FEE_PERCENT` and `DEV_PROTOCOL_FEE_MIN_USD`)
- **High-Value Security Guard (Anti-Drain Cool-down Threshold):** [`src/components/CryptoSendModal.tsx`](./src/components/CryptoSendModal.tsx) (variable `isHighValue`, defaults to $\ge \$100\text{ USDC}$ or $\ge \text{R\$} 500$)
- **Default Budget Categories & Emojis:** [`src/utils/initialData.ts`](./src/utils/initialData.ts) (array `DEFAULT_CATEGORIES`)
- **Supported Fiat Currencies & Fallback Exchange Rates:** [`src/utils/currencies.ts`](./src/utils/currencies.ts) (array `TOP_CURRENCIES`)

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

## 🛡️ Security & Cryptographic Self-Custody

- **Strict BIP-39 HD Key Generation (Zero Legacy Derivation):** All wallets generate a cryptographically random 12-word recovery phrase (`generateMnemonic(english)`) and strictly derive the exact corresponding private key and EVM address (`mnemonicToAccount`). Legacy deterministic seed derivation (`v1`) has been permanently removed from the codebase.
- **Versioned Dual-Mode AES-GCM 256-bit Cryptographic Vault (`cryptoVault.ts`):**
  - **Device-Bound Non-Extractable `CryptoKey` (`enc:aes-gcm:idb:v3:`):** By default, private keys and mnemonics are encrypted with AES-GCM 256-bit (random 12-byte IV) using a master `CryptoKey` generated with `extractable: false` and stored in the browser's **IndexedDB** (`cofreadmin_keystore_db`). This ensures seamless persistence across page reloads (`F5`) and browser restarts while making raw key material impossible to export via `exportKey()` or steal from `localStorage`.
  - **PBKDF2 Passphrase & Constant-Time PIN Protection (`enc:aes-gcm:v2:`):** When a custom security passphrase or PIN is supplied, keys and PIN hashes are derived via PBKDF2 (100,000 iterations, SHA-256, random 16-byte salt + 12-byte IV) and verified using constant-time byte comparison (`constantTimeEqual`) with zero length-only fallback bypasses.
  - **Forward-Compatible Envelope Versioning (`v2` / `v3` → `vN`):** Every encrypted payload carries an explicit version prefix (`CURRENT_VAULT_ENVELOPE_VERSION = 'v3'`) and `needsVaultEnvelopeUpgrade()` detection, allowing the vault to transparently re-encrypt and upgrade key storage to future cryptographic standards (`v4+`) without breaking user access.
- **Hardware-Bound Biometrics & Salted PIN Defense (`webAuthnService.ts`):** In addition to Web3 key isolation, session locking is governed by client-side SHA-256 PIN hashing with an isolated device salt (`cofre_pin_salt`). WebAuthn platform credentials are tuned with `residentKey: 'discouraged'` and internal transports (`['internal']`), bypassing third-party passkey manager account-selection popups and allowing instant (<50ms) offline keypad or single-touch biometric unlocking.
- **Zero-Overwrite & Anti-Ghost Wallet Guarantees:**
  - If an encrypted key is locked or fails decryption, `connectGoogleWallet` immediately halts (`WALLET_LOCKED`) and **never** generates or overwrites existing keys.
  - On cloud restore or new device login, the app always verifies local private key ownership so the displayed deposit address strictly matches a key controlled on the current device.
  - Wallet resets (`resetWallet`) verify on-chain Base USDC/ETH balances first and block accidental resets when funds are present.
- **Universal Multi-Candidate Identity Resolution, Cross-Provider Isolation & Zero-Account-Loss Lock (`getCandidateDocIds` & `getStorageDataWithFallbacks`):**
  - **Exhaustive Multi-Key Candidate Sweep & Provider Isolation:** To prevent account disconnections across schema updates while guaranteeing strict separation between providers (even when a user shares the exact same email address on both Google and Discord on the same browser), queries resolve provider-scoped candidate keys:
    - **Google Auth:** Modern scoped prefix (`google_<sanitizedEmail>`), legacy un-prefixed (`<sanitizedEmail>`), raw email (`<email>`), `user_<sanitizedEmail>`, and Firebase auth UID (`<uid>`).
    - **Discord Auth:** Modern scoped prefix (`discord_<id>`), email-scoped prefix (`discord_<sanitizedEmail>`), and raw numeric ID (`<id>`), strictly isolated from un-prefixed Google legacy keys and unscoped storage fallbacks.
  - **Symmetric Non-Destructive Auto-Migration:** When historical data is discovered under legacy keys belonging to the same verified identity, it is seamlessly restored and mirrored to modern document collections (`userData/{docId}`) and UID-backed backups (`users/{uid}`) using `mergeLocalAndCloudData` with zero loss of balances, vaults, categories, or transaction histories.
  - **First-Access Prompt Shield & Ownership Verification:** Unscoped local fallbacks (`cofreadmin_user`) validate exact `email`/`authId` and provider ownership before returning cached records. Existing accounts bypass registration directly, while brand-new accounts on a shared browser are guaranteed to see the **First Access (Privacy Policy Clickwrap)** screen first, followed immediately by the **Mandatory Wallet Backup** modal upon wallet creation.
- **Future-Ready Multi-Generation Key Rotation & Upgrade Engine (`CURRENT_WALLET_GENERATION`):** Designed for long-term protocol evolution (`v3` → `v4+`) with zero overhead during normal operation. If a future protocol update stages a key rotation via `Web3Service.stageWalletForMigration()`, `Web3Service.getPendingMigrationWallet()` detects the staged previous generation wallet (`cofreadmin_prev_pk_*`), checks on-chain Base L2 balances, and presents the **Wallet Security Upgrade** modal (`WalletMigrationModal.tsx`) for a 1-click on-chain sweep (dynamically computing exact `0.2%` / `$0.05` protocol and `$0.02` gas fees) to the newly upgraded BIP-39 HD wallet, followed by mandatory recovery phrase backup.
- **Strict Cloud & Storage Sanitization (`localStorageDb.ts` & `firebaseDb.ts`):** Both `LocalStorageDatabaseService.saveUser` and `FirebaseDatabaseService.saveToCloud` (via `HybridDatabaseService`) explicitly strip `walletPrivateKey`, `walletMnemonic`, and `securityPinHash` prior to serialization—sensitive key material never touches plain JSON user objects or Firestore.
- **Immutable Legal & Self-Custody Audit Trail (`firebaseDb.ts` & `firestore.rules`):**
  - **Backup Acknowledgment Certificates (`WALLET_BACKUP_ACKNOWLEDGMENT`):** Whenever a user confirms having backed up their 12-word recovery phrase / private key (`WalletBackupModal.tsx` → `db.logWalletBackupAcknowledgment`), an immutable digital certificate (`ack_...`) is recorded with timestamps, SHA-256 hashed identifier, public wallet address, audit fingerprint, and explicit non-custodial liability acknowledgment (**never** storing the private key or seed phrase).
  - **Clickwrap Terms & Multi-Jurisdictional Privacy Erasure Certificates (`deleteFromCloud`):** First-access Privacy Policy acceptance (`clickwrap_v2_...`) is recorded upon registration, and voluntary account deletion (`db.deleteFromCloud`) permanently purges active operational documents while archiving a pseudonymized, write-once erasure and self-custody audit log in full compliance with global legal retention and data erasure mandates:
    - 🇧🇷 **Brazil — LGPD (*Lei Geral de Proteção de Dados*, Law No. 13.709/2018):** Enforces Art. 16, I, II & VI (immediate elimination of operational personal data with legitimate archive of immutable compliance records for legal obligations).
    - 🇪🇺 **European Union — GDPR (*General Data Protection Regulation*, Regulation (EU) 2016/679):** Guarantees the "Right to Erasure" (*Right to be Forgotten*) under Art. 17(1), harmonized with Art. 17(3)(b) & (e) (permissible retention of tamper-evident digital records solely for legal obligation compliance and defense of legal claims).
    - 🇺🇸 **United States — CCPA / CPRA (*California Consumer Privacy Act / California Privacy Rights Act*, Cal. Civ. Code § 1798.100+ & § 1798.105):** Fulfills consumer right-to-delete requests while strictly retaining immutable audit evidence required to complete transactions, fulfill security and evidentiary audits, and comply with state/federal legal obligations under Cal. Civ. Code § 1798.105(d).
  - **Write-Once Audit Rules & Dual-State Tenant Isolation:** Enforced at the database level via `firestore.rules` (`allow update, delete: if false;` on legal audit collections), guaranteeing tamper-proof evidentiary integrity, while user data collections enforce verified-email ownership across both existing (`resource.data`) and incoming (`request.resource.data`) states to prevent cross-tenant IDOR overwrites.
- **Client-Side Allowlist, Input Validation & Fee Guard:** Outgoing meta-transactions (EIP-3009 `TransferWithAuthorization`) validate recipient checksums (`isAddress`, non-zero burn guard), positive finite amounts, total balance coverage (`amount + protocolFee + gasFee <= usdcBalance`), and verify the Relayer and fee recipient against an immutable client-side allowlist (capping gas fees at `$0.10 USDC` and protocol fees at `max(0.2%, $0.05 USDC)` prior to signing).
- **Cryptographic EIP-3009 Nonces:** All transaction authorization nonces are generated with `crypto.getRandomValues(32)` to eliminate predictable nonce collision attacks.
- **Zero Secrets in Code, Resilient Env-Var Config & Strict `.gitignore`:** Zero API keys, Firebase credentials, database passwords, or private keys are hardcoded in the repository (`src/services/firebaseDb.ts` reads exclusively from `import.meta.env.VITE_FIREBASE_*`). Files matching `.env*`, `*.key`, `bun.lock*`, `service-account*.json`, and private metadata are strictly excluded from commits, and any auto-generated local development relayer key (`.relayer.dev.key`) is created with strict `0600` owner-only file permissions.
- **OAuth2 Anti-CSRF, XSS & Origin Hardening:** Discord OAuth2 flows enforce one-time HMAC-SHA256 signed `state` tokens verified with `crypto.timingSafeEqual` (10-minute TTL and replay eviction), strict `Host` / `X-Forwarded-Host` header allowlist validation, HTML/JSON script-context escaping (`escapeHtml` / `safeJsonForScript`), and exact `window.location.origin` target origin verification on popup `postMessage` handshakes.
- **Hardened Web3 Relayer & Paymaster Security (`/api/paymaster/transfer` & `/api/paymaster/proxy`):**
  - **Pre-Flight EIP-712 Signature & On-Chain Nonce Validation:** Before spending any Relayer ETH gas, the server cryptographically verifies all three EIP-3009 ECDSA signatures (`recoverTypedDataAddress` for main transfer, protocol fee, and gas fee), enforces server-side fee floors (`$0.02 USDC` gas fee and `0.2%` / `$0.05 USDC` protocol fee), and checks on-chain `authorizationState` and total `balanceOf(from)` on Base L2.
  - **Serialized Relayer Mutex & Dual Rate Limiting:** A server-side execution mutex (`withRelayerExecutionLock`) and per-sender concurrency lock prevent EVM nonce collisions and double-spend TOCTOU races, paired with dual per-IP (`trust proxy` single-hop) and per-wallet rate limiting.
  - **Fail-Closed Paymaster RPC Proxy:** `/api/paymaster/proxy` blocks JSON-RPC batch arrays and enforces a fail-closed contract allowlist (`BASE_USDC_ADDRESS` and `ALLOWED_PAYMASTER_CONTRACTS`) for `pm_sponsorUserOperation` / `pm_getPaymasterStubData` calls.
- **CSV Formula Injection Prevention:** Financial statement exports ([`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts)) automatically neutralize spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) and escape embedded quotes before generating CSV files, preventing DDE/macro execution in Excel, LibreOffice, and Google Sheets.
- **Web Security & Auth Proxy Hardening:** The Express backend implements OWASP defense headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`) and strict path/SSRF validation on `/__/auth/*` reverse-proxy routes.

---

## 📬 Contact

In compliance with the AGPL-3.0-or-later terms:

- **Official Support Email:** [cofreadminwallet@gmail.com](mailto:cofreadminwallet@gmail.com)
- **Official Discord:** `@cofreadmin`
- **Official Feedback Form:** [Submit Feedback](https://forms.gle/MBpyniv5zf795wi97)
- **Documentation & Resources:** [GitHub Docs Repository](https://github.com/cofreadminwallet/app/tree/main/docs)
- **Privacy Policy:** [`GitHub Docs Repository/.. privacy-policy.md`](https://github.com/cofreadminwallet/app/blob/main/docs/en-us/privacy-policy/privacy-policy.md)
- **Product Lifecycle & UX Flow:** [`GitHub Docs Repository/.. product-flow.md`](https://github.com/cofreadminwallet/app/blob/main/docs/en-us/product-flow.md)

---

## 📜 License (AGPL-3.0-or-later)

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License as published by the Free Software Foundation**, either version 3 of the License, or (at your option) any later version.

See the [`LICENSE.md`](./LICENSE.md) file for full details.

---

<small>
💖 Donate Support the development:

- **Fiat:** [GitHub Sponsors](https://github.com/sponsors/erissontech)
- **Crypto:** [BTC/USDC/ETH/SOL](https://github.com/cofreadminwallet/app/blob/main/.github/donate.md)
</small>