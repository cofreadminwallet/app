# CofreAdmin Wallet

> <img src="../../public/icon48x48.png" alt="CofreAdmin Logo" width="36" height="36" align="center" /> <br>
> **Self-Custodial Web3 Personal Finance** <br>
> Manual del Usuario Completo • Gestor de Bóvedas en USDC en la Red Base <br>
> Versión: **v1.0.6** • Distribuido bajo la **Licencia Pública General de Affero de GNU v3.0 o posterior (AGPL-3.0-or-later)**.

🌐 **Idiomas:** **[English](user-manual.md)** • **[Português](user-manual-pt-BR.md)** • **[Español](user-manual-es-ES.md)** • **[简体中文](user-manual-zh-Hans.md)**

---

## 📑 Índice Rápido
1. [Instalación de la Aplicación (PWA)](#1--instalación-de-la-aplicación-pwa)
2. [Acceso y Gestión de Cuenta (Google, Discord y Correo Unificado)](#2--acceso-y-gestión-de-cuenta)
3. [Tu Billetera Digital Web3, Tipo de Cambio y Modo de Privacidad Rápida](#3--tu-billetera-digital-web3-tipo-de-cambio-y-modo-de-privacidad-rápida)
4. [Cómo Recibir Fondos (USDC en Base)](#4--cómo-recibir-fondos-usdc-en-base)
5. [Cómo Enviar Pagos, Anti-Envenenamiento y Resolución de Nombres](#5--cómo-enviar-pagos-anti-envenenamiento-y-resolución-de-nombres)
6. [Bóvedas Inteligentes (Ahorros y Metas)](#6--bóvedas-inteligentes-ahorros-y-metas)
7. [Extracto Financiero, Libro Mayor y Categorización en 1 Toque](#7--extracto-financiero-libro-mayor-y-categorización-en-1-toque)
8. [Monitor de Presupuesto Diario](#8--monitor-de-presupuesto-diario)
9. [Panel de Métricas y Gráficos](#9--panel-de-métricas-y-gráficos)
10. [Seguridad, Teclado de PIN, Biometría y Agilidad Criptográfica](#10--seguridad-teclado-de-pin-biometría-y-agilidad-criptográfica)
11. [Personalización, Temas y Notificaciones Push](#11--personalización-temas-y-notificaciones-push)
12. [Privacidad, Cumplimiento Global y Eliminación de Cuenta](#12--privacidad-cumplimiento-global-y-eliminación-de-cuenta)
13. [Preguntas Frecuentes (FAQ)](#13--preguntas-frecuentes-faq)

---

## 1. 📲 Instalación de la Aplicación (PWA)

CofreAdmin está desarrollado como una **Aplicación Web Progresiva (PWA)** de última generación, brindando el rendimiento y la fluidez de una app nativa sin las restricciones de las tiendas de aplicaciones.

### En iPhone / iPad (iOS Safari):
1. Abre el enlace de CofreAdmin en el navegador **Safari**.
2. Pulsa el botón **Compartir** (el icono de un cuadrado con una flecha hacia arriba en la barra de herramientas).
3. Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"**.
4. Confirma pulsando **"Añadir"** en la esquina superior derecha.
5. El icono de CofreAdmin aparecerá en tu pantalla de inicio y se ejecutará a pantalla completa, sin barras de navegación del navegador.

### En Android (Google Chrome):
1. Abre el enlace de CofreAdmin en el navegador **Google Chrome**.
2. Pulsa el aviso inferior **"Instalar aplicación"** o abre el **menú de 3 puntos** en la esquina superior derecha.
3. Elige **"Instalar aplicación"** (o *"Añadir a la pantalla de inicio"*).
4. Confirma la instalación. La aplicación se instalará como una app independiente con accesos directos y compatibilidad con caché sin conexión.

---

## 2. 🔑 Acceso y Gestión de Cuenta

CofreAdmin ofrece múltiples métodos de inicio de sesión pensados para salvaguardar tu privacidad y garantizar un acceso continuo a tus datos:

* 🌐 **Iniciar sesión con Google:** Sincronización en la nube rápida y segura entre tu móvil y tu ordenador mediante la infraestructura en la nube de Firebase.
* 🎮 **Iniciar sesión con Discord:** Acceso ágil con 1 toque adaptado a comunidades Web3 y gamers.
* 🔄 **Unificación de Cuentas por Correo Verificado (Novedad v1.0.6):**
  * Al iniciar sesión mediante Google o Discord utilizando la misma dirección de correo verificada, CofreAdmin reconoce automáticamente tu identidad única.
  * Tus datos, tu dirección de billetera Web3 en la cadena, tu historial de transacciones y tus bóvedas personalizadas se mantienen unificados, sin cuentas duplicadas, pantallas repetidas de términos ni pérdida de información.
* 🕶️ **Modo Invitado (Offline y Privado):** ¿Prefieres probar sin iniciar sesión? Entra como invitado. Todas las claves de la billetera y los registros financieros permanecen estrictamente guardados en el almacenamiento local de tu navegador (`localStorage` e IndexedDB).
* 🚪 **Cierre de Sesión y Cambio de Cuenta:** En la pestaña **Ajustes**, pulsa **"Cerrar sesión"** en cualquier momento para finalizar la sesión activa en pantalla de forma segura.

---

## 3. 💵 Tu Billetera Digital Web3, Tipo de Cambio y Modo de Privacidad Rápida

En el primer uso, CofreAdmin genera una billetera criptográfica **100% autocustodial** que opera directamente en la **red Base (Layer 2 de Ethereum creada por Coinbase)**.

* **Moneda Principal (USDC):** Tu saldo se mantiene en **USD Coin (USDC)**, un dólar digital totalmente respaldado 1:1 por dinero en efectivo y bonos del tesoro de EE. UU.
* **Tipos de Cambio en Tiempo Real:** Visualiza tus fondos en USDC ($) junto a su valor equivalente en tu moneda local (ej.: EUR / €, BRL / R$, MXN / $) actualizado mediante oráculos de cotización en vivo.
* **👁️ Modo de Privacidad Rápida ("Protección contra Miradas Indiscretas"):**
  * Pulsa el **icono de ojo** en la tarjeta de saldo principal para enmascarar instantáneamente las cifras sensibles con puntos (`••••`).
  * El modo de privacidad se sincroniza automáticamente en todo el panel: **Presupuesto Diario**, **Actividad Reciente** y **Bóvedas Activas**.
  * Ideal para revisar tus finanzas en el transporte público, cafeterías o espacios abiertos con total discreción. Pulsa nuevamente para mostrar los números.
* **Saldo Libre vs. Saldo en Bóvedas:**
  * **Saldo Total:** La cantidad total de USDC en tu dirección en la cadena.
  * **Saldo en Bóvedas:** Fondos apartados para tus objetivos y metas financieras.
  * **Saldo Libre Disponible:** Fondos líquidos disponibles para transferencias y gastos inmediatos. ¡Nunca gastarás por error el dinero destinado a tus metas!
* **Cambio de Red:** Alterna entre **Base Mainnet** (activos reales) y **Base Sepolia Testnet** (entorno de pruebas y simulación) directamente desde los Ajustes.

---

## 4. 📥 Cómo Recibir Fondos (USDC en Base)

Recibe dólares digitales de amigos, pagos de servicios o depósitos desde cualquier exchange centralizado (ej.: Binance, Coinbase, Bybit, Kraken, Bitso):

1. En la pantalla de inicio o en la vista de Billetera, pulsa el botón **"Recibir"** 📲.
2. Una ventana interactiva mostrará tu **Código QR Oficial** y tu **Dirección de Billetera en Base** (`0x...`).
3. **Para recibir de otra persona:** Pídele que escanee tu código QR desde su billetera.
4. **Para depositar desde un exchange:**
   * Pulsa **"Copiar Dirección"**.
   * En la sección de retiros de tu exchange, selecciona el activo **USDC** y asegúrate de elegir la red **Base**. *(Advertencia: enviar por redes como Ethereum Mainnet o Polygon puede generar demoras o costes adicionales de recuperación).*
5. **Acreditación Instantánea:** En 2 a 3 segundos, la transacción se confirma en la blockchain de Base y tu saldo se actualiza al instante.

---

## 5. 📤 Cómo Enviar Pagos, Anti-Envenenamento y Resolución de Nombres

Envía dólares digitales a cualquier lugar del mundo en segundos, pagando centavos de dólar en comisiones de red:

1. En la pantalla de inicio, pulsa **"Enviar"** 📤.
2. **Especifica el Destinatario:**
   * **Resolución de Basenames (`.base.eth`) y ENS (`.eth`):** En lugar de pegar largas direcciones hexadecimales, escribe nombres legibles como `alice.base.eth` o `vitalik.eth`. CofreAdmin resuelve la dirección on-chain en tiempo real con validaciones contra clonaciones y caracteres homógrafos.
   * **Dirección Directa:** Pega cualquier dirección EVM válida (`0x...`).
   * **Lector de Códigos QR:** Pulsa el icono de la cámara para escanear el código de la billetera de destino.
3. **🛡️ Protección Visual Anti-Envenenamiento de Portapapeles:**
   * Programas maliciosos a menudo intentan sustituir la dirección copiada por otra parecida en el portapapeles.
   * CofreAdmin resalta con badges de alto contraste los **primeros 6** y los **últimos 4** caracteres, junto a un distintivo de verificación anti-alteración.
   * ¡Revisa siempre estos segmentos destacados antes de confirmar la firma!
4. **⚠️ Aviso de Seguridad para Primer Destinatario:**
   * Al transferir a una dirección con la que nunca antes has interactuado, la app muestra un aviso preventivo para evitar envíos a cuentas equivocadas.
5. **Cero Necesidad de Tener ETH para Gas:**
   * Gracias a la abstracción de gas (EIP-3009) y al Circle Paymaster, **no necesitas tener saldo de ETH**. Las microtarifas de red (habitualmente inferiores a $0.02) se deducen directamente de la fracción de USDC enviada.
6. **Autenticación y Confirmación:**
   * Autoriza la operación mediante biometría (Face ID / Touch ID) o con tu PIN de 4 dígitos.
7. **Comprobante Digital Oficial:**
   * Cada transacción genera un recibo criptográfico con fecha, hora, código identificador (`TxHash`) y un enlace directo para comprobarlo en el explorador público **BaseScan**.

---

## 6. 🎯 Bóvedas Inteligentes (Ahorros y Metas)

Separa tus gastos cotidianos de tus ahorros y proyectos a futuro:

1. Accede a la pestaña **"Bóvedas"** en el menú de navegación inferior.
2. Pulsa **"+ Nueva Bóveda"** 🚀.
3. **Personaliza tu Meta:**
   * Escoge un emoji ilustrativo (✈️ *Vacaciones*, 💻 *Nueva Laptop*, 🚗 *Coche*, 🛡️ *Fondo de Emergencia*).
   * Asigna el importe objetivo en USDC o moneda local.
4. **Deposita y Monitorea:**
   * Pulsa **"Depositar"** para transferir saldo libre a tu bóveda.
   * Observa cómo la barra de progreso avanza hacia el 100%.
5. **Retiros sin Penalización:**
   * ¿Necesitas el dinero de vuelta? Pulsa **"Retirar"** en cualquier momento. Los fondos regresan inmediatamente a tu saldo disponible sin comisiones de salida ni periodos de bloqueo.
6. **Celebración de Metas Cumplidas:**
   * ¡Al completar el 100% de la meta, la aplicación celebra con animación de confeti y una notificación especial de logro!

---

## 7. 📊 Extracto Financiero, Libro Mayor y Categorización en 1 Toque

La vista de **"Extracto"** brinda un control exhaustivo de entradas y salidas:

* **Indexación Blockchain Automática:** Los depósitos y transferencias on-chain en Base se registran automáticamente en tu historial.
* **⚡ Categorización Rápida en 1 Toque vía Notificación (Novedad v1.0.6):**
  * Al recibir un depósito en USDC, aparece un banner inteligente en la parte superior de la pantalla.
  * Asigna la categoría correspondiente (ej.: *Freelance*, *Salario*, *Inversión*, *Venta*) con un solo toque, ¡sin necesidad de abrir la pantalla de extracto!
* **Registros Manuales para Gastos Externos:**
  * Anota compras en efectivo, tarjetas o transferencias bancarias tradicionales pulsando en **"+ Nuevo Registro"**.
  * Indica descripción, importe, fecha y categoría.
* **Búsqueda y Filtros Rápidos:** Filtra movimientos por *Ingresos*, *Gastos* o palabras clave.
* **Exportación de Informe en PDF:**
  * Genera un informe financiero en formato PDF listo para archivar o para control contable, con encabezado profesional y tabla detallada.

---

## 8. ⏱️ Monitor de Presupuesto Diario

Mantén la disciplina de gastos día a día sin necesidad de hojas de cálculo:

1. En la pantalla **Principal**, ubica la tarjeta de **"Presupuesto Diario"**.
2. Pulsa para configurar tu límite de gasto diario deseado (ej.: `$15.00 / día`).
3. Conforme registras gastos durante el día, la barra de progreso refleja tu consumo y te previene antes de exceder tu límite.

---

## 9. 📈 Panel de Métricas y Gráficos

Abre la pestaña **"Análisis"** para comprender la distribución de tus recursos:

* **Gráfico de Gastos por Categoría:** Visualiza en qué conceptos gastas mensualmente (Alimentación, Ocio, Hogar, Servicios).
* **Balance Mensual:** Comparativa visual entre el total de ingresos y gastos del periodo.
* **Tasa de Ahorro:** Porcentaje exacto de tus ingresos que lograste resguardar en dólares dentro de tus bóvedas.

---

## 10. 🛡️ Seguridad, Teclado de PIN, Biometría y Agilidad Criptográfica

CofreAdmin está desarrollado siguiendo un modelo de seguridad por capas:

### 1. Teclado de PIN Táctil de 4 Dígitos y Biometría WebAuthn
* Configura un PIN numérico seguro con nuestro teclado **táctil y aleatorizado** (inspirado en Trust Wallet).
* El PIN se procesa localmente mediante **hash SHA-256 con salt de dispositivo** y nunca sale de tu equipo.
* Activa la **Biometría WebAuthn** (Face ID, Touch ID o Windows Hello) para desbloqueo y confirmación rápida en un toque.

### 2. Motor de Agilidad Criptográfica Multi-Generación (`v1` → `v2` → `v3`)
* **v1 (Heredado):** Derivación estándar en texto simple para compatibilidad y transición suave.
* **v2 (Sobre Encriptado):** Encriptación militar AES-GCM de 256 bits protegida mediante derivación de clave PBKDF2 con 100,000 iteraciones.
* **v3 (Hardware-Bound):** Claves criptográficas no extraíbles Web Crypto API vinculadas al hardware del dispositivo y resguardadas en partición segura IndexedDB.
* **Barrido On-Chain en 1 Clic (Sweep):** Migra y transfiere la totalidad de tus fondos entre generaciones de billetera en una única transacción en la cadena.

### 3. Copia de Seguridad Autocustodial de Clave Privada
* Tu clave privada te pertenece exclusivamente a ti.
* Para respaldarla: Ve a **Ajustes** > **Billetera y Seguridad** > **"Copia de Seguridad de Clave Privada"**.
* Autentícate, copia tu clave criptográfica (`0x...`) y guárdala en un gestor seguro fuera de línea.
* Con esta clave, puedes importar tu billetera en MetaMask, Rabby, Rainbow o Coinbase Wallet cuando desees.

---

## 11. 🎨 Personalización, Temas y Notificaciones Push

* **Temas Visuales (Neo-Brutalismo):** Elige entre diseños vibrantes de alto contraste o paletas oscuras de máxima legibilidad.
* **Perfil Personalizado:** Configura tu avatar, nombre de usuario y crea tu identificador `@handle`.
* **Notificaciones Push:** Recibe alertas en tiempo real en tu navegador o móvil cuando recibas USDC o cumplas una meta en tus bóvedas.
* **Copia de Seguridad Offline en JSON:** Exporta una copia integral de tus registros y metas en formato `.json` para guardarla en tu ordenador o transferirla de dispositivo.

---

## 12. 🔒 Privacidad, Cumplimiento Global y Eliminación de Cuenta

CofreAdmin respeta plenamente los estándares internacionales de protección de datos (GDPR, LGPD y CCPA) y la soberanía sobre tu información:

### Eliminación Definitiva de Cuenta y Datos:
1. Dirígete a **Ajustes** y desplázate hasta el final.
2. En la sección **Privacidad y Datos**, pulsa **"Eliminar Mi Cuenta y Mis Datos"**.
3. **Qué sucede tras la confirmación:**
   * **Limpieza en la Nube:** Todos los registros en `userData` se eliminan permanentemente.
   * **Limpieza en el Dispositivo:** El almacenamiento local, caché y sesiones del navegador se limpian por completo.
   * **Registro Auditivo de Cumplimiento:** En riguroso cumplimiento con las normativas internacionales (como el Art. 16 de la LGPD brasileña y las excepciones del Art. 17 del GDPR europeo), el sistema genera un comprobante anónimo e inmutable (`legalAuditArchive`) que certifica ante los entes reguladores la fecha y el descarte legal de los datos.
   * *Aviso: Asegúrate de retirar tus fondos en USDC a una billetera externa o guardar tu Clave Privada antes de confirmar la eliminación.*

---

## 13. ❓ Preguntas Frecuentes (FAQ)

### ¿Por qué la red Base es tan rápida y económica?
Base es una solución Layer 2 desarrollada por Coinbase sobre la red Ethereum. Agrupa y procesa múltiples transacciones simultáneamente, reduciendo las comisiones a fracciones de centavo mientras conserva la seguridad descentralizada de Ethereum.

### ¿Cómo funciona la Unificación de Cuentas por Correo?
Si inicias sesión con Google y luego con Discord usando el mismo correo verificado, CofreAdmin detecta tu identidad única. Mantiene tu mismo perfil, tu misma dirección de billetera y tus registros sin solicitarte aceptar términos nuevamente ni crear cuentas divididas.

### ¿Qué es el Modo de Privacidad Rápida?
Al pulsar el icono de ojo en la tarjeta de saldo, todas las cifras de la pantalla principal se ocultan con puntos (`••••`). Esto evita que personas a tu alrededor vean tu dinero en el transporte o en lugares públicos.

### ¿Puedo transferir a dominios Basenames o ENS?
¡Sí! Solo escribe cualquier nombre terminado en `.base.eth` o `.eth` en el campo de envío. La app realiza la resolución automática de la dirección on-chain con controles de seguridad.

### ¿Necesito ETH para enviar USDC?
No. La tecnología de patrocinio de gas (EIP-3009) absorbe las comisiones y deduce céntimos de dólar directamente de la fracción de USDC enviada.

### ¿Alguien puede retener o congelar mis fondos?
No. CofreAdmin es 100% autocustodial. Ningún intermediario, servidor ni desarrollador tiene acceso a tus claves privadas ni la posibilidad técnica de bloquear tus activos.

---

🎮 Discord: `@cofreadmin` • 📧 Correo: [soporte](mailto:cofreadminwallet@gmail.com) • 🌐 Código Abierto: AGPL-3.0-or-later
