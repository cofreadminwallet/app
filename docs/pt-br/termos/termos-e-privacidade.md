# TERMOS DE USO, POLÍTICA DE PRIVACIDADE E AVISO LEGAL (DISCLAIMER)

**Aplicativo:** CofreAdmin Wallet (Gerenciador Financeiro Web3 Self-Custodial)
*Ao utilizar nosso aplicativo, você concorda integralmente com as condições, políticas e isenções de responsabilidade descritas neste documento unificado. Se não concordar com qualquer termo aqui estabelecido, não deverá utilizar o aplicativo.*

---

## PARTE 1: TERMOS DE USO E JURISDIÇÕES GLOBAIS

### 1.1. Escopo do Serviço
O CofreAdmin é um aplicativo Web3 de gerenciamento e controle financeiro pessoal (Gerenciador Financeiro Web3 de Autocustódia). O app fornece ferramentas visuais para criar metas, rastrear despesas, registrar a evolução e oferecer integração técnica com uma carteira digital em USDC (Stablecoin) na blockchain da rede Base (uma camada de escalonamento Ethereum L2).  
O CofreAdmin opera e gerencia registros financeiros baseados em USDC (USD Coin), uma stablecoin cuja emissão e paridade econômica estão atreladas ao Dólar Americano (USD). O usuário reconhece que o USDC opera em uma infraestrutura blockchain descentralizada, sujeita às regras tecnológicas do protocolo emissor e da rede de transferência. A plataforma não exerce interferência, custódia direta de chaves privadas ou garantias em relação à estabilidade macroeconômica global ou falhas sistêmicas de redes de terceiros.

### 1.2. Elegibilidade Global e Marcos Legais Regionais
O CofreAdmin foi projetado para usuários a partir de 14 anos globalmente. Para garantir conformidade internacional, o aplicativo alinha-se a padrões regionais específicos:
* **Brasil (LGPD - Lei Geral de Proteção de Dados, Lei nº 13.709/2018 e ECA):** Usuários entre 14 e 18 anos declaram possuir autorização e assistência de seus pais ou responsáveis legais para aceitar estes termos e utilizar a plataforma.
* **União Europeia (GDPR - Regulamento Geral sobre a Proteção de Dados):** Cumpre com os rigorosos direitos dos titulares de dados, bases legais para processamento, minimização de dados e proteções de transferência transfronteiriça para usuários que residem no Espaço Econômico Europeu (EEE).
* **Estados Unidos (CCPA/CPRA e COPPA):** Cumpre com os padrões de privacidade do consumidor da Califórnia (CCPA/CPRA) em relação à transparência na coleta de dados e direitos de exclusão (opt-out), bem como com a Lei de Proteção à Privacidade Online de Crianças (COPPA), exigindo consentimento parental verificável para usuários menores de 13 anos, quando aplicável.

---

## PARTE 2: AVISO LEGAL (DESCENTRALIZAÇÃO E ISENÇÕES WEB3)

### 2.1. Natureza Estritamente Não Custodial e Infraestrutura Blockchain
O CofreAdmin não é uma instituição financeira, banco tradicional, corretora, transmissor de dinheiro ou custodiante de ativos. Qualquer criptomoeda, token, saldo digital ou ativo transferido para a carteira gerada dentro do aplicativo é armazenado de forma descentralizada diretamente na blockchain da rede Base. O CofreAdmin funciona exclusivamente como um software de interface visual e cliente de autocustódia, permitindo que o usuário interaja com a rede blockchain. Nós não temos acesso, posse, controle, custódia ou gerenciamento sobre os fundos dos usuários.

### 2.2. Arquitetura de Chaves Criptográficas e Responsabilidade Exclusiva
Sua carteira é gerada localmente usando mnemônicos de 12 palavras do padrão BIP-39. A chave privada é gerada exclusivamente no seu navegador ou dispositivo usando a Web Crypto API do sistema operacional. Ela é protegida em repouso por criptografia simétrica AES-GCM de 256 bits, alimentada por uma `CryptoKey` não extraível do IndexedDB (envelope v3) ou por derivação de chave PBKDF2 com 100 mil iterações (envelope v2). Nenhum servidor, API de backend ou banco de dados pertencente ao CofreAdmin recebe, transmite, armazena ou retém uma cópia de sua chave privada ou frase mnemônica. É de responsabilidade única e exclusiva do usuário salvaguardar, proteger e fazer backup de suas credenciais de acesso, chaves privadas ou frases de recuperação. Em caso de perda de acesso ao dispositivo, perda de chaves secretas ou exclusão da conta sem saque prévio, o CofreAdmin não tem meios técnicos para recuperar seus ativos digitais. A perda das chaves implica na perda irreversível dos fundos na rede Base.

### 2.3. Volatilidade, Taxas de Rede e Riscos Tecnológicos
O usuário assume total responsabilidade pelos riscos de mercado ao operar com ativos digitais, incluindo a volatilidade de preços. O CofreAdmin utiliza a infraestrutura de metatransações EIP-3009 (TransferWithAuthorization) para oferecer experiências sem taxa de gás (gasless), pagando as taxas de transação e do protocolo diretamente do saldo em USDC. No entanto, o CofreAdmin não é responsável pelas taxas de rede (gas fees) nativas cobradas pela blockchain da rede Base, variações de slippage ou falhas na validação de transações inerentes à própria rede descentralizada.

---

## PARTE 3: POLÍTICA DE PRIVACIDADE E SEGURANÇA DE DADOS

