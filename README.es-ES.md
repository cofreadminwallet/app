# CofreAdmin Wallet

> <img src="./public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Gestor de Bóvedas en USDC en la Red Base <br>
> Versión: **v1.0.6** • Documentación: **[Recursos y Documentación](./docs/)**; **[Whitepaper](./docs/whitepaper/whitepaper-es-ES.md)**; **[Changelog](./CHANGELOG.md)** <br>
> Licenciado bajo la **Apache License, Version 2.0 (Apache-2.0)**.

🌐 **Idiomas:** **[English](./README.md)** • **[Português](./README.pt-BR.md)** • **[Español](./README.es-ES.md)** • **[简体中文](./README.zh-Hans.md)**

---

## 📖 Descripción General

**CofreAdmin** es una aplicación web de finanzas personales de código abierto y billetera de dólares digitales de **autocustodia estricta**, desarrollada sobre la red **Base (Ethereum Layer 2)**.

Diseñada con la fluidez, familiaridad y rapidez de las aplicaciones de banca digital de consumo modernas, CofreAdmin elimina las fricciones tradicionales de la Web3: los usuarios pueden ahorrar en bóvedas de dólares digitales (USDC), enviar y recibir pagos al instante, y organizar sus finanzas con descripciones claras y comprensibles, manteniendo en todo momento el **100% del control criptográfico y la posesión exclusiva de sus claves privadas**.

---

## ✨ Características Principales

