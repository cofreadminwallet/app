# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> End-to-End Product Flow & User Experience • Investor & Technical Overview <br>
> Version: **v1.0.6** • Licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

🌐 **Languages:** **[English](product-flow.md)** • **[Português](product-flow-pt-BR.md)** • **[Español](product-flow-es-ES.md)** • **[简体中文](product-flow-zh-Hans.md)**

---

## 🔄 The 6-Stage Investor Product Lifecycle Flow

```
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   1. ZERO-FRICTION         │  ───> │   2. INVISIBLE WEB3        │  ───> │   3. FRICTIONLESS PAY &    │
│      ENTRY & IDENTITY      │       │      SELF-CUSTODY          │       │      RECEIVE (PAYMENTS)    │
│ • 1-Tap Social Auth        │       │ • Client-side AES-GCM 256  │       │ • Instant Camera QR & 0x   │
│ • Cross-Provider Email Sync│       │ • Multi-Gen Agility (v1-v3)│       │ • Basenames & ENS Resolver │
│ • 1-Tap Guest/Offline mode │       │ • Hardware WebAuthn/PIN    │       │ • Anti-Poisoning Badges    │
│ • PWA Install (0% store fee│       │ • 1-Click On-Chain Sweep   │       │ • Gas in USDC (EIP-3009)   │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
                                                                                        │
                                                                                        ▼
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   6. PRIVACY, SOVEREIGNTY  │  <─── │   5. LIVING LEDGER &       │  <─── │   4. SMART VAULTS &        │
│      & LEGAL ERASURE       │       │      INTELLIGENCE          │       │      DOLLAR SAVINGS        │
│ • Quick Privacy Mode       │       │ • 1-Tap Alert Categorize   │       │ • Dual-Balance Architecture│
│ • Full Private Key export  │       │ • Human Memos & Tagging    │       │ • Multi-Goal Themed Vaults │
│ • Multi-Tenant Cloud Sync  │       │ • Daily Budget Pace Ring   │       │ • Micro-reward Celebrations│
│ • 1-Click LGPD/GDPR Erasure│       │ • Accountant PDF/CSV Export│       │ • 0-Fee Emergency Release  │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
```

---

## 🔎 Detailed Stage-by-Stage Breakdown

### 1. Zero-Friction Entry & Unified Identity
* **The Problem:** Traditional Web3 onboarding forces users through 12-24 word seed phrases, third-party wallet browser extensions, or creates fragmented, duplicate profiles when users sign in across different social providers.
* **CofreAdmin Experience:**
  * **1-Tap Social Onboarding:** Users sign in with existing Google or Discord credentials in under 3 seconds.
  * **Cross-Provider Unified Email Identity (New in v1.0.6):** When a user logs in via Google and later via Discord using the same verified email address, CofreAdmin automatically resolves them to their single legal identity. Existing on-chain wallet addresses, cloud documents (`userData`), custom vaults, and transactions remain unified without duplicate accounts, prompt loops, or profile overwrites.
  * **Guest / Offline Mode:** Users can test the complete application with zero sign-up; data and wallet initialize 100% locally in browser memory (`localStorage` and IndexedDB).
  * **PWA Native Feel:** Bypasses 30% Apple/Google App Store tolls and censorship risks. Installs directly to iOS & Android home screens with full offline caching, custom app shortcuts, and 60 FPS fluid rendering.

### 2. Invisible Web3 Self-Custody & Cryptographic Agility
* **The Problem:** Non-technical consumers lose seed phrases, suffer phishing attacks, or get trapped in obsolete cryptographic architectures with no upgrade path.
* **CofreAdmin Experience:**
  * **On-the-Fly Cryptography:** Cryptographic EVM private keys are derived client-side via Web Crypto API and secured at rest using **AES-GCM 256-bit envelope encryption**.
  * **Zero Custodial Risk:** CofreAdmin servers never receive, transmit, or hold private keys or user funds.
  * **Multi-Generation Cryptographic Agility Engine (`v1` → `v2` → `v3`):**
    * *v1 (Legacy):* Standard plaintext software derivation for backwards-compatibility.
    * *v2 (Encrypted Envelope):* AES-GCM 256-bit encryption fortified with PBKDF2 key derivation (100,000 iterations).
    * *v3 (Hardware-Bound):* Non-extractable Web Crypto API keys stored inside protected IndexedDB partitions.
    * *1-Click On-Chain Balance Sweep:* Allows users to migrate all funds seamlessly between key generations in a single atomic transaction.
  * **Tactile 4-Digit Security PIN & WebAuthn Biometrics:** High-security actions (signing, key viewing, large transfers) prompt native device biometric authentication (Face ID, Touch ID, Fingerprint, Windows Hello) or a randomized tactile PIN keypad inspired by Trust Wallet.

