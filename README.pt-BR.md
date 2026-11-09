# CofreAdmin Wallet

> <img src="./public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Gestor de Cofres em USDC na Rede Base <br>
> Versão: **v1.0.6** • Documentação: **[Recursos & Documentação](./docs/)**; **[Whitepaper](./docs/whitepaper/whitepaper-pt-BR.md)**; **[Changelog](./CHANGELOG.md)** <br>
> Licenciado sob a **Apache License, Version 2.0 (Apache-2.0)**.

🌐 **Idiomas:** **[English](./README.md)** • **[Português](./README.pt-BR.md)** • **[Español](./README.es-ES.md)** • **[简体中文](./README.zh-Hans.md)**

---

## 📖 Visão Geral

O **CofreAdmin** é uma aplicação web de finanças pessoais de código aberto e carteira de dólar digital de **autocustódia estrita**, desenvolvida na rede **Base (Ethereum Layer 2)**.

Projetado com a fluidez, familiaridade e velocidade dos aplicativos bancários digitais modernos, o CofreAdmin elimina os atritos típicos da Web3: os usuários podem poupar em cofres de dólar digital (USDC), realizar transferências e pagamentos instantâneos, e organizar suas finanças com descrições amigáveis — mantendo **100% do controle criptográfico e posse exclusiva de suas chaves privadas**.

---

## ✨ Recursos Principais

