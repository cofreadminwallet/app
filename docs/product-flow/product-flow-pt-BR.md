# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Fluxo de Produto Ponta a Ponta & Experiência do Usuário • Visão Técnica & para Investidores <br>
> Versão: **v1.0.6** • Licenciado sob a **Apache License, Version 2.0 (Apache-2.0)**.

🌐 **Idiomas:** **[English](product-flow.md)** • **[Português](product-flow-pt-BR.md)** • **[Español](product-flow-es-ES.md)** • **[简体中文](product-flow-zh-Hans.md)**

---

## 🔄 O Fluxo do Ciclo de Vida do Produto em 6 Etapas

```
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   1. ENTRADA SEM ATRITO    │  ───> │   2. WEB3 INVISÍVEL &      │  ───> │   3. PAGAMENTOS FLUIDOS    │
│      & IDENTIDADE ÚNICA    │       │      AUTOCUSTÓDIA          │       │      & RECEBIMENTOS        │
│ • Login Social em 1 Toque  │       │ • AES-GCM 256 no Cliente   │       │ • QR Code com Câmera e 0x  │
│ • E-mail Unificado Cross   │       │ • Agilidade Multi-Geração  │       │ • Basenames & ENS Resolver │
│ • Modo Visitante Offline   │       │ • Biometria WebAuthn / PIN │       │ • Badges Anti-Envenenamento│
│ • PWA (0% taxas de appstore│       │ • Varredura On-Chain Sweep │       │ • Gas em USDC (EIP-3009)   │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
                                                                                        │
                                                                                        ▼
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   6. PRIVACIDADE, DADOS    │  <─── │   5. EXTRATO INTELIGENTE   │  <─── │   4. COFRES & PSICOLOGIA   │
│      & EXCLUSÃO LEGAL      │       │      & LIVRO-RAZÃO         │       │      DE ECONOMIA EM DÓLAR  │
│ • Modo Privacidade Rápida  │       │ • Categorização em 1 Toque │       │ • Arquitetura Saldo Duplo  │
│ • Backup de Chave Privada  │       │ • Memos Humanos & Tags     │       │ • Metas Temáticas em Dólar │
│ • Nuvem Multi-Tenant       │       │ • Anel de Orçamento Diário │       │ • Chuva de Confetes        │
│ • Exclusão LGPD / GDPR     │       │ • Exportação PDF/CSV       │       │ • Resgate Imediato Taxa 0  │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
```

---

## 🔎 Detalhamento Etapa por Etapa

### 1. Entrada Sem Atrito & Identidade Unificada
* **O Problema:** A integração tradicional na Web3 força o usuário a anotar frases-semente de 12 a 24 palavras, instalar extensões de carteiras de terceiros ou cria perfis divididos e duplicados ao alternar entre provedores de login.
* **A Experiência CofreAdmin:**
  * **Onboarding Social em 1 Toque:** Usuários iniciam sessão com suas contas Google ou Discord em menos de 3 segundos.
  * **Identidade Unificada por E-mail Verificado (Novo na v1.0.6):** Ao entrar via Google e posteriormente via Discord utilizando o mesmo e-mail verificado, o CofreAdmin consolida automaticamente os acessos sob uma única identidade legal. O mesmo endereço de carteira on-chain, documentos em nuvem (`userData`), cofres e histórico de transações são mantidos íntegros, sem contas duplicadas, loops de termos de uso ou substituição acidental de perfil.
  * **Modo Visitante / Offline:** Permite testar todo o aplicativo com zero burocracia de cadastro; os dados e a carteira operam 100% locais na memória do navegador (`localStorage` e IndexedDB).
  * **Experiência Nativa PWA:** Elimina a comissão abusiva de 30% das lojas da Apple e Google e o risco de censura. Instala diretamente na tela inicial do iOS e Android com cache offline, atalhos de aplicativo e fluidez a 60 FPS.

### 2. Web3 Invisível & Agilidade Criptográfica
* **The Problem:** Usuários leigos perdem frases-semente de recuperação, caem em golpes de phishing ou ficam presos a padrões criptográficos legados sem caminho de atualização segura.
* **A Experiência CofreAdmin:**
  * **Criptografia Instantânea:** Chaves privadas EVM são derivadas no lado do cliente via Web Crypto API e protegidas em repouso com **criptografia AES-GCM de 256 bits**.
  * **Risco Custodial Zero:** Os servidores do CofreAdmin jamais recebem, transmitem ou armazenam chaves privadas ou ativos dos usuários.
  * **Motor de Agilidade Criptográfica Multi-Geração (`v1` → `v2` → `v3`):**
    * *v1 (Legado):* Derivação em texto puro para manter compatibilidade retroativa.
    * *v2 (Envelope Criptografado):* Criptografia AES-GCM de 256 bits reforçada por derivação PBKDF2 com 100.000 iterações.
    * *v3 (Hardware-Bound):* Chaves Web Crypto API não-extraíveis armazenadas em partições protegidas do IndexedDB.
    * *Varredura On-Chain em 1 Clique (Sweep):* Permite aos usuários migrar a totalidade de seus saldos entre gerações de carteira em uma única transação atômica na blockchain.
  * **PIN de Segurança Tátil de 4 Dígitos & Biometria WebAuthn:** Operações críticas (assinaturas, revelação de chaves, transferências de alto valor) solicitam autenticação biométrica nativa (Face ID, Touch ID, Windows Hello) ou PIN com teclado numérico randomizado tátil inspirado na Trust Wallet.

