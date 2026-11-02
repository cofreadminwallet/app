# Changelog

All notable changes to this project will be documented in this file.

## [1.0.6] - 2026-11-01

### Added
- **Quick Privacy Mode ("Shoulder Surfing Protection"):** Synchronized 1-tap balance masking across the entire dashboard (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard`, and `ActiveVaultsPreview`), concealing financial figures with discrete bullet indicators (`••••`) for privacy in public areas.
- **Anti-Clipboard Poisoning Visual Protection:** High-contrast prefix (first 6 characters) and suffix (last 4 characters) badge segmentation with an integrated anti-adulteration verification badge in `CryptoSendModal` across both payment amount and review steps.

### Fixed
- **Multi-Provider Identity & Web3 Vault Unification (OAuth & Web3 Vault):** Unifies access to the same profile and cryptographic vault for identical verified emails (Google/Discord), eliminating the risk of accidental private key overwrite and ensuring international regulatory compliance (GDPR Art. 17/20, CCPA/CPRA, and LGPD) for single data subject consolidation and right-to-erasure integrity:
  - Eliminates artificial login provider segregation in `LoginScreen.tsx` and removes obsolete cross-provider wallet discard logic in `web3Service.ts`.
  - Enables persistent cloud synchronization and restoration via Firestore for Discord accounts sharing a verified email.
  - Prevents unintended key regeneration and recurring terms of service prompts for pre-existing accounts.

## [1.0.5-b] - 2026-10-29

### Added
- Added Quick Privacy Mode ("Shoulder Surfing Protection"): Synchronized 1-tap balance masking across the entire dashboard (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard`, and `ActiveVaultsPreview`), concealing financial figures with discrete bullet indicators (`••••`) for privacy in public areas.
- Added Anti-Clipboard Poisoning Visual Protection: Implemented high-contrast prefix (first 6 characters) and suffix (last 4 characters) badge segmentation with an integrated verification badge in `CryptoSendModal` across both payment amount and review steps.
- Added direct navigation link to `CHANGELOG.md` in the project header documentation.
- Added comprehensive multilingual documentation suite (`README.pt-BR.md`, `README.es-ES.md`, and `README.zh-Hans.md`) with unified language switcher navigation for global Web3 developers and investors.
- Documented multi-jurisdictional compliance across Brazil (LGPD), European Union (GDPR), and United States (CCPA/CPRA) for immutable audit and account erasure certificates.

### Changed
- Streamlined `LegalTermsModal` simplified summary into a rapid-read format, removing regional law acronyms from the quick overview and delegating statutory articles to full documentation.
- Upgraded Contact card action icons in `ProfileSettingsScreen`:
  - Feedback: updated to `MessageSquareHeart` for welcoming community suggestions.
  - Support: updated to `LifeBuoy` (helpdesk standard), replacing the alarmist `AlertCircle`.
  - About: updated to official `Github` open-source repository symbol.
- Refined mobile keypad ergonomics in `AppLockScreen` (`gap-2 sm:gap-3`, `h-13 sm:h-16`) and contact button row (`w-9 h-9 sm:w-10 sm:h-10`) for narrow screens (<360px).

### Fixed
- Fixed Google vs Discord account and wallet unification for shared verified emails:
  - Eliminated artificial provider segregation in `LoginScreen.tsx` that rejected existing Google profiles on Discord login.
  - Removed cross-provider wallet discard logic in `Web3Service.ts` that erroneously wiped the existing wallet and triggered unwanted new wallet generation.
  - Enabled Firestore cloud snapshot restoration for Discord logins, ensuring persistent synchronization of balances, terms acceptance, and BIP-39 credentials across providers.
- Fixed HTML parsing issues in Markdown readers by standardizing clean Markdown headings.
- Fixed "ghost wallet" address flicker (`0xdC1...` temporarily reappearing before flipping to `0xed4...`):
  - Prioritized modern isolated provider keys (`google_*` / `discord_*`) during initial synchronous storage retrieval in `localStorageDb.getUser()`.
  - Enforced local device keystore as strictly authoritative in `mergeLocalAndCloudData`, preventing older Firestore documents from reviving legacy wallet addresses.
  - Added automatic cloud reconciliation: if cloud snapshot contains an outdated wallet address, flagged for immediate silent background write to update Firestore permanently.
  - Automatically cleared pending migration staging for sub-dust legacy balances (< $0.25 USDC with 0 ETH) to eliminate recurring migration popups.

## [1.0.5] - 2026-10-28

### Added
- Implemented instantaneous Trust Wallet-style on-screen numeric keypad with 4-digit PIN verification and interactive visual indicator dots in `AppLockScreen`.
- Added secure client-side 4-digit PIN hashing with persistent device salt and SHA-256 via Web Crypto API in `webAuthnService`.
- Added dedicated 4-digit Security PIN creation and update modal in `ProfileSettingsScreen` (Security section).
- Added direct 1-tap biometric unlock button and physical keyboard listening (0–9 and Backspace) to the lock screen.
- Embedded official CofreAdmin vault icon into PDF statement exports with resilient vector fallback for offline reliability.
- Added titular Web3 Base wallet display and discreet on-chain activity indicators (`[Base]`) in exported financial statements.
- Added dynamic bilingual multi-page numbering (`Page X of Y` / `Página X de Y`) across all exported statement pages.
- Added zero-cache headers (`no-store, no-cache, must-revalidate, max-age=0`) for `/sw.js` and `/manifest.json` in `server.ts` to ensure instant client version propagation.
- Added mobile PWA foreground visibility listener (`visibilitychange` / `focus`) in `src/services/cacheManager.ts` to trigger automatic Service Worker byte checks upon app resume.
- Added reload-loop throttling guard in `src/services/appUpdateService.ts`.

### Changed
- Bumped Service Worker cache namespace to `cofreadmin-cache-v27` with aggressive cleanup of stale cache stores on activation.
- Streamlined device security unlocking: suppressed Google Password Manager account selector sheet by configuring `residentKey: 'discouraged'` and platform-only transports (`['internal']`), enabling instant biometrics or PIN verification with zero delay.
- Streamlined PDF statement header banner: replaced redundant standalone `COFREADMIN` title text with official document titles (`FINANCIAL STATEMENT` / `EXTRATO FINANCEIRO`), clear subtitle descriptors, and brand slogans.
- Refactored payment and transfer feedback in `CryptoSendModal` to distinguish between business warnings and system errors. Insufficient balance notifications now render as amber warnings without error reporting buttons.
- Translated all blockchain validation error messages in `web3Service` to English for international consistency.

### Fixed
- Fixed unlock latency and repetitive passkey credential selector popups on locked app launch.
- Fixed unwanted Android Chrome / Google Translate bottom sheet bar popping up on mobile PWA launch by adding `notranslate` attributes and meta tags while keeping automatic locale/language detection 100% active.
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
