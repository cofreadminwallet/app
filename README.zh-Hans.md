# CofreAdmin Wallet

> <img src="./public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> 基于 Base 网络的原生 USDC 数字美元金库管理系统 <br>
> 当前版本：**v1.0.6** • 官方文档：**[技术文档与资源库](./docs/)**；**[白皮书 (Whitepaper)](./docs/whitepaper/whitepaper-zh-Hans.md)**；**[变更日志 (Changelog)](./CHANGELOG.md)** <br>
> 遵循开源协议：**Apache License, Version 2.0 (Apache-2.0)**。

🌐 **语言选择 (Languages):** **[English](./README.md)** • **[Português](./README.pt-BR.md)** • **[Español](./README.es-ES.md)** • **[简体中文](./README.zh-Hans.md)**

---

## 📖 项目概述 (Overview)

**CofreAdmin** 是一款开源的**完全自托管 (Self-Custodial)** Web3 个人财务管理系统与数字美元钱包，构建于以太坊二层网络 **Base (Ethereum Layer 2)** 之上。

CofreAdmin 结合了现代商业数字银行的流畅体验与 Web3 的底层主权，彻底消除了传统区块链交互的技术门槛：用户能够轻松在数字美元金库中进行定期储蓄、完成秒级无 Gas 支付，并通过可读的文字备注清晰记账——在此过程中，用户始终持有私钥的 **100% 独立密码学掌控权**。

---

## ✨ 核心特性 (Key Features)

- 🛡️ **纯粹的密码学自托管 (BIP-39 + WebCrypto 版本化保险库)：** 钱包完全在用户本地浏览器生成，严格遵循 **BIP-39 12 词助记词**标准（`generateMnemonic` 与 `mnemonicToAccount` 分层确定性派生），并通过 **AES-GCM 256 位**高强度算法在静止状态下加密保护。秘钥存储由浏览器 **IndexedDB 中标记为不可导出 (`extractable: false`) 的 `CryptoKey`**（`v3` 规范）或 **100,000 次迭代的 PBKDF2 强化算法**（`v2` 规范）驱动。任何云端数据库与服务器均无法获取、查看或存储用户的私钥或助记词。
- 👁️ **极速隐私防护模式（防窥探 Shoulder Surfing）：** 全局控制台一键隐蔽余额（`HeroBalanceCard`、`DailyBudgetCard`、`RecentActivityCard` 和 `ActiveVaultsPreview`），在公共场所将财务数据遮蔽为离散圆点（`••••`）。
- 📋 **防剪贴板投毒视觉校验（Anti-Clipboard Poisoning）：** 在 `CryptoSendModal` 转账与复核界面实施高对比度首 6 位与尾 4 位字符徽章高亮，配合防篡改校验标记，全力防范恶意剪贴板地址劫持攻击。
- 🔄 **连续密码敏捷性与多代账户升级引擎：** 独创向前兼容的版本化钱包架构（`v1` → `v2` → `v3`+），可自动探查 Base L2 上前序历史世代的残存资产，提供一键链上资金归集扫块功能并强制要求安全备份——确保在现行与未来的密码学升级中实现**资金零损失**。
- 💵 **数字美元专储金库 (Base 链上原生 USDC)：** 支持根据财务规划建立个性化储蓄金库，设定目标金额与完成期限，将日常开销资金与中长期储备资产进行结构化物理隔离。
- ⛽ **极致的零 ETH 无 Gas 体验 (Gasless)：** 基于 Circle Paymaster 官方支付管道与 EIP-3009 授权转账标准（`TransferWithAuthorization` 元交易），手续费直接由 USDC 余额结算——用户账户中无需预存任何 ETH 原生 Gas 资产。
- 📇 **受信任通讯录、Basenames (`.base.eth`) 解析与陌生收款人防御：** 收藏常用联系人，支持解析 `.base.eth`（Base L2 Resolver）与 `.eth`（ENS）域名并配备反同形字钓鱼欺诈保护。首次向陌生地址转账时系统将触发前置安全风控拦截。
- ⚡ **秒级扫码付、预填金额支付链接与链上可审计凭证：** 支持扫描 QR 码，生成包含 USDC 或法币预置金额的 1 键收款深层链接（EIP-681 + Web Deep Links），并可即时生成附带 BaseScan 链上审计二维码的高分辨率对账收据。
- 🏷️ **智能对账单、可读备注与一键即时分类：** 将复杂的区块链交易哈希（`0x3f...`）自动映射为业务名称（如 *"超市采购"*, *"技术咨询服务费"*）。当收到链上进账时，用户可**直接在悬浮实时通知栏上一键完成账目分类**，无需打断当前页面。
- 🔒 **Trust Wallet 风格极速应用锁与 4 位实体 PIN 键盘：** 采用纯客户端 SHA-256 结合设备唯一盐值的安全加密，搭配防窥探的 4 位动态指示灯与物理触感软键盘，硬件生物识别（指纹 / 面容 ID）经过底层参数深度优化，无弹窗打扰，解锁耗时低于 50 毫秒。
- 📊 **专业财务分析与会计级 PDF 对账单导出：** 实时追踪每日预算支出步调，展示各分类支出占比，支持导出带有官方金库印章与链上钱包标识的双语会计级 PDF 财务报表。
- 📱 **渐进式 Web 应用 (PWA)：** 无需依赖应用商店中介审核，支持直接安装至 iOS 与 Android 桌面，具备纯本地离线持久化与抗审查运行能力。