- 🛡️ **Autocustodia Criptográfica Real (BIP-39 + Bóveda WebCrypto Versionada):** Billeteras generadas localmente mediante mnemónicos estándar **BIP-39 de 12 palabras** (`generateMnemonic` + derivación HD `mnemonicToAccount`) y cifradas en reposo con **AES-GCM de 256 bits** mediante una **`CryptoKey` no extraíble (`extractable: false`) en IndexedDB** (envoltura `v3`) o **PBKDF2 con 100.000 iteraciones** (envoltura `v2`). Los servidores y las bases de datos en la nube nunca ven ni almacenan claves privadas ni frases semilla de recuperación.
- 👁️ **Modo Privacidad Rápido (Protección contra Miradas Indiscretas / "Shoulder Surfing"):** Enmascaramiento y ocultación de saldos sincronizada en un toque en todo el panel principal (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard` y `ActiveVaultsPreview`), protegiendo cifras confidenciales mediante puntos discretos (`••••`) en lugares públicos.
- 📋 **Protección Visual contra Envenenamiento de Portapapeles (Clipboard Poisoning):** Segmentación visual de direcciones en alto contraste destacando los primeros 6 y últimos 4 caracteres, con un sello integrado de verificación en `CryptoSendModal` para mitigar ataques de sustitución maliciosa en el portapapeles.
- 🔄 **Criptoagilidad Continua y Motor de Migración Multigeneración:** Arquitectura de billetera versionada retrocompatible (`v1` → `v2` → `v3`+) que detecta automáticamente balances remanentes de generaciones anteriores en Base L2, facilita el barrido on-chain en un clic hacia el estándar de seguridad más moderno y exige respaldo obligatorio, garantizando **cero pérdida de fondos** frente a actualizaciones de seguridad presentes y futuras.
- 💵 **Ahorro en Dólares Digitales (USDC nativo en Base):** Cree bóvedas de ahorro temáticas con objetivos y plazos personalizados, separando el capital para gastos corrientes de las reservas financieras de mediano y largo plazo.
- ⛽ **Experiencia Gasless (Sin Necesidad de ETH):** Pague las tarifas de transacción directamente con su saldo en USDC mediante los rieles de meta-transacciones de Circle Paymaster y el estándar EIP-3009 (`TransferWithAuthorization`), sin necesidad de mantener saldo de ETH para gas.
- 📇 **Directorio de Contactos, Resolución Basenames (`.base.eth`) y Protección a Nuevos Destinatarios:** Guarde direcciones habituales, resuelva nombres `.base.eth` (Base L2 Resolver) y `.eth` (ENS) con protección anti-homógrafos, y reciba advertencias preventivas de seguridad al transferir fondos a una dirección desconocida por primera vez.
- ⚡ **Pagos Instantâneos, Enlaces Precargados y Comprobantes Auditables:** Escanee códigos QR, genere enlaces de cobro en un clic (EIP-681 + Web Deep Links) con montos predefinidos en USDC o moneda fiduciaria local (`R$`), y comparta recibos visuales de alta resolución con código QR directo para auditoría en BaseScan.
- 🏷️ **Libro Mayor Inteligente, Conceptos Legibles y Categorización en 1 Toque:** Transforme hashes criptográficos complejos (`0x3f...`) en movimientos legibles (ej.: *"Supermercado"*, *"Factura de consultoría"*) con categorías personalizables, permitiendo categorizar transferencias entrantes en **un solo toque directamente desde el banner de notificación en tiempo real**, sin abrir la pantalla de extractos.
- 🔒 **Bloqueo Instantâneo y Teclado Numérico de 4 Dígitos (Estilo Trust Wallet):** Proteja el acceso a las bóvedas con teclado numérico en pantalla, indicadores visuales de 4 puntos dinámicos, hash local SHA-256 con sal aislada del dispositivo y desbloqueo biométrico por hardware (Touch ID / Face ID) con latencia ultrabaja (<50ms).
- 📊 **Métricas Financieras y Estados de Cuenta Contables en PDF:** Analice el ritmo de gasto diario, consulte desgloses analíticos por categoría y exporte estados de cuenta formales en PDF con sellos oficiales de bóveda, indicadores de billetera Base y numeración dinámica de páginas bilingüe.
- 📱 **Progressive Web App (PWA):** Instalable en la pantalla de inicio de iOS y Android como aplicación nativa, con funcionamiento offline resiliente e independencia de intermediarios de tiendas de aplicaciones.

---

## 🛠️ Stack Tecnológico

- **Lenguaje y Entorno de Ejecución:** TypeScript (`~5.8`), Node.js (`>=20`)
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Arquitectura y Capa de Datos:** Clean Architecture con **Repository Pattern / Service Layer** (`IDatabaseService`, `IAuthService`, `IBillingService` en `src/services/`) con sincronización híbrida Local + Nube y cambio de proveedor de base de datos en una sola línea
- **Web3 y Blockchain:** Viem 2 (EVM / Red Base L2, Cuentas HD BIP-39, EIP-3009)
- **Backend y Empaquetador:** Express 4, esbuild
- **Alojamiento y Nube:** *(Agnóstico a proveedores; preconfigurado para Firebase App Hosting)*

---

## 🏗️ Arquitectura Limpia y Capa de Repositorio (`src/services/`)

La persistencia de datos y la autenticación de CofreAdmin están 100% desacopladas de la interfaz de usuario en React mediante el **Repository Pattern (Capa de Servicios)**. Ningún componente de React importa SDKs directos como `firebase/*` ni manipula `localStorage` de manera directa para entidades de negocio:

| Archivo | Responsabilidad |
| :--- | :--- |
| [`src/services/types.ts`](./src/services/types.ts) | Modelos de dominio fuertemente tipados (`UserProfile`, `Vault`, `Transaction`, `Category`, `SavedContact`, `OnChainLedgerEntry`, soporte multi-tenant `userId`/`doctorId`) y contratos de servicio (`IDatabaseService`, `IAuthService`, `IBillingService`). |
| [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts) | `LocalStorageDatabaseService` — persistencia local/offline completa, aislamiento estricto por cuenta, saneamiento de transacciones y gestión de sesión. |
| [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) | `FirebaseDatabaseService` y `FirebaseAuthService` — aísla el 100% de las llamadas SDK de `firebase/app`, `firebase/auth` y `firebase/firestore`, con inicialización condicional (`isFirebaseConfigured`) que activa el Modo Local seguro si las claves del `.env` están ausentes. |
| [`src/services/currentDb.ts`](./src/services/currentDb.ts) | `HybridDatabaseService` — implementa `IDatabaseService` e `IBillingService`, combinando lecturas y escrituras locales instantáneas con sincronización en segundo plano en Cloud Firestore y fusión sin conflictos (`mergeLocalAndCloudData`). |
| [`src/services/index.ts`](./src/services/index.ts) | **Punto Único de Inyección de Dependencias** exportando `db`, `authService` y `billingService`. Permite reemplazar todo el proveedor de base de datos (ej.: migrar a Supabase, PostgreSQL/Cloud SQL o API REST externa) cambiando **una sola línea de código**. |

---

## 📋 Requisitos Previos

Antes de instalar, asegúrese de que su entorno cumpla con los siguientes requisitos mínimos:

- **Node.js:** versión `v20.0.0` o superior (`v22.x` recomendada)
- **npm:** versión `v10.0.0` o superior
- **Git**

---

## 🚀 Instalación y Desarrollo Local

Siga estos pasos para ejecutar una instancia funcional e independiente en su máquina local:

### 1. Clonar el Repositorio

```bash
git clone https://github.com/cofreadminwallet/app.git
cd app
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copie la plantilla de ejemplo `.env.example` para crear su archivo local `.env`:

```bash
cp .env.example .env
```

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación iniciará en `http://localhost:3000` con recarga rápida en vivo habilitada.

### 5. Compilación para Producción

```bash
npm run build
npm run start
```

---

## ⚙️ Variables de Entorno y Configuración (`.env`)

Toda la configuración operativa se encuentra aislada en variables de entorno. Abra su archivo `.env` para personalizar las opciones:

### A. Configuración de Firebase (Base de Datos en la Nube y Login con Google)

Firebase proporciona soporte para sincronización en la nube y autenticación social con Google. *(El modo Invitado / Offline funciona 100% de forma local sin Firebase; si `VITE_FIREBASE_API_KEY` se deja vacío, el servicio desactiva la conexión en la nube y opera en Modo Local sin emitir errores de ejecución)*.

> **💡 Habilitar Inicio de Sesión con Google:** En su [Firebase Console](https://console.firebase.google.com/), ingrese a **Authentication** > **Sign-in method**, haga clic en **Agregar nuevo proveedor** y active **Google**. No se requiere ninguna variable adicional `GOOGLE_CLIENT_ID`; Firebase gestiona la negociación de credenciales automáticamente con los parámetros a continuación.

| Variable | Descripción | Dónde Encontrarla |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Clave de API Web de Firebase | Firebase Console > Configuración del Proyecto > Web App |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio de Auth (ej.: `su-app.firebaseapp.com`) | Firebase Console > Configuración del Proyecto > Web App |
| `VITE_FIREBASE_PROJECT_ID` | ID del Proyecto Google Cloud / Firebase | Firebase Console > Configuración del Proyecto |
| `VITE_FIREBASE_STORAGE_BUCKET` | URL del Bucket de Firebase Storage | Firebase Console > Configuración del Proyecto |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID del Remitente de Cloud Messaging | Firebase Console > Configuración del Proyecto |
| `VITE_FIREBASE_APP_ID` | Identificador de la Aplicación Web de Firebase | Firebase Console > Configuración del Proyecto |
| `VITE_FIREBASE_DATABASE_ID` | *(Opcional)* ID de Base de Datos Firestore con nombre | Dejar vacío para usar la base `(default)` |

### B. Configuración de Red Base y Web3

| Variable | Descripción | Valor Predeterminado / Ejemplo |
| :--- | :--- | :--- |
| `DEV_FEE_RECIPIENT_ADDRESS` | Dirección pública EVM receptora de comisiones de protocolo (0,2%, mín. $0,05) | `0xD4875cCF...` |
| `VITE_DEV_FEE_RECIPIENT_ADDRESS` | Espejo del cliente de la dirección de comisiones | `0xD4875cCF...` |
| `EXPECTED_GAS_RELAYER` | Dirección pública EVM del relayer de gas designado | `0x31b7BafB...` |
| `VITE_EXPECTED_GAS_RELAYER` | Espejo del cliente de la dirección del relayer | `0x31b7BafB...` |
| `CIRCLE_API_KEY` | *(Opcional)* Clave de desarrollador Circle para paymaster | Dejar vacío para modo permissionless |
| `RELAYER_PRIVATE_KEY` | *(Opcional / Solo Servidor)* Clave privada si ejecuta un relayer propio | **Nunca confirmar en el repositorio Git** |

> **💡 Ajuste de la Comisión de Protocolo:** De forma predeterminada, las transferencias salientes destinan una comisión del 0,2% (con un piso mínimo de $0,05 USDC) a `DEV_FEE_RECIPIENT_ADDRESS`. Para modificar este porcentaje o piso, actualice `DEV_PROTOCOL_FEE_PERCENT` y `DEV_PROTOCOL_FEE_MIN_USD` en [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts).

> **💡 RPCs Públicos sin Costo y USDC Nativo:** La aplicación se conecta de forma nativa al endpoint RPC público oficial de Base (`https://mainnet.base.org`) e interactúa con el contrato de USDC nativo oficial de Circle (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), sin requerir claves de infraestructura externa de pago.

### C. Inicio de Sesión Social con Discord *(Opcional)*

Habilite la autenticación con Discord en el Portal de Desarrolladores de Discord > OAuth2:

| Variable | Descripción |
| :--- | :--- |
| `DISCORD_CLIENT_ID` | ID de Cliente de la Aplicación Discord |
| `DISCORD_CLIENT_SECRET` | Clave Secreta del Cliente de la Aplicación Discord |
| `OAUTH_STATE_SECRET` | *(Opcional)* Secreto de servidor para firma HMAC de tokens anti-CSRF (autoderivado si se omite) |

*URI de Redirección a configurar en Discord:* `https://<su-dominio>/api/auth/discord/callback`

---

## 🎨 Personalización de Marca, Soporte y Contactos

Para implementaciones privadas, institucionales o rebranding, puede modificar los canales de contacto y soporte mediante variables de entorno o directamente en los archivos fuente:

### 1. Vía Variables de Entorno (`.env`)

| Variable | Valor Predeterminado | Qué Modifica en la Aplicación |
| :--- | :--- | :--- |
| `VITE_SUPPORT_EMAIL` | `cofreadminwallet@gmail.com` | Modifica el correo oficial de soporte en Configuración y enlaces de diagnóstico |
| `VITE_FEEDBACK_URL` | `https://forms.gle/MBpyniv5zf795wi97` | Modifica la URL de destino del botón **Feedback** en Configuración |

### 2. Personalización de Logotipo, Nombre de la Aplicación y Activos Visuales en Código

Si desea realizar un cambio de marca (*rebranding*) o adaptar una implementación propia (*white-label*), este es el mapa técnico exacto en el código fuente:

- **Logotipo Visual de la Aplicación e Ícono de Bóveda ([`src/components/CofreLogo.tsx`](./src/components/CofreLogo.tsx)):**
  - **Ícono del Logotipo:** En la aplicación en ejecución, el logotipo **no es una imagen de mapa de bits estática**; se dibuja programáticamente mediante React y Tailwind CSS. El cuerpo 3D Neo-Brutalista con degradado púrpura, el volante giratorio y el ecualizador verde lima se construyen directamente en JSX. Es posible modificar sus estilos o reemplazarlo por un SVG propio o etiqueta `<img>`.
  - **Tipografía y Marca:** Los títulos `"Cofre"` (negro) y `"Admin"` (insignia verde lima) están definidos en `CofreLogo.tsx`.
  - **Eslóganes Bilingües:** Los subtítulos en `en-US` (*"Own your money. Be the admin."*) y `pt-BR` (*"Seja o admin da sua grana."*) se gestionan en `CofreLogo.tsx`.
  - **Componente de Emoji Oficial (`CofreEmoji`):** Renderiza el archivo vectorial [`public/cofre-emoji.svg`](./public/cofre-emoji.svg).
- **Título de la Marca en la Barra Superior ([`src/components/Header.tsx`](./src/components/Header.tsx)):**
  - Renderiza la insignia de la aplicación en la cabecera junto al avatar del usuario autenticado.
- **Título de la Aplicación, Metatags SEO y OpenGraph ([`index.html`](./index.html)):**
  - **Título del Documento:** `<title>CofreAdmin — Self-Custodial Web3 Personal Finance</title>`.
  - **Metatags y Descripciones:** `<meta name="description">`, `<meta name="keywords">`, `<meta name="application-name">` y `<meta name="apple-mobile-web-app-title">`.
  - **Tarjetas de Compartir (OpenGraph):** `og:site_name`, `og:title`, `og:description` y `og:image`.
- **Manifiesto de Instalación PWA ([`public/manifest.json`](./public/manifest.json)):**
  - Define el nombre de la app (`name` y `short_name`), descripción y comportamiento de pantalla completa en dispositivos móviles y de escritorio.
- **Íconos del Sistema, Favicons y Recursos en Tiempo de Ejecución ([`public/`](./public/)):**
  - **Favicon del Navegador:** [`public/favicon.svg`](./public/favicon.svg).
  - **Ícono Apple / Encabezado de Extracto PDF:** [`public/apple-touch-icon.png`](./public/apple-touch-icon.png) (utilizado también por el motor de extractos en [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts)).
  - **Íconos PWA y Notificaciones Push:** [`public/icon-192.png`](./public/icon-192.png) y [`public/icon-512.png`](./public/icon-512.png) (usados en [`public/sw.js`](./public/sw.js) y [`src/services/notificationService.ts`](./src/services/notificationService.ts)).
  - **Tarjetas de Compartición Nativa:** [`public/cofreadmin-share-card.png`](./public/cofreadmin-share-card.png) y [`public/cofreadmin-share-card-en.png`](./public/cofreadmin-share-card-en.png) (utilizadas en WhatsApp / Web Share en [`src/App.tsx`](./src/App.tsx)).
  - *(Nota: El archivo `./public/icon48x48.png` es únicamente una miniatura decorativa para el encabezado de los archivos Markdown del README, sin participación en el código de ejecución).*

### 3. Mapeo en el Código Fuente

Si desea actualizar parámetros fijos directamente en los archivos de origen:

- **Punto de Inyección de Dependencias de Base de Datos y Auth (Cambio en 1 Línea):** [`src/services/index.ts`](./src/services/index.ts) (`db`, `authService`, `billingService`)
- **Contratos de Repositorio y Modelos de Dominio:** [`src/services/types.ts`](./src/services/types.ts) (`IDatabaseService`, `IAuthService`, `IBillingService`)
- **Servicio Híbrido, Repositorios Cloud Firestore y Local Storage:** [`src/services/currentDb.ts`](./src/services/currentDb.ts), [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) y [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts)
- **Correo de Soporte y Diagnóstico Automatizado:** [`src/utils/supportEmail.ts`](./src/utils/supportEmail.ts) (variable `SUPPORT_EMAIL`)
- **Formulario de Retroalimentación:** [`src/components/ProfileSettingsScreen.tsx`](./src/components/ProfileSettingsScreen.tsx)
- **Términos Legales y Documentación:** [`src/components/LegalTermsModal.tsx`](./src/components/LegalTermsModal.tsx)
- **Auditoría Jurídica Inmutable y Certificados Globales de Supresión (Brasil LGPD, UE GDPR, EE. UU. CCPA/CPRA):** [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) (`logWalletBackupAcknowledgment`, `deleteFromCloud`) y [`firestore.rules`](./firestore.rules)
- **Versión de la Aplicación y Sincronización Automática:** [`src/config/version.ts`](./src/config/version.ts) (`APP_VERSION` y `APP_VERSION_LABEL`)
- **Bóveda Criptográfica Versionada (`v2` PBKDF2 / `v3` IndexedDB `CryptoKey` No Extraíble):** [`src/utils/cryptoVault.ts`](./src/utils/cryptoVault.ts) (`CURRENT_VAULT_ENVELOPE_VERSION`, `needsVaultEnvelopeUpgrade`)
- **Contratos Nativos USDC, Motor BIP-39, RPCs Públicos Base y Rotación Futura:** [`src/services/web3Service.ts`](./src/services/web3Service.ts) (`BASE_USDC_MAINNET`, `BASE_PUBLIC_RPC`, `CURRENT_WALLET_GENERATION`, `generateMnemonicWallet`, `stageWalletForMigration`, `getPendingMigrationWallet`)
- **Modales de Rotación Criptográfica y Respaldo Obligatorio:** [`src/components/WalletMigrationModal.tsx`](./src/components/WalletMigrationModal.tsx) y [`src/components/WalletBackupModal.tsx`](./src/components/WalletBackupModal.tsx)
- **Categorización en 1 Toque en el Banner de Notificación:** [`src/components/QuickCategorizeReceiveToast.tsx`](./src/components/QuickCategorizeReceiveToast.tsx)
- **Bloqueo de Sesión y Seguridad WebAuthn en el Dispositivo:** [`src/services/webAuthnService.ts`](./src/services/webAuthnService.ts) y [`src/components/AppLockScreen.tsx`](./src/components/AppLockScreen.tsx)
- **Motor de Generación de Extractos Contables en PDF:** [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts) y [`src/components/ExportDataModal.tsx`](./src/components/ExportDataModal.tsx)
- **Porcentaje de Comisión del Protocolo y Piso Mínimo (0,2% / $0,05 USDC):** [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts) (constantes `DEV_PROTOCOL_FEE_PERCENT` y `DEV_PROTOCOL_FEE_MIN_USD`)
- **Traba de Seguridad para Transacciones de Alto Valor:** [`src/components/CryptoSendModal.tsx`](./src/components/CryptoSendModal.tsx) (variable `isHighValue`, por defecto $\ge \$100\text{ USDC}$ o $\ge \text{R\$} 500$)
- **Categorías y Emojis Predeterminados:** [`src/utils/initialData.ts`](./src/utils/initialData.ts) (vector `DEFAULT_CATEGORIES`)
- **Monedas Fiduciarias Compatibles:** [`src/utils/currencies.ts`](./src/utils/currencies.ts) (vector `TOP_CURRENCIES`)

---

## ☁️ Despliegue en Producción

### Opción 1: Firebase App Hosting (Preconfigurado)

El proyecto se encuentra 100% preconfigurado para despliegue continuo mediante **Firebase App Hosting**:

1. Vincule su repositorio de GitHub en la **Firebase Console** bajo **App Hosting**.
2. En **App Hosting** > **Configuración de Entorno**, agregue las variables definidas en su `.env`.
3. El archivo incluido [`apphosting.yaml`](./apphosting.yaml) gestiona automáticamente:
   - Comando de compilación: `npm run build`
   - Comando de ejecución: `npm run start` (sirve el backend empaquetado en el puerto 8080/3000)
4. Cada push en la rama `main` activa una compilación automatizada con cero tiempo de inactividad (*zero-downtime*).

### Opción 2: Cualquier Proveedor Cloud, Contenedor o VPS (Cloud-Agnostic)

Al compilar en un paquete Node.js / Express autónomo (`dist/server.cjs`), la aplicación **no depende de forma obligatoria de Firebase**. Puede alojarse en cualquier nube, plataforma de contenedores o servidor Linux (Docker, Render, Railway, Fly.io, AWS, Google Cloud Run, DigitalOcean, etc.):

- **Comando de Compilación:** `npm run build`
- **Comando de Ejecución:** `npm run start` *(se vincula automáticamente a la variable de entorno `PORT` del sistema operativo)*

---

## 🛡️ Seguridad y Autocustodia Criptográfica

- **Generación Estricta de Claves HD BIP-39 (Sin Derivaciones Legadas):** Todas las billeteras generan frases mnemónicas criptográficamente aleatorias de 12 palabras (`generateMnemonic(english)`) y derivan con precisión la clave privada y dirección EVM correspondiente (`mnemonicToAccount`). Los esquemas de derivación determinística anteriores (`v1`) fueron eliminados definitivamente del código.
- **Bóveda Criptográfica Versionada en Dos Modos AES-GCM de 256 bits (`cryptoVault.ts`):**
  - **`CryptoKey` No Extraíble Vinculada al Dispositivo (`enc:aes-gcm:idb:v3:`):** De forma predeterminada, las claves privadas y frases mnemónicas se cifran con AES-GCM 256 bits (vector de inicialización IV de 12 bytes aleatorio) usando una `CryptoKey` maestra generada con `extractable: false` y guardada en el **IndexedDB** del navegador (`cofreadmin_keystore_db`). Esto garantiza persistencia fluida entre recargas de página (`F5`) y reinicios del navegador, impidiendo que el material de la clave pueda extraerse con `exportKey()` o sustraerse de un simple `localStorage`.
  - **Protección con Frase de Seguridad PBKDF2 y PIN en Tiempo Constante (`enc:aes-gcm:v2:`):** Cuando se define una contraseña personalizada o PIN de 4 dígitos, las claves y hashes se derivan mediante PBKDF2 (100.000 iteraciones, SHA-256, sal de 16 bytes aleatoria + IV de 12 bytes) y se comparan en tiempo constante (`constantTimeEqual`) para neutralizar ataques de canal lateral por temporización (*timing attacks*).
  - **Versionado de Envoltura Progresivo (`v2` / `v3` → `vN`):** Cada carga cifrada lleva un prefijo explícito de versión (`CURRENT_VAULT_ENVELOPE_VERSION = 'v3'`) con detección vía `needsVaultEnvelopeUpgrade()`, permitiendo que la bóveda actualice el almacenamiento hacia futuros estándares de seguridad (`v4+`) de forma transparente y sin interrumpir al usuario.
- **Biometría por Hardware y Protección de PIN con Sal Local (`webAuthnService.ts`):** El bloqueo de sesión utiliza hashing local SHA-256 con sal aislada del dispositivo (`cofre_pin_salt`). Las credenciales WebAuthn están optimizadas con `residentKey: 'discouraged'` y transportes internos (`['internal']`), omitiendo cuadros de diálogo de administradores de contraseñas de terceros y garantizando desbloqueos biométricos o por PIN en menos de 50ms.
- **Garantías Anti-Sobrescritura y Prevención de Billeteras Fantasma:**
  - Si una clave cifrada se encuentra bloqueada o falla la verificación criptográfica, el flujo se detiene de inmediato (`CARTEIRA_BLOQUEADA`) y **nunca** genera claves nuevas por encima de registros existentes.
  - Al iniciar la app o restaurar sesión, se verifica siempre que la dirección pública en pantalla pertenezca a la clave privada bajo control efectivo del dispositivo local.
  - La función de restablecimiento de billetera (`resetWallet`) verifica previamente los saldos en Base y bloquea el reinicio si existen fondos en custodia.
- **Resolución Multi-Clave con Aislamiento entre Proveedores y Cero Pérdida de Cuentas (`getCandidateDocIds` y `getStorageDataWithFallbacks`):**
  - **Aislamiento Estricto entre Google y Discord:** Las consultas resuelven claves candidatas con alcance delimitado para evitar colisiones (incluso si un usuario emplea el mismo correo en ambos proveedores en el mismo navegador):
    - **Google Auth:** Prefijo moderno (`google_<sanitizedEmail>`), legado sin prefijo (`<sanitizedEmail>`), correo plano (`<email>`), `user_<sanitizedEmail>` y UID de Firebase (`<uid>`).
    - **Discord Auth:** Prefijo moderno (`discord_<id>`), prefijo por correo (`discord_<sanitizedEmail>`) e ID numérico (`<id>`), aislados de claves legadas de Google.
  - **Auto-Migración Simétrica No Destructiva:** Si se detectan registros históricos bajo claves anteriores pertenecientes a la misma identidad confirmada, los datos se restauran y sincronizan en las colecciones modernas (`userData/{docId}`) y respaldos por UID (`users/{uid}`) mediante `mergeLocalAndCloudData` sin pérdida de saldos, bóvedas ni transacciones.
  - **Barrera de Primer Acceso y Validación de Titularidad:** Los registros locales genéricos validan la titularidad de identidad antes de retornar datos en caché. Cuentas nuevas son dirigidas de forma obligatoria a la aceptación de términos y privacidad (*Clickwrap*), seguida inmediatamente por el modal de **Respaldo Obligatorio de la Billetera**.
- **Saneamiento Riguroso de Datos en la Nube (`localStorageDb.ts` y `firebaseDb.ts`):** El almacenamiento local y el envío hacia Cloud Firestore purgan de forma explícita `walletPrivateKey`, `walletMnemonic` y `securityPinHash` antes de cualquier serialización: las claves privadas nunca ingresan al Firestore ni abandonan el entorno criptográfico local.
- **Pista de Auditoría Jurídica y de Autocustodia Inmutable (`firebaseDb.ts` y `firestore.rules`):**
  - **Certificados de Constancia de Respaldo (`WALLET_BACKUP_ACKNOWLEDGMENT`):** Cada confirmación de respaldo de la frase de 12 palabras (`WalletBackupModal.tsx` → `db.logWalletBackupAcknowledgment`) genera un certificado digital inmutable con marca de tiempo, identificador hasheado en SHA-256, dirección pública y asunción expresa de responsabilidad de autocustodia (**nunca** almacenando la frase semilla ni la clave privada).
  - **Aceptación de Términos y Certificados Globales de Supresión de Cuenta (`deleteFromCloud`):** La aceptación de primer acceso queda asentada en el registro, y la solicitud voluntaria de eliminación de cuenta purga la información operativa a la vez que archiva un registro seudonimizado inmutable de conformidad regulatoria internacional:
    - 🇧🇷 **Brasil — LGPD (Ley General de Protección de Datos, Ley Nº 13.709/2018):** Cumplimiento del Art. 16, incisos I, II y VI (supresión de datos operativos personales con archivo legítimo de constancias probatorias para obligaciones legales).
    - 🇪🇺 **Unión Europea — GDPR (Reglamento (UE) 2016/679):** Garantía del Derecho de Supresión (*Right to Erasure*) del Art. 17(1), armonizado con el Art. 17(3)(b) y (e) (retención legítima de evidencias digitales inmutables para defensa procesal y cumplimiento normativo).
    - 🇺🇸 **Estados Unidos — CCPA / CPRA (Cal. Civ. Code § 1798.100+ y § 1798.105):** Cumplimiento de solicitudes de eliminación del consumidor, reteniendo estrictamente los registros inmutables indispensables para auditorías probatorias y cumplimiento legal federal y estatal bajo Cal. Civ. Code § 1798.105(d).
  - **Reglas de Auditoría Write-Once:** Las colecciones de auditoría jurídica en Firestore están protegidas a nivel de base de datos (`allow update, delete: if false;`), garantizando integridad probatoria inviolable.
- **Allowlist en el Cliente, Validación de Entradas y Techo de Comisiones:** Las meta-transacciones salientes (EIP-3009) validan suma de verificación de destinatarios (`isAddress`, bloqueo contra quema accidental), importes positivos, cobertura completa de fondos (`monto + comisiónProtocolo + comisiónGas <= saldoUSDC`) y verifican al Relayer contra una lista cerrada con techo máximo de tarifa de gas fijado en `$0,10 USDC` antes de autorizar la firma.
- **Nonces Criptográficos EIP-3009:** Todos los nonces de autorización de transacciones se generan con `crypto.getRandomValues(32)`, eliminando cualquier predictibilidad o riesgo de colisión.
- **Cero Secretos en el Código, Configuración Segura y `.gitignore` Estricto:** Ninguna clave de API, credencial de Firebase ni clave privada se encuentra codificada en el repositorio. Los archivos con extensiones `.env*`, `*.key`, `bun.lock*` y credenciales de cuentas de servicio quedan permanentemente excluidos de las confirmaciones de Git.
- **Seguridad Reforzada en el Relayer y Paymaster Web3 (`/api/paymaster/transfer` y `/api/paymaster/proxy`):**
  - **Verificación Previa de Firma EIP-712 y Nonce On-Chain:** Antes de despachar gas ETH en la red, el servidor valida las tres firmas ECDSA EIP-3009, comprueba los pisos mínimos de tarifas y verifica el `authorizationState` y saldo on-chain en Base L2.
  - **Mutex de Ejecución Serializada y Doble Rate Limiting:** Un mutex en memoria del servidor previene colisiones de nonce EVM y condiciones de carrera de doble gasto (*TOCTOU race conditions*), complementado con limitación de solicitudes por IP y por billetera.
  - **Proxy Paymaster Fail-Closed:** El endpoint `/api/paymaster/proxy` rechaza solicitudes en lote y restringe las llamadas estrictamente a los contratos oficiales permitidos.
- **Prevención de Inyección de Fórmulas en CSV:** Las exportaciones de estados financieros ([`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts)) neutralizan de forma automática los detonadores de fórmulas de hojas de cálculo (`=`, `+`, `-`, `@`, `\t`, `\r`) antes de generar archivos CSV, impidiendo la ejecución de macros maliciosas en Excel, LibreOffice y Google Sheets.
- **Cabeceras de Seguridad Web (OWASP):** El servidor Express implementa cabeceras defensivas de estándar bancario (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`) y saneamiento exhaustivo de rutas en el proxy inverso.

---

## 🗺️ Hoja de Ruta Estratégica (Roadmap) y Financiación

CofreAdmin combina la ingeniería de software de autocustodia con un modelo de sostenibilidad transparente y respaldado por subvenciones:

- 🚀 **Hitos y Evolución:** Partiendo de la versión de producción **v1.0.6** (bóvedas Web3 de autocustodia real, rieles gasless EIP-3009 y recuperación BIP-39) hacia bóvedas recurrentes inteligentes, cuentas con Abstracción de Cuentas y un **modelo analítico híbrido** — donde la ejecución financiera es 100% determinista y basada en reglas estrictas (garantizando cero riesgo de alucinación), mientras los diagnósticos heurísticos y algorítmicos apoyan la toma de decisiones del usuario.
- 💡 **Grants y Sostenibilidad del Protocolo:** Diseñado como un bien público autosustentable sin emisión de tokens especulativos, financiado a través de microtarifas on-chain transparentes (`0,2%` con tope de `$0,05 USDC`), subvenciones de los programas Base Ecosystem Grants, rondas de Gitcoin Public Goods y patrocinio de la comunidad de código abierto.
- 📑 **Especificación Completa:** Para consultar el cronograma detallado de cada fase, métricas y modelo económico, consulte el **[Whitepaper Ejecutivo de CofreAdmin](./docs/whitepaper/whitepaper-es-ES.md)**.

---

## 📬 Contacto

Canales oficiales de contacto y recursos de soporte:

- **Correo Oficial de Soporte:** [cofreadminwallet@gmail.com](mailto:cofreadminwallet@gmail.com)
- **Discord Oficial:** `@cofreadmin`
- **Formulario de Retroalimentación:** [Enviar Comentarios](https://forms.gle/MBpyniv5zf795wi97)
- **Documentación y Recursos:** [Documentación](./docs/)
- **Whitepaper Ejecutivo y Hoja de Ruta Estratégica:** [Whitepaper CofreAdmin (Especificación Completa)](./docs/whitepaper/whitepaper-es-ES.md)
- **Política de Privacidad:** [Política de Privacidad](./docs/privacy-policy/privacy-policy.md)
- **Ciclo de Vida del Producto y UX:** [Ciclo de Vida del Producto y UX](./docs/product-flow/product-flow-es-ES.md)

---

## 📜 Licencia (Apache-2.0)

Este proyecto es software de código abierto licenciado bajo la **Apache License, Version 2.0**.

Consulte el archivo [`LICENSE.md`](./LICENSE.md) para el texto legal completo y el archivo [`NOTICE`](./NOTICE) para la atribución de derechos de autor y reserva de marcas registradas.
