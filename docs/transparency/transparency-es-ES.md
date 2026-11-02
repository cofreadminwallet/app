# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Guía de Transparencia Pública & Modelo Económico • Visión Técnica & para Inversores <br>
> Versión: **v1.0.6** • Distribuido bajo la **Licencia Pública General de Affero de GNU v3.0 o posterior (AGPL-3.0-or-later)**.

🌐 **Idiomas:** **[English](transparency.md)** • **[Português](transparency-pt-BR.md)** • **[Español](transparency-es-ES.md)** • **[简体中文](transparency-zh-Hans.md)**

---

## 📑 Estructura del Documento
1. [Flujo de Tokens y Liquidez (EIP-3009)](#1-flujo-de-tokens-y-liquidez)
2. [Infraestructura Institucional & Pila Tecnológica](#2-infraestructura-institucional--pila-tecnológica)
3. [Garantías de Autocustodia & Privacidad](#3-garantías-de-autocustodia--privacidad)
4. [Modelo de Negocio Sostenible & Mecánica de Ingresos](#4-modelo-de-negocio-sostenible--mecánica-de-ingresos)
5. [Auditabilidad, Cumplimiento & Estándares Regulatorios](#5-auditabilidad-cumplimiento--estándares-regulatorios)
6. [Contactos Oficiales & Verificación](#6-contactos-oficiales--verificación)

---

## 1. Flujo de Tokens y Liquidez

CofreAdmin opera bajo un **modelo de flujo directo, descentralizado y no custodial** anclado en la red Base (Layer 2 de Ethereum desarrollada por Coinbase). Los fondos transaccionados jamás pasan por la custodia intermedia de los desarrolladores:

```
[ Usuario Remitente (Navegador Cliente) ]
              │
              │ 1. Firma la autorización de transferencia EIP-3009 localmente (v, r, s)
              ▼
[ Relayer Dispatcher / Paymaster ]
              │
              │ 2. Envía la transacción atómica a Base blockchain usando Gas del Relayer
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Contrato Oficial de USDC de Circle en Base:                 │
│ Dirección: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913      │
│                                                             │
│ ├──> [99,8% Importe Neto]       ──> Dirección del Receptor  │
│ ├──> [0,2% Microtarifa Protocol]──> Billetera Tesorería Dev │
│ └──> [Reembolso de Tarifa Gas]  ──> Pool de Gas del Relayer │
└─────────────────────────────────────────────────────────────┘
```

### Garantías Inviolables del Flujo:
1. **Cero Retención de Liquidez:** Todas las transferencias de USDC se ejecutan directamente desde la dirección del remitente hacia la dirección del destinatario. La liquidación ocurre de forma atómica en un único bloque mediante el contrato inteligente oficial y auditado de Circle.
2. **Abstracción Total de Gas (Sin Necesidad de ETH):** Los usuarios operan 100% en dólares digitales (USDC). Las microcomisiones de red se reembolsan al relayer directamente de la fracción del importe de USDC transferido mediante firmas EIP-3009, eliminando la necesidad de adquirir o gestionar ETH.
3. **División Automatizada e Inmutable:** La microtarifa del protocolo (0,2%, con un mínimo de $0.05 USD) se redirige de forma transparente e inmediata a la tesorería del proyecto, sin intervención manual ni discrecional.

---

## 2. Infraestructura Institucional & Pila Tecnológica

CofreAdmin se fundamenta en proveedores institucionales y estándares consolidados del ecosistema global:

| Componente | Proveedor Oficial / Estándar | Función Técnica & Operativa |
| :--- | :--- | :--- |
| **Blockchain Layer 2** | **Base (Coinbase)** | Alto rendimiento, comisiones inferiores al centavo de dólar y confirmación de bloque en 2 segundos con seguridad Ethereum L1. |
| **Moneda de Liquidación** | **Circle (USDC)** | Dólar digital regulado, respaldado 1:1 en reservas financieras reales con soporte nativo de EIP-3009. |
| **Contrato Oficial USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Dirección oficial canónica del contrato USDC en la red Base. |
| **Motor Web3 en Cliente** | **Viem & Wagmi** | Bibliotecas TypeScript de alto rendimiento para derivación de cuentas EVM y firmas type-safe. |
| **Autenticación Biométrica**| **WebAuthn / W3C Passkeys** | Validación por hardware en el dispositivo del usuario (Face ID, Touch ID, Biometría Android, Windows Hello). |
| **Seguridad de PIN** | **Teclado Táctil Aleatorizado** | Procesamiento local con hash SHA-256 con salt de hardware y desorden dinámico contra miradas espía. |
| **Resolución de Nombres** | **Basenames (`.base.eth`) & ENS (`.eth`)** | Resolución on-chain en tiempo real de nombres legibles con protección contra ataques homógrafos. |
| **Protección Anti-Envenenamiento**| **Badges de Alto Contraste** | Resalte visual de los segmentos inicial (`0x1234`) y final (`5678`) de la dirección para neutralizar malwares de portapapeles. |
| **Explorador Blockchain** | **BaseScan / Blockscout** | Auditoría pública e inmutable de transacciones con conciliación del extracto en tiempo real. |
| **Oráculo de Tipo de Cambio**| **Coinbase Spot API** | Cotización oficial continua de mercado para paridades USD, EUR, BRL y GBP. |
| **Nube Multi-Tenant** | **Google Cloud Firestore** | Almacenamiento en la nube aislado por usuario (`userData`) con unificación de identidad por correo verificado. |

---

## 3. Garantías de Autocustodia & Privacidad

### A. Autocustodia Real (Cero Custodia en Servidores)
* **Derivación en el Cliente:** Las claves privadas EVM se generan íntegramente en el navegador del usuario mediante la Web Crypto API.
* **Cifrado de Sobre en Reposo:** Las claves se resguardan localmente mediante **cifrado AES-GCM de 256 bits** vinculado a una clave maestra del dispositivo.
* **Agilidad Criptográfica Multi-Generación (`v1` → `v2` → `v3`):**
  * *v1:* Derivación estándar en texto simple para compatibilidad hacia atrás.
  * *v2:* Derivación PBKDF2 con 100,000 iteraciones y sobre encriptado AES-GCM.
  * *v3:* Claves Web Crypto API no extraíbles vinculadas al hardware y resguardadas en IndexedDB.
  * *Barrido On-Chain en 1 Clic (Sweep):* Permite a los usuarios migrar todos sus fondos entre generaciones de claves en una única transacción atómica en la cadena.
* **Soberanía y Portabilidad:** El usuario puede exportar su clave privada íntegra y descifrada en cualquier momento (previa validación biométrica o PIN) para migrar a MetaMask, Rabby o billeteras frías.

### B. Modo Privacidad Rápida ("Protección contra Miradas Indiscretas")
* Un toque en el icono de ojo en la cabecera enmascara al instante todas las cifras monetarias del panel (`HeroBalanceCard`, `DailyBudgetCard`, `RecentActivityCard` y `ActiveVaultsPreview`) con puntos (`••••••`).
* Diseñado especialmente para el transporte público, cafeterías y espacios compartidos, evitando la exposición involuntaria del patrimonio.

---

## 4. Modelo de Negocio Sostenible & Mecánica de Ingresos

CofreAdmin opera un motor económico predecible basado en el volumen de transferencias y la utilidad de la plataforma:

### A. Microtarifa de Protocolo On-Chain (0,2%)
* En cada transferencia o pago ejecutado en la red Base, se descuenta una tarifa transparente del **0,2% (con un mínimo de $0.05 USD)** que se envía automáticamente a la tesorería del protocolo (`DEV_TREASURY_WALLET`).
* **Proyección de Escala:**
  * **10,000 Usuarios Activos (MAU)** moviendo $200 USD/mes ($2.0M Volumen Bruto) = **$4,000 USD/mes** en ingresos recurrentes.
  * **50,000 Usuarios Activos (MAU)** moviendo $200 USD/mes ($10.0M Volumen Bruto) = **$20,000 USD/mes** en ingresos recurrentes.
  * **250,000 Usuarios Activos (MAU)** moviendo $350 USD/mes ($87.5M Volumen Bruto) = **$175,000 USD/mes** en ingresos recurrentes.

### B. Spread de Conversión en Pasarelas Fiat (On/Off Ramp)
* Integración con socios regulados de conversión local (ej.: SEPA en Europa, PIX en Brasil) generando una tarifa flotante de conveniencia (spread entre 0.3% y 0.7%) en conversiones de dinero fiduciario a USDC y viceversa.

### C. Soluciones B2B para Comercios y Creadores
* Licenciamiento de widgets de pago personalizados y APIs para tiendas online y creadores de contenido que reciban cobros directos en USDC en la red Base.

---

## 5. Auditabilidad, Cumplimiento & Estándares Regulatorios

### A. Cumplimiento con Normativas Internacionales de Privacidad (GDPR, LGPD, CCPA)
* **Cero Bloqueos de Cuentas Personales:** Arquitectura 100% pública y multi-tenant, sin credenciales privilegiadas ni accesos ocultos.
* **Borrado Definitivo en 1 Clic:** El usuario puede eliminar de manera irrevocable todos sus registros en la nube (`userData`) y en el almacenamiento local.
* **Comprobante Criptográfico de Cumplimiento (`legalAuditArchive`):** En riguroso cumplimiento con las exigencias legales (como el Art. 17 del GDPR europeo y el Art. 16 de la LGPD brasileña), el sistema genera y archiva una constancia criptográfica anónima con marca de tiempo que acredita el descarte legal de la información ante auditorías regulatorias.

### B. Transparencia en Código Abierto
* Código distribuido bajo la licencia **GNU Affero General Public License v3.0 o posterior (AGPL-3.0-or-later)**.
* Cualquier distribución pública con código modificado debe permanecer en código abierto bajo los mismos términos, asegurando la total auditabilidad para la comunidad global.

---

🎮 Discord: `@cofreadmin` • 📧 Correo: [soporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Abierto: AGPL-3.0-or-later