---

## 🛠️ 技术栈 (Tech Stack)

- **开发语言与运行时：** TypeScript (`~5.8`), Node.js (`>=20`)
- **前端技术：** React 19, Vite 6, Tailwind CSS 4, Motion 动效库
- **软件架构与数据持久层：** 整洁架构 **仓库模式 / 服务契约层 (Repository Pattern / Service Layer)**（位于 `src/services/`，包含 `IDatabaseService`, `IAuthService`, `IBillingService`），支持本地即时读写与云端静默双向同步，仅需修改 1 行代码即可任意切换数据库基础设施
- **Web3 与区块链：** Viem 2（EVM / Base Layer 2, BIP-39 HD 账户体系, EIP-3009 元交易标准）
- **服务端与打包工具：** Express 4, esbuild
- **生产托管环境：** *(云服务平台无关，预配置开箱即用支持 Firebase App Hosting)*

---

## 🏗️ 整洁架构与服务仓库层设计 (`src/services/`)

CofreAdmin 的核心业务逻辑与 React UI 视图完全解耦，严禁任何业务界面直接调用 `firebase/*` SDK 或直接操作 `localStorage`：

| 核心文件 | 职责定位 |
| :--- | :--- |
| [`src/services/types.ts`](./src/services/types.ts) | 强类型领域模型（`UserProfile`, `Vault`, `Transaction`, `Category`, `SavedContact`, `OnChainLedgerEntry`，多租户支持）及标准服务契约接口（`IDatabaseService`, `IAuthService`, `IBillingService`）。 |
| [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts) | `LocalStorageDatabaseService` — 离线优先本地持久化、多账户存储严格隔离、交易数据清洗脱敏与会话管理。 |
| [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) | `FirebaseDatabaseService` 与 `FirebaseAuthService` — 100% 封装 `firebase/app`, `firebase/auth` 与 `firebase/firestore` 调用。具备 `.env` 环境变量自适应检测，缺失云端配置时自动平滑回退至纯本地运行模式。 |
| [`src/services/currentDb.ts`](./src/services/currentDb.ts) | `HybridDatabaseService` — 混合型数据服务，将本地毫秒级响应与云端 Firestore 静默备份有机融合，通过 `mergeLocalAndCloudData` 实现无冲突数据合并。 |
| [`src/services/index.ts`](./src/services/index.ts) | **全局单点依赖注入中心**，导出单例 `db`, `authService` 和 `billingService`。如需切换后端架构（例如迁移至 Supabase, PostgreSQL/Cloud SQL 或自建 REST API），仅需**更改此处的单行引用**。 |

---

## 📋 环境准备 (Prerequisites)

在本地构建或部署之前，请确保您的开发机器满足以下基础环境：

- **Node.js:** `v20.0.0` 或更高版本（推荐使用 `v22.x LTS`）
- **npm:** `v10.0.0` 或更高版本
- **Git**

---

## 🚀 本地安装与开发流程

执行以下命令即可在本地快速启动独立测试实例：

### 1. 克隆代码仓库

```bash
git clone https://github.com/cofreadminwallet/app.git
cd app
```

### 2. 安装项目依赖

