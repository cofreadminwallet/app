# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented instantaneous Trust Wallet-style on-screen numeric keypad with 4-digit PIN verification and interactive visual indicator dots in `AppLockScreen`.
- Added secure client-side 4-digit PIN hashing with persistent device salt and SHA-256 via Web Crypto API in `webAuthnService`.
- Added dedicated 4-digit Security PIN creation and update modal in `ProfileSettingsScreen` (Security section).
- Added direct 1-tap biometric unlock button and physical keyboard listening (0–9 and Backspace) to the lock screen.
- Embedded official CofreAdmin vault icon into PDF statement exports with resilient vector fallback for offline reliability.
- Added titular Web3 Base wallet display and discreet on-chain activity indicators (`[Base]`) in exported financial statements.
- Added dynamic bilingual multi-page numbering (`Page X of Y` / `Página X de Y`) across all exported statement pages.

### Changed
- Streamlined device security unlocking: suppressed Google Password Manager account selector sheet by configuring `residentKey: 'discouraged'` and platform-only transports (`['internal']`), enabling instant biometrics or PIN verification with zero delay.
- Streamlined PDF statement header banner: replaced redundant standalone `COFREADMIN` title text with official document titles (`FINANCIAL STATEMENT` / `EXTRATO FINANCEIRO`), clear subtitle descriptors, and brand slogans.
- Refactored payment and transfer feedback in `CryptoSendModal` to distinguish between business warnings and system errors. Insufficient balance notifications now render as amber warnings without error reporting buttons.
- Translated all blockchain validation error messages in `web3Service` to English for international consistency.

### Fixed
- Fixed unlock latency and repetitive passkey credential selector popups on locked app launch.
- Fixed localization inconsistency where insufficient balance alerts appeared in Portuguese even when the active application language was set to English (`en-US`).
- Fixed vault allocation validation toasts in `App.tsx` to dynamically respect the user's selected language.

## [1.0.4-b] - 2026-10-27

### Added
- Centralized version configuration in `src/config/version.ts` with visual badge indicators across header and authentication views.
- Strict license header and AGPL-3.0 compliance auditing across build scripts and client bundles.

### Changed
- Standardized UI badge typography, contrast, and responsive layout across mobile and desktop breakpoints.
- Enhanced dev server and build pipelines with automated Firebase bundling patches in `scripts/patch-firebase.cjs`.

### Security
- Reinforced public repository hygiene: strictly prevented private keys, credentials, and sensitive configuration files from git staging.

## [1.0.4] - 2026-10-25

### Added
- Resilient multi-device cloud synchronization with conflict resolution and offline-first capabilities.
- Real-time Firestore snapshot listeners for multi-session vault balance and transaction synchronization.

### Changed
- Enhanced non-destructive snapshot merging (`mergeLocalAndCloudData`) to prevent data loss across concurrent login sessions.

### Fixed
- Fixed race conditions during simultaneous vault updates from multiple browser tabs.

## [1.0.3] - 2026-10-20

### Added
- Self-custodial Web3 encrypted vault integration (`cryptoVault`) supporting local cryptographic key isolation.
- Multi-key backward compatibility resolution (`getCandidateDocIds` and `getCandidateStorageKeys`) supporting Google and Discord identities.

### Security
- Client-side key derivation and AES-GCM vault encryption ensuring zero-plaintext exposure of private credentials.
- Zero-leakage memory clearing for decrypted cryptographic material upon session termination.

## [1.0.2] - 2026-10-10

### Added
- Implementation of the Repository Pattern with strict interfaces in `src/services/types.ts` (`IDatabaseService`, `IAuthService`, `IBillingService`).
- Pluggable storage architecture supporting LocalStorage, IndexedDB, and Firebase Firestore implementations.

### Changed
- Decoupled UI components from direct persistence calls, directing all data access through the `src/services/` service layer facade.

## [1.0.0] - 2026-09-15

### Added
- Initial public release of CofreAdmin.
- Personal finance and investment vault management interface with target allocations and rebalancing tools.
- Real-time asset quotation tracking and portfolio valuation dashboard.
- Multi-provider authentication supporting Google and Discord OAuth integrations.
- Bilingual localization framework (`en-US` and `pt-BR`) with automatic locale detection.
