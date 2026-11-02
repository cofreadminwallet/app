# TERMOS DE USO, POLÍTICA DE PRIVACIDADE E ISENÇÃO DE RESPONSABILIDADE (DISCLAIMER)

**Aplicação:** CofreAdmin Wallet (Gestão Financeira Pessoal Web3 Autocustodial)  
*Ao utilizar nossa aplicação, você concorda integralmente com as condições, políticas e isenções de responsabilidade descritas neste documento unificado. Caso não concorde com qualquer termo estabelecido neste instrumento, você não deve utilizar a aplicação.*

---

## PARTE 1: TERMOS DE USO E JURISDIÇÕES GLOBAIS

### 1.1. Escopo do Serviço
O CofreAdmin é uma aplicação de controle e gestão financeira pessoal Web3 (Web3 Self-Custodial Financial Manager). O aplicativo disponibiliza ferramentas visuais para criação de metas e cofres, rastreamento de despesas, registro de evolução patrimonial e integração técnica com carteira digital em USDC (Stablecoin) na blockchain da rede Base (uma camada de escalabilidade L2 da Ethereum).  
O CofreAdmin opera e gerencia registros financeiros baseados em USDC (USD Coin), uma stablecoin cuja emissão e paridade econômica são atreladas ao Dólar Americano (USD). O usuário reconhece expressamente que o USDC opera sobre infraestrutura blockchain descentralizada, sujeita às regras tecnológicas do protocolo emissor e da rede de transferência. A plataforma não exerce qualquer interferência, custódia direta de chaves privadas ou garantias quanto à estabilidade macroeconômica global ou falhas sistêmicas de redes de terceiros.

### 1.2. Elegibilidade Global e Marcos Legais Regionais
O CofreAdmin é projetado para usuários a partir de 14 anos de idade globalmente. Para assegurar conformidade internacional, a aplicação alinha-se a padrões regionais específicos:
* **Brasil (LGPD - Lei Geral de Proteção de Dados, Lei nº 13.709/2018 e ECA):** Usuários com idade entre 14 e 18 anos declaram possuir autorização e assistência de seus pais ou responsáveis legais para aceitar estes termos e utilizar a plataforma.
* **União Europeia (GDPR - Regulamento Geral sobre a Proteção de Dados):** Cumpre com direitos rigorosos dos titulares de dados, bases legais legítimas para processamento, minimização de dados e salvaguardas para transferências transfronteiriças aplicáveis a residentes do Espaço Econômico Europeu (EEE).
* **Estados Unidos (CCPA/CPRA e COPPA):** Em conformidade com os padrões de privacidade do consumidor da Califórnia (CCPA/CPRA) referentes à transparência na coleta de dados e direitos de opt-out, bem como à Lei de Proteção da Privacidade Online das Crianças (COPPA), exigindo consentimento parental verificável para usuários menores de 13 anos onde aplicável.

---

## PARTE 2: ISENÇÃO DE RESPONSABILIDADE (DISCLAIMER - DESCENTRALIZAÇÃO & NÃO-CUSTÓDIA WEB3)

### 2.1. Natureza Estritamente Não-Custodial e Infraestrutura Blockchain
O CofreAdmin não é uma instituição financeira, banco tradicional, corretora de valores, transmissor de moeda ou custodiante de ativos. Qualquer criptoativo, token, saldo digital ou valor transferido para a carteira gerada no aplicativo é armazenado de forma descentralizada diretamente na blockchain da rede Base. O CofreAdmin funciona exclusivamente como um software de interface visual e cliente de autocustódia que permite ao usuário interagir com a rede blockchain. Nós não possuímos acesso, posse, controle, custódia ou gestão sobre os fundos dos usuários.

### 2.2. Arquitetura de Chaves Criptográficas e Responsabilidade Exclusiva
Sua carteira é gerada localmente utilizando mnemônicos padrão BIP-39 de 12 palavras. A chave privada é criada exclusivamente no seu navegador ou dispositivo por meio da API Web Crypto nativa do sistema operacional. Ela é protegida em repouso por criptografia simétrica AES-GCM de 256 bits potencializada por uma chave `CryptoKey` não exportável no IndexedDB (envelope v3) ou derivação de chave PBKDF2 com 100.000 iterações (envelope v2). Nenhum servidor, API de backend ou banco de dados pertencente ao CofreAdmin recebe, transmite, armazena ou retém cópia de sua chave privada ou frase mnemônica. É de responsabilidade única e exclusiva do usuário guardar, proteger e realizar backup de suas credenciais de acesso, chaves privadas e frases de recuperação. Em caso de perda do dispositivo, perda das chaves secretas ou exclusão de conta sem retirada prévia dos saldos, o CofreAdmin não possui meios técnicos para recuperar seus ativos digitais. A perda das chaves implica a perda irreversível dos fundos na rede Base.

### 2.3. Volatilidade, Taxas de Rede e Riscos Tecnológicos
O usuário assume total responsabilidade pelos riscos de mercado ao operar com ativos digitais, incluindo oscilações de preços. O CofreAdmin utiliza trilhos de metatransação EIP-3009 (TransferWithAuthorization) para viabilizar experiências gasless, debitando eventuais taxas de transação e do protocolo diretamente dos saldos em USDC. No entanto, o CofreAdmin não se responsabiliza por taxas de rede base cobradas pela blockchain da rede Base, variações de slippage ou falhas na validação de transações inerentes à própria rede descentralizada.

---

## PARTE 3: POLÍTICA DE PRIVACIDADE E SEGURANÇA DE DADOS

