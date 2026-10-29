# TERMS OF USE, PRIVACY POLICY, AND DISCLAIMER

**Application:** CofreAdmin Wallet (Web3 Self-Custodial Personal Finance)  
*By using our application, you fully agree to the conditions, policies, and disclaimers described in this unified document. If you do not agree with any term set forth herein, you must not use the application.*

---

## PART 1: TERMS OF USE AND GLOBAL JURISDICTIONS

### 1.1. Scope of Service
CofreAdmin is a Web3 personal financial management and control application (Web3 Self-Custodial Financial Manager)[cite: 1]. The app provides visual tools for creating goals, tracking expenses, recording evolution, and offering technical integration with a digital wallet in USDC (Stablecoin) on the Base network blockchain (an Ethereum L2 scaling layer)[cite: 1, 2].  
CofreAdmin operates and manages financial records based on USDC (USD Coin), a stablecoin whose issuance and economic parity are pegged to the US Dollar (USD)[cite: 1]. The user acknowledges that USDC operates on a decentralized blockchain infrastructure, subject to the technological rules of the issuer protocol and the transfer network[cite: 1]. The platform exercises no interference, direct custody of private keys, or guarantees regarding global macroeconomic stability or systemic failures of third-party networks[cite: 1].

### 1.2. Global Eligibility & Regional Legal Frameworks
CofreAdmin is designed for users starting from 14 years of age globally[cite: 1]. To ensure international compliance, the application aligns with specific regional standards:
* **Brazil (LGPD - Lei Geral de Proteção de Dados, Lei nº 13.709/2018 & ECA):** Users between 14 and 18 years of age declare they possess the authorization and assistance of their parents or legal guardians to accept these terms and use the platform[cite: 1].
* **European Union (GDPR - General Data Protection Regulation):** Complies with strict data subject rights, lawful bases for processing, data minimization, and cross-border transfer protections for users residing within the European Economic Area (EEA)[cite: 1].
* **United States (CCPA/CPRA & COPPA):** Complies with California consumer privacy standards (CCPA/CPRA) regarding data collection transparency and opt-out rights, as well as the Children's Online Privacy Protection Act (COPPA), requiring verifiable parental consent for users under the age of 13 where applicable[cite: 1].

---

## PART 2: DISCLAIMER (DECENTRALIZATION & WEB3 EXEMPTIONS)

### 2.1. Strictly Non-Custodial Nature and Blockchain Infrastructure
CofreAdmin is not a financial institution, traditional bank, broker, money transmitter, or asset custodian[cite: 1]. Any cryptocurrency, token, digital balance, or asset transferred to the wallet generated within the application is stored in a decentralized manner directly on the Base network blockchain[cite: 1, 2]. CofreAdmin functions exclusively as a visual interface software and self-custody client enabling the user to interact with the blockchain network[cite: 1]. We do not have access, possession, control, custody, or management over user funds[cite: 1, 2].

### 2.2. Cryptographic Key Architecture and Exclusive Responsibility
Your wallet is generated locally using BIP-39 12-word mnemonics[cite: 2]. The private key is generated exclusively within your browser or device using the operating system's Web Crypto API[cite: 1]. It is protected at rest by 256-bit AES-GCM symmetric encryption powered by a non-extractable IndexedDB `CryptoKey` (v3 envelope) or PBKDF2 100k iterations key derivation (v2 envelope)[cite: 2]. No server, backend API, or database belonging to CofreAdmin receives, transmits, stores, or holds a copy of your private key or mnemonic phrase[cite: 1, 2]. It is the sole and exclusive responsibility of the user to safeguard, secure, and back up their access credentials, private keys, or recovery phrases[cite: 1]. In the event of lost device access, lost secret keys, or account deletion without prior withdrawal, CofreAdmin has no technical means to recover your digital assets[cite: 1]. The loss of keys implies the irreversible loss of funds on the Base network[cite: 1].

### 2.3. Volatility, Network Fees, and Technological Risks
The user assumes full responsibility for market risks when operating with digital assets, including price volatility[cite: 1]. CofreAdmin utilizes EIP-3009 (TransferWithAuthorization) meta-transaction rails for gasless experiences, paying transaction and protocol fees directly from USDC balances[cite: 2]. However, CofreAdmin is not responsible for baseline network fees charged by the Base network blockchain, slippage variations, or failures in transaction validation native to the decentralized network itself[cite: 1, 2].

---

## PART 3: PRIVACY POLICY AND DATA SECURITY