### 3. Frictionless Payments, Base Rails & Anti-Poisoning
* **The Problem:** Making crypto transfers requires holding volatile native gas tokens (ETH), calculating Gwei, risking clipboard address poisoning malware, and typing cryptic 42-character hexadecimal hashes.
* **CofreAdmin Experience:**
  * **Base L2 Infrastructure:** Ultra-low transaction fees (sub-cent) and near-instant 2-second block finality powered by Coinbase's Ethereum Layer 2.
  * **Gas Sponsored in USDC (No ETH Required):** Powered by EIP-3009 transfer-with-authorization and Circle Paymaster abstraction, network fees are debited directly from fractional USDC. Users never need to acquire or bridge ETH.
  * **Visual Anti-Clipboard Poisoning Protection (New in v1.0.6):** High-contrast badge segmentation highlights the **first 6** (`0x1234`) and **last 4** (`5678`) characters of recipient addresses alongside an anti-tamper verification seal, making clipboard hijacking immediately visible.
  * **Basenames (`.base.eth`) & ENS (`.eth`) Resolver:** Users can type human-friendly Web3 names instead of raw hashes, verified in real-time with anti-homograph spoofing safeguards.
  * **Camera QR Scanner:** Built-in video camera scanner reads standard Web3 address formats, EIP-681 payment URLs, and invoices with zero external app switching.
  * **Live FX Conversion:** Real-time spot rates display balances and transfer amounts simultaneously in digital dollars ($ USDC) and local fiat currency (e.g., R$ BRL, € EUR, £ GBP).
  * **High-Value Fraud Guard:** Outgoing transactions above $100 USDC trigger a mandatory 3-second cool-off countdown and secondary confirmation, preventing rash clicks or scam drains.
  * **Exportable Receive Cards:** Generates branded, high-contrast QR code cards with EIP-55 checksum verification that users can download as PNG or share directly to WhatsApp or messaging apps.

### 4. Smart Vaults & Dollar Budgeting Psychology
* **The Problem:** Traditional crypto wallets display one single aggregate balance, encouraging users to overspend and fail their personal savings goals.
* **CofreAdmin Experience:**
  * **Segregated Balance Architecture:** Clear distinction between **Free Spendable Balance** (available for day-to-day transfers) and **Locked Vault Balance** (protected from impulsive spending).
  * **Themed Financial Goals:** Users create custom vaults (Emergency Fund, Travel, Tech, Vehicle, Education) with target deadlines and emoji identifiers.
  * **Behavioral Gamification:** Deposit and withdrawal workflows feature neo-brutalist milestone indicators and celebratory confetti animations when targets are reached.
  * **Instant Emergency Release:** Users can unlock funds from their vaults back to their liquid balance in a single tap with zero penalty fees or time lockups.

### 5. Living Ledger & Transaction Intelligence
* **The Problem:** Blockchain explorers display cryptic lists of alphanumeric hashes (`0x3f8a...`) without human context, tags, or accountant-friendly categorization.
* **CofreAdmin Experience:**
  * **Automatic Blockchain Indexing:** On-chain deposits and transfers on Base are indexed and synced in real time.
  * **⚡ 1-Tap Real-Time Notification Categorization (New in v1.0.6):** When incoming USDC arrives, a smart banner appears at the top of the viewport. Users can categorize the inflow (*Freelance*, *Salary*, *Investment*, *Sale*) with a single tap directly on the notification.
  * **Smart Human-Readable Naming:** Users can tag and name any raw on-chain transaction with human memos (e.g., *"Dinner with friends"*, *"Contract design payment"*, *"Supermarket"*).
  * **Categorization Engine:** Entries are assigned to preset or custom categories with automatic color-coded badges.
  * **Soft-Exclusion & Privacy Control:** Users can soft-exclude specific internal movements from overall statistics without altering on-chain history.
  * **Daily Budget Monitor & Burn Pace:** Visual metrics display weekly spending delta, daily budget pace ring, and category breakdown charts.
  * **Accountant-Ready PDF/CSV Reports:** 1-Click export generates clean, normalized transaction statements formatted for tax filing and accounting compliance.

