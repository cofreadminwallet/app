# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Whitepaper Executivo • Tese de Investimento, Arquitetura de Crescimento & Roteiro Técnico <br>
> Versão: **v1.0.6** • Licenciado sob a **GNU Affero General Public License v3.0 ou posterior (AGPL-3.0-or-later)**.

🌐 **Idiomas:** **[English](whitepaper.md)** • **[Português](whitepaper-pt-BR.md)** • **[Español](whitepaper-es-ES.md)** • **[简体中文](whitepaper-zh-Hans.md)**

---

## 📑 Estrutura do Documento
1. [Visão Geral & Oportunidade de Mercado (Pitch)](#1-visão-geral--oportunidade-de-mercado-pitch)
2. [Fundação de Rede & Token (Base L2 & USDC Nativo)](#2-fundação-de-rede--token-base-l2--usdc-nativo)
3. [Modelo de Negócios & Mecânica de Receita](#3-modelo-de-negócios--mecânica-de-receita)
4. [Alocação de Capital & Estratégia de Crescimento](#4-alocação-de-capital--estratégia-de-crescimento)
5. [Arquitetura de Produto Ponta a Ponta & Experiência do Usuário](#5-arquitetura-de-produto-ponta-a-ponta--experiência-do-usuário)
6. [Modelo de Segurança Criptográfica de Autocustódia](#6-modelo-de-segurança-criptográfica-de-autocustódia)
7. [Roteiro Estratégico de Execução (Roadmap)](#7-roteiro-estratégico-de-execução-roadmap)
8. [Nota sobre a Arquitetura de Inteligência Financeira Híbrida](#8-nota-sobre-a-arquitetura-de-inteligência-financeira-híbrida)

---

## 1. Visão Geral & Oportunidade de Mercado (Pitch)

### O Problema
Na América Latina e em economias emergentes, a desvalorização cambial contínua, a inflação crônica e as tarifas abusivas do sistema bancário tradicional corroem sistematicamente a poupança popular. O acesso a moedas fortes e estáveis (como o Dólar Americano) permanece restrito por exigências de saldo mínimo, burocracia de câmbio ou custos proibitivos em remessas internacionais, que cobram entre 5% e 12% por transferência.

Ao mesmo tempo, as aplicações Web3 convencionais impõem barreiras técnicas intransponíveis:
* **Fricção do Token de Gás:** A exigência de comprar, manter e calcular saldos em tokens nativos voláteis (como ETH) apenas para realizar um pagamento básico em stablecoin.
* **Complexidade na Gestão de Chaves:** Frases-semente de 12 ou 24 palavras que, se mal armazenadas, resultam na perda irrecuperável de fundos.
* **Interfaces Intimidantes:** Telas repletas de sequências hexadecimais, tolerâncias de slippage e parâmetros complexos de rede.
* **Envenenamento de Endereços On-Chain:** Ataques de *address poisoning*, onde criminosos criam carteiras falsas com prefixos e sufixos idênticos para enganar o usuário durante o ato de colar da área de transferência.

### A Solução: CofreAdmin Wallet
O **CofreAdmin** supera essa barreira ao oferecer um **Sistema Operacional de Finanças Pessoais Web3 Autocustodial**, acessível via Progressive Web App (PWA) de altíssima performance. Ele une a simplicidade e a familiaridade de um aplicativo bancário moderno com a soberania financeira e a segurança criptográfica inegociável das finanças descentralizadas.

Construído de forma nativa sobre a **Base L2 (Coinbase)** e impulsionado pelo **USDC Nativo da Circle**, o CofreAdmin capacita cidadãos comuns, profissionais autônomos e pequenos comerciantes a poupar, categorizar despesas, pagar e receber em moeda forte, com liquidação instantânea e gestão de gás invisível.

---

## 2. Fundação de Rede & Token (Base L2 & USDC Nativo)

| Pilar do Ecossistema | Detalhes de Implementação | Benefício ao Usuário e Protocolo |
| :--- | :--- | :--- |
| **Rollup Layer-2** | **Base L2** (`Chain ID: 8453`) | Confirmação em fração de segundo e taxas de rede irrisórias (< $0,005 USD) através da tecnologia OP Stack ancorada ao Ethereum. |
| **Ativo de Liquidação** | **USDC Nativo** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) | Dólar digital com 100% de reserva auditada emitido diretamente pela Circle; totalmente auditável, líquido e resgatável 1:1 com USD. |
| **Execução Sem Gás ETH** | **EIP-3009** (`transferWithAuthorization`) | Usuários assinam a autorização localmente sem gastar gás. A taxa de rede é patrocinada e liquidada diretamente na transação USDC. |
| **Tesouraria do Protocolo** | `0xc143C3A4106B3aE36b43D69807fa5D79d92419aF` | Cofre público verificado e auditado em hardware que recebe a microtarifa automática do protocolo. |

### Por que a Base L2 e o USDC Nativo?
* **Zero Volatilidade de Gás para o Usuário Final:** Graças ao patrocínio EIP-3009, o usuário nunca precisa adquirir ETH. As taxas de rede são tratadas de forma transparente.
* **Segurança Institucional e Conformidade:** Diferente de tokens sintéticos ou pontes (wrapped), o USDC Nativo da Circle possui atestações mensais públicas e proteção patrimonial de reservas.
* **Instalação Imediata (PWA):** Sem barreiras de lojas de aplicativos (0% de comissões), sem necessidade de instalar extensões de navegador e sem censura operacional. O app é instalado na tela inicial em segundos.

---

## 3. Modelo de Negócios & Mecânica de Receita

O CofreAdmin conjuga utilidade real e monetização programática para estabelecer um modelo de negócios sustentável e escalável:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MOTOR DE RECEITA RECORRENTE ESTRUTURADA                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│    MICROTARIFA DO PROTOCOLO  │              │     SPREAD EM GATEWAYS       │
│     (Ativo na versão 1.0.6)  │              │       FIAT (ON/OFF RAMP)     │
│                              │              │                              │
│ • 0,20% por envio externo    │              │ • Spread competitivo de 0,5% │
│ • Piso mínimo de $0,05 USD   │              │   a 1,2% via Pix / SPEI      │
│ • Roteamento direto ao Cofre │              │ • Parcerias com APIs locais  │
└──────────────────────────────┘              └──────────────────────────────┘
```

1. **Microtarifa de Envio (Ativa):** Cada transferência externa na Base L2 contribui com **0,20% (com valor mínimo de $0,05 USD)** diretamente para a carteira da tesouraria (`0xc143C3A4106B3aE36b43D69807fa5D79d92419aF`). Isso garante crescimento linear da receita com o aumento do volume transacionado.
2. **Gateway Fiat On/Off Ramp (Fase 3 do Roadmap):** Monetização via spread cambial competitivo na conversão de moeda local (Pix no Brasil, SPEI no México, PSE na Colômbia) para USDC autocustodial.
3. **Licenciamento White-Label & Institucional (Visão Futura):** Integração com cooperativas e fintechs regionais que desejam oferecer cofres em dólar para seus clientes com infraestrutura pronta.

> A estrutura completa de taxas e diretrizes de auditoria on-chain estão descritas no **[Guia de Transparência Pública & Modelo Econômico](../transparency/transparency-pt-BR.md)**.

---

## 4. Alocação de Capital & Estratégia de Crescimento

Os recursos captados pelo CofreAdmin são alocados estrategicamente em quatro pilares fundamentais:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ESTRUTURA DE ALOCAÇÃO DE CAPITAL                       │
├────────────────────────┬────────────────────────┬───────────────────────────┤
│ 35% Produto & Segurança│ 30% Crescimento        │ 25% Operação & Fundadores │
│ Auditorias & Hardening │ Aquisição & Regional   │ Entrega dos Marcos Chave  │
├────────────────────────┴────────────────────────┴───────────────────────────┤
│ 10% Jurídico, Estruturação Regulatória & Conformidade Local                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

* **35% — Produto, Infraestrutura & Segurança:** Auditorias externas de código e contratos inteligentes, testes de intrusão, redundância de relayers e integração de provedores de liquidez fiat institucionais.
* **30% — Aquisição de Usuários & Expansão Regional:** Campanhas de crescimento focadas em praças de alta demanda de dolarização na América Latina e parcerias com o ecossistema Base.
* **25% — Engenharia Principal & Operações:** Dedicação contínua da equipe central de desenvolvedores e fundadores para a entrega pontual de cada marco do roadmap técnico.
* **10% — Jurídico & Conformidade:** Estruturação jurídica para software não-custodial, conformidade com legislações de proteção de dados (LGPD/GDPR) e compliance com processadores de pagamento.

---

## 5. Arquitetura de Produto Ponta a Ponta & Experiência do Usuário

```
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   1. ENTRADA SEM ATRITO    │  ───> │   2. WEB3 INVISÍVEL E      │  ───> │   3. PAGAMENTOS VERIFICADOS│
│      & ONBOARDING          │       │      AUTOCUSTÓDIA          │       │      & ESCUDO ANTI-POISON  │
│ • Login Unificado em 1-Toq │       │ • WebCrypto no Navegador   │       │ • Patrocínio EIP-3009      │
│ • Modo Visitante Imediato  │       │ • 3 Gerações Criptográficas│       │ • Distintivo Anti-Poison   │
│ • Instalação Direta PWA    │       │ • Biometria / PIN WebAuthn │       │ • Consulta Basenames e ENS │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
                                                                                        │
                                                                                        ▼
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   6. SOBERANIA DE DADOS    │  <─── │   5. ANÁLISE HÍBRIDA       │  <─── │   4. COFRES INTELIGENTES   │
│      & EXCLUSÃO AUDITADA   │       │      & CONTROLE FINANCEIRO │       │      & RESERVA EM DÓLAR    │
│ • Exportação de Chave Priv │       │ • Livro-Razão Determiníst. │       │ • Cofres com Metas e Temas │
│ • Backups Criptografados   │       │ • Classificação em 1-Toque │       │ • Saldo Livre vs Alocado   │
│ • Recibo Auditável LGPD    │       │ • Recomendações Consultivas│       │ • Marcos e Conquistas      │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
```

> A jornada do usuário e todas as transições de interface estão detalhadas no **[Fluxo de Produto & Experiência do Usuário](../product-flow/product-flow-pt-BR.md)**.

---

## 6. Modelo de Segurança Criptográfica de Autocustódia

O CofreAdmin opera sob uma rigorosa **Arquitetura Não-Custodial Zero-Knowledge**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ENCLAVE CRIPTOGRÁFICO CLIENT-SIDE (NO NAVEGADOR)               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Senha do Usuário / Biometria do Dispositivo                                │
│       │                                                                     │
│       ▼                                                                     │
│  Derivação PBKDF2 (100.000 iterações, Salt Único do Dispositivo, SHA-256)   │
│       │                                                                     │
│       ▼                                                                     │
│  Chave de Decodificação AES-GCM 256 bits (Volátil em Memória RAM)           │
│       │                                                                     │
│       ▼                                                                     │
│  Chave Privada Real (Nunca sai do navegador, nunca transmitida ao servidor) │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Isolamento de Chaves Zero-Knowledge:** A chave privada é criada exclusivamente no motor de JavaScript local através da Web Crypto API. Ela nunca trafega pela rede nem é armazenada em servidores externos.
2. **Agilidade Criptográfica de 3 Gerações:**
   * **Geração 1 (Legada):** Compatibilidade inicial de armazenamento local.
   * **Geração 2 (PBKDF2 + AES-GCM 256):** Proteção avançada com derivação de 100.000 iterações e salt específico do dispositivo.
   * **Geração 3 (Enclave Biométrico):** Suporte a credenciais de hardware via WebAuthn (Touch ID, Face ID ou PIN de sistema).
3. **Escudo Visual Duplo Contra Envenenamento de Endereços:** O sistema analisa e destaca com cores de alto contraste os 6 primeiros e os 4 últimos caracteres dos endereços de destino, protegendo o usuário contra fraudes de colagem na área de transferência.
4. **Trilha de Auditoria Criptográfica de Exclusão (`legalAuditArchive`):** Cumprimento incondicional do Artigo 18 da LGPD e Artigo 17 do GDPR, gerando um comprovante criptográfico que atesta a exclusão de dados sem expor informações pessoais.

---

## 7. Roteiro Estratégico de Execução (Roadmap)

| Fase / Status | Horizonte de Prazo | Marcos Principais & Entregáveis | Dependência Primária |
| :--- | :--- | :--- | :--- |
| **Fase 1: Fundação & UX** | **Concluída (v1.0.6)** | • Carteira funcional em USDC Nativo na Base L2.<br>• Motor de envio com gás patrocinado EIP-3009.<br>• Múltiplos cofres de poupança e livro-razão com sincronização offline.<br>• Proteção visual contra address poisoning e resolução Basenames/ENS. | Autofinanciamento / Engenharia Interna |
| **Fase 2: Captação & Parcerias** | **Em Andamento (Ativa)** | • Submissão a editais e subsídios da Base e Superchain da Optimism.<br>• Apresentações a investidores privados e rodadas de financiamento-anjo.<br>• Homologação técnica e comercial com parceiros institucionais de rampas fiat. | Rodada de Captação Estratégica |
| **Fase 3: Infraestrutura & Rampa Fiat** | **Após Aporte de Capital** | • **Rampas automatizadas de conversão instantânea Pix para USDC (Brasil e América Latina).**<br>• Protocolos de abstração de conta (ERC-4337) e sincronização segura entre dispositivos.<br>• **Motor Híbrido de Inteligência Financeira e Análise de Despesas** (categorização automática de gastos, projeções de fluxo de caixa e insights localizados). | Aporte Inicial de Capital |
| **Fase 4: Escala, Segurança & Rendimento**| **Após Fase 3** | • Auditorias de segurança independentes de contratos inteligentes e da aplicação.<br>• Módulos opcionais de rendimento conectando cofres a protocolos DeFi auditados na Base (ex: Aave, Compound).<br>• Expansão massiva de marketing de crescimento nas capitais estratégicas da América Latina. | Conclusão das Auditorias da Fase 3 |
| **Fase 5: Expansão Global Emergente** | **Visão de Longo Prazo** | • Expansão para mercados latinos com alta demanda de dolarização (Colômbia, Argentina) e emergentes globais.<br>• Múltiplos gateways fiat e APIs empresariais em modelo White-Label. | Fluxo de Caixa Positivo / Rodada Seed |

---

## 8. Nota sobre a Arquitetura de Inteligência Financeira Híbrida

> ### ⚖️ Nota sobre a Arquitetura de Inteligência Financeira Híbrida
> Em um ecossistema que gerencia **dinheiro real, criptografia de autocustódia e preservação patrimonial**, a execução financeira deve ser absoluta, determinística e auditável sem ambiguidades.
>
> Por esta razão, o CofreAdmin adota rigorosamente uma **Arquitetura Híbrida**:
> * **Camada de Execução 100% Determinística:** Qualquer movimentação de fundos, validação de saldo, assinatura de autorização EIP-3009, derivação criptográfica de chaves e alocação em cofres é governada exclusivamente por algoritmos determinísticos, heurísticas explícitas baseadas em regras e contratos inteligentes auditados na blockchain.
> * **Camada de Inteligência Exclusivamente Consultiva:** Modelos preditivos, heurísticas de classificação de gastos e recomendações financeiras operam **estritamente em uma camada analítica e informativa** (ex: identificação de padrões de consumo, categorização de despesas e alertas de ritmo orçamentário).
>
> **Princípio Fundamental:** Nunca é concedida autonomia direta de execução financeira a motores de inteligência probabilística. Esta separação estrutural elimina categoricamente riscos de alucinações algorítmicas, loops inesperados de transação ou execuções não autorizadas, garantindo a integridade e segurança fiduciária dos recursos do usuário.

> 💡 **Notas Operacionais & Estratégicas:**
> * **Infraestrutura de Pagamentos:** O Pix (Brasil) atua como o principal motor regional de conversão fiat-para-USDC. Integrações com gateways regulados de terceiros expandirão para trilhos latinos e globais (SPEI no México, PSE na Colômbia, cartões e transferências bancárias).
> * **Roadmap Dinâmico:** Este cronograma é vivo e adaptável; a sequência de marcos e integrações evolui responsivamente conforme inovações de mercado, avanços regulatórios e otimizações de segurança e UX.

---

🎮 Discord: `@cofreadmin` • 📧 E-mail: [suporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Aberto: AGPL-3.0-or-later
