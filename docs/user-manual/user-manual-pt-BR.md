# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Manual do Usuário Completo • Gestor de Cofres em USDC na Rede Base <br>
> Versão: **v1.0.6** • Licenciado sob a **GNU Affero General Public License v3.0 ou posterior (AGPL-3.0-or-later)**.

🌐 **Idiomas:** **[English](user-manual.md)** • **[Português](user-manual-pt-BR.md)** • **[Español](user-manual-es-ES.md)** • **[简体中文](user-manual-zh-Hans.md)**

---

## 📑 Índice Rápido
1. [Instalação do Aplicativo (PWA)](#1--instalação-do-aplicativo-pwa)
2. [Acesso e Gerenciamento de Conta (Google, Discord e E-mail Unificado)](#2--acesso-e-gerenciamento-de-conta)
3. [Sua Carteira Digital Web3, Câmbio e Modo Privacidade Rápida](#3--sua-carteira-digital-web3-câmbio-e-modo-privacidade-rápida)
4. [Como Receber Recursos (USDC na Base)](#4--como-receber-recursos-usdc-na-base)
5. [Como Enviar Pagamentos, Anti-Envenenamento e Resolução de Nomes](#5--como-enviar-pagamentos-anti-envenenamento-e-resolução-de-nomes)
6. [Cofres Inteligentes (Metas e Economias)](#6--cofres-inteligentes-metas-e-economias)
7. [Extrato Financeiro, Livro-Razão e Categorização em 1 Toque](#7--extrato-financeiro-livro-razão-e-categorização-em-1-toque)
8. [Monitor de Orçamento Diário](#8--monitor-de-orçamento-diário)
9. [Painel de Métricas e Gráficos](#9--painel-de-métricas-e-gráficos)
10. [Segurança, Teclado de PIN, Biometria e Agilidade Criptográfica](#10--segurança-teclado-de-pin-biometria-e-agilidade-criptográfica)
11. [Personalização, Temas e Notificações Push](#11--personalização-temas-e-notificações-push)
12. [Privacidade, Conformidade Global e Exclusão de Conta](#12--privacidade-conformidade-global-e-exclusão-de-conta)
13. [Perguntas Frequentes (FAQ)](#13--perguntas-frequentes-faq)

---

## 1. 📲 Instalação do Aplicativo (PWA)

O CofreAdmin foi desenvolvido como um **Progressive Web App (PWA)** de última geração, oferecendo desempenho e experiência de aplicativo nativo sem burocracias de lojas de aplicativos.

### No iPhone / iPad (iOS Safari):
1. Abra o link do CofreAdmin no navegador **Safari**.
2. Toque no botão **Compartilhar** (ícone quadrado com uma seta para cima na barra de ferramentas inferior).
3. Role a lista para baixo e selecione **"Adicionar à Tela de Início"**.
4. Confirme tocando em **"Adicionar"** no canto superior direito.
5. O ícone do CofreAdmin aparecerá na sua tela inicial e abrirá em tela cheia, sem barras de endereços ou controles do navegador.

### No Android (Google Chrome):
1. Abra o link do CofreAdmin no navegador **Google Chrome**.
2. Toque no banner inferior **"Instalar Aplicativo"** ou abra o **menu de 3 pontos** no canto superior direito.
3. Selecione **"Instalar aplicativo"** (ou *"Adicionar à tela inicial"*).
4. Confirme a instalação. O aplicativo será instalado como um app independente com atalhos rápidos e suporte a cache offline.

---

## 2. 🔑 Acesso e Gerenciamento de Conta

O CofreAdmin oferece métodos de autenticação fluidos pensados para proteger sua privacidade e assegurar acesso contínuo aos seus dados:

* 🌐 **Entrar com Google:** Sincronização em nuvem rápida e segura entre computadores e celulares através da infraestrutura de nuvem do Firebase.
* 🎮 **Entrar com Discord:** Login com 1 toque otimizado para comunidades Web3 e gamers.
* 🔄 **Unificação de Contas por E-mail Verificado (Novo na v1.0.6):**
  * Ao fazer login pelo Google ou pelo Discord utilizando o mesmo e-mail verificado, o CofreAdmin reconhece automaticamente a sua identidade única.
  * Seus dados, seu endereço de carteira Web3 on-chain, histórico de transações e cofres personalizados são preservados de forma integrada, sem contas duplicadas, telas repetidas de termos ou perda de dados.
* 🕶️ **Modo Visitante (Offline e Privado):** Deseja testar sem fazer login? Entre como visitante! Todas as chaves da carteira e lançamentos financeiros ficam salvos exclusivamente no armazenamento local seguro do seu navegador (`localStorage` e IndexedDB).
* 🚪 **Desconectar e Troca de Conta:** Na aba de **Ajustes**, toque em **"Sair da Conta"** a qualquer momento para encerrar a sessão na tela com total segurança, mantendo seus dados protegidos.

---

## 3. 💵 Sua Carteira Digital Web3, Câmbio e Modo Privacidade Rápida

No primeiro acesso, o CofreAdmin deriva uma carteira criptográfica **100% autocustodial** compatível com a **rede Base (Layer 2 da Ethereum desenvolvida pela Coinbase)**.

* **Moeda Principal (USDC):** Seu saldo é mantido em **USD Coin (USDC)**, um dólar digital lastreado 1:1 em reservas financeiras e títulos do tesouro americano.
* **Cotações em Tempo Real:** Visualize seus fundos em USDC ($) juntamente com o valor equivalente em moeda local (ex.: Real BRL / R$, Euro EUR / €) atualizado em tempo real.
* **👁️ Modo Privacidade Rápida ("Proteção contra Olhares Curiosos"):**
  * Toque no **ícone de olho** no cartão de saldo principal para ocultar instantaneamente todos os valores monetários com pontos (`••••`).
  * O modo de privacidade sincroniza em tempo real com todo o painel, incluindo o **Orçamento Diário**, a **Atividade Recente** e os **Cofres Ativos**.
  * Perfeito para conferir suas finanças no metrô, cafés ou locais públicos sem expor seus números. Toque novamente para revelar.
* **Saldo Livre vs. Saldo Guardado nos Cofres:**
  * **Saldo Total:** Todo o valor de USDC existente no seu endereço on-chain.
  * **Saldo em Cofres:** Valores reservados para seus objetivos e metas financeiras.
  * **Saldo Livre Disponível:** Dinheiro líquido pronto para transferências e gastos do dia a dia. Você nunca gastará acidentalmente o dinheiro guardado para seus sonhos!
* **Alternância de Rede:** Alterne entre a **Base Mainnet** (dinheiro real) e a **Base Sepolia Testnet** (ambiente de testes e simulação) a qualquer momento nas configurações.

---

## 4. 📥 Como Receber Recursos (USDC na Base)

Receba dólares digitais de amigos, pagamentos de serviços ou depósitos de qualquer corretora centralizada (ex.: Binance, Coinbase, Bybit, Mercado Bitcoin, Kraken):

1. Na tela inicial ou na visão de Carteira, toque no botão **"Receber"** 📲.
2. Uma janela interativa exibirá seu **QR Code Oficial** e seu **Endereço da Carteira Base** (`0x...`).
3. **Para receber de outra carteira:** Peça para a pessoa escanear seu QR Code.
4. **Para transferir de uma corretora (Exchange):**
   * Toque em **"Copiar Endereço"**.
   * No painel de saque da sua corretora, selecione a moeda **USDC** e escolha obrigatoriamente a rede **Base**. *(Atenção: transferir por outras redes como Ethereum Mainnet ou Polygon pode exigir procedimentos extras de recuperação).*
5. **Chegada Instantânea:** Em 2 a 3 segundos, a transação liquida na blockchain da Base e seu saldo é atualizado em tempo real.

---

## 5. 📤 Como Enviar Pagamentos, Anti-Envenenamento e Resolução de Nomes

Envie dólares digitais para qualquer lugar do mundo em segundos, pagando frações de centavos em taxas:

1. Na tela inicial, toque em **"Enviar"** 📤.
2. **Identifique o Destinatário:**
   * **Resolução de Basenames (`.base.eth`) e ENS (`.eth`):** Em vez de colar endereços hexadecimais longos, digite nomes amigáveis como `alice.base.eth` ou `vitalik.eth`. O CofreAdmin resolve o endereço on-chain com proteção contra caracteres homógrafos e clonagens.
   * **Endereço Direto:** Cole qualquer endereço EVM válido (`0x...`).
   * **Leitor de QR Code:** Toque no ícone de câmera para escanear o código da carteira de destino.
3. **🛡️ Proteção Visual Anti-Envenenamento de Área de Transferência:**
   * Softwares maliciosos podem tentar substituir o endereço copiado por um similar no momento de colar.
   * O CofreAdmin destaca visualmente os **primeiros 6** e os **últimos 4** caracteres em badges de alto contraste, acompanhados de um selo de verificação anti-adulteração.
   * Sempre confira os segmentos destacados antes de confirmar!
4. **⚠️ Aviso de Segurança para Primeiro Destinatário:**
   * Ao transferir para um endereço com o qual você nunca interagiu antes, o aplicativo exibe um alerta preventivo para evitar envios para contas erradas.
5. **Zero Necessidade de Ter ETH para Gas:**
   * Graças à abstração de gas (EIP-3009) e ao Circle Paymaster, **você não precisa ter saldo de ETH**. As microtaxas de rede (geralmente abaixo de $0,02) são descontadas diretamente da fração de USDC transferida.
6. **Autenticação e Confirmação:**
   * Autorize a transferência com sua biometria (Face ID / Touch ID) ou pelo seu PIN de 4 dígitos.
7. **Comprovante Digital Oficial:**
   * Toda transação gera um comprovante criptográfico com data, hora, código de identificação (`TxHash`) e link direto para conferir no explorador público **BaseScan**.

---

## 6. 🎯 Cofres Inteligentes (Metas e Economias)

Separe o dinheiro de gastos rotineiros das suas economias de longo prazo:

1. Acesse a aba **"Cofres"** na barra de navegação inferior.
2. Toque em **"+ Novo Cofre"** 🚀.
3. **Personalize seu Objetivo:**
   * Escolha um emoji temático (✈️ *Férias*, 💻 *Computador Novo*, 🚗 *Carro*, 🛡️ *Reserva de Emergência*).
   * Defina o valor da meta em USDC ou em moeda local.
4. **Deposite e Acompanhe:**
   * Toque em **"Guardar"** para transferir recursos do saldo livre para o cofre.
   * Acompanhe a barra de progresso visual se aproximando dos 100%.
5. **Resgate a Qualquer Momento:**
   * Precisou do dinheiro de volta? Toque em **"Resgatar"** a qualquer instante. O valor retorna imediatamente para seu saldo livre sem taxas, travas ou carências.
6. **Comemoração de Conquista:**
   * Ao atingir 100% da meta, o aplicativo celebra com chuva de confetes e uma notificação de conquista especial!

---

## 7. 📊 Extrato Financeiro, Livro-Razão e Categorização em 1 Toque

A tela de **"Extrato"** oferece controle completo de entradas e saídas:

* **Indexação Blockchain Automática:** Depósitos e transferências on-chain na Base são registrados automaticamente no extrato.
* **⚡ Categorização Rápida em 1 Toque via Notificação (Novo na v1.0.6):**
  * Ao receber um depósito em USDC, uma notificação inteligente aparece no topo da tela.
  * Você pode definir a categoria do recurso (ex.: *Freelance*, *Salário*, *Investimento*, *Venda*) com apenas 1 toque, sem precisar abrir o extrato!
* **Lançamentos Manuais de Gastos Externos:**
  * Registre despesas em dinheiro físico, cartões de crédito ou contas bancárias externas tocando em **"+ Novo Lançamento"**.
  * Preencha descrição, valor, data e categoria.
* **Busca e Filtros Rápidos:** Filtre seus lançamentos por *Entradas*, *Saídas* ou palavras-chave.
* **Exportação de Relatório em PDF:**
  * Gere um relatório financeiro completo formatado em PDF para arquivamento ou controle contábil com cabeçalho profissional e tabela detalhada.

---

## 8. ⏱️ Monitor de Orçamento Diário

Mantenha a disciplina de gastos mês a mês sem planilhas complexas:

1. Na tela **Inicial**, localize o cartão do **"Orçamento Diário"**.
2. Toque para definir seu limite diário de gastos (ex.: `$15,00 / dia`).
3. Conforme você registra gastos durante o dia, a barra de progresso acompanha o consumo e avisa antes que você ultrapasse sua meta.

---

## 9. 📈 Painel de Métricas e Gráficos

Acesse a aba **"Análise"** para entender para onde vai o seu dinheiro:

* **Gráfico de Despesas por Categoria:** Visão percentual dos seus gastos mensais (Alimentação, Lazer, Moradia, Serviços).
* **Balanço Mensal:** Comparativo entre o total de entradas e o total de saídas no período.
* **Taxa de Poupança:** Métrica que indica a porcentagem da sua renda mensal guardada em dólares nos seus cofres.

---

## 10. 🛡️ Segurança, Teclado de PIN, Biometria e Agilidade Criptográfica

O CofreAdmin foi construído com arquitetura de segurança em camadas:

### 1. Teclado de PIN Tátil de 4 Dígitos e Biometria WebAuthn
* Configure um PIN numérico protegido com teclado **tátil e randomizado** (inspirado na Trust Wallet).
* O PIN é processado localmente através de **hash SHA-256 com salt de hardware** e nunca sai do seu aparelho.
* Habilite a **Biometria WebAuthn** (Face ID, Touch ID ou Windows Hello) para desbloqueio e autorização rápida com um toque.

### 2. Motor de Agilidade Criptográfica Multi-Geração (`v1` → `v2` → `v3`)
* **v1 (Legado):** Derivação padrão em texto simples para compatibilidade e transição suave.
* **v2 (Envelope Criptografado):** Criptografia avançada padrão militar AES-GCM de 256 bits protegida por derivação PBKDF2 com 100.000 iterações.
* **v3 (Hardware-Bound):** Chaves criptográficas não-extraíveis Web Crypto API vinculadas ao hardware do dispositivo e armazenadas em partição segura IndexedDB.
* **Varredura On-Chain em 1 Clique (Sweep):** Migre e transfira integralmente seus fundos entre gerações de carteira em uma única transação on-chain simplificada.

### 3. Backup Autocustodial da Chave Privada
* A chave privada é de sua propriedade exclusiva.
* Para fazer backup: Acesse **Ajustes** > **Carteira e Segurança** > **"Backup da Chave Privada"**.
* Confirme sua autenticação, copie sua chave criptográfica (`0x...`) e guarde-a em local seguro offline.
* Com essa chave, você tem a liberdade de importar sua carteira no MetaMask, Rabby, Rainbow ou Coinbase Wallet quando desejar.

---

## 11. 🎨 Personalização, Temas e Notificações Push

* **Temas Visuais (Neo-Brutalism):** Escolha entre estilos marcantes de alto contraste ou paletas escuras com alta legibilidade.
* **Perfil Customizado:** Altere seu nome de exibição, avatar e crie seu identificador `@handle`.
* **Notificações Push:** Seja avisado em tempo real no navegador ou no celular sempre que receber recursos em USDC ou completar uma meta de cofre.
* **Backup Offline em JSON:** Exporte a qualquer momento uma cópia integral dos seus lançamentos e metas em formato `.json` para salvar no seu computador ou transferir de aparelho.

---

## 12. 🔒 Privacidade, Conformidade Global e Exclusão de Conta

O CofreAdmin respeita integralmente as normas internacionais de proteção de dados (LGPD, GDPR e CCPA) e a soberania dos seus dados:

### Exclusão Definitiva de Conta e Dados:
1. Vá até **Ajustes** e role até o final da página.
2. Na seção **Privacidade e Dados**, toque em **"Excluir Minha Conta e Meus Dados"**.
3. **O que acontece após a confirmação:**
   * **Limpeza em Nuvem:** Todos os registros operacionais vinculados ao seu perfil em `userData` são permanentemente eliminados da nuvem.
   * **Limpeza no Aparelho:** O armazenamento local, caches e sessões do navegador são totalmente limpos.
   * **Registro Auditável de Conformidade:** Em estrito cumprimento às exigências legais (como o Art. 16 da LGPD brasileira e exceções do Art. 17 do GDPR europeu), o sistema gera um comprovante anônimo e imutável (`legalAuditArchive`) atestando a data e o descarte legal dos dados perante órgãos reguladores.
   * *Aviso: Lembre-se de transferir seus fundos em USDC para uma carteira externa ou salvar sua Chave Privada antes de concluir a exclusão.*

---

## 13. ❓ Perguntas Frequentes (FAQ)

### O que torna a rede Base tão rápida e econômica?
A Base é uma solução de segunda camada (Layer 2) desenvolvida pela Coinbase sobre a rede Ethereum. Ela processa e compacta múltiplas transações simultaneamente, reduzindo as taxas de rede para frações de centavo e mantendo toda a segurança descentralizada da Ethereum.

### Como funciona a Unificação de Contas por E-mail?
Se você entrar pelo Google e posteriormente entrar pelo Discord utilizando o mesmo endereço de e-mail verificado, o CofreAdmin reconhece sua identidade única. O sistema mantém o mesmo perfil, endereço de carteira e histórico de dados sem exigir nova aceitação de termos ou criar contas separadas.

### O que é o Modo Privacidade Rápida?
Ao tocar no ícone de olho do cartão de saldo, todos os valores financeiros da tela inicial são mascarados com pontos (`••••`). Isso impede que pessoas ao seu redor vejam suas economias em locais públicos ou no transporte.

### Posso transferir para Basenames ou domínios ENS?
Sim! Basta digitar qualquer nome no formato `.base.eth` ou `.eth` no campo de envio. O aplicativo faz a resolução automática do endereço on-chain com validações de segurança.

### Eu preciso ter ETH para transferir USDC?
Não. A tecnologia de abstração de gas (EIP-3009) patrocina as taxas de rede e debita centavos diretamente da fração transferida em USDC.

### Alguém pode congelar meus fundos?
Não. O CofreAdmin é 100% autocustodial. Nenhum intermediário, servidor ou desenvolvedor possui acesso às suas chaves ou capacidade técnica de bloquear seus fundos.

---

🎮 Discord: `@cofreadmin` • 📧 E-mail: [suporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Aberto: AGPL-3.0-or-later
