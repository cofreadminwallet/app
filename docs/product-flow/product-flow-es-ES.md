# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Flujo de Producto de Extremo a Extremo & Experiencia de Usuario • Visión Técnica & para Inversores <br>
> Versión: **v1.0.6** • Distribuido bajo la **Apache License, Version 2.0 (Apache-2.0)**.

🌐 **Idiomas:** **[English](product-flow.md)** • **[Português](product-flow-pt-BR.md)** • **[Español](product-flow-es-ES.md)** • **[简体中文](product-flow-zh-Hans.md)**

---

## 🔄 El Ciclo de Vida del Producto en 6 Etapas

```
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   1. ENTRADA SIN FRICCIÓN  │  ───> │   2. WEB3 INVISIBLE &      │  ───> │   3. PAGOS Y COBROS        │
│      E IDENTIDAD ÚNICA     │       │      AUTOCUSTODIA          │       │      FLUIDOS (PAGOS)       │
│ • Acceso Social en 1 Toque │       │ • AES-GCM 256 en Cliente   │       │ • Escáner QR de Cámara y 0x│
│ • Correo Unificado Multi-ID│       │ • Agilidad Multi-Generación│       │ • Basenames y ENS Resolver │
│ • Modo Invitado Offline    │       │ • Biometría WebAuthn / PIN │       │ • Badges Anti-Envenenamient│
│ • PWA (0% tarifas de tienda│       │ • Barrido On-Chain (Sweep) │       │ • Gas en USDC (EIP-3009)   │
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
                                                                                        │
                                                                                        ▼
┌────────────────────────────┐       ┌────────────────────────────┐       ┌────────────────────────────┐
│   6. PRIVACIDAD, SOBERANÍA │  <─── │   5. LIBRO MAYOR &         │  <─── │   4. BÓVEDAS INTELIGENTES  │
│      Y BORRADO LEGAL       │       │      EXTRACTO INTELIGENTE  │       │      Y AHORRO EN DÓLARES   │
│ • Modo Privacidad Rápida   │       │ • Categorización en 1 Toque│       │ • Arquitectura Doble Saldo │
│ • Exportación Clave Privada│       │ • Memos Humanos y Etiquetas│       │ • Bóvedas Temáticas        │
│ • Nube Segura Multi-Tenant │       │ • Anillo Presupuesto Diario│       │ • Celebración con Confeti  │
│ • Borrado LGPD / GDPR      │       │ • Informes PDF/CSV Fiscales│       │ • Rescate Inmediato 0 Coste│
└────────────────────────────┘       └────────────────────────────┘       └────────────────────────────┘
```

---

## 🔎 Desglose Detallado Etapa por Etapa

### 1. Entrada sin Fricción & Identidad Unificada
* **El Problema:** El acceso convencional en Web3 obliga al usuario a memorizar frases semilla de 12 a 24 palabras, instalar extensiones externas o genera perfiles fragmentados y duplicados al alternar entre proveedores sociales.
* **La Experiencia CofreAdmin:**
  * **Onboarding Social en 1 Toque:** Los usuarios inician sesión con sus cuentas de Google o Discord en menos de 3 segundos.
  * **Identidad Unificada por Correo Verificado (Novedad v1.0.6):** Si un usuario entra mediante Google y posteriormente mediante Discord usando el mismo correo verificado, CofreAdmin consolida automáticamente el acceso bajo una única identidad legal. La dirección de billetera en la cadena, los documentos en la nube (`userData`), las bóvedas y el historial de transacciones se mantienen unificados sin duplicidades, solicitudes repetidas de términos ni sobreescrituras accidentales.
  * **Modo Invitado / Offline:** Permite probar toda la aplicación sin registro previo; los datos y la billetera se inicializan 100% de forma local en la memoria del navegador (`localStorage` e IndexedDB).
  * **Experiencia Nativa PWA:** Elimina las comisiones del 30% de Apple y Google y los riesgos de censura. Se instala directamente en la pantalla de inicio de iOS y Android con caché sin conexión, accesos directos y fluidez a 60 FPS.

### 2. Web3 Invisible & Agilidad Criptográfica
* **El Problema:** Los usuarios sin conocimientos técnicos pierden frases semilla, caen en ataques de phishing o quedan atrapados en esquemas criptográficos obsoletos sin ruta de actualización segura.
* **La Experiencia CofreAdmin:**
  * **Criptografía en Tiempo Real:** Las claves privadas EVM se derivan en el navegador mediante la Web Crypto API y se protegen en reposo mediante **cifrado de sobre AES-GCM de 256 bits**.
  * **Cero Riesgo de Custodia:** Los servidores de CofreAdmin jamás reciben, transmiten ni retienen claves privadas ni fondos de los usuarios.
  * **Motor de Agilidad Criptográfica Multi-Generación (`v1` → `v2` → `v3`):**
    * *v1 (Heredado):* Derivación estándar en texto plano para compatibilidad retroactiva.
    * *v2 (Sobre Encriptado):* Cifrado AES-GCM de 256 bits reforzado con derivación PBKDF2 (100,000 iteraciones).
    * *v3 (Hardware-Bound):* Claves no extraíbles Web Crypto API resguardadas en particiones protegidas de IndexedDB.
    * *Barrido On-Chain en 1 Clic (Sweep):* Permite a los usuarios migrar la totalidad de sus fondos entre generaciones de claves en una única transacción atómica en la cadena.
  * **PIN Táctil de 4 Dígitos & Biometría WebAuthn:** Las operaciones críticas (firmas, consulta de claves, transferencias elevadas) solicitan biometría nativa (Face ID, Touch ID, Windows Hello) o un teclado numérico táctil y aleatorizado inspirado en Trust Wallet.

