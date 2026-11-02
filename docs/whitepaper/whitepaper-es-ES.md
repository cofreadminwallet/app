# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Whitepaper Ejecutivo • Tesis de Inversión, Arquitectura de Crecimiento y Hoja de Ruta Técnica <br>
> Versión: **v1.0.6** • Distribuido bajo la **Licencia Pública General de Affero de GNU v3.0 o posterior (AGPL-3.0-or-later)**.

🌐 **Idiomas:** **[English](whitepaper.md)** • **[Português](whitepaper-pt-BR.md)** • **[Español](whitepaper-es-ES.md)** • **[简体中文](whitepaper-zh-Hans.md)**

---

## 📑 Estructura del Documento
1. [Visión General y Oportunidad de Mercado (Pitch)](#1-visión-general-y-oportunidad-de-mercado-pitch)
2. [Fundación de Red y Token (Base L2 y USDC Nativo)](#2-fundación-de-red-y-token-base-l2-y-usdc-nativo)
3. [Modelo de Negocio y Mecánica de Ingresos](#3-modelo-de-negocio-y-mecánica-de-ingresos)
4. [Asignación de Capital y Estrategia de Crecimiento](#4-asignación-de-capital-y-estrategia-de-crecimiento)
5. [Arquitectura de Producto de Extremo a Extremo y Experiencia del Usuario](#5-arquitectura-de-producto-de-extremo-a-extremo-y-experiencia-del-usuario)
6. [Modelo de Seguridad Criptográfica de Autocustodia](#6-modelo-de-seguridad-criptográfica-de-autocustodia)
7. [Hoja de Ruta Estratégica de Ejecución (Roadmap)](#7-hoja-de-ruta-estratégica-de-ejecución-roadmap)
8. [Nota sobre la Arquitectura de Inteligencia Financiera Híbrida](#8-nota-sobre-la-arquitectura-de-inteligencia-financiera-híbrida)

---

## 1. Visión General y Oportunidad de Mercado (Pitch)

### El Problema
En América Latina y en los mercados emergentes, la continua devaluación monetaria, la inflación crónica y las comisiones bancarias tradicionales erosionan drásticamente el poder adquisitivo y el ahorro de la población. El acceso a divisas duras y estables (como el Dólar Estadounidense) está obstaculizado por requisitos de saldos mínimos prohibitivos, trámites burocráticos de cambio o costosos canales de remesas que cobran entre el 5% y el 12% por transferencia.

Al mismo tiempo, las soluciones Web3 habituales presentan barreras insalvables para el usuario común:
* **Fricción del Token de Gas:** La necesidad de adquirir, custodiar y calcular saldos en criptoactivos volátiles (como ETH) solo para realizar una transferencia básica en stablecoins.
* **Gestión Compleja de Claves:** Frases semilla de 12 o 24 palabras que, ante el menor descuido, derivan en la pérdida irrecuperable de los activos.
* **Interfaces Intimidantes:** Pantallas saturadas de caracteres hexadecimales, parámetros de gas incomprensibles y tolerancias de deslizamiento.
* **Envenenamiento de Direcciones (Address Poisoning):** Ataques on-chain donde actores fraudulentos generan direcciones con los mismos primeros y últimos caracteres para engañar al usuario al pegar desde el portapapeles.

### La Solución: CofreAdmin Wallet
**CofreAdmin** supera esta brecha mediante un **Sistema Operativo de Finanzas Personales Web3 Autocustodial**, distribuido como una Progressive Web App (PWA) de alto rendimiento. Combina la sencillez de una aplicación bancaria cotidiana con la soberanía financiera y la seguridad criptográfica absoluta de las finanzas descentralizadas.

Diseñado de forma nativa sobre **Base L2 (Coinbase)** y liquidado en **USDC Nativo de Circle**, CofreAdmin permite a usuarios cotidianos, profesionales autónomos y microempresas ahorrar, planificar gastos, pagar y cobrar en moneda fuerte con liquidación sub-céntrica en fracciones de segundo y gestión de gas invisible.

---

## 2. Fundación de Red y Token (Base L2 y USDC Nativo)

| Pilar del Ecosistema | Detalles de Implementación | Beneficio para el Usuario y Protocolo |
| :--- | :--- | :--- |
| **Rollup Layer-2** | **Base L2** (`Chain ID: 8453`) | Confirmación en fracciones de segundo y costes de red mínimos (< $0.005 USD) con tecnología OP Stack anclada a Ethereum. |
| **Activo de Liquidación** | **USDC Nativo** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) | Dólar digital con respaldo del 100% en reservas auditadas emitido por Circle; plenamente líquido y canjeable 1:1 con USD. |
| **Ejecución Sin Gas ETH** | **EIP-3009** (`transferWithAuthorization`) | Los usuarios firman la autorización localmente sin gastar gas. La tarifa de red es patrocinada y liquidada directamente en USDC. |
| **Tesorería del Protocolo** | `0xc143C3A4106B3aE36b43D69807fa5D79d92419aF` | Bóveda pública auditada en hardware que recibe de forma automática la microtarifa del protocolo. |

### ¿Por qué Base L2 y USDC Nativo?
* **Cero Volatilidad de Gas:** Mediante el patrocinio EIP-3009, el usuario nunca necesita adquirir ETH.
* **Seguridad Institucional y Cumplimiento:** Frente a tokens sintéticos o puenteados (wrapped), el USDC Nativo de Circle ofrece atestaciones mensuales públicas y reservas segregadas.
* **Instalación Directa (PWA):** Sin comisiones de tiendas de aplicaciones, sin extensiones de navegador y sin barreras de censura. Se instala directamente en la pantalla de inicio del dispositivo.

---

## 3. Modelo de Negocio y Mecánica de Ingresos

CofreAdmin combina utilidad financiera práctica y monetización on-chain automatizada para sostener un modelo de ingresos recurrente y escalable:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 MOTOR DE INGRESOS RECURRENTES ESTRUCTURADO                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│   MICROTARIFA DEL PROTOCOLO  │              │    SPREAD EN PASARELAS       │
│    (Activa en versión 1.0.6) │              │    FIAT (RAMPAS ON/OFF)      │
│                              │              │                              │
│ • 0.20% por envío externo    │              │ • Spread competitivo del     │
│ • Suelo mínimo de $0.05 USD  │              │   0.5% al 1.2% vía Pix/SPEI  │
│ • Enrutamiento directo al    │              │ • Integración con APIs       │
│   Cofre de Tesorería         │              │   institucionales reguladas  │
└──────────────────────────────┘              └──────────────────────────────┘
```

1. **Microtarifa por Transferencia (Activa):** Cada envío externo en Base L2 aporta un **0.20% (con un mínimo fijo de $0.05 USD)** directamente a la tesorería (`0xc143C3A4106B3aE36b43D69807fa5D79d92419aF`), garantizando un crecimiento lineal con el volumen transferido.
2. **Pasarelas Fiat On/Off Ramp (Fase 3 de la Hoja de Ruta):** Monetización mediante spread cambiario competitivo en la conversión de moneda local (Pix en Brasil, SPEI en México, PSE en Colombia) a USDC autocustodiado.
3. **Licenciamiento Institucional y Marca Blanca (Visión Futura):** Integración con cooperativas y entidades financieras locales que busquen ofrecer bóvedas de ahorro en dólares a sus clientes mediante nuestra infraestructura.

> Los detalles completos del esquema de tarifas y verificación on-chain se encuentran en la **[Guía de Transparencia Pública y Modelo Económico](../transparency/transparency-es-ES.md)**.

---

## 4. Asignación de Capital y Estrategia de Crecimiento

Los fondos obtenidos por CofreAdmin se distribuyen estratégicamente en cuatro pilares de crecimiento:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ESTRUCTURA DE ASIGNACIÓN DE CAPITAL                     │
├────────────────────────┬────────────────────────┬───────────────────────────┤
│ 35% Producto y Segur.  │ 30% Crecimiento        │ 25% Operaciones y Fundad. │
│ Auditorías y Blindaje  │ Adquisición y Regional │ Entrega de Hitos Clave    │
├────────────────────────┴────────────────────────┴───────────────────────────┤
│ 10% Asuntos Jurídicos, Estructuración Regulatoria y Cumplimiento            │
└─────────────────────────────────────────────────────────────────────────────┘
```

* **35% — Producto, Infraestructura y Seguridad:** Auditorías independientes de contratos inteligentes y código, pruebas de penetración, clústeres de retransmisión redundantes e integración de rampas fiat institucionales.
* **30% — Adquisición de Usuarios y Expansión:** Campañas de crecimiento en mercados con alta demanda de dolarización en América Latina y colaboraciones con el ecosistema Base.
* **25% — Equipo Principal y Ejecución:** Retribución para asegurar el enfoque total de los fundadores e ingenieros clave en la consecución secuencial de los hitos técnicos.
* **10% — Marco Jurídico y Cumplimiento:** Estructuración legal para distribución de software no custodial, cumplimiento de normativas de datos (LGPD/GDPR) y acuerdos regulatorios.

---

## 5. Arquitectura de Producto de Extremo a Extremo y Experiencia del Usuario

```
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   1. ENTRADA SIN FRICCIÓN  │  ───> │   2. WEB3 INVISIBLE Y      │  ───> │   3. PAGOS VERIFICADOS     │
│      Y ONBOARDING          │       │      AUTOCUSTODIA          │       │      Y ESCUDO ANTI-POISON  │
│ • Acceso unificado en 1-cl │       │ • WebCrypto en Navegador   │       │ • Patrocinio EIP-3009      │
│ • Modo Invitado Inmediato  │       │ • 3 Generaciones Criptogr. │       │ • Distintivo Anti-Poison   │
│ • Instalación Directa PWA  │       │ • Biometría / PIN WebAuthn │       │ • Consulta Basenames y ENS │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
                                                                                        │
                                                                                        ▼
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   6. SOBERANÍA DE DATOS    │  <─── │   5. ANALÍTICA HÍBRIDA     │  <─── │   4. BÓVEDAS INTELIGENTES  │
│      Y BORRADO AUDITADO    │       │      Y CONTROL FINANCIERO  │       │      Y AHORRO EN DÓLARES   │
│ • Exportación Clave Priv.  │       │ • Libro Mayor Determinista │       │ • Bóvedas por Objetivos    │
│ • Copias Cifradas Locales  │       │ • Clasificación en 1-Toque │       │ • Saldo Disponible vs Bóv. │
│ • Recibo Auditado LGPD     │       │ • Consejos Consultivos     │       │ • Metas y Logros           │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
```

> El detalle paso a paso de la experiencia se encuentra en el **[Flujo de Producto y Experiencia del Usuario](../product-flow/product-flow-es-ES.md)**.

---

## 6. Modelo de Seguridad Criptográfica de Autocustodia

CofreAdmin opera bajo una estricta **Arquitectura No Custodial de Conocimiento Cero (Zero-Knowledge)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             ENCLAVE CRIPTOGRÁFICO CLIENT-SIDE (EN EL NAVEGADOR)             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Contraseña del Usuario / Biometría del Dispositivo                         │
│       │                                                                     │
│       ▼                                                                     │
│  Derivación PBKDF2 (100.000 iteraciones, Sal Única del Dispositivo, SHA-256)│
│       │                                                                     │
│       ▼                                                                     │
│  Clave de Descifrado AES-GCM de 256 bits (En Memoria RAM Transitoria)       │
│       │                                                                     │
│       ▼                                                                     │
│  Clave Privada Real (Nunca abandona el navegador ni se envía al servidor)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Aislamiento de Claves Zero-Knowledge:** La clave privada se genera y procesa exclusivamente en el entorno local del navegador mediante la Web Crypto API. Nunca se transmite por la red ni se aloja en servidores centralizados.
2. **Agilidad Criptográfica de 3 Generaciones:**
   * **Generación 1 (Legada):** Compatibilidad básica de almacenamiento local.
   * **Generación 2 (PBKDF2 + AES-GCM 256):** Derivación robusta con 100.000 iteraciones y sal aleatoria vinculada al dispositivo.
   * **Generación 3 (Enclave Biométrico):** Protección con credenciales biométricas por hardware mediante WebAuthn (Touch ID, Face ID o PIN del sistema).
3. **Escudo Visual Doble Anti-Poisoning:** Detección visual y resaltado en alto contraste de los primeros 6 y últimos 4 caracteres de las direcciones de destino, neutralizando ataques de sustitución en el portapapeles.
4. **Registro de Auditoría de Borrado Legal (`legalAuditArchive`):** Cumplimiento riguroso del Artículo 17 del GDPR y el Artículo 18 de la LGPD, generando un comprobante criptográfico inmutable que certifica el borrado seguro de la cuenta sin almacenar información sensible.

---

## 7. Hoja de Ruta Estratégica de Ejecución (Roadmap)

| Fase / Estado | Horizonte Temporal | Hitos Principales y Entregables | Dependencia Primaria |
| :--- | :--- | :--- | :--- |
| **Fase 1: Fundación y UX** | **Completada (v1.0.6)** | • Billetera funcional en USDC Nativo sobre Base L2.<br>• Motor de pagos con gas patrocinado EIP-3009.<br>• Bóvedas temáticas de ahorro y libro mayor sincronizado sin conexión.<br>• Escudo visual contra address poisoning y resolución Basenames/ENS. | Autofinanciación / Ingeniería Interna |
| **Fase 2: Financiación y Alianzas** | **En Progreso (Activa)** | • Solicitud de subvenciones en el ecosistema Base y la Superchain de Optimism.<br>• Rondas de presentación a inversores privados y ángeles.<br>• Validación técnica y comercial con proveedores institucionales de rampas fiat. | Ronda de Financiación Estratégica |
| **Fase 3: Infraestructura y Rampa Fiat** | **Tras Inyección de Capital** | • **Rampas automatizadas de conversión instantánea de fiat a USDC (Pix en Brasil, SPEI en México).**<br>• Evaluación de abstracción de cuentas (ERC-4337) y respaldo cifrado multidispositivo.<br>• **Motor Híbrido de Inteligencia Financiera y Análisis de Gastos** (categorización automática de gastos, proyecciones de liquidez y métricas personalizadas). | Inyección Inicial de Capital |
| **Fase 4: Escala, Seguridad y Rendimiento** | **Tras Fase 3** | • Auditorías exhaustivas e independientes de contratos inteligentes y de la aplicación.<br>• Módulos opcionales de rendimiento no custodial conectando bóvedas a protocolos DeFi auditados en Base (ej: Aave, Compound).<br>• Campañas de crecimiento a gran escala en los principales centros urbanos de América Latina. | Finalización de Auditorías de Fase 3 |
| **Fase 5: Expansión Global Emergente** | **Visión a Largo Plazo** | • Expansión a otros mercados latinoamericanos con alta demanda de dolarización (Colombia, Argentina) y regiones emergentes.<br>• Múltiples pasarelas fiat y APIs empresariales de marca blanca. | Flujo de Caja Positivo / Serie A |

---

## 8. Nota sobre la Arquitectura de Inteligencia Financiera Híbrida

> ### ⚖️ Nota sobre la Arquitectura de Inteligencia Financiera Híbrida
> En una aplicación que gestiona **dinero real, criptografía de autocustodia y patrimonio financiero**, la ejecución de operaciones debe ser absoluta, determinista y auditable sin ambigüedades.
>
> Por esta razón, CofreAdmin aplica con rigor una **Arquitectura Híbrida**:
> * **Capa de Ejecución 100% Determinista:** Toda transferencia de fondos, comprobación de saldos, firma de autorización EIP-3009, derivación de claves criptográficas y asignación de fondos a bóvedas está regida exclusivamente por algoritmos deterministas, heurísticas basadas en reglas estrictas y contratos inteligentes auditados en la cadena de bloques.
> * **Capa de Inteligencia Exclusivamente Consultiva:** Los modelos predictivos, las heurísticas de categorización y los diagnósticos financieros operan **únicamente en un nivel informativo y de asesoramiento** (ej: detección de hábitos de gasto, categorización de gastos y sugerencias de ritmo presupuestario).
>
> **Principio Fundamental:** En ningún caso se otorga autonomía de ejecución financiera directa a modelos de inteligencia probabilística. Esta separación arquitectónica suprime de raíz los riesgos de alucinaciones algorítmicas, bucles de transacción imprevistos o ejecuciones de fondos no autorizadas, salvaguardando la integridad fiduciaria de los usuarios.

> 💡 **Notas Operativas y Estratégicas:**
> * **Infraestructura de Pagos:** Pix (Brasil) opera como motor regional prioritario de conversión fiat a USDC. Integraciones con pasarelas reguladas de terceros se expandirán a rieles latinoamericanos y globales (SPEI en México, PSE en Colombia, tarjetas y transferencias).
> * **Hoja de Ruta Dinámica:** Este cronograma es dinámico; la secuencia de hitos e integraciones evoluciona de forma adaptativa según condiciones del mercado, avances regulatorios y optimizaciones de seguridad y UX.

---

🎮 Discord: `@cofreadmin` • 📧 Correo: [soporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Abierto: AGPL-3.0-or-later