### 6. Quick Privacy Mode, Data Sovereignty & Legal Erasure
* **The Problem:** Displaying balances in public spaces risks "shoulder surfing" theft; cloud platforms hold user data hostage with opaque data retention policies.
* **CofreAdmin Experience:**
  * **👁️ Quick Privacy Mode ("Shoulder Surfing Protection"):** A 1-tap eye icon in the header instantly masks all sensitive monetary values across `HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard`, and `ActiveVaultsPreview` with dot masks (`••••••`).
  * **Hybrid Local & Multi-Tenant Cloud Architecture:** Local-first IndexedDB/localStorage ensures 60 FPS offline performance, coupled with user-isolated Firestore synchronization for authenticated users.
  * **Portable Web3 Ownership:** Users can export their full unencrypted private key at any time (protected by biometrics/PIN) to import into MetaMask, Rabby, Rainbow, or hardware wallets.
  * **Self-Custody Defense Certificate & 1-Click Erasure:** 1-Tap account and cloud deletion permanently purges all operational entries from cloud databases (`userData`) and browser storage. Simultaneously, it generates an immutable cryptographic compliance receipt (`legalAuditArchive`) verifying the lawful deletion timestamp in compliance with LGPD (Art. 16/18), GDPR (Art. 17), and CCPA/CPRA regulations.

---

## 📊 Competitive Matrix: Why CofreAdmin Wins

| Feature / Experience | Traditional Neobanks | Traditional Web3 Wallets | **CofreAdmin v1.0.6** |
| :--- | :---: | :---: | :---: |
| **Self-Custody (You own the keys)** | ❌ No (Custodial bank risk) | ✅ Yes | **✅ Yes (Client-side AES-256 Web Crypto)** |
| **Instant Onboarding (No Seed Phrase)** | ✅ Yes | ❌ No (12-24 word barrier) | **✅ Yes (1-Tap Social / 1-Tap Guest)** |
| **Unified Cross-Provider Identity** | ❌ No (Siloed accounts) | ❌ No (Address only) | **✅ Yes (Google + Discord Unified Email)** |
| **Gas Fee Experience** | N/A (Hidden bank fees) | ❌ Must hold native ETH | **✅ Paid natively in USDC (EIP-3009)** |
| **Anti-Clipboard Poisoning Guard** | N/A | ❌ Vulnerable to malware | **✅ High-contrast prefix/suffix badges** |
| **Basenames & ENS Resolution** | ❌ No | ⚠️ Partial (ENS only) | **✅ Full Basenames & ENS with anti-spoof** |
| **Quick Privacy Mode (Shoulder Surfing)** | ⚠️ Basic | ❌ Rarely supported | **✅ 1-Tap synchronized dashboard masking** |
| **PWA (No App Store Approval Risk)** | ❌ No (Native stores only) | ❌ No (Browser extension / app) | **✅ Yes (Universal 60 FPS Web App)** |
| **Cryptographic Agility Engine** | ❌ No | ❌ Fixed key derivation | **✅ 3-Gen Agility (v1-v3) + 1-Click Sweep** |
| **Dollar Savings Vaults & Milestones** | ⚠️ Partial (Fiat only) | ❌ No (Single balance) | **✅ Native USDC segregated vaults** |
| **Living Ledger & Human Memos** | ✅ Yes | ❌ Raw hashes only | **✅ Human memos, tags & categories** |
| **1-Tap Alert Categorization** | ❌ No | ❌ No | **✅ Direct categorization on alert banner** |
| **Real-time Local Fiat / USDC Ticker** | ❌ No | ⚠️ Basic (USD only) | **✅ Live Local Fiat ⇄ USDC Conversion** |
| **Accountant PDF & CSV Export** | ✅ Yes | ❌ External tool needed | **✅ 1-Click built-in export** |
| **Cryptographic Legal Erasure Certificate** | ❌ No | ❌ No | **✅ 1-Click LGPD/GDPR Audit Certificate** |

---

🎮 Discord: `@cofreadmin` • 📧 Email: [support](mailto:cofreadminwallet@gmail.com) • 🌐 Open-Source: AGPL-3.0-or-later