### 3.1. Dados Coletados e Finalidades Estritas
* **Informações Pessoais:** Nome, E-mail e IDs de Usuário via Login OAuth (Google e Discord) coletados para os fins estritos de autenticação de segurança e gerenciamento de conta.
* **Informações Financeiras e Metas:** Saldos de cofres visuais, categorizações inteligentes, notas e descrições de transações (memos) e seu endereço de carteira pública na rede Base, sincronizados no Firebase/Firestore para o funcionamento do app e sincronização entre dispositivos autorizados. No modo offline ou visitante (quando o banco de dados em nuvem não está configurado), esses dados permanecem estritamente no armazenamento local (Local Storage).
* **Localização Aproximada:** Inferida através do endereço IP do dispositivo para segurança da sessão e prevenção de fraudes.
* **Informações de Desempenho e Diagnóstico:** Dados sobre erros técnicos e travamentos coletados para análise técnica e correção de bugs.

### 3.2. Controle de Acesso e Fortalecimento de Segurança
O banco de dados em nuvem do CofreAdmin opera sob regras estritas de controle de acesso (Firestore Security Rules). Cada usuário autenticado possui acesso exclusivo de leitura e escrita estritamente aos seus próprios registros, mediante verificação de propriedade do e-mail. Nenhuma entidade externa ou usuário tem permissão técnica para inspecionar, alterar ou consultar painéis financeiros de terceiros.

### 3.3. Criptografia e Segurança do Dispositivo
Todos os dados transmitidos pelo CofreAdmin utilizam criptografia de ponta em trânsito (protocolos HTTPS/TLS). As chaves locais de autocustódia são criptografadas em repouso usando algoritmos AES-GCM de 256 bits de padrão militar. Além disso, o bloqueio local de sessão utiliza hash de PIN SHA-256 no lado do cliente com um salt isolado no dispositivo e biometria de hardware WebAuthn (Impressão Digital / Face ID). Esses artefatos de autenticação e PINs nunca são transmitidos aos nossos servidores.

### 3.4. Anúncios e Notificações Push
Utilizamos Notificações Push para anúncios/atualizações *apenas* se o usuário clicar em "Permitir", "Aceitar" ou equivalente. O processo é totalmente anônimo e não coleta dados pessoais (como nome ou e-mail). Você permanece no controle total e pode cancelar a inscrição a qualquer momento diretamente nas configurações do seu navegador ou dispositivo. *(Dependendo da versão, o aplicativo pode apresentar ou omitir este recurso).*

---

## PARTE 4: EXCLUSÃO DE CONTA E IMUTABILIDADE DA BLOCKCHAIN

### 4.1. Direito à Exclusão (Padrões Globais de Privacidade)
Em conformidade com as leis internacionais de proteção de dados (incluindo LGPD, GDPR e CCPA), o usuário tem o direito de solicitar a exclusão total e permanente de seus dados dos servidores do CofreAdmin a qualquer momento, através das opções do aplicativo ou dos canais oficiais de suporte.

### 4.2. Fluxo de Exclusão no Servidor Privado
Ao processar uma solicitação de exclusão do CofreAdmin, todos os dados operacionais e financeiros (despesas, receitas, categorias e cofres) são definitiva e permanentemente destruídos de nossos servidores.

### 4.3. Regra Especial Web3: Imutabilidade da Blockchain e Conformidade Legal
O usuário reconhece que, devido às limitações e características nativas da tecnologia blockchain, os registros públicos de transação e o endereço da carteira digital são permanentes e imutáveis. A carteira digital continuará a existir de forma autônoma na blockchain sob a propriedade exclusiva do detentor da chave privada.  
Na medida permitida pelas leis aplicáveis (como o Artigo 7º, Inciso VI, e Artigo 16 da LGPD brasileira, exceções de conformidade do GDPR e marcos globais equivalentes) para o exercício regular de direitos em processos judiciais, fiscais ou administrativos, o CofreAdmin reterá de maneira segregada e protegida um registro técnico de auditoria e conformidade (incluindo o Clickwrap da Política de Privacidade no primeiro acesso e Certificados de Confirmação de Backup da Carteira). Este registro de gravação única (write-once) conterá a data e hora de aceitação dos termos, solicitações de exclusão, identificadores com hash SHA-256, e-mail autenticado, impressões digitais de auditoria (audit fingerprints) e endereços da carteira, mantidos exclusivamente para rastreabilidade de segurança e defesa da plataforma, completamente dissociados dos dados de transações financeiras após a exclusão da conta.

---

## PARTE 5: SUPORTE AO USUÁRIO E ESCLARECIMENTOS

O aplicativo fornece um canal de suporte exclusivamente para esclarecimento de dúvidas conceituais, recebimento de sugestões/feedback e relato de problemas técnicos.

* **Limitação de Escopo:** Sendo um aplicativo não custodial / de autocustódia, o usuário reconhece que o aplicativo **não tem acesso, controle ou custódia** sobre as chaves privadas, frases semente (seed phrases), senhas ou ativos digitais do usuário.
* **Impossibilidade de Intervenção:** O Suporte **não realiza e não possui capacidade técnica para realizar:** recuperação de chaves privadas, estorno de transações na blockchain, cancelamento de operações ou correções de erros cometidos pelo usuário durante transferências de ativos.
* **Canais Disponíveis:** Os usuários podem entrar em contato com o suporte pelo e-mail: **cofreadminwallet@gmail.com**, através do Discord oficial em **@cofreadmin** e/ou através do canal de feedback disponibilizado no próprio aplicativo.
* **Aviso sobre o SLA (Nível de Serviço):** As mensagens serão lidas e respondidas com base na disponibilidade da equipe, não gerando nenhum acordo de nível de serviço (SLA) ou obrigação de resolução imediata.

<sub>Global: [Privacy Policy](https://github.com/cofreadminwallet/docs/blob/main/en-us/privacy-policy/privacy-policy.md)</sub>