### 3. Pagamentos Fluidos, Rede Base & Proteção Anti-Envenenamento
* **O Problema:** Realizar transferências em cripto exige manter tokens nativos voláteis para gas (ETH), calcular frações de Gwei, enfrentar vírus de adulteração de área de transferência (clipboard poisoning) e digitar endereços de 42 caracteres hexadecimais indecifráveis.
* **A Experiência CofreAdmin:**
  * **Infraestrutura Base L2:** Taxas de transação inferiores a centavos de dólar e liquidação em bloco ultrarrápida de 2 segundos garantida pela Layer 2 da Coinbase sobre o Ethereum.
  * **Gas Patrocinado em USDC (Sem Necessidade de ETH):** Através de autorizações EIP-3009 e abstração do Circle Paymaster, as microtaxas de rede são deduzidas diretamente de frações de USDC. Usuários não precisam comprar ou realizar pontes de ETH.
  * **Proteção Visual Anti-Envenenamento de Área de Transferência (Novo na v1.0.6):** Badges visuais de alto contraste segmentam os **primeiros 6** (`0x1234`) e os **últimos 4** (`5678`) caracteres do endereço de destino acompanhados de selo de verificação anti-adulteração, tornando qualquer tentativa de sequestro de clipboard imediatamente visível.
  * **Resolução de Basenames (`.base.eth`) & ENS (`.eth`):** Usuários digitam apelidos legíveis da Web3 em vez de endereços brutos, com checagem em tempo real contra ataques de homógrafos.
  * **Leitor de QR Code com Câmera Integrada:** Scanner por câmera nativa interpreta formatos padrão Web3, URIs de pagamento EIP-681 e faturas sem alternância de janelas.
  * **Câmbio em Tempo Real:** Oráculos de cotação ao vivo exibem simultaneamente saldos e valores de transferência em dólares digitais ($ USDC) e em moeda local (ex.: R$ BRL, € EUR, £ GBP).
  * **Trava Contra Golpes de Alto Valor:** Transferências superiores a $100 USDC ativam uma contagem regressiva de segurança de 3 segundos e uma tela de confirmação secundária, impedindo cliques impulsivos.
  * **Cartões de Recebimento Exportáveis:** Gera cartões com código QR de alto contraste, com checksum EIP-55, que podem ser baixados em PNG ou compartilhados diretamente pelo WhatsApp.

### 4. Cofres Inteligentes & Psicologia de Economia em Dólar
* **O Problema:** Carteiras convencionais exibem apenas um saldo unificado agregado, incentivando o gasto por impulso e sabotando o planejamento financeiro pessoal.
* **A Experiência CofreAdmin:**
  * **Arquitetura de Saldo Segregado:** Clara separação entre **Saldo Livre Disponível** (destinado a gastos cotidianos) e **Saldo Bloqueado em Cofres** (protegido contra a tentação do gasto impulsivo).
  * **Metas Financeiras Temáticas:** Usuários criam cofres personalizados (Reserva de Emergência, Férias, Computador Novo, Carro, Educação) com datas-alvo e identificadores visuais.
  * **Gamificação Comportamental:** Fluxos de depósito e retirada contam com barras de progresso neo-brutalistas e chuva de confetes comemorativos ao atingir 100% da meta.
  * **Resgate Emergencial Imediato:** O usuário pode devolver o saldo do cofre para o saldo livre com apenas 1 toque, sem multas, carências ou taxas de retenção.

### 5. Extrato Inteligente & Livro-Razão Financeiro
* **O Problema:** Exploradores de blockchain exibem listas crípticas de códigos alfanuméricos (`0x3f8a...`) sem contexto humano, notas de controle ou categorias contábeis úteis.
* **A Experiência CofreAdmin:**
  * **Indexação Blockchain em Tempo Real:** Depósitos e transferências on-chain na rede Base são capturados e sincronizados instantaneamente.
  * **⚡ Categorização Rápida em 1 Toque via Notificação (Novo na v1.0.6):** Quando uma transferência de USDC é recebida, um banner inteligente surge no topo da tela. O usuário categoriza a entrada (*Freelance*, *Salário*, *Investimento*, *Venda*) com um único toque direto no alerta, sem precisar navegar até o extrato.
  * **Identificação Amigável de Transações:** Atribuição de memos e anotações descritivas para qualquer transação on-chain (ex.: *"Jantar com amigos"*, *"Recebimento de projeto freelance"*, *"Supermercado"*).
  * **Motor de Categorização com Badges Coloridos:** Classificação rápida de despesas e receitas em categorias organizadas.
  * **Exclusão Suave de Lançamentos Internos:** Permite desconsiderar movimentações internas das estatísticas sem descaracterizar a integridade do registro blockchain.
  * **Monitor de Orçamento Diário:** Anel de ritmo de gastos que previne estouros orçamentários antes do fim do dia.
  * **Relatórios em PDF e CSV Prontos para Contabilidade:** Exportação em 1 clique de relatórios financeiros formais e normalizados para declaração fiscal e controle contábil.