### 3. Pagos Fluidos, Red Base & Protección Anti-Envenenamiento
* **El Problema:** Enviar cripto requiere poseer tokens nativos volátiles para gas (ETH), calcular comisiones en Gwei, sufrir ataques de sustitución de direcciones en el portapapeles y verificar 42 caracteres hexadecimales ilegibles.
* **La Experiencia CofreAdmin:**
  * **Infraestructura Base L2:** Tarifas de red inferiores al centavo de dólar y confirmación en bloque ultrarrápida de 2 segundos gracias a la Layer 2 de Coinbase sobre Ethereum.
  * **Gas Patrocinado en USDC (Sin Necesidad de ETH):** Con el estándar EIP-3009 y la abstracción de Circle Paymaster, las microtarifas se descuentan directamente de la fracción de USDC. Los usuarios no necesitan comprar ni puentear ETH.
  * **Protección Visual Anti-Envenenamiento de Portapapeles (Novedad v1.0.6):** Badges visuales de alto contraste destacan los **primeros 6** (`0x1234`) y los **últimos 4** (`5678`) caracteres de la dirección de destino junto a un sello anti-manipulación, alertando al instante sobre cualquier intento de suplantación.
  * **Resolución de Basenames (`.base.eth`) & ENS (`.eth`):** Permite escribir nombres legibles en lugar de códigos hexadecimales, con comprobación automática contra caracteres homógrafos.
  * **Escáner QR con Cámara Nativa:** Lee formatos estándar Web3, URIs de pago EIP-681 y solicitudes de cobro sin salir de la app.
  * **Conversión de Divisas en Vivo:** Oráculos en tiempo real muestran saldos y transferencias simultáneamente en dólares digitales ($ USDC) y en moneda local (ej.: € EUR, R$ BRL, $ MXN).
  * **Protección contra Fraudes de Alto Valor:** Toda transferencia superior a $100 USDC activa una cuenta atrás de seguridad de 3 segundos y confirmación secundaria para prevenir descuidos.
  * **Tarjetas de Cobro Compartibles:** Genera tarjetas con código QR de alto contraste y comprobación EIP-55, listas para descargar en PNG o compartir directamente por WhatsApp o mensajería.

### 4. Bóvedas Inteligentes & Psicología de Ahorro en Dólares
* **El Problema:** Las billeteras tradicionales muestran un único saldo consolidado, lo que fomenta el gasto impulsivo y desarticula las metas de ahorro.
* **La Experiencia CofreAdmin:**
  * **Arquitectura de Saldo Segregado:** Clara diferenciación entre **Saldo Libre Disponible** (para uso cotidiano) y **Saldo Bloqueado en Bóvedas** (protegido frente a compras impulsivas).
  * **Metas de Ahorro Temáticas:** Bóvedas personalizadas (Fondo de Emergencia, Vacaciones, Nueva Laptop, Coche, Educación) con plazos límite e iconos emoji representativos.
  * **Ludificación Positiva:** Flujos de depósito y retiro acompañados de barras de avance estilo neo-brutalista y lluvia de confeti al alcanzar el 100% de la meta.
  * **Rescate Inmediato de Emergencia:** Los fondos se pueden reincorporar al saldo libre en cualquier momento con un solo toque, sin penalizaciones, comisiones ni periodos de bloqueo.

### 5. Libro Mayor & Extracto Inteligente
* **El Problema:** Los exploradores de bloques muestran listas crípticas de códigos alfanuméricos (`0x3f8a...`) sin contexto humano, etiquetas claras ni desglose apto para contabilidad.
* **La Experiencia CofreAdmin:**
  * **Indexación Automática en la Cadena:** Los depósitos y envíos on-chain en Base se registran y sincronizan en tiempo real.
  * **⚡ Categorización Rápida en 1 Toque vía Notificación (Novedad v1.0.6):** Al recibir un cobro en USDC, surge un banner interactivo en la parte superior. El usuario puede asignarle una categoría (*Freelance*, *Sueldo*, *Inversión*, *Venta*) con un solo toque directo en la notificación, sin entrar al extracto.
  * **Identificación Humana de Movimientos:** Posibilidad de asociar notas descriptivas a cualquier transacción (ej.: *"Cena con amigos"*, *"Pago de diseño freelance"*, *"Supermercado"*).
  * **Motor de Categorización con Badges de Color:** Organización ágil de ingresos y gastos mediante etiquetas visuales.
  * **Exclusión Suave de Movimientos Internos:** Permite ocultar transferencias internas de los totales estadísticos sin alterar el registro inmutable de la blockchain.
  * **Monitor de Presupuesto Diario:** Anillo de ritmo de consumo que ayuda a no sobrepasar el límite diario establecido.
  * **Informes en PDF y CSV Aptos para Contabilidad:** Exportación en un clic de estados financieros normalizados listos para auditoría o declaraciones fiscales.

