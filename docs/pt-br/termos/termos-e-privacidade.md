# TERMOS DE USO, POLÍTICA DE PRIVACIDADE E ISENÇÃO DE RESPONSABILIDADE

**Aplicativo:** CofreAdmin Wallet (Gerenciador Financeiro Web3 Self-Custodial)

Ao utilizar nosso aplicativo, você concorda integralmente com as condições, políticas e isenções de responsabilidade descritas neste documento unificado. Se você não concordar com qualquer termo aqui disposto, não deverá utilizar o aplicativo.

---

## PARTE 1: TERMOS DE USO

### 1.1. Escopo do Serviço
O CofreAdmin é uma aplicação web3 de gerenciamento e controle financeiro pessoal (Gerenciador Financeiro Web3 Self-Custodial). O aplicativo oferece ferramentas visuais para criação de metas, acompanhamento de despesas, registros de evolução e integração técnica com uma carteira digital em USDC (Stablecoin) na blockchain da rede/Base (camada L2 da Ethereum).

* O CofreAdmin opera e gerencia registros financeiros baseados em USDC (USD Coin), um criptoativo do tipo stablecoin cuja emissão e paridade econômica são atreladas ao dólar americano (USD). O usuário reconhece que o USDC opera em infraestrutura descentralizada de blockchain, estando sujeito às regras tecnológicas do protocolo emissor e da rede de transferência, não havendo por parte da plataforma qualquer ingerência, custódia direta de chaves privadas ou garantia sobre a estabilidade macroeconômica global ou falhas sistêmicas da rede de terceiros.

### 1.2. Elegibilidade (Público-Alvo)
O CofreAdmin é projetado para usuários a partir de 14 anos de idade. Em consonância com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD) e o Estatuto da Criança e do Adolescente (Lei nº 8.069/1990 - ECA), os usuários menores de 18 anos declaram possuir a devida autorização e assistência de seus pais ou responsáveis legais para aceitar estes termos, cadastrar-se e utilizar a plataforma.

---

## PARTE 2: ISENÇÃO DE RESPONSABILIDADE (DESCENTRALIZAÇÃO E WEB3)

### 2.1. Natureza Estritamente Não-Custodial e Infraestrutura Blockchain
O CofreAdmin não é uma instituição financeira, banco tradicional, corretora, transmissor de dinheiro ou custodiante de ativos. Toda e qualquer criptomoeda, token, saldo digital ou ativo transferido para a carteira gerada no aplicativo fica armazenado de forma descentralizada diretamente na blockchain da rede/Base. O CofreAdmin funciona exclusivamente como software de interface visual e cliente de auto-custódia para que o usuário interaja com a rede blockchain. Nós não temos acesso, posse, controle, guarda ou gerência sobre os fundos dos usuários.

### 2.2. Arquitetura de Chaves Criptográficas e Responsabilidade Exclusiva
A chave privada da sua carteira é gerada exclusivamente no seu navegador/dispositivo através da Web Crypto API do sistema operacional e protegida em repouso por criptografia simétrica AES-GCM de 256 bits com derivação PBKDF2. Nenhum servidor, API de retaguarda ou banco de dados do CofreAdmin recebe, trafega, armazena ou possui cópia da sua chave privada. É de responsabilidade única e exclusiva do usuário a guarda, segurança e backup de suas credenciais de acesso, chaves privadas ou frases de recuperação. Em caso de perda de acesso ao dispositivo, perda de chaves secretas ou exclusão de conta sem o devido saque, o CofreAdmin não possui meios técnicos para recuperar seus ativos digitais. A perda das chaves implica a perda irreversível dos fundos na rede/Base.

### 2.3. Volatilidade, Taxas de Rede e Riscos Tecnológicos
O usuário assume total responsabilidade pelos riscos de mercado ao operar com ativos digitais, incluindo volatilidade de preços. O CofreAdmin não se responsabiliza por taxas de rede cobradas pela blockchain da rede/Base, variações de slippage ou por falhas na validação de transações nativas da própria rede descentralizada.

---

## PARTE 3: POLÍTICA DE PRIVACIDADE E SEGURANÇA DOS DADOS (LGPD)

### 3.1. Dados Coletados e Finalidades Estritas
* **Informações Pessoais:** (Nome, Endereço de E-mail e IDs de Usuário via Login OAuth) coletadas com a finalidade estrita de autenticação de segurança e gerenciamento de conta.
* **Outras Informações Financeiras e Metas:** Saldo dos cofres visuais, histórico de metas criadas, categorias de gastos e o endereço público da sua carteira na rede/Base, sincronizados no Firebase/Firestore para a funcionalidade do app e persistência entre dispositivos autorizados.
* **Local Aproximado:** Inferido através do endereço IP do dispositivo para segurança de sessão e prevenção de fraudes.
* **Informações de Desempenho e Diagnósticos:** Dados técnicos de erro e travamento coletados para análise técnica e correção de bugs.

