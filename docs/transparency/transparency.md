# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Public Transparency Guide & Economic Model • Investor & Technical Overview <br>
> Version: **v1.0.6** • Licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

🌐 **Languages:** **[English](transparency.md)** • **[Português](transparency-pt-BR.md)** • **[Español](transparency-es-ES.md)** • **[简体中文](transparency-zh-Hans.md)**

---

## 📑 Document Structure
1. [Token & Funds Flow Architecture (EIP-3009)](#1-token--funds-flow-architecture)
2. [Official Institutional Infrastructure & Ecosystem Stack](#2-official-institutional-infrastructure--ecosystem-stack)
3. [Self-Custodial Security & Privacy Guarantees](#3-self-custodial-security--privacy-guarantees)
4. [Sustainable Business Model & Revenue Mechanics](#4-sustainable-business-model--revenue-mechanics)
5. [Auditability, Compliance & Regulatory Standards](#5-auditability-compliance--regulatory-standards)
6. [Ecosystem Contacts & Verification](#6-ecosystem-contacts--verification)

---

## 1. Token & Funds Flow Architecture

CofreAdmin operates on a **direct, decentralized, and non-custodial flow model** anchored on the Base network (Coinbase's Ethereum Layer 2). Transacted funds never pass through intermediary developer custody:

```
[ Sender User (Client Browser) ]
              │
              │ 1. Signs EIP-3009 transfer-with-authorization locally (v, r, s)
              ▼
[ Relayer Dispatcher / Paymaster ]
              │
              │ 2. Submits atomic transaction to Base blockchain using Relayer Gas
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Official Circle USDC Contract on Base:                      │
│ Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913         │
│                                                             │
│ ├──> [99.8% Net Amount]        ──> Recipient Address        │
│ ├──> [0.2% Protocol Micro-Fee] ──> Dev Treasury Wallet      │
│ └──> [Gas Cost Reimbursement]  ──> Relayer Gas Pool         │
└─────────────────────────────────────────────────────────────┘
```

### Inviolable Flow Guarantees:
1. **Zero Liquidity Trap:** All USDC transfers execute directly from the sender's address to the recipient's address. Execution is handled atomically in a single block by Circle’s audited official smart contract.
2. **Gas Abstraction (No ETH Required):** Users transact 100% in digital dollars (USDC). Sub-cent network fees are reimbursed to the relayer directly from the fractional USDC transfer value via EIP-3009 signatures, eliminating the need for users to acquire, bridge, or manage ETH.
3. **Immutable Protocol Split:** The protocol micro-fee (0.2%, minimum $0.05 USD) is routed automatically and transparently into the designated developer treasury wallet without any discretionary manual handling.

---

## 2. Official Institutional Infrastructure & Ecosystem Stack

CofreAdmin builds exclusively upon battle-tested, institutional-grade infrastructure:

| Component | Official Provider / Standard | Technical & Operational Function |
| :--- | :--- | :--- |
| **Layer 2 Blockchain** | **Base (Coinbase)** | High-throughput, sub-cent gas fees, and 2-second block finality inheriting Ethereum L1 security. |
| **Settlement Currency** | **Circle (USDC)** | Regulated, dollar-backed digital currency with audited ERC-20 and EIP-3009 smart contracts. |
| **Official USDC Contract** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Verified canonical USDC deployment on Base network. |
| **Web3 Client Engine** | **Viem & Wagmi** | Type-safe, high-performance cryptographic signing and EVM address derivation. |
| **Biometric Auth** | **WebAuthn / W3C Passkeys** | Hardware-level biometric verification (Touch ID, Face ID, Fingerprint, Windows Hello). |
| **PIN Security** | **Tactile Randomized Keypad** | Hardware-salted SHA-256 local hashing with dynamic keypad scrambling against shoulder-surfing. |
| **Name Resolution** | **Basenames (`.base.eth`) & ENS (`.eth`)** | Real-time human-readable name resolver with integrated anti-homograph spoof verification. |
| **Anti-Poisoning Protection** | **High-Contrast Badge Segmentation** | Visual highlight of initial (`0x1234`) and trailing (`5678`) address segments to defeat clipboard malware. |
| **Blockchain Explorer** | **BaseScan / Blockscout** | Public, immutable transaction auditing and real-time on-chain statement reconciliation. |
| **FX Oracle Feed** | **Coinbase Spot API** | Real-time spot market exchange rate feeds for USD, BRL, EUR, and GBP. |
| **Multi-Tenant Cloud Sync** | **Google Cloud Firestore** | User-isolated cloud document store (`userData`) with cross-provider unified email identity. |

---

## 3. Self-Custodial Security & Privacy Guarantees

### A. True Self-Custody (Zero Server Custody)
* **Client-Side Derivation:** EVM private keys are generated entirely in the client browser using the Web Crypto API.
* **Envelope Encryption at Rest:** Private keys are stored locally using **AES-GCM 256-bit encryption** protected by a device-specific master envelope.
* **Multi-Generation Cryptographic Agility (`v1` → `v2` → `v3`):**
  * *v1:* Standard software derivation for legacy environments.
  * *v2:* PBKDF2 key derivation with 100,000 iterations and AES-GCM envelope encryption.
  * *v3:* Hardware-bound non-extractable Web Crypto API keys isolated inside protected IndexedDB partitions.
  * *1-Click On-Chain Sweep:* Enables seamless migration of entire balances between wallet generations in one transaction.
* **Portable Ownership:** Users can export their full unencrypted private key at any time (authorized by biometrics or PIN) to import into MetaMask, Rabby, Rainbow, or hardware wallets.

### B. Quick Privacy Mode ("Shoulder Surfing Protection")
* A 1-tap eye icon on the main header immediately masks all sensitive financial values across `HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard`, and `ActiveVaultsPreview` with bullet dots (`••••••`).
* Designed for commuters, cafes, and streaming environments, shielding user net worth from prying eyes.

---

## 4. Sustainable Business Model & Revenue Mechanics

CofreAdmin operates a transparent, volume-based economic engine designed for sustainable long-term cash flow:

### A. On-Chain Transfer Protocol Micro-Fee (0.2%)
* Across every payment or transfer executed on the Base network, a transparent **0.2% fee (with a minimum of $0.05 USD)** is routed automatically to the protocol treasury wallet (`DEV_TREASURY_WALLET`).
* **Scale Projection:**
  * **10,000 MAU** moving $200 USD/month ($2.0M Gross Volume) = **$4,000 USD/month** recurring revenue.
  * **50,000 MAU** moving $200 USD/month ($10.0M Gross Volume) = **$20,000 USD/month** recurring revenue.
  * **250,000 MAU** moving $350 USD/month ($87.5M Gross Volume) = **$175,000 USD/month** recurring revenue.

### B. Fiat On/Off-Ramp Integration Spread
* Integration with regulated local fiat on/off-ramp partners (PIX in Brazil, SEPA in Europe, ACH in the US) generates an additional floating convenience fee (0.3% - 0.7% spread) on fiat-to-USDC conversions.

### C. Enterprise Merchant & White-Label Solutions
* API licensing and custom branded payment widgets for e-commerce checkouts and creators accepting direct USDC payments on Base.

---

## 5. Auditability, Compliance & Regulatory Standards

### A. Global Regulatory Compliance (LGPD, GDPR, CCPA)
* **Zero Personal Account Locks:** 100% public, multi-tenant application with no hardcoded credentials or administrative backdoors.
* **1-Click Irrevocable Account & Data Erasure:** Users can permanently delete all cloud records (`userData`) and browser storage.
* **Immutable Compliance Proof (`legalAuditArchive`):** In strict accordance with international legal requirements (e.g., Brazilian LGPD Art. 16 and European GDPR Art. 17 exceptions), the system archives an anonymized cryptographic timestamp verifying lawful data disposal for regulatory audit defense.

### B. Open-Source Transparency
* Distributed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.
* Any public deployment of modified code must remain open-source under identical licensing terms, ensuring complete auditability for the global community.

---

🎮 Discord: `@cofreadmin` • 📧 Email: [support](mailto:cofreadminwallet@gmail.com) • 🌐 Open-Source: AGPL-3.0-or-later