### 6. Modo Privacidad Rápida, Soberanía de Datos & Borrado Legal
* **El Problema:** Consultar saldos en espacios públicos expone el patrimonio a miradas indiscretas (*shoulder surfing*); los servicios en la nube retienen la información sin respetar la soberanía del usuario.
* **La Experiencia CofreAdmin:**
  * **👁️ Modo Privacidad Rápida ("Protección contra Miradas Indiscretas"):** Un toque en el icono de ojo en la cabecera enmascara al instante todas las cifras monetarias del panel (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard` y `ActiveVaultsPreview`) con puntos (`••••••`).
  * **Arquitectura Híbrida Local y Nube Multi-Tenant:** Modelo local-first en IndexedDB/localStorage para máxima velocidad a 60 FPS, junto a sincronización aislada por usuario en Firestore para cuentas registradas.
  * **Propiedad Web3 Portable:** Los usuarios pueden exportar su clave privada íntegra y descifrada en cualquier instante (requiriendo biometría o PIN) para migrar a MetaMask, Rabby o billeteras frías.
  * **Certificado de Autocustodia & Borrado en 1 Clic:** La eliminación de cuenta borra definitivamente todos los registros de la nube (`userData`) y del almacenamiento local. A su vez, genera un certificado criptográfico inmutable (`legalAuditArchive`) que acredita la fecha y el descarte legal conforme al GDPR (Art. 17), LGPD (Art. 16/18) y CCPA/CPRA.

---

## 📊 Matriz Competitiva: Por Qué CofreAdmin Gana

| Funcionalidad / Experiencia | Neobancos Tradicionales | Billeteras Web3 Comunes | **CofreAdmin v1.0.6** |
| :--- | :---: | :---: | :---: |
| **Autocustodia (Eres dueño de las claves)**| ❌ No (Riesgo de custodia bancaria) | ✅ Sí | **✅ Sí (AES-256 en cliente con Web Crypto)** |
| **Acceso Inmediato (Sin Frases Semilla)** | ✅ Sí | ❌ No (Barrera de 12-24 palabras) | **✅ Sí (1 Toque Social / 1 Toque Invitado)** |
| **Identidad Unificada Multi-Proveedor** | ❌ No (Cuentas separadas) | ❌ No (Solo dirección) | **✅ Sí (Correo Unificado Google + Discord)** |
| **Experiencia con Comisiones de Gas** | N/A (Comisiones ocultas) | ❌ Requiere saldo en ETH nativo | **✅ Pagado de forma nativa en USDC (EIP-3009)**|
| **Protección Anti-Envenenamiento Portapapeles**| N/A | ❌ Vulnerable a programas espía | **✅ Badges de alto contraste inicio y final** |
| **Resolución de Basenames & ENS** | ❌ No | ⚠️ Parcial (Solo ENS) | **✅ Basenames y ENS con validación anti-fraude**|
| **Modo Privacidad Rápida (Anti-Espías)** | ⚠️ Básico | ❌ Poco frecuente en Web3 | **✅ Enmascaramiento simultáneo en el panel** |
| **PWA (Sin Bloqueo de Tiendas de Apps)** | ❌ No (Solo tiendas nativas) | ❌ No (Extensión o app tienda) | **✅ Sí (Web App Universal fluida a 60 FPS)** |
| **Motor de Agilidad Criptográfica** | ❌ No | ❌ Derivación fija sin evolución | **✅ 3 Generaciones (v1-v3) + Sweep On-Chain** |
| **Bóvedas en Dólares & Metas Gamificadas** | ⚠️ Parcial (Moneda local) | ❌ No (Saldo único acumulado) | **✅ Bóvedas nativas segregadas en USDC** |
| **Libro Mayor Humano & Memos** | ✅ Sí | ❌ Solo hashes alfanuméricos | **✅ Memos, etiquetas y categorías humanas** |
| **Categorización en 1 Toque en Alertas** | ❌ No | ❌ No | **✅ Directo en el aviso de depósito recibido** |
| **Cotización en Vivo Divisa Local / USDC** | ❌ No | ⚠️ Básico (Solo USD) | **✅ Conversión activa Divisa Local ⇄ USDC** |
| **Exportación de Informes en PDF y CSV** | ✅ Sí | ❌ Exige herramientas externas | **✅ Exportación nativa en 1 clic** |
| **Certificado Criptográfico de Borrado Legal**| ❌ No | ❌ No | **✅ Certificado legal auditado GDPR/LGPD** |

---
🎮 Discord: `@cofreadmin` • 📧 Correo: [soporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Abierto: Apache-2.0