### 3.1. Collected Data and Strict Purposes
* **Personal Information:** Name, E-mail Address, and User IDs via OAuth Login (Google and Discord) collected for the strict purposes of security authentication and account management[cite: 1, 2].
* **Financial Information and Goals:** Balances of visual safes, smart ledger categorizations, transaction memos, and your public wallet address on the Base network, synchronized in Firebase/Firestore for app functionality and cross-device synchronization on authorized devices[cite: 1, 2]. In offline or guest mode (when cloud databases are not configured), this data remains strictly in Local Storage[cite: 2].
* **Approximate Location:** Inferred through the device's IP address for session security and fraud prevention[cite: 1].
* **Performance and Diagnostic Information:** Technical error and crash data collected for technical analysis and bug fixes[cite: 1].

### 3.2. Access Control and Security Hardening
CofreAdmin's cloud database operates under strict access control rules (Firestore Security Rules)[cite: 1, 2]. Each authenticated user has exclusive read and write access strictly to their own records via verified-email ownership[cite: 1, 2]. No external entity or user has technical permission to inspect, alter, or query third-party financial dashboards[cite: 1]. 

### 3.3. Encryption and Device Security
All data transmitted by CofreAdmin utilizes state-of-the-art encryption in transit (HTTPS/TLS protocols)[cite: 1]. Local self-custody keys are encrypted at rest using military-standard 256-bit AES-GCM algorithms[cite: 1, 2]. Additionally, local session locking utilizes client-side SHA-256 PIN hashing with an isolated device salt and WebAuthn hardware biometrics (Fingerprint / Face ID)[cite: 2]. These authentication artifacts and PINs are never transmitted to our servers[cite: 2].

### 3.4. Ads and Push Notifications
We utilize Push Notifications for announcements/updates *only* if the user clicks "Allow," "Accept," or equivalent[cite: 1]. The process is entirely anonymous and does not collect personal data (such as name or email)[cite: 1]. You remain in full control and can unsubscribe at any time directly through your browser or device settings[cite: 1].

---

## PART 4: ACCOUNT DELETION AND BLOCKCHAIN IMMUTABILITY

### 4.1. Right to Deletion (Global Privacy Standards)
In compliance with international data protection laws (including LGPD, GDPR, and CCPA), the user has the right to request the total and permanent deletion of their data from CofreAdmin servers at any time through the application options or official support channels[cite: 1, 2].

### 4.2. Private Server Deletion Flow
Upon processing a deletion request from CofreAdmin, all operational and financial data (expenses, revenues, categories, and safes) are definitively and permanently destroyed from our servers[cite: 1, 2].

### 4.3. Special Web3 Rule: Blockchain Immutability and Legal Compliance
The user acknowledges that, due to the native limitations and characteristics of blockchain technology, public transaction records and the digital wallet address are permanent and immutable[cite: 1]. The digital wallet will continue to exist autonomously on the blockchain under the exclusive ownership of the private key holder[cite: 1, 2].  
To the extent permitted by applicable laws (such as Article 7, Item VI, and Article 16 of the Brazilian LGPD, GDPR compliance exceptions, and equivalent global frameworks) for the regular exercise of rights in judicial, tax, or administrative proceedings, CofreAdmin shall retain in a segregated and protected manner a technical audit and compliance log (including First-Access Privacy Policy Clickwrap and Wallet Backup Acknowledgment Certificates)[cite: 1, 2]. This write-once record shall contain the timestamp of the acceptance of terms, deletion requests, SHA-256 hashed identifiers, authenticated email, audit fingerprints, and wallet addresses, maintained exclusively for security traceability and platform defense, completely dissociated from financial transaction data after deletion[cite: 1, 2].

---

## PART 5: USER SUPPORT AND CLARIFICATIONS

The application provides a support channel exclusively for clarifying conceptual doubts, receiving suggestions/feedback, and reporting technical issues[cite: 1].

* **Scope Limitation:** Being a non-custodial / self-custodial application, the user acknowledges that the application **does not have access, control, or custody** over the user's private keys, seed phrases, passwords, or digital assets[cite: 1, 2].
* **Impossibility of Intervention:** Support **does not perform and lacks the technical capability to perform:** private key recovery, blockchain transaction reversals, operation cancellations, or corrections of user errors made during asset transfers[cite: 1, 2].
* **Available Channels:** Users may contact support via email at: **cofreadminwallet@gmail.com**[cite: 1], through the official Discord at **@cofreadmin**[cite: 2], and/or through the feedback channel provided within the application itself[cite: 1, 2].
* **SLA Disclaimer:** Messages will be read and answered based on team availability, generating no service level agreement (SLA) or obligation for immediate resolutions[cite: 1].