- 🛡️ **Autocustódia Criptográfica Real (BIP-39 + Cofre WebCrypto Versionado):** Carteiras geradas localmente utilizando mnemônicos padrão **BIP-39 de 12 palavras** (`generateMnemonic` + derivação HD `mnemonicToAccount`) e criptografadas em repouso com **AES-GCM de 256 bits** através de uma **`CryptoKey` não extraível (`extractable: false`) no IndexedDB** (envelope `v3`) ou **PBKDF2 com 100.000 iterações** (envelope `v2`). Servidores e bancos em nuvem jamais visualizam ou armazenam chaves privadas ou sementes de recuperação.
- 👁️ **Modo Privacidade Rápido (Proteção contra Olhar Indiscreto / "Shoulder Surfing"):** Ocultação e máscara de saldos sincronizada em 1 toque em todo o painel (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard` e `ActiveVaultsPreview`), protegendo valores confidenciais com pontos discretos (`••••`) em locais públicos.
- 📋 **Proteção Visual contra Envenenamento de Clipboard (Clipboard Poisoning):** Segmentação visual de endereços de alto contraste com destaque dos primeiros 6 e últimos 4 caracteres, acompanhada de selo de verificação no `CryptoSendModal` para mitigar ataques de substituição maliciosa na área de transferência.
- 🔄 **Criptoagilidade Contínua & Motor de Migração Multigeração:** Arquitetura de carteira com versionamento retrocompatível (`v1` → `v2` → `v3`+) que detecta automaticamente saldos remanescentes de gerações anteriores na Base L2, viabiliza varredura on-chain em 1 clique para o padrão mais recente e exige backup obrigatório — garantindo **zero perda de fundos** em atualizações de segurança presentes e futuras.
- 💵 **Poupança em Dólar Digital (USDC nativo na Base):** Crie cofres temáticos com metas e prazos customizados, separando o saldo para despesas imediatas das reservas financeiras de médio e longo prazo.
- ⛽ **Experiência Gasless (Sem Necessidade de ETH):** Pague taxas de transação diretamente com o saldo em USDC utilizando trilhos de meta-transações Circle Paymaster e padrão EIP-3009 (`TransferWithAuthorization`) — sem necessidade de manter ETH na carteira.
- 📇 **Catálogo de Contatos, Resolução Basenames (`.base.eth`) & Proteção a Novos Destinatários:** Salve endereços frequentes, resolva nomes `.base.eth` (Base L2 Resolver) e `.eth` (ENS) com proteção contra ataques de homógrafos, e receba avisos preventivos de segurança ao enviar fundos para um endereço desconhecido pela primeira vez.
- ⚡ **Pagamentos Instantâneos, Links Pré-preenchidos & Comprovantes Auditáveis:** Escaneie QR Codes, gere links de cobrança em 1 clique (EIP-681 + Web Deep Links) com valores pré-configurados em USDC ou moeda fiduciária local (`R$`), e compartilhe comprovantes visuais de alta fidelidade contendo QR Code direto para auditoria no BaseScan.
- 🏷️ **Livro-Razão Inteligente, Memos Amigáveis & Categorização em 1 Toque:** Converta hashes criptográficos complexos (`0x3f...`) em lançamentos legíveis (ex.: *"Supermercado"*, *"Consultoria técnica"*) com categorias personalizadas, permitindo categorizar transferências recebidas em **1 toque diretamente no banner de notificação em tempo real**, sem necessidade de abrir a tela de extrato.
- 🔒 **Bloqueio Instantâneo & Teclado Numérico de 4 Dígitos (Estilo Trust Wallet):** Proteja o acesso ao cofre com teclado numérico na tela, indicadores visuais dinâmicos de 4 dígitos, hash local SHA-256 com sal isolado do dispositivo, e autenticação biométrica em hardware (Touch ID / Face ID) com latência ultrabaixa (<50ms).
- 📊 **Análises Financeiras & Extratos Contábeis em PDF:** Monitore o ritmo diário de gastos, acompanhe gráficos de consumo por categoria e emita relatórios contábeis em PDF com insígnias oficiais de cofre, indicadores da carteira Base e numeração dinâmica de páginas bilíngue.
- 📱 **Progressive Web App (PWA):** Instalável na tela de início do iOS e Android como aplicativo nativo, com operação offline resiliente e independência de intermediários de lojas de aplicativos.

---

## 🛠️ Stack Tecnológica

- **Linguagem & Ambiente de Execução:** TypeScript (`~5.8`), Node.js (`>=20`)
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Arquitetura & Camada de Dados:** Clean Architecture com **Repository Pattern / Service Layer** (`IDatabaseService`, `IAuthService`, `IBillingService` em `src/services/`) com sincronização híbrida Local + Nuvem e alternância de provedor de banco em 1 linha
- **Web3 & Blockchain:** Viem 2 (EVM / Rede Base L2, Contas HD BIP-39, EIP-3009)
- **Backend & Empacotador:** Express 4, esbuild
- **Hospedagem & Infraestrutura Cloud:** *(Agnóstico a provedores de nuvem; pré-configurado para Firebase App Hosting)*

---

## 🏗️ Arquitetura Limpa e Camada de Repositório (`src/services/`)

A persistência de dados e a autenticação do CofreAdmin são 100% desacopladas dos componentes visuais do React por meio do **Repository Pattern (Camada de Serviços)**. Nenhuma tela do React importa SDKs diretos como `firebase/*` ou manipula `localStorage` diretamente para entidades de negócio:

| Arquivo | Responsabilidade |
| :--- | :--- |
| [`src/services/types.ts`](./src/services/types.ts) | Modelos de domínio fortemente tipados (`UserProfile`, `Vault`, `Transaction`, `Category`, `SavedContact`, `OnChainLedgerEntry`, suporte multi-tenant `userId`/`doctorId`) e contratos de serviço (`IDatabaseService`, `IAuthService`, `IBillingService`). |
| [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts) | `LocalStorageDatabaseService` — persistência local/offline completa, isolamento estrito de armazenamento por conta, higienização de transações e gestão de sessões. |
| [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) | `FirebaseDatabaseService` & `FirebaseAuthService` — isola 100% das chamadas SDK do `firebase/app`, `firebase/auth` e `firebase/firestore`, com inicialização condicional (`isFirebaseConfigured`) que opera em Modo Local seguro caso as chaves não estejam configuradas no `.env`. |
| [`src/services/currentDb.ts`](./src/services/currentDb.ts) | `HybridDatabaseService` — implementa `IDatabaseService` e `IBillingService`, combinando leituras e gravações locais imediatas com sincronização em segundo plano no Cloud Firestore e mesclagem sem conflitos (`mergeLocalAndCloudData`). |
| [`src/services/index.ts`](./src/services/index.ts) | **Ponto Único de Injeção de Dependências** exportando `db`, `authService` e `billingService`. Permite alterar todo o provedor de banco de dados (ex.: migrar para Supabase, PostgreSQL/Cloud SQL ou API REST externa) modificando **uma única linha de código**. |

---

## 📋 Pré-requisitos

Antes de iniciar a instalação, certifique-se de que seu ambiente atenda aos seguintes requisitos mínimos:

- **Node.js:** versão `v20.0.0` ou superior (`v22.x` recomendada)
- **npm:** versão `v10.0.0` ou superior
- **Git**

---

## 🚀 Instalação e Desenvolvimento Local

Siga os passos abaixo para executar uma instância funcional e independente em sua máquina local:

### 1. Clonar o Repositório

```bash
git clone https://github.com/cofreadminwallet/app.git
cd app
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo `.env.example` para criar seu arquivo local `.env`:

```bash
cp .env.example .env
```

### 4. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000` com suporte a recarga rápida em tempo real.

### 5. Compilação para Produção

```bash
npm run build
npm run start
```

---

## ⚙️ Variáveis de Ambiente e Configuração (`.env`)

Todas as configurações operacionais estão isoladas em variáveis de ambiente. Abra seu arquivo `.env` para personalizar as opções:

### A. Configuração do Firebase (Banco na Nuvem e Autenticação Google)

O Firebase fornece suporte à sincronização de dados na nuvem e autenticação via Google. *(O modo Convidado / Offline funciona 100% localmente sem Firebase — caso `VITE_FIREBASE_API_KEY` esteja vazio, o serviço entra em operação Local resiliente sem gerar erros de runtime)*.

> **💡 Habilitando o Login com o Google:** No seu [Firebase Console](https://console.firebase.google.com/), acesse **Authentication** > **Sign-in method**, clique em **Adicionar novo provedor** e selecione **Google**. Não é necessária nenhuma variável adicional de `GOOGLE_CLIENT_ID` — o handshake é gerenciado pelo próprio SDK do Firebase com os parâmetros abaixo.

| Variável | Descrição | Onde Encontrar |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Chave de API Web do Firebase | Firebase Console > Configurações do Projeto > Web App |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de Auth (ex.: `seu-app.firebaseapp.com`) | Firebase Console > Configurações do Projeto > Web App |
| `VITE_FIREBASE_PROJECT_ID` | ID do Projeto Google Cloud / Firebase | Firebase Console > Configurações do Projeto |
| `VITE_FIREBASE_STORAGE_BUCKET` | URL do Bucket do Firebase Storage | Firebase Console > Configurações do Projeto |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID do Remetente de Mensagens Cloud | Firebase Console > Configurações do Projeto |
| `VITE_FIREBASE_APP_ID` | Identificador da Aplicação Web do Firebase | Firebase Console > Configurações do Projeto |
| `VITE_FIREBASE_DATABASE_ID` | *(Opcional)* ID do Banco Firestore nomeado | Deixe em branco para usar o banco `(default)` |

### B. Configurações da Rede Base e Web3

| Variável | Descrição | Padrão / Exemplo |
| :--- | :--- | :--- |
| `DEV_FEE_RECIPIENT_ADDRESS` | Endereço público EVM receptor das taxas de protocolo (0,2%, mín. $0,05) | `0xD4875cCF...` |
| `VITE_DEV_FEE_RECIPIENT_ADDRESS` | Espelho client-side do endereço receptor de taxas | `0xD4875cCF...` |
| `EXPECTED_GAS_RELAYER` | Endereço público EVM do relayer oficial de gás | `0x31b7BafB...` |
| `VITE_EXPECTED_GAS_RELAYER` | Espelho client-side do endereço do relayer | `0x31b7BafB...` |
| `CIRCLE_API_KEY` | *(Opcional)* Chave de desenvolvedor Circle para paymaster | Deixe vazio para modo permissionless |
| `RELAYER_PRIVATE_KEY` | *(Opcional / Apenas Servidor)* Chave privada caso utilize relayer próprio | **Nunca comitar no repositório Git** |

> **💡 Ajuste de Taxa do Protocolo:** Por padrão, transferências enviadas direcionam 0,2% de taxa de protocolo (com piso mínimo de $0,05 USDC) para `DEV_FEE_RECIPIENT_ADDRESS`. Para alterar essa taxa, edite `DEV_PROTOCOL_FEE_PERCENT` e `DEV_PROTOCOL_FEE_MIN_USD` em [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts).

> **💡 RPCs Públicos sem Custo & USDC Nativo:** A aplicação se conecta diretamente ao RPC público oficial da Base (`https://mainnet.base.org`) e interage com o contrato de USDC nativo oficial da Circle (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), sem depender de provedores pagos de infraestrutura externa.

### C. Autenticação Social via Discord *(Opcional)*

Habilite a autenticação Discord no Portal de Desenvolvedores do Discord > OAuth2:

| Variável | Descrição |
| :--- | :--- |
| `DISCORD_CLIENT_ID` | ID do Cliente da Aplicação Discord |
| `DISCORD_CLIENT_SECRET` | Chave Secreta do Cliente da Aplicação Discord |
| `OAUTH_STATE_SECRET` | *(Opcional)* Segredo de servidor para assinatura HMAC dos tokens anti-CSRF (derivado automaticamente se omitido) |

*URI de Redirecionamento a configurar no Discord:* `https://<seu-dominio>/api/auth/discord/callback`

---

## 🎨 Personalização de Marca, Suporte e Contatos

Para implementações self-hosted ou rebranding institucional, você pode personalizar os canais de contato e links via variáveis de ambiente ou diretamente nos arquivos fonte:

### 1. Via Variáveis de Ambiente (`.env`)

| Variável | Valor Padrão | O que Altera na Aplicação |
| :--- | :--- | :--- |
| `VITE_SUPPORT_EMAIL` | `cofreadminwallet@gmail.com` | Altera o e-mail oficial de suporte nas Configurações e nos links automáticos de diagnóstico |
| `VITE_FEEDBACK_URL` | `https://forms.gle/MBpyniv5zf795wi97` | Altera a URL de destino do botão **Feedback** em Configurações |

### 2. Personalização de Logotipo, Nome da Aplicação e Ativos Visuais em Código

Caso deseje alterar a identidade visual (*rebranding*) ou criar uma versão própria (*white-label*), este é o mapeamento técnico exato do código-fonte:

- **Logotipo Visual do App e Ícone do Cofre ([`src/components/CofreLogo.tsx`](./src/components/CofreLogo.tsx)):**
  - **Ícone do Logotipo:** No aplicativo em execução, o logotipo **não é uma imagem estática**; ele é renderizado programaticamente via React e Tailwind CSS. O corpo 3D Neo-Brutalista em gradiente roxo, o volante da porta giratória e o painel equalizador verde-limão são desenhados diretamente em JSX. É possível alterar as cores, o desenho ou substituir o bloco por um vetor SVG próprio ou tag `<img>`.
  - **Tipografia da Marca:** Os textos `"Cofre"` (preto) e `"Admin"` (badge verde-limão) estão definidos em `CofreLogo.tsx`.
  - **Slogans Bilíngues:** Os subtítulos nos idiomas `en-US` (*"Own your money. Be the admin."*) e `pt-BR` (*"Seja o admin da sua grana."*) são alternados em `CofreLogo.tsx`.
  - **Componente de Emoji da Marca (`CofreEmoji`):** Renderiza o vetor [`public/cofre-emoji.svg`](./public/cofre-emoji.svg).
- **Nome da Marca no Cabeçalho Superior ([`src/components/Header.tsx`](./src/components/Header.tsx)):**
  - Renderiza o título da aplicação exibido na barra superior ao lado do avatar do usuário autenticado.
- **Título da Aplicação, Metatags SEO e Cards OpenGraph ([`index.html`](./index.html)):**
  - **Título da Página:** `<title>CofreAdmin — Self-Custodial Web3 Personal Finance</title>`.
  - **Metatags e Descrições:** `<meta name="description">`, `<meta name="keywords">`, `<meta name="application-name">` e `<meta name="apple-mobile-web-app-title">`.
  - **Compartilhamento Social (OpenGraph):** `og:site_name`, `og:title`, `og:description` e `og:image`.
- **Manifesto de Instalação PWA ([`public/manifest.json`](./public/manifest.json)):**
  - Define o nome exibido no dispositivo (`name` e `short_name`), descrição e comportamento de abertura em tela cheia para celulares e computadores.
- **Ícones do Sistema, Favicons e Ativos em Tempo de Execução ([`public/`](./public/)):**
  - **Favicon do Navegador:** [`public/favicon.svg`](./public/favicon.svg).
  - **Ícone Apple / Cabeçalho de Extrato PDF:** [`public/apple-touch-icon.png`](./public/apple-touch-icon.png) (carregado também pelo motor de relatórios em [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts)).
  - **Ícones PWA e Notificações Push:** [`public/icon-192.png`](./public/icon-192.png) e [`public/icon-512.png`](./public/icon-512.png) (utilizados pelo [`public/sw.js`](./public/sw.js) e pelo [`src/services/notificationService.ts`](./src/services/notificationService.ts)).
  - **Cards de Compartilhamento Social:** [`public/cofreadmin-share-card.png`](./public/cofreadmin-share-card.png) e [`public/cofreadmin-share-card-en.png`](./public/cofreadmin-share-card-en.png) (enviados nativamente via WhatsApp / Web Share em [`src/App.tsx`](./src/App.tsx)).
  - *(Nota: O arquivo `./public/icon48x48.png` é apenas uma miniatura decorativa para o cabeçalho dos arquivos Markdown do README, sem qualquer interferência no código do aplicativo).*

### 3. Mapeamento nos Arquivos Fonte

Caso deseje atualizar parâmetros fixos diretamente no código-fonte:

- **Ponto de Injeção de Dependências do Banco & Auth (Troca em 1 Linha):** [`src/services/index.ts`](./src/services/index.ts) (`db`, `authService`, `billingService`)
- **Contratos de Repositório & Modelos de Domínio:** [`src/services/types.ts`](./src/services/types.ts) (`IDatabaseService`, `IAuthService`, `IBillingService`)
- **Serviço Híbrido, Repositórios Cloud Firestore e Local Storage:** [`src/services/currentDb.ts`](./src/services/currentDb.ts), [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) e [`src/services/localStorageDb.ts`](./src/services/localStorageDb.ts)
- **E-mail de Suporte & Diagnóstico do Sistema:** [`src/utils/supportEmail.ts`](./src/utils/supportEmail.ts) (variável `SUPPORT_EMAIL`)
- **Formulário de Feedback:** [`src/components/ProfileSettingsScreen.tsx`](./src/components/ProfileSettingsScreen.tsx)
- **Termos Legais & Documentação:** [`src/components/LegalTermsModal.tsx`](./src/components/LegalTermsModal.tsx)
- **Auditoria Jurídica Imutável e Certificados Globais de Eliminação (Brasil LGPD, UE GDPR, EUA CCPA/CPRA):** [`src/services/firebaseDb.ts`](./src/services/firebaseDb.ts) (`logWalletBackupAcknowledgment`, `deleteFromCloud`) e [`firestore.rules`](./firestore.rules)
- **Versão da Aplicação e Sincronização Automática:** [`src/config/version.ts`](./src/config/version.ts) (`APP_VERSION` e `APP_VERSION_LABEL`)
- **Cofre Criptográfico Versionado (`v2` PBKDF2 / `v3` IndexedDB `CryptoKey` Não Extraível):** [`src/utils/cryptoVault.ts`](./src/utils/cryptoVault.ts) (`CURRENT_VAULT_ENVELOPE_VERSION`, `needsVaultEnvelopeUpgrade`)
- **Contratos Nativos USDC, Motor BIP-39, RPCs Públicos Base e Rotação Futura:** [`src/services/web3Service.ts`](./src/services/web3Service.ts) (`BASE_USDC_MAINNET`, `BASE_PUBLIC_RPC`, `CURRENT_WALLET_GENERATION`, `generateMnemonicWallet`, `stageWalletForMigration`, `getPendingMigrationWallet`)
- **Modais de Rotação Criptográfica e Backup Obrigatório:** [`src/components/WalletMigrationModal.tsx`](./src/components/WalletMigrationModal.tsx) e [`src/components/WalletBackupModal.tsx`](./src/components/WalletBackupModal.tsx)
- **Categorização em 1 Toque no Banner de Notificação:** [`src/components/QuickCategorizeReceiveToast.tsx`](./src/components/QuickCategorizeReceiveToast.tsx)
- **Bloqueio de Sessão & Segurança WebAuthn no Dispositivo:** [`src/services/webAuthnService.ts`](./src/services/webAuthnService.ts) e [`src/components/AppLockScreen.tsx`](./src/components/AppLockScreen.tsx)
- **Motor de Geração de Extratos Contábeis em PDF:** [`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts) e [`src/components/ExportDataModal.tsx`](./src/components/ExportDataModal.tsx)
- **Percentual de Taxa do Protocolo & Piso Mínimo (0,2% / $0,05 USDC):** [`src/services/cryptoTransferService.ts`](./src/services/cryptoTransferService.ts) (constantes `DEV_PROTOCOL_FEE_PERCENT` e `DEV_PROTOCOL_FEE_MIN_USD`)
- **Trava de Segurança para Transações de Alto Valor:** [`src/components/CryptoSendModal.tsx`](./src/components/CryptoSendModal.tsx) (variável `isHighValue`, padrão $\ge \$100\text{ USDC}$ ou $\ge \text{R\$} 500$)
- **Categorias e Emojis Padrão:** [`src/utils/initialData.ts`](./src/utils/initialData.ts) (vetor `DEFAULT_CATEGORIES`)
- **Moedas Fiduciárias Suportadas:** [`src/utils/currencies.ts`](./src/utils/currencies.ts) (vetor `TOP_CURRENCIES`)

---

## ☁️ Implantação em Produção

### Opção 1: Firebase App Hosting (Pré-configurado)

O projeto está 100% pré-configurado para implantação contínua através do **Firebase App Hosting**:

1. Vincule seu repositório GitHub no **Firebase Console** em **App Hosting**.
2. Em **App Hosting** > **Configurações de Ambiente**, insira as variáveis definidas no seu `.env`.
3. O arquivo [`apphosting.yaml`](./apphosting.yaml) incluído gerencia o ciclo:
   - Comando de compilação: `npm run build`
   - Comando de execução: `npm run start` (servidor backend na porta 8080/3000)
4. Todo push na branch `main` executa uma compilação automatizada com zero indisponibilidade (*zero-downtime*).

### Opção 2: Provedores Cloud, Contêineres ou VPS (Cloud-Agnostic)

Por compilar em um pacote Node.js / Express independente (`dist/server.cjs`), a aplicação **não possui dependência exclusiva do Firebase**. Pode ser hospedada em qualquer nuvem, serviço de contêiner ou máquina Linux (Docker, Render, Railway, Fly.io, AWS, Google Cloud Run, DigitalOcean, etc.):

- **Comando de Compilação:** `npm run build`
- **Comando de Execução:** `npm run start` *(vincula-se automaticamente à variável de ambiente `PORT` do sistema operacional)*

---

## 🛡️ Segurança e Autocustódia Criptográfica

- **Geração Estrita de Chaves HD BIP-39 (Sem Derivações Legadas):** Todas as carteiras geram frases de recuperação criptograficamente aleatórias de 12 palavras (`generateMnemonic(english)`) e derivam a chave privada e endereço EVM correspondente (`mnemonicToAccount`). Métodos de derivação determinística anteriores (`v1`) foram removidos permanentemente da base de código.
- **Cofre Criptográfico Versionado em Dois Modos AES-GCM de 256 bits (`cryptoVault.ts`):**
  - **`CryptoKey` Não Extraível Vinculada ao Dispositivo (`enc:aes-gcm:idb:v3:`):** Por padrão, chaves privadas e mnemônicos são criptografados com AES-GCM 256 bits (IV de 12 bytes aleatório) utilizando uma `CryptoKey` gerada com `extractable: false` e persistida no **IndexedDB** do navegador (`cofreadmin_keystore_db`). Isso assegura persistência transparente entre recarregamentos de página (`F5`) e reinicializações de navegador, impedindo que o material puro da chave seja extraído via `exportKey()` ou roubado de um simples `localStorage`.
  - **Proteção por Frase de Acesso PBKDF2 & PIN em Tempo Constante (`enc:aes-gcm:v2:`):** Quando uma senha customizada ou PIN de 4 dígitos é configurado, as chaves e hashes são derivados via PBKDF2 (100.000 iterações, SHA-256, sal de 16 bytes aleatório + IV de 12 bytes) e verificados com comparação em tempo constante (`constantTimeEqual`) para neutralizar ataques de temporização (*timing attacks*).
  - **Versionamento de Envelope Progressivo (`v2` / `v3` → `vN`):** Todo conteúdo criptografado possui prefixo explícito de versão (`CURRENT_VAULT_ENVELOPE_VERSION = 'v3'`) com detecção via `needsVaultEnvelopeUpgrade()`, permitindo que o cofre atualize o armazenamento para futuros padrões criptográficos (`v4+`) de forma transparente e segura.
- **Biometria em Hardware & Proteção de PIN com Sal (`webAuthnService.ts`):** O bloqueio de sessão utiliza hash SHA-256 com sal isolado no dispositivo (`cofre_pin_salt`). As credenciais WebAuthn são ajustadas com `residentKey: 'discouraged'` e transportes internos (`['internal']`), eliminando janelas de diálogo de gerenciadores de credenciais e garantindo desbloqueio em menos de 50ms.
- **Garantias Anti-Sobrescrita e Prevenção de Carteira Fantasma:**
  - Caso uma chave criptografada esteja bloqueada ou ocorra falha de descriptografia, o processo é imediatamente interrompido (`CARTEIRA_BLOQUEADA`), **nunca** gerando chaves novas por cima das existentes.
  - No boot e restauração de dados, o aplicativo valida que o endereço exibido pertence à chave sob controle efetivo do dispositivo local.
  - A rotina de redefinição de carteira (`resetWallet`) verifica previamente os saldos de USDC e ETH na Base e bloqueia a ação caso existam fundos sob custódia.
- **Resolução Multi-Chave com Isolamento entre Provedores e Proteção Contra Perda de Contas (`getCandidateDocIds` & `getStorageDataWithFallbacks`):**
  - **Separação Estrita de Provedores:** Consultas resolvem chaves candidatas com escopo estrito para prevenir colisões entre Google e Discord (mesmo quando um usuário utiliza o mesmo e-mail em ambos no mesmo navegador):
    - **Google Auth:** Prefixo moderno (`google_<sanitizedEmail>`), legado sem prefixo (`<sanitizedEmail>`), e-mail puro (`<email>`), `user_<sanitizedEmail>` e UID do Firebase (`<uid>`).
    - **Discord Auth:** Prefixo moderno (`discord_<id>`), prefixo por e-mail (`discord_<sanitizedEmail>`) e ID numérico (`<id>`), estritamente isolados de chaves legadas do Google.
  - **Auto-Migração Simétrica Não Destrutiva:** Dados históricos descobertos sob chaves legadas pertencentes à mesma identidade verificada são restaurados e espelhados para as coleções modernas (`userData/{docId}`) e backups por UID (`users/{uid}`) através de `mergeLocalAndCloudData` com zero perda de saldos, cofres ou transações.
  - **Barreira de Primeiro Acesso & Verificação de Propriedade:** Registros locais genéricos validam titularidade antes de retornar dados em cache. Usuários novos são direcionados obrigatoriamente para a tela de aceite de termos e privacidade (*Clickwrap*), seguida imediatamente pelo modal de **Backup Obrigatório da Carteira**.
- **Higienização Estrita de Dados em Nuvem (`localStorageDb.ts` & `firebaseDb.ts`):** O armazenamento local e o envio para o Cloud Firestore removem expressamente `walletPrivateKey`, `walletMnemonic` e `securityPinHash` antes da serialização — chaves privadas jamais tocam o Firestore ou saem do ambiente criptográfico local.
- **Trilha de Auditoria Jurídica e de Autocustódia Imutável (`firebaseDb.ts` & `firestore.rules`):**
  - **Certificados de Ciência de Backup (`WALLET_BACKUP_ACKNOWLEDGMENT`):** Toda confirmação de backup da frase mnemônica (`WalletBackupModal.tsx` → `db.logWalletBackupAcknowledgment`) gera um certificado digital imutável com carimbo temporal, identificador com hash SHA-256, endereço público e ciência expressa de responsabilidade de autocustódia (**nunca** armazenando a semente ou a chave privada).
  - **Aceite de Termos e Certificados Globais de Eliminação de Conta (`deleteFromCloud`):** O aceite de primeiro acesso é registrado na inscrição, e a exclusão voluntária da conta elimina os dados operacionais enquanto arquiva um registro pseudonimizado de auditoria para conformidade jurídica internacional:
    - 🇧🇷 **Brasil — LGPD (Lei Geral de Proteção de Dados, Lei nº 13.709/2018):** Cumprimento do Art. 16, incisos I, II e VI (eliminação de dados pessoais operacionais com guarda legítima de registros probatórios para cumprimento de obrigação legal).
    - 🇪🇺 **União Europeia — GDPR (Regulamento (UE) 2016/679):** Assegura o Direito à Eliminação (*Right to Erasure*) do Art. 17(1), harmonizado com o Art. 17(3)(b) e (e) (retenção admitida de registros digitais imutáveis para defesa em processos e cumprimento legal).
    - 🇺🇸 **Estados Unidos — CCPA / CPRA (Cal. Civ. Code § 1798.100+ & § 1798.105):** Atende a solicitações de eliminação de consumidores mantendo estritamente os registros imutáveis necessários para auditoria probatória e cumprimento regulatório conforme Cal. Civ. Code § 1798.105(d).
  - **Regras de Auditoria Write-Once:** Coleções de auditoria jurídica são protegidas no Firestore (`allow update, delete: if false;`), garantindo integridade probatória à prova de adulteração.
- **Allowlist no Cliente, Validação de Entradas & Teto de Taxas:** Meta-transações de saída (EIP-3009) validam checksum de destinatários (`isAddress`, bloqueio de queima acidental), valores positivos, cobertura de saldo (`valor + taxaProtocolo + taxaGas <= saldoUSDC`), e verificam o Relayer contra uma lista restrita com teto máximo de taxa de gás fixado em `$0,10 USDC` antes da assinatura.
- **Nonces Criptográficos EIP-3009:** Todos os nonces de autorização de transação são gerados via `crypto.getRandomValues(32)`, eliminando qualquer previsibilidade ou risco de colisão.
- **Zero Segredos em Código, Configuração Segura e `.gitignore` Rigoroso:** Nenhuma chave de API, credencial do Firebase ou chave privada é embutida no repositório. Arquivos com extensão `.env*`, `*.key`, `bun.lock*`, credenciais de serviço e relayer são permanentemente excluídos de commits.
- **Proteção OAuth2 Anti-CSRF, XSS & Validação de Origem:** Autenticação Discord utiliza tokens `state` com HMAC-SHA256, expiração em 10 minutos, validação de cabeçalhos `Host`/`X-Forwarded-Host`, sanitização de contexto HTML/JSON e validação estrita de origem em handshakes `postMessage`.
- **Segurança Reforçada no Relayer & Paymaster Web3 (`/api/paymaster/transfer` & `/api/paymaster/proxy`):**
  - **Validação Prévia de Assinatura EIP-712 e Nonce On-Chain:** Antes de despachar gás ETH na rede, o servidor verifica as assinaturas ECDSA EIP-3009, valida pisos mínimos de taxa e confere o `authorizationState` e saldo on-chain na Base L2.
  - **Mutex de Execução Serializada e Rate Limiting Duplo:** Mutex em memória no servidor previne colisões de nonce EVM e ataques de concorrência (*TOCTOU race conditions*), complementado por limitação de requisições por IP e por carteira.
  - **Proxy Paymaster Fail-Closed:** O proxy `/api/paymaster/proxy` rejeita lotes em lote não auditados e restringe chamadas estritamente aos contratos oficiais permitidos.
- **Prevenção de Injeção de Fórmulas em CSV:** As exportações de extratos financeiros ([`src/utils/exportPdf.ts`](./src/utils/exportPdf.ts)) neutralizam gatilhos de planilhas (`=`, `+`, `-`, `@`, `\t`, `\r`) antes da geração de arquivos CSV, prevenindo a execução inadvertida de macros no Excel, LibreOffice e Google Sheets.
- **Cabeçalhos de Segurança Web (OWASP):** O servidor Express implementa cabeçalhos defensivos de mercado (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`) e validação rigorosa de rotas de proxy reverso.

---

## 🗺️ Roteiro Estratégico (Roadmap) & Financiamento

O CofreAdmin une engenharia de software de autocustódia com um modelo sustentável e transparente de financiamento via ecossistema:

- 🚀 **Marcos & Evolução:** Partindo da versão de produção **v1.0.6** (cofres Web3 de autocustódia real, trilhos gasless EIP-3009 e backup BIP-39) rumo a cofres recorrentes inteligentes, contas inteligentes com Account Abstraction e inteligência financeira em **arquitetura híbrida** — onde a execução financeira é 100% determinística e baseada em regras estritas (garantindo zero risco de alucinação), enquanto diagnósticos e análises heurísticas algorítmicas apoiam o usuário.
- 💡 **Grants & Sustentabilidade do Protocolo:** Estruturado como bem público sustentável sem emissão de tokens especulativos, sustentado por microtaxas transparentes on-chain (`0,2%` com teto de `$0,05 USDC`), subvenções dos programas Base Ecosystem Grants, rodadas Gitcoin Public Goods e patrocínios da comunidade open-source.
- 📑 **Especificação Completa:** Para conferir o detalhamento completo de cada fase de entrega, cronograma, métricas e modelo econômico, consulte o **[Whitepaper Executivo do CofreAdmin](./docs/whitepaper/whitepaper-pt-BR.md)**.

---

## 📬 Contato

Canais oficiais de atendimento e recursos de suporte:

- **E-mail Oficial de Suporte:** [cofreadminwallet@gmail.com](mailto:cofreadminwallet@gmail.com)
- **Discord Oficial:** `@cofreadmin`
- **Formulário de Feedback:** [Enviar Sugestões](https://forms.gle/MBpyniv5zf795wi97)
- **Documentação & Recursos:** [Documentação](./docs/)
- **Whitepaper Executivo & Roteiro Estratégico:** [Whitepaper CofreAdmin (Especificação Completa)](./docs/whitepaper/whitepaper-pt-BR.md)
- **Política de Privacidade:** [Política de Privacidade](./docs/privacy-policy/privacy-policy-pt-BR.md)
- **Fluxo de Produto e UX:** [Fluxo de Produto e UX](./docs/product-flow/product-flow-pt-BR.md)

---

## 📜 Licença (Apache-2.0)

Este projeto é um software de código aberto licenciado sob a **Apache License, Version 2.0**.

Consulte o arquivo [`LICENSE.md`](./LICENSE.md) para o texto jurídico integral e o arquivo [`NOTICE`](./NOTICE) para a atribuição de direitos autorais e reserva de marcas registradas.