### 6. Modo Privacidade Rápida, Soberania dos Dados & Exclusão Legal
* **The Problem:** Consultar saldos em locais públicos expõe o patrimônio a olhares indiscretos (*shoulder surfing*); plataformas em nuvem retêm dados indefinidamente sem conformidade regulatória.
* **A Experiência CofreAdmin:**
  * **👁️ Modo Privacidade Rápida ("Proteção contra Olhares Curiosos"):** Um toque no ícone de olho no cabeçalho mascara instantaneamente todos os valores em dinheiro no painel (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard` e `ActiveVaultsPreview`) com marcadores (`••••••`).
  * **Arquitetura Híbrida Local e Nuvem Multi-Tenant:** Modelo local-first em IndexedDB/localStorage para velocidade total a 60 FPS, somado à sincronização segura e isolada por usuário no Firestore para contas autenticadas.
  * **Propriedade Web3 Portável:** Usuários podem exportar sua chave privada completa e descriptografada a qualquer momento (com validação biométrica ou PIN) para importação em carteiras como MetaMask, Rabby ou hardwallets.
  * **Certificado de Defesa de Autocustódia & Exclusão em 1 Clique:** A exclusão de conta apaga permanentemente todos os dados operacionais da nuvem (`userData`) e do navegador. Concomitantemente, gera um recibo criptográfico auditável (`legalAuditArchive`) comprovando a data e o descarte legal dos dados, em total conformidade com a LGPD (Art. 16/18), GDPR (Art. 17) e CCPA/CPRA.

---

## 📊 Matriz Competitiva: Por Que o CofreAdmin Vence

| Funcionalidade / Experiência | Neobancos Tradicionais | Carteiras Web3 Comuns | **CofreAdmin v1.0.6** |
| :--- | :---: | :---: | :---: |
| **Autocustódia (Você é dono das chaves)** | ❌ Não (Risco de custódia bancária) | ✅ Sim | **✅ Sim (AES-256 no cliente via Web Crypto)** |
| **Acesso Imediato (Sem Palavras-Semente)** | ✅ Sim | ❌ Não (Barreira de 12-24 palavras) | **✅ Sim (1 Toque Social / 1 Toque Visitante)** |
| **Identidade Unificada Multi-Provedor** | ❌ Não (Contas isoladas) | ❌ Não (Apenas endereço) | **✅ Sim (E-mail Unificado Google + Discord)** |
| **Experiência de Taxas de Gas** | N/A (Tarifas bancárias embutidas) | ❌ Exige saldo em ETH nativo | **✅ Pago diretamente em USDC (EIP-3009)** |
| **Proteção Anti-Envenenamento de Clipboard** | N/A | ❌ Vulnerável a malwares | **✅ Badges de alto contraste início/fim** |
| **Resolução de Basenames & ENS** | ❌ Não | ⚠️ Parcial (Apenas ENS) | **✅ Basenames & ENS com checagem anti-spoof** |
| **Modo Privacidade Rápida (Anti-Espiões)** | ⚠️ Básico | ❌ Raro em carteiras Web3 | **✅ Mascaramento sincronizado no painel** |
| **PWA (Zero Risco de Censura de Loja)** | ❌ Não (Apenas lojas nativas) | ❌ Não (Extensão / App loja) | **✅ Sim (Web App Universal fluido a 60 FPS)** |
| **Motor de Agilidade Criptográfica** | ❌ Não | ❌ Derivação de chaves fixa | **✅ 3 Gerações (v1-v3) + Sweep On-Chain** |
| **Cofres em Dólar & Metas Gamificadas** | ⚠️ Parcial (Moeda fiduciária) | ❌ Não (Saldo único agregado) | **✅ Cofres nativos segregados em USDC** |
| **Extrato Vivo & Memos Descritivos** | ✅ Sim | ❌ Apenas hashes crus | **✅ Memos, tags e categorias humanas** |
| **Categorização em 1 Toque via Notificação**| ❌ Não | ❌ Não | **✅ Direto no banner de alerta de depósito** |
| **Câmbio em Tempo Real Moeda Local / USDC** | ❌ Não | ⚠️ Básico (Apenas USD) | **✅ Conversão ativa Moeda Local ⇄ USDC** |
| **Exportação Contábil em PDF e CSV** | ✅ Sim | ❌ Requer ferramenta externa | **✅ Exportação nativa integrada em 1 clique** |
| **Certificado Criptográfico de Exclusão Legal** | ❌ Não | ❌ Não | **✅ Certificado auditável LGPD/GDPR** |

---
🎮 Discord: `@cofreadmin` • 📧 E-mail: [suporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Aberto: Apache-2.0
