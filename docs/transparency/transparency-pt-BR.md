# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Guia de Transparência Pública & Modelo Econômico • Visão Técnica & para Investidores <br>
> Versão: **v1.0.6** • Licenciado sob a **Apache License, Version 2.0 (Apache-2.0)**.

🌐 **Idiomas:** **[English](transparency.md)** • **[Português](transparency-pt-BR.md)** • **[Español](transparency-es-ES.md)** • **[简体中文](transparency-zh-Hans.md)**

---

## 📑 Estrutura do Documento
1. [Fluxo de Tokens e Liquidez (EIP-3009)](#1-fluxo-de-tokens-e-liquidez)
2. [Infraestrutura Institucional & Pilha Tecnológica](#2-infraestrutura-institucional--pilha-tecnológica)
3. [Garantias de Autocustódia & Privacidade](#3-garantias-de-autocustódia--privacidade)
4. [Modelo de Negócios Sustentável & Mecânica de Receita](#4-modelo-de-negócios-sustentável--mecânica-de-receita)
5. [Auditabilidade, Conformidade & Padrões Regulatórios](#5-auditabilidade-conformidade--padrões-regulatórios)
6. [Contatos Oficiais & Verificação](#6-contatos-oficiais--verificação)

---

## 1. Fluxo de Tokens e Liquidez

O CofreAdmin opera sob um **modelo de fluxo direto, descentralizado e não-custodial** ancorado na rede Base (Layer 2 da Ethereum desenvolvida pela Coinbase). Os fundos transacionados jamais passam pela custódia intermediária dos desenvolvedores:

```
[ Usuário Remetente (Navegador Cliente) ]
              │
              │ 1. Assina autorização de transferência EIP-3009 localmente (v, r, s)
              ▼
[ Relayer Dispatcher / Paymaster ]
              │
              │ 2. Submete transação atômica na blockchain Base utilizando Gas do Relayer
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Contrato Oficial de USDC da Circle na Base:                 │
│ Endereço: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913       │
│                                                             │
│ ├──> [99,8% Valor Líquido]     ──> Endereço do Destinatário │
│ ├──> [0,2% Microtaxa Protocolo]──> Carteira Tesouraria Dev  │
│ └──> [Reembolso de Taxa Gas]   ──> Pool de Gas do Relayer   │
└─────────────────────────────────────────────────────────────┘
```

### Garantias Invioláveis do Fluxo:
1. **Zero Retenção de Liquidez:** Todas as transferências de USDC são executadas diretamente do endereço do remetente para o endereço do destinatário. A liquidação ocorre de forma atômica em um único bloco pelo contrato inteligente oficial e auditado da Circle.
2. **Abstração Total de Gas (Sem Necessidade de ETH):** O usuário transaciona 100% em dólares digitais (USDC). As microtaxas de rede são reembolsadas ao relayer diretamente da fração do valor de USDC transferido via assinaturas EIP-3009, eliminando a barreira de ter que comprar ou custodiar ETH.
3. **Divisão Automatizada e Imutável:** A microtaxa de protocolo (0,2%, com valor mínimo de $0,05 USD) é direcionada de forma transparente e imediata para a carteira de tesouraria do projeto, sem intermediação manual ou discricionária.

---

## 2. Infraestrutura Institucional & Pilha Tecnológica

O CofreAdmin é construído sobre provedores institucionais e padrões de mercado consolidados:

| Componente | Provedor Oficial / Padrão | Função Técnica & Operacional |
| :--- | :--- | :--- |
| **Blockchain Layer 2** | **Base (Coinbase)** | Altíssimo throughput, taxas de gas inferiores a centavos e finalidade de bloco em 2 segundos com segurança Ethereum L1. |
| **Moeda de Liquidação** | **Circle (USDC)** | Dólar digital auditado, lastreado 1:1 em reservas financeiras reais com suporte nativo a EIP-3009. |
| **Contrato Oficial USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Endereço oficial canônico do contrato USDC na rede Base. |
| **Motor Web3 no Cliente** | **Viem & Wagmi** | Bibliotecas TypeScript de alto desempenho para derivação de contas EVM e assinaturas criptográficas type-safe. |
| **Autenticação Biométrica** | **WebAuthn / W3C Passkeys** | Validação por hardware no aparelho do usuário (Face ID, Touch ID, Biometria Android, Windows Hello). |
| **Segurança de PIN** | **Teclado Tátil Randomizado** | Processamento local com hash SHA-256 com salt de hardware e randomização dinâmica anti-espionagem. |
| **Resolução de Nomes** | **Basenames (`.base.eth`) & ENS (`.eth`)** | Resolução on-chain em tempo real de nomes amigáveis com proteção nativa contra ataques homógrafos. |
| **Proteção Anti-Envenenamento**| **Badges de Alto Contraste** | Destaque visual dos segmentos inicial (`0x1234`) e final (`5678`) do endereço para neutralizar malwares de clipboard. |
| **Explorador Blockchain** | **BaseScan / Blockscout** | Auditoria pública e imutável de transações com conciliação do extrato em tempo real. |
| **Oráculo de Câmbio** | **Coinbase Spot API** | Cotação oficial contínua de mercado para paridades USD, BRL, EUR e GBP. |
| **Nuvem Multi-Tenant** | **Google Cloud Firestore** | Armazenamento em nuvem isolado por usuário (`userData`) com unificação de identidade por e-mail verificado. |

---

## 3. Garantias de Autocustódia & Privacidade

### A. Autocustódia Real (Zero Custódia em Servidores)
* **Derivação no Cliente:** As chaves privadas EVM são geradas integralmente no navegador do usuário via Web Crypto API.
* **Criptografia de Envelope em Repouso:** As chaves são protegidas localmente utilizando **criptografia AES-GCM de 256 bits** atrelada a uma chave mestra do dispositivo.
* **Agilidade Criptográfica Multi-Geração (`v1` → `v2` → `v3`):**
  * *v1:* Derivação em texto puro para manter compatibilidade com versões anteriores.
  * *v2:* Derivação PBKDF2 com 100.000 iterações e envelope criptografado AES-GCM.
  * *v3:* Chaves Web Crypto API não-extraíveis vinculadas ao hardware e isoladas no IndexedDB.
  * *Varredura On-Chain em 1 Clique (Sweep):* Permite aos usuários transferir a totalidade de seus saldos entre gerações de carteira em uma única transação atômica.
* **Soberania e Portabilidade:** O usuário pode exportar sua chave privada completa e descriptografada a qualquer momento (mediante validação biométrica ou PIN) para migrar para MetaMask, Rabby ou carteiras físicas.

### B. Modo Privacidade Rápida ("Proteção contra Olhares Curiosos")
* Um toque no ícone de olho no cabeçalho mascara instantaneamente todos os valores financeiros em todos os componentes (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard` e `ActiveVaultsPreview`) com marcadores (`••••••`).
* Desenvolvido especialmente para transportes públicos, cafés e ambientes compartilhados, impedindo a exposição involuntária de patrimônio.

---

## 4. Modelo de Negócios Sustentável & Mecânica de Receita

O CofreAdmin adota um modelo econômico previsível, baseado no volume de transações e na utilidade da plataforma:

### A. Microtaxa de Protocolo On-Chain (0,2%)
* Em cada transferência ou pagamento realizado na rede Base, uma taxa transparente de **0,2% (com valor mínimo de $0,05 USD)** é encaminhada automaticamente para a tesouraria do protocolo (`DEV_TREASURY_WALLET`).
* **Projeção de Escala:**
  * **10.000 Usuários Ativos (MAU)** movimentando $200 USD/mês (Volume Bruto de $2,0M) = **$4.000 USD/mês** em receita recorrente.
  * **50.000 Usuários Ativos (MAU)** movimentando $200 USD/mês (Volume Bruto de $10,0M) = **$20.000 USD/mês** em receita recorrente.
  * **250.000 Usuários Ativos (MAU)** movimentando $350 USD/mês (Volume Bruto de $87,5M) = **$175.000 USD/mês** em receita recorrente.

### B. Spread de Conversão em Rampas Fiat (On/Off Ramp)
* Integração com parceiros regulados de conversão local (ex.: PIX no Brasil, SEPA na Europa) gerando uma taxa flutuante de conveniência (spread entre 0,3% e 0,7%) na conversão de moedas fiduciárias para USDC e vice-versa.

### C. Soluções B2B para Lojistas e Criadores
* Licenciamento de widgets de pagamento customizados e APIs para e-commerces e criadores de conteúdo receberem pagamentos em USDC diretamente na rede Base.

---

## 5. Auditabilidade, Conformidade & Padrões Regulatórios

### A. Conformidade com Legislações Globais de Privacidade (LGPD, GDPR, CCPA)
* **Zero Travas de Contas Pessoais:** Arquitetura 100% pública e multi-tenant, sem credenciais privilegiadas ou acessos ocultos.
* **Exclusão Definitiva em 1 Clique:** O usuário pode apagar de forma irrevogável todos os seus registros na nuvem (`userData`) e no armazenamento local.
* **Comprovante Criptográfico de Conformidade (`legalAuditArchive`):** Em estrito cumprimento às exigências legais (como o Art. 16 da LGPD brasileira e exceções do Art. 17 do GDPR europeu), o sistema arquiva um registro criptográfico anônimo com carimbo de tempo comprovando a destruição legal dos dados para defesa em auditorias regulatórias.

### B. Transparência em Código Aberto
* Código distribuído sob a licença **Apache License, Version 2.0 (Apache-2.0)**.
* Modelo aberto permissivo e transparente que viabiliza auditoria pública, bifurcações comunitárias e compilações reproduzíveis com atribuição de autoria clara e proteção mútua de patentes.

---

🎮 Discord: `@cofreadmin` • 📧 E-mail: [suporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Aberto: Apache-2.0
