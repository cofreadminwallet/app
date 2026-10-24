# CofreAdmin • Guia de Transparência Pública & Modelo Econômico
**Arquitetura Aberta, Governança On-Chain e Validação de Custódia**  
*Especificações Técnicas de Fluxo de Tokens, Contratos Inteligentes e Auditoria de Protocolo*  
*Padrão de Divulgação: Public Architecture & Token Flow*

---

## 1. Fluxo do Dinheiro e de Tokens (Token & Funds Flow)

O CofreAdmin (Gerenciador Financeiro Web3 Self-Custodial) foi desenhado com um modelo de **fluxo direto e transparente** na blockchain Base, garantindo que o dinheiro transacionado nunca passe por custódia do desenvolvedor:

```
[ Usuário Remetente (Base L2) ]
             │
             │ 1. Assina autorização EIP-3009 no navegador (v, r, s)
             ▼
[ Backend Despachante / Relayer ]
             │
             │ 2. Submete tx usando ETH do Relayer
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Contrato Oficial USDC na Base:                              │
│ 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913                  │
│                                                             │
│ ├──> [99.8% do Valor Líquido] ──> Carteira do Destinatário  │
│ ├──> [0.2% Protocol Fee]      ──> Carteira Tesouraria DEV   │
│ └──> [Taxa de Reembolso Gás]  ──> Carteira de Gás Relayer   │
└─────────────────────────────────────────────────────────────┘
```

### Características Invioláveis do Fluxo:
1. **Sem Risco de Fundo Retido (No Liquidity Trap):** O USDC sai diretamente da carteira do usuário de origem para o destinatário, executado atomicamente em bloco único pelo contrato inteligente auditado da Circle.
2. **Reembolso Transparente de Gás:** O usuário não precisa comprar nem ter ETH. A quantia exata de gás em USDC ($0.02) reembolsa a carteira relayer que arcou com a transação na rede.

---

## 2. Infraestrutura Oficial e Provedores Parceiros

O CofreAdmin baseia sua operação em fornecedores institucionais consagrados no mercado global:

| Componente | Provedor Oficial | Função no Ecossistema |
| :--- | :--- | :--- |
| **Blockchain L2** | **Base (Coinbase)** | Liquidação de transações ultrarrápidas com segurança herdada da Ethereum L1. |
| **Moeda Estável** | **Circle (USDC)** | Liquidez em dólar digital regulado, padrão EIP-3009 e contratos ERC-20 auditados. |
| **Cliente Web3** | **Viem / Wagmi** | Biblioteca TypeScript de alta performance para derivação de contas e assinaturas criptográficas. |
| **Autenticação Biométrica** | **WebAuthn / W3C Passkeys** | Validação local por hardware (Face ID / Touch ID / Android Biometrics). |
| **Indexador Blockchain** | **BaseScan / Blockscout** | Rastreabilidade pública e reconciliação em tempo real de extratos on-chain. |
| **Cotação em Tempo Real** | **Coinbase Spot API** | Referência de câmbio USD/BRL e USDC/BRL com atualização contínua. |

---

## 3. Modelo de Negócios & Monetização Sustentável

O CofreAdmin possui fontes de receita previsíveis, atreladas ao volume transacionado e ao uso recorrente da plataforma:

### A. Microtaxa de Protocolo em Transferências On-Chain (0.2%)
* Em cada transferência via rede Base, uma taxa de **0.2% (com mínimo de $0.05 USD)** é automaticamente direcionada para a carteira de tesouraria do projeto (`DEV_TREASURY_WALLET`).
* *Projeção de Escala:* Com 50.000 usuários ativos movimentando uma média de $200 USD/mês em remessas e pagamentos, o volume bruto transacionado de $10M gera **$20.000 USD/mês** em receita recorrente automatizada.

### B. Monetização de Entrada/Saída Fiat (On/Off Ramp Spread)
* Monetização de Entrada/Saída Fiat (On/Off Ramp Spread - Atrelado ao Q3) A partir da entrega do marco de Conectividade Financeira (Q3), com a integração do parceiro regulado de conversão local, o aplicativo passará a monetizar através de uma taxa flutuante de conveniência (*spread*) sobre o volume transacionado na conversão de Reais (BRL) para USDC e vice-versa.

---

###### 📌 Nota:
* **Autocustódia Real (Non-Custodial):** As chaves privadas nunca tocam o servidor; ficam criptografadas no hardware do usuário via Web Crypto API (AES-GCM 256 bits).
* **Account Abstraction & EIP-3009:** Eliminação da maior barreira da Web3: o usuário transaciona USDC sem precisar comprar ou entender ETH para pagar gás.
* **UX Sem Atrito (Web3 Invisível):** O usuário tem a segurança de uma L2 da Coinbase sem a complexidade técnica de extensões ou sementes de recuperação invasivas.
* **Monetização Embutida:** Microtaxa de 0.2% por envio na tesouraria do protocolo, viabilizando receita recorrente automática com escala.
---

*_Nota de Evolução Comercial: O modelo de negócios é dinâmico e estruturado para acompanhar a maturidade da plataforma. Novas verticais e possibilidades de monetização secundárias poderão ser integradas conforme o ecossistema Web3 evolua e novas demandas de mercado surjam, visando sempre a maximização do valor para o negócio e para os usuários._

---
Contato: **🎮 Discord:** `@cofreadmin` | **📧 E-mail:** [suporte](mailto:cofreadminwallet@gmail.com) <br>