### 3.2. Controle de Acesso e Endurecimento de Segurança (Firestore Security Rules)
O banco de dados do CofreAdmin opera sob regras restritas de controle de acesso (Security Rules). Cada usuário autenticado possui acesso exclusivo de leitura e gravação para os seus próprios registros. Nenhuma entidade ou usuário externo possui permissão técnica para inspecionar, alterar ou consultar o painel financeiro de terceiros.

### 3.3. Criptografia em Trânsito e em Repouso
Todos os dados transmitidos pelo CofreAdmin utilizam criptografia de ponta em trânsito (protocolos HTTPS/TLS). As chaves locais de auto-custódia são criptografadas em repouso com algoritmo padrão militar AES-GCM 256 bits, impedindo a leitura indevida por scripts maliciosos ou invasões de terceiros.

### 3.4. Anúncios e Notificações Push
Usamos o método de anúncios por Notificações Push, mais apenas se o usuário clicar em "Permitir", "Aceito" ou equivalente. O processo é totalmente anônimo e não coleta dados pessoais (como nome ou e-mail). Você está no controle e pode cancelar a inscrição quando quiser direto nas configurações do seu navegador/dispositivo. ** Dependendo da versão, o aplicativo pode incluí-lo ou omiti-lo.

---

## PARTE 4: EXCLUSÃO DE CONTA E IMUTABILIDADE DA BLOCKCHAIN

### 4.1. Direito de Exclusão (LGPD)
Em conformidade com a LGPD (Lei nº 13.709/2018), o usuário possui o direito de solicitar a exclusão total e definitiva de seus dados dos servidores do CofreAdmin a qualquer momento através das opções do aplicativo ou dos canais oficiais de suporte.

### 4.2. Fluxo de Exclusão de Servidores Privados
Ao processar o pedido de exclusão do CofreAdmin, todos os seus dados operacionais e financeiros (despesas, receitas, categorias e cofres) são definitivamente e permanentemente destruídos de nossos servidores.

### 4.3. Regra Especial Web3: Imutabilidade da Blockchain e LGPD
O usuário declara estar ciente de que, por limitações e características nativas da tecnologia blockchain, os registros de transações públicas e o endereço da carteira digital são permanentes e imutáveis. A carteira digital continuará existindo de forma autônoma na blockchain sob posse exclusiva do portador da chave privada.
* Em estrita conformidade com o Art. 7º, inciso VI, e o Art. 16 da LGPD (Lei nº 13.709/2018), para fins de exercício regular de direitos em processo judicial ou administrativo, o CofreAdmin reterá de forma segregada e protegida um log técnico de auditoria e conformidade. Esse registro conterá o timestamp (data/hora) do aceite dos termos de uso, de exclusão, o hash de status, o e-mail autenticado e o endereço da carteira, mantidos exclusivamente para rastreabilidade de segurança e defesa da plataforma, sem atrelamento a dados de transações financeiras após a exclusão.

---

## PARTE 5: DO ATENDIMENTO AO USUÁRIO E ESCLARECIMENTOS

O aplicativo disponibiliza canal de atendimento exclusivamente para esclarecimento de dúvidas conceituais, recebimento de sugestões/feedbacks, e relato de problemas técnicos.

* **Limitação de Escopo:** Por se tratar de uma aplicação de auto-custódia (non-custodial, self-custodial), o usuário declara estar ciente de que a APLICATIVO não possui acesso, controle ou custódia sobre as chaves privadas (private key, seed phrases), senhas ou ativos digitais do usuário.
* **Impossibilidade de Intervenção:** O atendimento não realiza e não tem capacidade técnica de realizar: recuperação de chaves privadas, estorno de transações na blockchain, cancelamento de operações ou correção de erros cometidos pelo usuário no envio de ativos, e etapas relacionadas.
* **Canal Disponível:** O usuário poderá entrar em contato através do e-mail: cofreadminwallet@gmail.com e/ou canal disponibilizado no próprio aplicativo.
* **Prazos:** As mensagens serão lidas e respondidas conforme a disponibilidade da equipe, não gerando obrigação de nível de serviço (SLA) para resoluções imediatas.

---

<sub>Global: [Privacy Policy](https://github.com/cofreadminwallet/docs/blob/main/en-us/privacy-policy/privacy-policy.md)</sub>