### 3.1. Dados Coletados e Finalidades Estritas
* **Informações Pessoais:** Nome, endereço de e-mail e identificadores de usuário obtidos via Login OAuth (Google e Discord), coletados exclusivamente para fins de autenticação de segurança e gerenciamento da conta.
* **Informações Financeiras e Metas:** Saldos dos cofres visuais, categorizações de lançamentos, descrições de movimentações e seu endereço público de carteira na rede Base, sincronizados no Firebase/Firestore para funcionamento do app e sincronização entre dispositivos autorizados. Em modo convidado ou offline (quando bancos em nuvem não estão configurados), estes dados permanecem estritamente no armazenamento local (Local Storage).
* **Localização Aproximada:** Inferida a partir do endereço IP do dispositivo para segurança da sessão e prevenção contra fraudes.
* **Informações de Diagnóstico e Desempenho:** Registros técnicos de erros e relatórios de falhas coletados para análise técnica e correções de bugs.

### 3.2. Controle de Acesso e Regras de Segurança
O banco de dados em nuvem do CofreAdmin opera sob regras estritas de controle de acesso (Firestore Security Rules). Cada usuário autenticado possui permissão de leitura e gravação restrita exclusivamente aos seus próprios registros por validação de titularidade do e-mail autenticado. Nenhuma entidade ou usuário externo possui permissão técnica para inspecionar, alterar ou consultar painéis financeiros de terceiros.

### 3.3. Criptografia e Segurança do Dispositivo
Todos os dados transmitidos pelo CofreAdmin utilizam criptografia de ponta a ponta em trânsito (protocolos HTTPS/TLS). As chaves locais de autocustódia são criptografadas em repouso com algoritmos de padrão militar AES-GCM de 256 bits. Além disso, o bloqueio local da aplicação utiliza hash SHA-256 do PIN com salt isolado por dispositivo e autenticação biométrica por hardware via WebAuthn (Impressão Digital / Face ID). Estes artefatos de autenticação e códigos PIN nunca são transmitidos aos nossos servidores.

### 3.4. Anúncios e Notificações Push
Utilizamos notificações push para comunicados e atualizações *somente* se o usuário clicar em "Permitir", "Aceitar" ou equivalente. O processo é inteiramente anônimo e não coleta dados pessoais identificáveis (como nome ou e-mail). O usuário mantém controle integral e pode revogar as permissões a qualquer momento diretamente nas configurações de seu navegador ou dispositivo.

---

## PARTE 4: EXCLUSÃO DE CONTA E IMUTABILIDADE BLOCKCHAIN

### 4.1. Direito à Exclusão (Padrões Globais de Privacidade)
Em conformidade com legislações internacionais de proteção de dados (incluindo LGPD, GDPR e CCPA), o usuário possui o direito de solicitar a exclusão total e permanente de seus dados dos servidores do CofreAdmin a qualquer momento através das opções do aplicativo ou pelos canais oficiais de suporte.

### 4.2. Fluxo de Exclusão de Servidores Privados
Ao processar uma solicitação de exclusão no CofreAdmin, todos os dados operacionais e financeiros (despesas, receitas, categorias e cofres) são definitiva e permanentemente eliminados de nossos servidores.

### 4.3. Regra Especial Web3: Imutabilidade Blockchain e Conformidade Legal
O usuário reconhece que, devido às limitações e características nativas da tecnologia blockchain, os registros públicos de transações e o endereço da carteira digital são permanentes e imutáveis. A carteira digital continuará a existir de forma autônoma na blockchain sob a posse exclusiva do detentor da chave privada.  
Na medida permitida pelas leis aplicáveis (como o Artigo 7º, Inciso VI, e Artigo 16 da LGPD brasileira, exceções de conformidade do GDPR e estruturas globais equivalentes) para o exercício regular de direitos em processos judiciais, tributários ou administrativos, o CofreAdmin reterá de forma segregada e protegida um registro técnico de auditoria e conformidade (incluindo os Certificados de Aceite Clickwrap da Política de Privacidade no primeiro acesso e Confirmação de Backup da Carteira). Este registro somente-gravação (write-once) conterá o registro de data e hora (timestamp) do aceite dos termos, solicitações de exclusão, identificadores hash SHA-256, e-mail autenticado, impressões digitais de auditoria e endereços de carteira, mantidos exclusivamente para rastreabilidade de segurança e defesa da plataforma, totalmente dissociados de dados de movimentações financeiras após a exclusão.

---

## PARTE 5: SUPORTE AO USUÁRIO E ESCLARECIMENTOS

A aplicação disponibiliza canal de atendimento exclusivamente para esclarecimento de dúvidas conceituais, recebimento de sugestões/feedbacks e comunicação de problemas técnicos.

* **Limitação de Escopo:** Por se tratar de uma aplicação não-custodial / autocustodial, o usuário reconhece expressamente que o aplicativo **não possui acesso, controle ou custódia** sobre as chaves privadas, frases semente (seed phrases), senhas ou ativos digitais do usuário.
* **Impossibilidade de Intervenção:** O suporte **não realiza e carece de capacidade técnica para realizar:** recuperação de chaves privadas, reversão de transações em blockchain, cancelamento de operações ou correção de erros cometidos pelo usuário no envio de ativos.
* **Canais Disponíveis:** O contato com o suporte pode ser realizado através do e-mail: **cofreadminwallet@gmail.com**, via Discord oficial em **@cofreadmin** e/ou através do canal de feedback integrado à própria aplicação.
* **Isenção de SLA:** As mensagens serão lidas e respondidas conforme disponibilidade da equipe, não gerando acordo de nível de serviço (SLA) ou obrigação de resolução imediata.
