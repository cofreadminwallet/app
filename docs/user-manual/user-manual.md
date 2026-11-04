# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Complete User Manual • USDC Vault Manager on Base Network <br>
> Version: **v1.0.6** • Licensed under the **Apache License, Version 2.0 (Apache-2.0)**.

🌐 **Languages:** **[English](user-manual.md)** • **[Português](user-manual-pt-BR.md)** • **[Español](user-manual-es-ES.md)** • **[简体中文](user-manual-zh-Hans.md)**

---

## 📑 Quick Index
1. [App Installation (PWA)](#1--app-installation-pwa)
2. [Access & Account Management (Google, Discord & Unified Email)](#2--access--account-management)
3. [Your Web3 Digital Wallet, FX Rate & Quick Privacy Mode](#3--your-web3-digital-wallet-fx-rate--quick-privacy-mode)
4. [How to Receive Funds (USDC on Base)](#4--how-to-receive-funds-usdc-on-base)
5. [How to Send Payments, Anti-Poisoning & Name Resolution](#5--how-to-send-payments-anti-poisoning--name-resolution)
6. [Smart Vaults (Savings & Goals)](#6--smart-vaults-savings--goals)
7. [Financial Statement, Ledger & 1-Tap Notification Categorization](#7--financial-statement-ledger--1-tap-notification-categorization)
8. [Daily Budget Monitor](#8--daily-budget-monitor)
9. [Analytics & Charts Dashboard](#9--analytics--charts-dashboard)
10. [Security, PIN Keypad, Biometrics & Multi-Generation Agility](#10--security-pin-keypad-biometrics--multi-generation-agility)
11. [Customization, Themes & Push Notifications](#11--customization-themes--push-notifications)
12. [Privacy, Global Compliance & Account Deletion](#12--privacy-global-compliance--account-deletion)
13. [Frequently Asked Questions (FAQ)](#13--frequently-asked-questions-faq)

---

## 1. 📲 App Installation (PWA)

CofreAdmin is built as a state-of-the-art **Progressive Web App (PWA)**, offering the performance and feel of native software with zero app store gatekeeping.

### On iPhone / iPad (iOS Safari):
1. Open the CofreAdmin web app in **Safari**.
2. Tap the **Share** button (the square icon with an upward arrow in the browser toolbar).
3. Scroll down and select **"Add to Home Screen"**.
4. Confirm by tapping **"Add"** in the top-right corner.
5. The CofreAdmin icon will appear on your iOS home screen, launching full-screen without address bars or browser controls.

### On Android (Google Chrome):
1. Open the CofreAdmin web app in **Google Chrome**.
2. Tap the bottom installation prompt **"Install App"** or open the **3-dot menu** in the top-right corner.
3. Choose **"Install app"** (or *"Add to Home screen"*).
4. Confirm the installation. The app will install as a standalone native app featuring custom app shortcuts and offline caching.

---

## 2. 🔑 Access & Account Management

CofreAdmin provides seamless identity options designed to protect your privacy and ensure permanent data accessibility:

* 🌐 **Sign in with Google:** Fast, zero-friction cloud synchronization across desktop and mobile devices via Google identity and Firestore cloud storage.
* 🎮 **Sign in with Discord:** Direct login tailored for Web3 communities and gamers.
* 🔄 **Cross-Provider Unified Email Identity (New in v1.0.6):**
  * When logging in via either Google or Discord using the same verified email address, CofreAdmin automatically recognizes your single legal identity.
  * Your data, existing on-chain Web3 wallet address, transaction history, and custom vaults are preserved without duplicates, prompt loops, or profile overwrites.
* 🕶️ **Guest Mode (Offline & Private):** Prefer to test without logging in? Enter as a guest. All wallet keys and ledger entries remain strictly inside your browser's local sandbox (`localStorage` and IndexedDB).
* 🚪 **Sign Out & Switching:** In the **Settings** tab, tap **"Log Out"** at any time to clear the active session from the screen while safely preserving your encrypted cloud and local data.

---

## 3. 💵 Your Web3 Digital Wallet, FX Rate & Quick Privacy Mode

Upon first launch, CofreAdmin derives a **100% self-custodial** Ethereum Virtual Machine (EVM) crypto wallet operating directly on the **Base network (Coinbase's Layer 2 blockchain)**.

* **Primary Asset (USDC):** Your account balance is denominated in **USD Coin (USDC)**, a digital dollar fully backed by cash and short-dated US treasuries.
* **Real-Time Exchange Rates:** View your balance in USDC ($) alongside your local fiat currency (e.g., BRL / R$, EUR / €, GBP / £) computed via live exchange rate oracles.
* **👁️ Quick Privacy Mode ("Shoulder Surfing Protection"):**
  * Tap the **Eye icon** on the main balance card to instantly mask your sensitive figures with dots (`••••`).
  * Privacy mode automatically syncs across the entire dashboard, including the **Daily Budget Card**, **Recent Activity Card**, and **Active Vaults Preview**.
  * Keep your finances private while checking your balances in subways, cafes, or public spaces. Tap the eye again to unmask.
* **Free Balance vs. Locked Vault Balance:**
  * **Total Balance:** All USDC funds currently held in your on-chain address.
  * **Vault Balance:** Funds reserved for your personal financial goals.
  * **Available Free Balance:** Liquid funds ready for immediate day-to-day spending. You will never accidentally spend funds locked for your dreams!
* **Network Switching:** Seamlessly toggle between **Base Mainnet** (real assets) and **Base Sepolia Testnet** (simulation and training) directly from Settings.

---

## 4. 📥 How to Receive Funds (USDC on Base)

Receive digital dollars from friends, freelance clients, or any centralized crypto exchange (e.g., Coinbase, Binance, Bybit, Mercado Bitcoin, Kraken):

1. On the Home screen or Wallet view, tap the **"Receive"** button 📲.
2. An interactive modal displays your **Official QR Code** and your **Base Wallet Address** (`0x...`).
3. **From another wallet:** Ask the sender to scan your QR code.
4. **From a centralized exchange:**
   * Tap **"Copy Address"** to copy your public address to your clipboard.
   * On your exchange's withdrawal screen, select asset **USDC** and ensure the transfer network is set to **Base**. *(Warning: Sending via other networks like Ethereum Mainnet or Polygon may result in temporary routing delays or recovery fees).*
5. **Instant Arrival:** Within 2 to 3 seconds, your transaction confirms on the Base blockchain and your live balance updates immediately.

---

## 5. 📤 How to Send Payments, Anti-Poisoning & Name Resolution

Send digital dollars globally in seconds with micro-cent transaction fees:

1. On the Home screen, tap **"Send"** 📤.
2. **Specify the Recipient:**
   * **Basenames (`.base.eth`) & ENS (`.eth`) Resolver:** Instead of long hexadecimal addresses, type human-readable Web3 names (such as `alice.base.eth` or `vitalik.eth`). CofreAdmin verifies them in real time with anti-homograph spoofing safeguards.
   * **Direct Address:** Paste any valid EVM hexadecimal address (`0x...`).
   * **QR Scanner:** Tap the camera icon to scan recipient addresses directly.
3. **🛡️ Visual Anti-Clipboard Poisoning Protection:**
   * Malicious malware often swaps clipboard contents with visually similar attacker addresses.
   * CofreAdmin features a **High-Contrast Address Badge Segmentation** displaying the **first 6** and **last 4** characters prominently alongside an **Anti-Adulteration Verification Badge**.
   * Always double-check these two highlight segments before signing!
4. **⚠️ First-Time Recipient Security Warning:**
   * When sending funds to an address you have never transacted with before, the app displays a prominent cautionary notice to prevent costly typos.
5. **Zero Native ETH Required for Gas:**
   * Powered by gas abstraction (EIP-3009) and the Circle Paymaster, **you do not need ETH in your wallet**. Network fees (typically under $0.02) are deducted directly from your fractional USDC balance.
6. **Authentication & Confirmation:**
   * Confirm the transaction using your biometric credentials (Face ID / Touch ID) or your 4-digit security PIN.
7. **Digital Receipt & Explorer Link:**
   * Every transaction generates a cryptographic receipt complete with timestamp, hash (`TxHash`), and an instant link to inspect on **BaseScan**.

---

## 6. 🎯 Smart Vaults (Savings & Goals)

Isolate your discretionary spending from your long-term milestones:

1. Tap the **"Vaults"** tab in the bottom navigation bar.
2. Tap **"+ New Vault"** 🚀.
3. **Customize Your Target:**
   * Choose an expressive icon (✈️ *Vacation*, 💻 *New Laptop*, 🚗 *Vehicle*, 🛡️ *Emergency Reserve*).
   * Define your target amount in USDC or local currency.
4. **Deposit & Track:**
   * Tap **"Deposit"** to move money from your free balance into your vault.
   * Watch the visual progress bar fill up as you approach 100%.
5. **Withdraw with Zero Penalties:**
   * Need the funds back? Tap **"Withdraw"** at any time. Capital moves instantly back to your liquid balance with zero lockups or exit fees.
6. **Celebration & Rewards:**
   * When your vault reaches 100%, CofreAdmin triggers celebratory confetti and an achievement notification!

---

## 7. 📊 Financial Statement, Ledger & 1-Tap Notification Categorization

The **"Statement"** view serves as your all-in-one financial ledger:

* **Automatic Blockchain Indexing:** On-chain deposits and transfers on Base are indexed in real time.
* **⚡ 1-Tap Real-Time Notification Categorization (New in v1.0.6):**
  * When incoming USDC arrives, a smart banner appears at the top of your screen.
  * Assign the transaction directly to a category (e.g., *Freelance*, *Salary*, *Investment*, *Sale*) with a single tap—without having to navigate to the statement tab!
* **Off-Chain Manual Entries:**
  * Record cash, debit cards, or external bank payments by clicking **"+ New Entry"**.
  * Enter description, amount, date, and custom tags.
* **Smart Search & Filters:** Filter your transactions by *Income*, *Expenses*, or custom keywords.
* **Professional PDF Export:**
  * Generate an auditable monthly statement with structured tables, timestamps, and balance totals ready for accounting and tax reporting.

---

## 8. ⏱️ Daily Budget Monitor

Maintain steady spending habits without complex budgeting sheets:

1. On the **Home** screen, check your **"Daily Budget"** widget.
2. Tap to set your target daily spending threshold (e.g., `$15.00 / day`).
3. As outflows are recorded, the progress ring tracks your consumption throughout the day, alerting you before you exceed your self-imposed limits.

---

## 9. 📈 Analytics & Charts Dashboard

Open the **"Analytics"** tab to understand your financial trends:

* **Category Breakdown:** Interactive visual breakdown of spending across categories (Groceries, Housing, Services, Dining).
* **Cash Flow Balance:** Real-time comparison between incoming cash flow and outgoing expenses.
* **Savings Velocity:** Measure what percentage of your monthly income was saved inside your Smart Vaults.

---

## 10. 🛡️ Security, PIN Keypad, Biometrics & Multi-Generation Agility

CofreAdmin is built upon a defense-in-depth security model:

### 1. Tactile 4-Digit Security PIN & WebAuthn Biometrics
* Configure an application-level PIN with our **tactile, randomized numeric keypad** (inspired by Trust Wallet).
* PINs are hashed locally using **device-salted SHA-256** and never leave your hardware.
* Enable **WebAuthn Biometrics** (Face ID, Touch ID, or Windows Hello) for instant, one-touch transaction approval.

### 2. Multi-Generation Wallet Agility Engine (`v1` → `v2` → `v3`)
* **v1 (Legacy):** Standard software derivation for legacy environments.
* **v2 (Encrypted Envelope):** Industry-standard AES-GCM 256-bit envelope encryption fortified with PBKDF2 (100,000 key derivation iterations).
* **v3 (Hardware-Bound):** Hardware-backed non-extractable Web Crypto API keys stored inside protected IndexedDB partitions.
* **1-Click On-Chain Balance Sweep:** Seamlessly migrate and sweep all funds between cryptographic wallet generations in one transaction.

### 3. Non-Custodial Private Key Backup
* Your private key is yours alone.
* To export your key: Go to **Settings** > **Wallet & Security** > **"Backup Private Key"**.
* Authenticate your identity, copy your key, and store it safely in an offline manager.
* You can import this key into MetaMask, Rabby, Rainbow, or Coinbase Wallet whenever you wish.

---

## 11. 🎨 Customization, Themes & Push Notifications

* **Neo-Brutalism & Modern Themes:** Choose between vivid high-contrast aesthetics or dark high-legibility palettes.
* **Custom Profiles:** Personalize your avatar and public `@handle`.
* **Push Notifications:** Stay informed with real-time browser alerts when funds land on-chain or a goal is reached.
* **Offline JSON Backup:** Download a full offline encrypted snapshot of your profile, ledger, and goals at any time.

---

## 12. 🔒 Privacy, Global Compliance & Account Deletion

CofreAdmin guarantees total data sovereignty in compliance with international standards (GDPR, LGPD, and CCPA):

### Complete Account & Data Erasure:
1. Navigate to **Settings** and scroll to **Privacy & Data**.
2. Tap **"Delete My Account and Data"**.
3. **What happens:**
   * **Database Purge:** All cloud records in `userData` are permanently deleted.
   * **Client Eradication:** Local browser storage, cookies, and cached states are wiped clean.
   * **Immutable Compliance Archive:** In strict adherence to international regulatory audit requirements (e.g., Brazilian LGPD Art. 16 and GDPR Art. 17 exceptions), an anonymized cryptographic receipt (`legalAuditArchive`) records the lawful deletion timestamp.
   * *Note: Be sure to withdraw your on-chain USDC or export your private key before deleting your account.*

---

## 13. ❓ Frequently Asked Questions (FAQ)

### What makes Base network so fast and inexpensive?
Base is an Ethereum Layer 2 roll-up developed by Coinbase. It bundles multiple transactions together and posts compressed cryptographic proofs to Ethereum, reducing fees to fractions of a cent while inheriting Ethereum's institutional security.

### How does Cross-Provider Account Unification work?
If you sign in with Google and later sign in with Discord using the same verified email address, CofreAdmin detects the matching verified identifier. It preserves your single unified profile, wallet address, and cloud data without requiring you to re-accept terms or creating split accounts.

### What is the Quick Privacy Mode?
By tapping the eye icon on your balance card, all monetary values across your dashboard are masked (`••••`). This protects your balance from prying eyes when in public spaces.

### Can I send funds to Basenames or ENS names?
Yes! Type any `.base.eth` or `.eth` handle directly in the send field. The app resolves the on-chain address automatically and displays safety checks.

### Do I ever need ETH to transfer USDC?
No. Gas sponsorship via EIP-3009 abstracts all network fees, allowing you to send transactions using micro-deductions from your USDC balance.

### Who controls my funds?
Only you. CofreAdmin is non-custodial. No third party, server, or developer can freeze, seize, or move your assets.

---
🎮 Discord: `@cofreadmin` • 📧 Email: [support](mailto:cofreadminwallet@gmail.com) • 🌐 Open-Source: Apache-2.0