```bash
npm install
```

### 3. 配置本地环境变量

复制环境配置模板文件 `.env.example` 并重命名为 `.env`：

```bash
cp .env.example .env
```

### 4. 启动本地开发热更服务器

```bash
npm run dev
```

启动完成后，访问浏览器 `http://localhost:3000` 即可开始使用。

### 5. 生产构建验证

```bash
npm run build
npm run start
```

---

## ⚙️ 环境变量与系统配置 (`.env`)

所有关键配置均统一收敛于环境变量中，可根据需求定制修改 `.env`：

### A. Firebase 云数据库与 Google 社交登录

Firebase 负责提供多端云端数据漫游与 Google 账户一键登录功能。*(在离线 / 访客模式下，即便未配置 `VITE_FIREBASE_API_KEY`，系统亦能 100% 正常运行，无任何控制台报错)*。

> **💡 开启 Google 登录配置：** 登录您的 [Firebase 控制台 (Firebase Console)](https://console.firebase.google.com/)，导航至 **Authentication** > **Sign-in method**，点击 **添加新提供商** 并选择 **Google**。无需额外配置 `GOOGLE_CLIENT_ID`，Firebase 将通过以下参数自动完成 OIDC 握手。

| 环境变量名 | 说明描述 | 获取位置 |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Web 应用 API 密钥 | Firebase 控制台 > 项目设置 > 我的应用 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase 身份验证域名（如 `your-app.firebaseapp.com`） | Firebase 控制台 > 项目设置 > 我的应用 |
| `VITE_FIREBASE_PROJECT_ID` | Google Cloud / Firebase 项目全局唯一 ID | Firebase 控制台 > 项目设置 |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase 云存储存储桶 URL | Firebase 控制台 > 项目设置 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase 消息推送发送者 ID | Firebase 控制台 > 项目设置 |
| `VITE_FIREBASE_APP_ID` | Firebase 网页应用标识符 App ID | Firebase 控制台 > 项目设置 |
| `VITE_FIREBASE_DATABASE_ID` | *(选填)* 自定义命名的 Firestore 数据库 ID | 留空则默认连接 `(default)` |

### B. Web3 与 Base 区块链网络参数

| 环境变量名 | 说明描述 | 默认参考值 |
| :--- | :--- | :--- |
| `DEV_FEE_RECIPIENT_ADDRESS` | 接收协议维护费的公开 EVM 地址（0.2% 费率，最低 $0.05） | `0xD4875cCF...` |
| `VITE_DEV_FEE_RECIPIENT_ADDRESS` | 协议费收款地址的前端安全镜像 | `0xD4875cCF...` |
| `EXPECTED_GAS_RELAYER` | 指定的 Gas 费用代付中继器公开地址 | `0x31b7BafB...` |
| `VITE_EXPECTED_GAS_RELAYER` | Gas 中继器公开地址的前端安全镜像 | `0x31b7BafB...` |
| `CIRCLE_API_KEY` | *(选填)* Circle Paymaster 开发者密钥 | 留空则运行于无许可模式 |
| `RELAYER_PRIVATE_KEY` | *(选填 / 仅限服务端)* 自建私有 Gas 中继器的私钥 | **严禁提交至 Git 仓库** |

> **💡 自定义调整协议费率：** 默认情况下，对外链上转账将扣除 0.2%（最低 $0.05 USDC）的协议维护费转入 `DEV_FEE_RECIPIENT_ADDRESS`。若需自定义费率，请在 [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts) 中调整常量 `DEV_PROTOCOL_FEE_PERCENT` 与 `DEV_PROTOCOL_FEE_MIN_USD`。

> **💡 零成本公开 RPC 与原生 USDC 合约：** 系统开箱即用直连 Base 官方公共 RPC 节点（`https://mainnet.base.org`），并与 Circle 官方 Base 链上原生 USDC 合约交互（`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`），无需采购任何昂贵的第三方区块链节点网关服务。

### C. Discord 社交授权登录 *(选填)*

如需启用 Discord 登录，请在 Discord Developer Portal > OAuth2 中配置：

| 环境变量名 | 说明描述 |
| :--- | :--- |
| `DISCORD_CLIENT_ID` | Discord 应用客户端 Client ID |
| `DISCORD_CLIENT_SECRET` | Discord 应用客户端凭证 Client Secret |
| `OAUTH_STATE_SECRET` | *(选填)* 用于对 anti-CSRF 随机 state 令牌进行 HMAC-SHA256 签名的服务端密钥（留空时系统将安全自派生） |

*Discord 开发者后台需登记的回调地址：* `https://<您的域名>/api/auth/discord/callback`

---

## 🎨 品牌形象、技术支持与服务渠道自定义

如需将系统私有化部署或进行机构品牌换肤，可通过环境变量或源码统一配置：

### 1. 通过环境变量配置 (`.env`)

| 环境变量名 | 默认设定值 | 在系统中所影响的位置 |
| :--- | :--- | :--- |
| `VITE_SUPPORT_EMAIL` | `cofreadminwallet@gmail.com` | 修改系统“设置”界面中展示的客服邮箱与一键诊断邮件目标 |
| `VITE_FEEDBACK_URL` | `https://forms.gle/MBpyniv5zf795wi97` | 修改“设置”界面中**用户反馈**按钮跳转的表单链接 |

### 2. 品牌 Logo、应用名称与视觉资产代码映射

如需进行系统换肤、重命名或白标定制 (Rebranding / White-labeling)，以下为核心视觉资源与代码的精确映射位置：

- **系统核心交互 Logo 与保险库图标组件 ([`src/components/CofreLogo.tsx`](./src/components/CofreLogo.tsx)):**
  - **矢量保险库图标：** 在运行中的 Web 应用中，Logo **并非静态位图图片**，而是使用 React 与 Tailwind CSS 纯代码动态构建而成。立体新野兽派 (Neo-Brutalist) 紫色保险库轮廓、密码盘旋转手柄以及侧边荧光绿均衡器滑块均直接由 JSX 绘制。您可以直接修改颜色、阴影或替换为自定义 SVG / `<img>` 标签。
  - **品牌字样：** `"Cofre"` (黑色) 与 `"Admin"` (荧光绿徽章) 文字在 `CofreLogo.tsx` 中定义。
  - **双语标语 (Slogan)：** `en-US` 英文标语 (*"Own your money. Be the admin."*) 与 `pt-BR` 葡语标语 (*"Seja o admin da sua grana."*) 均在该组件中呈现。
  - **系统 Emoji 组件 (`CofreEmoji`):** 负责加载并渲染矢量徽章 [`public/cofre-emoji.svg`](./public/cofre-emoji.svg)。
- **已登录主界面顶栏品牌标识 ([`src/components/Header.tsx`](./src/components/Header.tsx)):**
  - 在用户头像旁的顶部导航栏展示品牌名称徽章。
- **页面标题、SEO 标签与社交分享卡片 ([`index.html`](./index.html)):**
  - **网页标题：** `<title>CofreAdmin — Self-Custodial Web3 Personal Finance</title>`。
  - **元标签与应用名称：** `<meta name="description">`、`<meta name="keywords">`、`<meta name="application-name">` 以及 `<meta name="apple-mobile-web-app-title">`。
  - **社交分享卡片 (OpenGraph):** `og:site_name`、`og:title`、`og:description` 与 `og:image`。
- **PWA 独立安装清单 ([`public/manifest.json`](./public/manifest.json)):**
  - 配置移动端与桌面端独立窗口安装时的应用全称 (`name`)、简称 (`short_name`)、简介与主屏幕图标。
- **系统底层运行时静态图标资源 ([`public/`](./public/)):**
  - **浏览器标签页 Favicon:** [`public/favicon.svg`](./public/favicon.svg)。
  - **苹果桌面图标与 PDF 对账单表头 Logo:** [`public/apple-touch-icon.png`](./public/apple-touch-icon.png) (同时供 [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts) 生成对账单时调用)。
  - **PWA 图标与推送通知图标:** [`public/icon-192.png`](./public/icon-192.png) 与 [`public/icon-512.png`](./public/icon-512.png) (供 [`public/sw.js`](./public/sw.js) 与 [`src/services/notificationService.ts`](./src/services/notificationService.ts) 调用)。
  - **社交分享封面图:** [`public/cofreadmin-share-card.png`](./public/cofreadmin-share-card.png) 与 [`public/cofreadmin-share-card-en.png`](./public/cofreadmin-share-card-en.png) (在 [`src/App.tsx`](./src/App.tsx) 中用于原生 WhatsApp / Web Share 分享)。
  - *(注：`./public/icon48x48.png` 仅作为 Markdown README 顶部排版展示的小缩略图，并不参与前端代码与 Web 应用的实际运行)。*

### 3. 源码映射索引 (Source Code Map)

- **数据库与身份验证依赖注入单点 (1 行切换后端)：** [`src/services/index.ts`](./src/services/index.ts) (`db`, `authService`, `billingService`)
- **仓库契约接口与领域模型：** [`src/services/types.ts`](./src/services/types.ts) (`IDatabaseService`, `IAuthService`, `IBillingService`)
- **混合持久层、Cloud Firestore 与本地 LocalStorage 仓库：** [`src/services/currentDb.ts`](./src/services/currentDb.ts), [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts), [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts)
- **技术支持邮箱与诊断邮件生成器：** [`src/utils/supportEmail.ts`](./src/utils/supportEmail.ts) (常量 `SUPPORT_EMAIL`)
- **用户反馈入口：** [`src/components/ProfileSettingsScreen.tsx`](./src/components/ProfileSettingsScreen.tsx)
- **法律条款与隐私政策弹窗：** [`src/components/LegalTermsModal.tsx`](./src/components/LegalTermsModal.tsx)
- **不可篡改法律存证与全球合规数据销毁证书 (巴西 LGPD, 欧盟 GDPR, 美国 CCPA/CPRA)：** [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) (`logWalletBackupAcknowledgment`, `deleteFromCloud`) 与 [`firestore.rules`](./firestore.rules)
- **应用版本控制与构建同步：** [`src/config/version.ts`](./src/config/version.ts) (`APP_VERSION`, `APP_VERSION_LABEL`)
- **多版本密码学保险库 (`v2` PBKDF2 / `v3` IndexedDB 不可导出 `CryptoKey`)：** [`src/utils/cryptoVault.ts`](./src/utils/cryptoVault.ts) (`CURRENT_VAULT_ENVELOPE_VERSION`, `needsVaultEnvelopeUpgrade`)
- **原生 USDC 合约、BIP-39 钱包内核、公共 RPC 与下一代密钥升级：** [`src/services/web3Service.ts`](./src/services/web3Service.ts) (`BASE_USDC_MAINNET`, `BASE_PUBLIC_RPC`, `CURRENT_WALLET_GENERATION`, `generateMnemonicWallet`, `stageWalletForMigration`, `getPendingMigrationWallet`)
- **密码协议升级与强制备份交互组件：** [`src/components/WalletMigrationModal.tsx`](./src/components/WalletMigrationModal.tsx) 与 [`src/components/WalletBackupModal.tsx`](./src/components/WalletBackupModal.tsx)
- **通知栏 1 键分类组件：** [`src/components/QuickCategorizeReceiveToast.tsx`](./src/components/QuickCategorizeReceiveToast.tsx)
- **极速应用锁与 WebAuthn 硬件安全：** [`src/services/webAuthnService.ts`](./src/services/webAuthnService.ts) 与 [`src/components/AppLockScreen.tsx`](./src/components/AppLockScreen.tsx)
- **会计级 PDF 对账单生成引擎：** [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts) 与 [`src/components/ExportDataModal.tsx`](./src/components/ExportDataModal.tsx)
- **协议费率与保底金额 (0.2% / $0.05 USDC)：** [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts) (`DEV_PROTOCOL_FEE_PERCENT`, `DEV_PROTOCOL_FEE_MIN_USD`)
- **大额资金流出冷却安全阈值：** [`src/components/CryptoSendModal.tsx`](./src/components/CryptoSendModal.tsx) (`isHighValue` 阈值，默认为 $\ge \$100\text{ USDC}$ 或 $\ge \text{R\$} 500$)
- **预置预算分类与 Emoji 映射：** [`src/utils/initialData.ts`](./src/utils/initialData.ts) (`DEFAULT_CATEGORIES`)
- **法币多币种支持列表：** [`src/utils/currencies.ts`](./src/utils/currencies.ts) (`TOP_CURRENCIES`)

---

## ☁️ 生产环境部署方案

### 方案 1：Firebase App Hosting (官方推荐 / 预设支持)

本项目针对 **Firebase App Hosting** 进行了原生适配：

1. 在 **Firebase 控制台** 的 **App Hosting** 菜单中关联您的 GitHub 代码仓库。
2. 在 **App Hosting** > **环境设置** 中录入生产环境所需的 `.env` 变量。
3. 根目录的 [`apphosting.yaml`](./apphosting.yaml) 文件会自动调度生命周期：
   - 构建命令：`npm run build`
   - 启动命令：`npm run start` (服务将在 8080/3000 端口运行)
4. 向 `main` 分支提交代码即可触发自动化、零停机时间的生产流水线构建。

### 方案 2：任何主流云厂商、容器平台或独立 VPS (云原生无关)

CofreAdmin 可直接被打包为标准自治 Node.js / Express 生产构件（`dist/server.cjs`），**不受任何云平台锁定**。支持部署于任何云环境（如 Docker, Render, Railway, Fly.io, AWS, Google Cloud Run, 阿里云, 腾讯云等）：

- **构建命令：** `npm run build`
- **运行命令：** `npm run start` *(自动绑定宿主操作系统的 `PORT` 环境变量)*

---

## 🛡️ 密码学安全与非托管资产保障机制

- **严密的 BIP-39 分层确定性密钥派生 (根绝旧版非标准算法)：** 所有钱包创建均强制使用高熵密码学随机数生成 12 词标准助记词（`generateMnemonic(english)`），并派生唯一对应的私钥与 EVM 地址（`mnemonicToAccount`）。历史版本中的弱确定性种子方案（`v1`）已从代码库中被彻底移除。
- **AES-GCM 256 位版本化双模式加密金库 (`cryptoVault.ts`)：**
  - **基于设备物理绑定的不可导出 `CryptoKey` (`enc:aes-gcm:idb:v3:` 规范)：** 默认情况下，私钥与助记词在本地使用带有随机 12 字节 IV 的 AES-GCM 256 位加密。加密秘钥存储于浏览器 **IndexedDB**（`cofreadmin_keystore_db`），且必须标记为 `extractable: false`。即便用户刷新页面或重启浏览器，密钥依然安全持久化，任何外部脚本或 XSS 注入均无法通过 `exportKey()` 窃取明文私钥，彻底避免了传统 `localStorage` 明文存储被盗的系统性缺陷。
  - **PBKDF2 强化口令与常量时间 PIN 防护 (`enc:aes-gcm:v2:` 规范)：** 当用户设定了自定义安全口令或 4 位安全 PIN 时，系统将通过 PBKDF2（100,000 次哈希迭代，SHA-256，16 字节随机盐 + 12 字节 IV）推导解密密钥，并使用常量时间逐字节对比函数（`constantTimeEqual`）验证哈希，全面免疫侧信道计时攻击 (*Timing Attacks*)。
  - **向前兼容的加密信封版本跃迁 (`v2` / `v3` → `vN`)：** 所有加密密文均携带版本标识头（`CURRENT_VAULT_ENVELOPE_VERSION = 'v3'`）并配备自动检测接口 `needsVaultEnvelopeUpgrade()`，可在不影响用户使用的情况下无缝将秘钥平滑再加密升级至未来更高等级的标准（如 `v4+`）。
- **硬件生物识别与带盐 PIN 码双防线 (`webAuthnService.ts`)：** 会话锁定结合设备独立盐值（`cofre_pin_salt`）进行 SHA-256 哈希。WebAuthn 硬件凭证配置了 `residentKey: 'discouraged'` 与 `['internal']` 纯物理内部通道，直接跳过第三方密码管理器的繁琐选择窗，实现低于 50ms 的极速解锁。
- **防覆盖保护与反幽灵地址保障：**
  - 当私钥处于锁定状态或解密失败时，系统强制阻断执行（`CARTEIRA_BLOQUEADA`），**绝对禁止**擅自新建秘钥或覆盖已有历史账户。
  - 在应用初始化与会话恢复时，系统始终验证界面展示的充值地址必须由当前物理设备上的可用私钥真实控制，杜绝出现无法支配资金的“幽灵地址”。
  - 钱包重置功能（`resetWallet`）前置查询 Base 链上真实的 USDC/ETH 余额，一旦探测到存在未转移资产，系统将自动锁定销毁操作。
- **多维度身份冲突隔离与零账户丢失防护 (`getCandidateDocIds` 与 `getStorageDataWithFallbacks`)：**
  - **多提供商物理隔离：** 即使同一用户在同一浏览器中为 Google 和 Discord 绑定了相同的邮箱地址，系统也会通过作用域候选键进行严格隔离，杜绝跨渠道数据串扰：
    - **Google 登录：** 现代前缀键（`google_<sanitizedEmail>`）、历史无前缀键（`<sanitizedEmail>`）、原始邮箱键（`<email>`）、`user_<sanitizedEmail>` 以及 Firebase UID 键（`<uid>`）。
    - **Discord 登录：** 现代前缀键（`discord_<id>`）、邮箱前缀键（`discord_<sanitizedEmail>`）及纯数字 ID（`<id>`），与 Google 遗留数据物理隔离。
  - **对称无损自动化数据迁移：** 一旦在历史键名下探测到属于同一合法身份的历史数据，系统将通过 `mergeLocalAndCloudData` 将资产、分类与账单无损镜像至现代集合规范（`userData/{docId}`）和 UID 备份（`users/{uid}`）中。
  - **首访准入鉴权与合规拦截：** 未登录本地缓存严格校验账户属权。新用户首次访问时强制触发法律隐私条款签署（*Clickwrap* 界面），并在钱包生成后强制弹出**必须完成的助记词备份校验确认**。
- **云端与本地存储绝对脱敏清洗 (`localStorageDb.ts` 与 `firebaseDb.ts`)：** 任何写入 LocalStorage 或上传至 Cloud Firestore 的用户画像对象，均会被底层服务强制剥离 `walletPrivateKey`（私钥）、`walletMnemonic`（助记词）与 `securityPinHash`（PIN 散列）——绝密密码材料**永远不会**脱离本地设备进入云端。
- **只写防篡改合规审计存证 (`firebaseDb.ts` 与 `firestore.rules`)：**
  - **助记词备份数字回执 (`WALLET_BACKUP_ACKNOWLEDGMENT`)：** 用户完成助记词抄写确认后，系统在链下登记一条不可篡改的法律证据记录，包含数字时间戳、SHA-256 哈希标识、钱包公开地址、审计指纹以及明确的非托管免责声明（**严禁**记录助记词明文或私钥）。
  - **全球多司法管辖区账户注销与数据删除存证 (`deleteFromCloud`)：** 用户申请注销账户时，业务运营数据将被永久物理擦除，同时沉淀一条假名化法律合规留存日志，满足国际数据隐私监管要求：
    - 🇧🇷 **巴西 LGPD (Lei Geral de Proteção de Dados, 第 13.709/2018 号法律)：** 严格执行第 16 条第 I, II 及 VI 款（立即清除业务个人信息，同时合法留存履行法定义务所必需的防篡改记录）。
    - 🇪🇺 **欧盟 GDPR (通用数据保护条例, Regulation (EU) 2016/679)：** 履行第 17(1) 条“被遗忘权”规范，同时结合第 17(3)(b) 及 (e) 款要求，留存不可篡改证据用于应对法律诉讼抗辩与合规审计。
    - 🇺🇸 **美国 CCPA / CPRA (加州消费者隐私法案, Cal. Civ. Code § 1798.100+ 及 § 1798.105)：** 响应消费者的删除诉求，依照 Cal. Civ. Code § 1798.105(d) 款合法保留完成交易取证与履行州及联邦法律义务的核心存证。
  - **数据库级只写规则 (Write-Once Security Rules)：** 法律存证集合在 Firestore 安全规则中配置为只写保护（`allow update, delete: if false;`），确保审计证据具备司法公信力。
- **客户端白名单、输入全量校验与费用硬顶：** EIP-3009 授权转账在前置阶段严格校验接收方地址校验和（`isAddress`，阻断 0x000... 误燃烧地址）、正数金额检验、总额覆盖率（`转账额 + 协议费 + Gas费 <= USDC总余额`），并对 Gas 中继器执行白名单检查，在前端将 Gas 费用上限锁定在 `$0.10 USDC` 以内。
- **真随机密码学 Nonce：** 所有的 EIP-3009 交易授权 Nonce 均强制采用 `crypto.getRandomValues(32)` 生成，根除重放攻击与 Nonce 碰撞风险。
- **零硬编码密钥与严苛的 Git 排除规范 (`.gitignore`)：** 项目代码中绝无任何硬编码密钥或第三方私密 Token。所有 `.env*`, `*.key`, `bun.lock*`, 服务账号凭证均受到 `.gitignore` 强力阻断。
- **生产级 Paymaster 与交易中继器防线 (`/api/paymaster/transfer` & `/api/paymaster/proxy`)：**
  - **EIP-712 签名预校验与链上 Nonce 状态检查：** 在服务端消耗任何自有 ETH Gas 之前，中继器在链下严格校验三组 EIP-3009 ECDSA 椭圆曲线数字签名，核查费率底线，并校验 Base L2 链上的 `authorizationState` 与账户真实余额。
  - **排队执行互斥锁与 IP/钱包双限流：** 服务端内存互斥执行锁阻断了 EVM 并发 Nonce 竞争与重入竞态漏洞（*TOCTOU race conditions*），并具备单 IP 与单钱包维度的自适应限流。
  - **安全闭合 Paymaster 代理过滤：** `/api/paymaster/proxy` 拒绝未经审计的批量 RPC 阵列请求，并将合约交互严格限定在被信任的原生合约白名单之内。
- **CSV 电子表格公式注入防护：** 财务对账单导出引擎（[`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts)）在生成 CSV 文件时，会自动前置转义公式计算触发符（`=`, `+`, `-`, `@`, `\t`, `\r`），杜绝 Excel 或 Google Sheets 中潜在的 DDE/宏代码执行风险。
- **OWASP 银行业 Web 安全防御头：** Express 服务端搭载国际标准化防御响应头（`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`），对反向代理路由实施严格路径过滤。

---

## 🗺️ 战略路线图 (Roadmap) 与融资规划

CofreAdmin 将自托管密码学工程与透明的生态资助模式深度结合：

- 🚀 **演进里程碑：** 从当前已上线的 **v1.0.6** 生产版本（真自托管 Web3 金库、EIP-3009 无 Gas 支付与 BIP-39 离线备份）逐步拓展至自动化智能定投金库、ERC-4337 账户抽象智能账户以及**混合智能架构**——确保底层资产操作 100% 由确定性规则与智能合约驱动（彻底阻断大模型概率风险与幻觉），而上层算法和启发式引擎则专注于消费诊断与财务洞察。
- 💡 **生态 Grants 与协议自造血：** 恪守不发行投机性代币的开源公共产品定位，依托透明的链上微额服务费（`0.2%`，封顶 `$0.05 USDC`）、Base 生态发展基金 (Base Ecosystem Grants)、Gitcoin 公共物品捐助轮次及开源社区赞助实现长期健康运转。
- 📑 **完整技术规格书：** 欲查阅详细交付阶段、里程碑节点、资金配比模型及全景架构图，请参阅 **[CofreAdmin 执行白皮书 (完整规格书)](./docs/whitepaper/whitepaper-zh-Hans.md)**。

---

## 📬 官方联络渠道 (Contact)

官方服务联络与维护者支持渠道如下：

- **官方技术支持邮箱：** [cofreadminwallet@gmail.com](mailto:cofreadminwallet@gmail.com)
- **官方 Discord 社区：** `@cofreadmin`
- **用户建议与反馈表单：** [在线提交反馈](https://forms.gle/MBpyniv5zf795wi97)
- **技术文档与开发资源：** [官方文档](./docs/)
- **执行白皮书与战略路线图：** [CofreAdmin 白皮书 (完整技术与战略规格书)](./docs/whitepaper/whitepaper-zh-Hans.md)
- **隐私保护政策：** [隐私保护政策](./docs/privacy-policy/privacy-policy.md)
- **产品生命周期与交互设计：** [产品流程与交互设计](./docs/product-flow/product-flow-zh-Hans.md)

---

## 📜 开源协议 (Apache-2.0)

本项目属于开源软件，遵循 **Apache License, Version 2.0** 协议发布。

完整的法律授权条款详见仓库根目录的 [`LICENSE.md`](./LICENSE.md) 文件，版权归属与商标保留声明详见 [`NOTICE`](./NOTICE) 文件。

---

<small>
💖 赞助与支持开源开发：

- **法币赞助：** [GitHub Sponsors 开发者赞助通道](https://github.com/sponsors/erissontech)
- **加密货币捐赠：** [BTC/USDC/ETH/SOL 捐赠地址](./.github/donate.md)
</small>
