# Wallet Rewards Hub

## Plataforma SaaS de fidelización mediante Apple Wallet y Google Wallet



**Versión:** MVP 1.0  

**Objetivo:** construir la primera versión funcional del producto, sin landing comercial pública.  

**Tipo de producto:** SaaS multiempresa y multiestablecimiento para programas de fidelización basados en gasto, puntos y recompensas.



---



# 1. Visión del producto



Construir una plataforma de fidelización para comercios físicos —inicialmente cafeterías, bares y restaurantes— que permita:



1. Al comercio crear un programa de puntos personalizado con su marca.

2. Al cliente registrarse desde un QR público situado en la barra, carta, mesa, ticket o escaparate.

3. Al cliente añadir una tarjeta de fidelización a Apple Wallet o Google Wallet, sin instalar una aplicación.

4. Al empleado escanear en caja el QR personal de la tarjeta Wallet del cliente.

5. Al empleado introducir el importe de la compra y confirmar la operación.

6. Al sistema calcular y acumular automáticamente los puntos.

7. Al cliente consultar sus puntos, progreso y recompensas disponibles tanto en Wallet como en una web personalizada.

8. Al empleado canjear una recompensa desde el backoffice, dejando trazabilidad completa.

9. Al administrador de un comercio gestionar varios establecimientos, usuarios, programas, clientes y configuración de marca.

10. Al superadministrador gestionar toda la plataforma, comercios, establecimientos, accesos, actividad y configuración técnica.



Ejemplo principal:



- El comercio configura: **1 € gastado = 1 punto**.

- Crea una recompensa: **Café gratis = 100 puntos**.

- Un cliente realiza una compra de 18,50 €.

- Según la regla de redondeo configurada, recibe 18 puntos.

- Cuando alcanza 100 puntos, la recompensa aparece como disponible.

- Los puntos solo se descuentan cuando un empleado confirma el canje.



El producto no procesa el pago de la compra. Únicamente registra el importe validado por el empleado para calcular puntos.



---



# 2. Alcance del MVP



## Incluido



- Aplicación web responsive.

- Autenticación del backoffice.

- Arquitectura multiempresa y multiestablecimiento.

- Superadministrador de plataforma.

- Administrador de comercio.

- Empleado/cajero con permisos limitados.

- Alta y configuración de comercios y establecimientos.

- Branding por comercio.

- Branding opcional específico por establecimiento.

- Creación de programa de puntos basado en gasto.

- Catálogo de recompensas y equivalencias de puntos por producto.

- Landing pública personalizada para cada comercio/establecimiento.

- Generación y descarga de QR público de captación.

- Registro de clientes.

- Consentimientos legales separados.

- Creación de membresía de fidelización.

- Integración preparada para Apple Wallet y Google Wallet.

- QR personal dentro del pase Wallet.

- Portal web del cliente.

- Escáner QR desde la cámara del móvil del empleado.

- Introducción de importe y cálculo automático de puntos.

- Historial de transacciones.

- Canje de recompensas.

- Correcciones manuales autorizadas.

- Auditoría de operaciones.

- Métricas esenciales.

- Actualización del pase después de cada cambio de saldo.

- Estados vacíos, carga, confirmación y error.



## No incluido inicialmente



- Landing comercial del SaaS.

- Aplicaciones nativas iOS o Android.

- Integración con TPV o caja registradora.

- Cobro de las compras del cliente.

- Suscripciones pagadas por clientes finales.

- Tarjetas regalo con saldo monetario.

- Cashback monetario.

- Marketplace de recompensas.

- Campañas avanzadas de marketing.

- SMS o WhatsApp.

- Geofencing avanzado.

- Referidos.

- Reservas o pedidos.

- Facturación SaaS automatizada a los comercios.

- Importación masiva compleja.

- Sistema de inventario.



La arquitectura debe permitir añadir estas funciones en fases posteriores, pero no deben distraer ni bloquear el MVP.



---



# 3. Principios del producto



1. **Sin aplicación para el cliente:** todo funciona mediante navegador y Wallet.

2. **Alta en menos de un minuto:** escanear, registrarse y añadir la tarjeta.

3. **Operación de caja en menos de diez segundos:** escanear, introducir importe y confirmar.

4. **Marca del comercio protagonista:** la plataforma queda en segundo plano.

5. **Sin fraude por enlaces públicos:** solo usuarios autenticados y autorizados pueden añadir puntos o canjear premios.

6. **Toda modificación de saldo es auditable:** nunca se edita un saldo directamente sin crear un movimiento.

7. **Multiestablecimiento desde el modelo de datos:** aunque el primer comercio tenga una sola ubicación.

8. **Mobile first en captación, portal de cliente y escáner.**

9. **Responsive desktop/tablet en administración.**

10. **Privacidad por diseño:** los QR no contienen nombre, email, puntos ni otra información personal.



---



# 4. Jerarquía y modelo organizativo



La plataforma tendrá esta jerarquía:



1. **Plataforma**

2. **Organización comercial**

3. **Establecimiento o ubicación**

4. **Programa de fidelización**

5. **Membresías de clientes**



Ejemplo:



- Plataforma

  - Grupo Café Norte

    - Café Norte Malasaña

    - Café Norte Chamberí

    - Café Norte Retiro

  - Bar El Patio

    - Bar El Patio Algete



Una organización puede tener uno o varios establecimientos.



En el MVP, un programa puede configurarse como:



- **Compartido entre varios establecimientos:** el cliente acumula y canjea en cualquiera de las ubicaciones seleccionadas.

- **Exclusivo de un establecimiento:** el saldo y las recompensas solo funcionan en esa ubicación.



Debe existir un único saldo por membresía y programa. No se debe duplicar el cliente por cada visita.



---



# 5. Roles y permisos



## 5.1 Superadministrador de plataforma



Es el propietario del SaaS.



Puede:



- Ver todas las organizaciones y establecimientos.

- Crear, editar, activar, suspender y archivar organizaciones.

- Crear el primer administrador de cada organización.

- Ver métricas globales.

- Consultar clientes y transacciones de cualquier organización con acceso registrado en auditoría.

- Acceder en modo soporte a una organización, mostrando siempre un indicador visible.

- Consultar el estado de Apple Wallet y Google Wallet.

- Consultar errores de generación y actualización de pases.

- Gestionar plantillas globales y valores por defecto.

- Gestionar límites internos del servicio.

- Ver el registro global de auditoría.

- Suspender un establecimiento o un usuario.

- Reenviar invitaciones.

- Forzar regeneración o sincronización de un pase.



No debe existir registro público de superadministradores.



## 5.2 Administrador de organización/comercio



Puede gestionar una o varias ubicaciones de su propia organización.



Puede:



- Ver el dashboard de la organización.

- Crear y editar establecimientos.

- Configurar el branding general.

- Personalizar cada establecimiento.

- Crear y gestionar programas de fidelización.

- Seleccionar en qué establecimientos funciona cada programa.

- Crear, editar, activar y archivar recompensas.

- Ver clientes, membresías, saldos e historial.

- Invitar administradores, responsables y empleados.

- Asignar usuarios a uno o varios establecimientos.

- Generar y descargar QR públicos.

- Usar el escáner.

- Añadir puntos mediante una operación de compra.

- Canjear recompensas.

- Realizar ajustes manuales si tiene permiso.

- Exportar clientes y transacciones.

- Ver métricas.



Nunca puede acceder a datos de otra organización.



## 5.3 Responsable de establecimiento



Rol preparado desde el MVP aunque inicialmente pueda compartir interfaz con el administrador.



Puede:



- Gestionar las ubicaciones que tenga asignadas.

- Ver clientes y transacciones de esas ubicaciones.

- Usar el escáner.

- Canjear recompensas.

- Gestionar empleados de sus ubicaciones.

- Consultar métricas locales.

- Realizar ajustes si el administrador se lo permite.



No puede:



- Crear otras organizaciones.

- Modificar la configuración global del comercio.

- Acceder a ubicaciones no asignadas.



## 5.4 Empleado/cajero



Interfaz simplificada y principalmente móvil.



Puede:



- Elegir uno de sus establecimientos asignados al iniciar turno.

- Abrir el escáner.

- Escanear la tarjeta de un cliente.

- Ver nombre, saldo, progreso y recompensas disponibles.

- Registrar una compra introduciendo el importe.

- Canjear una recompensa.

- Ver únicamente sus operaciones recientes.



No puede:



- Ver listados completos de clientes.

- Exportar datos.

- Modificar reglas de puntos.

- Modificar recompensas.

- Cambiar branding.

- Editar usuarios.

- Añadir o retirar puntos manualmente fuera del flujo autorizado.



## 5.5 Cliente final



Puede:



- Registrarse en un programa.

- Aceptar las condiciones necesarias.

- Añadir la tarjeta a Apple Wallet o Google Wallet.

- Consultar su saldo y recompensas.

- Acceder al portal web mediante enlace seguro o autenticación sin contraseña.

- Ver su historial.

- Consultar los establecimientos adheridos.

- Actualizar algunos datos personales.

- Gestionar el consentimiento comercial.

- Solicitar eliminación de cuenta.



No puede modificar su saldo ni autoconfirmar compras o canjes.



---



# 6. Arquitectura de información



## 6.1 Backoffice del superadministrador



### Navegación principal



1. **Resumen global**

   - Organizaciones activas

   - Establecimientos activos

   - Clientes registrados

   - Pases emitidos

   - Compras registradas

   - Importe atribuido

   - Puntos emitidos

   - Recompensas canjeadas

   - Actividad reciente

   - Errores de Wallet



2. **Organizaciones**

   - Listado

   - Crear organización

   - Ficha de organización

     - Resumen

     - Establecimientos

     - Programas

     - Usuarios

     - Clientes

     - Transacciones

     - Branding

     - Estado del servicio

     - Auditoría



3. **Establecimientos**

   - Listado global

   - Filtros por organización, estado y fecha

   - Acceso a ficha



4. **Clientes**

   - Listado global

   - Búsqueda por nombre, email o identificador

   - Membresías

   - Historial



5. **Transacciones**

   - Compras

   - Canjes

   - Ajustes

   - Anulaciones

   - Filtros y exportación



6. **Wallet**

   - Apple Wallet

   - Google Wallet

   - Estado de credenciales

   - Pases emitidos

   - Cola de actualizaciones

   - Errores

   - Reintentos



7. **Usuarios y accesos**

   - Superadministradores

   - Usuarios de comercios

   - Invitaciones

   - Usuarios suspendidos



8. **Auditoría**

   - Acciones administrativas

   - Cambios de saldo

   - Accesos en modo soporte

   - Cambios de configuración



9. **Configuración global**

   - Nombre y marca de plataforma

   - Plantillas de email

   - Valores predeterminados

   - Textos legales

   - Límites internos



## 6.2 Backoffice del comercio



### Navegación principal



1. **Inicio**

   - Selector de establecimiento o vista agregada

   - Clientes totales

   - Altas recientes

   - Compras registradas

   - Importe atribuido

   - Puntos emitidos

   - Recompensas pendientes

   - Recompensas canjeadas

   - Actividad reciente



2. **Escanear**

   - Cámara QR

   - Introducción manual del código como alternativa

   - Ficha rápida del cliente

   - Registrar compra

   - Canjear recompensa



3. **Clientes**

   - Listado

   - Buscador

   - Filtros por establecimiento, saldo, recompensa y actividad

   - Ficha del cliente

     - Perfil

     - Membresías

     - Saldo

     - Progreso

     - Recompensas disponibles

     - Historial

     - Consentimientos

     - Estado del pase

     - Ajuste manual, según permisos



4. **Transacciones**

   - Todas

   - Compras

   - Canjes

   - Ajustes

   - Anulaciones

   - Detalle de operación

   - Exportación CSV



5. **Fidelización**

   - Programas

   - Crear programa

   - Configuración de puntos

   - Recompensas

   - Establecimientos participantes

   - Vista previa de progreso

   - Estado activo/borrador/pausado/archivado



6. **Establecimientos**

   - Listado

   - Crear establecimiento

   - Ficha

     - Datos generales

     - Dirección y contacto

     - Horarios

     - Branding específico

     - Programas activos

     - QR público

     - Landing de registro

     - Usuarios asignados

     - Métricas



7. **Captación y QR**

   - QR por organización

   - QR por establecimiento

   - Previsualización de landing

   - Descargar PNG

   - Descargar SVG

   - Copiar URL

   - Generar variantes con origen/campaña

   - Métricas de escaneos y conversiones



8. **Marca y tarjeta**

   - Logo

   - Imagen de cabecera

   - Color principal

   - Color secundario

   - Color de texto

   - Tipografía entre opciones seguras

   - Nombre visible del programa

   - Mensaje de bienvenida

   - Textos del Wallet

   - Vista previa móvil

   - Vista previa Apple Wallet

   - Vista previa Google Wallet



9. **Equipo**

   - Usuarios

   - Invitaciones

   - Roles

   - Establecimientos asignados

   - Estado activo/suspendido



10. **Configuración**

    - Datos de la organización

    - Privacidad y consentimientos

    - Preferencias operativas

    - Redondeo de puntos

    - Caducidad de puntos

    - Zona horaria

    - Exportación de datos



## 6.3 Interfaz simplificada del empleado



1. Seleccionar establecimiento

2. Escanear cliente

3. Resultado del escaneo

4. Registrar compra

5. Canjear recompensa

6. Operaciones recientes propias

7. Mi cuenta / cerrar sesión



La pantalla inicial del empleado debe priorizar un botón grande: **Escanear tarjeta**.



## 6.4 Landing pública de registro



Ruta sugerida:



`/unirme/{organization_slug}`  

`/unirme/{organization_slug}/{location_slug}`



Pantallas:



1. Presentación del programa

2. Formulario de registro

3. Consentimientos

4. Confirmación de alta

5. Añadir a Apple Wallet / Google Wallet

6. Instrucciones breves de uso



## 6.5 Portal web del cliente



Ruta sugerida:



`/mi-tarjeta/{membership_public_id}`



Secciones:



- Tarjeta/resumen

- Saldo de puntos

- Barra de progreso hacia la siguiente recompensa

- Recompensas disponibles

- Catálogo de recompensas

- Historial

- Establecimientos participantes

- Mis datos

- Privacidad y baja

- Botón para añadir o volver a añadir el Wallet



---



# 7. Flujos funcionales completos



## 7.1 Alta inicial de una organización por el superadministrador



1. El superadministrador accede a Organizaciones.

2. Pulsa **Nueva organización**.

3. Introduce:

   - Nombre legal o interno

   - Nombre comercial

   - Slug único

   - Email de contacto

   - Teléfono opcional

   - Estado

4. Crea el primer establecimiento:

   - Nombre

   - Dirección

   - Zona horaria

   - Email/teléfono

5. Introduce los datos del administrador principal.

6. El sistema envía una invitación segura.

7. La organización queda en estado `configuration_pending`.

8. Al completar marca, programa y recompensa, pasa a `ready`.

9. Cuando se publica la landing, pasa a `active`.



## 7.2 Configuración inicial por el administrador del comercio



Incluir un asistente de cinco pasos:



1. **Datos del comercio**

2. **Marca**

3. **Programa de puntos**

4. **Primera recompensa**

5. **Publicar y descargar QR**



Ejemplo de configuración:



- Nombre del programa: Club Café Norte

- Regla: 1 € = 1 punto

- Redondeo: hacia abajo al entero más cercano

- Recompensa: Café gratis

- Coste: 100 puntos

- Validez: sin caducidad

- Establecimientos: todos



Antes de publicar se muestra una previsualización completa.



## 7.3 Generación del QR público del establecimiento



1. El administrador abre Captación y QR.

2. Selecciona organización o establecimiento.

3. El sistema crea una URL pública única.

4. Puede añadir un origen opcional:

   - Barra

   - Carta

   - Mesa

   - Ticket

   - Escaparate

   - Otro

5. Cada origen genera un QR diferente, pero todos conducen al mismo programa.

6. Se registra el origen para medir escaneos y conversiones.

7. Puede descargar el QR como PNG y SVG.



El QR público nunca añade puntos. Solo abre la landing de registro.



## 7.4 Registro del cliente



1. El cliente escanea el QR público.

2. Se abre la landing con el branding del comercio.

3. La aplicación identifica organización, ubicación y origen del QR.

4. Se muestra:

   - Logo

   - Nombre del programa

   - Beneficio principal

   - Funcionamiento resumido

   - Ejemplo de recompensa

5. El cliente pulsa **Crear mi tarjeta**.

6. Formulario mínimo:

   - Nombre, obligatorio

   - Email, obligatorio en MVP

   - Fecha de nacimiento, opcional

7. Consentimientos independientes:

   - Aceptación de términos y privacidad, obligatoria

   - Comunicaciones comerciales, opcional y desmarcada por defecto

8. El sistema comprueba si el email ya tiene una membresía en el programa.

9. Si ya existe:

   - No crea un duplicado.

   - Envía acceso seguro o solicita un código de un solo uso.

   - Ofrece volver a añadir la tarjeta a Wallet.

10. Si no existe:

    - Crea el cliente.

    - Crea la membresía.

    - Asigna saldo inicial de cero, salvo promoción configurada.

    - Genera un identificador público aleatorio.

    - Genera un token QR opaco y revocable.

11. Detecta el dispositivo:

    - iPhone: botón principal **Añadir a Apple Wallet**.

    - Android: botón principal **Añadir a Google Wallet**.

    - Escritorio/u otro: mostrar ambos y permitir continuar en móvil mediante QR.

12. Se registra el evento de alta y el origen de captación.



## 7.5 Añadir la tarjeta a Wallet



La tarjeta debe incluir:



- Logo y colores del comercio.

- Nombre del programa.

- Nombre del cliente o nombre de pila.

- Saldo actual de puntos.

- Texto de progreso: “Te faltan 24 puntos para Café gratis”.

- Recompensas disponibles.

- QR personal del cliente.

- Identificador corto de respaldo.

- Enlace al portal web.

- Establecimientos participantes.

- Condiciones resumidas.

- Fecha de última actualización.



El código QR del Wallet debe contener un token opaco, por ejemplo una URL segura de resolución. No debe contener email, nombre, puntos ni IDs secuenciales.



Estados del pase:



- `pending_generation`

- `active`

- `update_pending`

- `error`

- `revoked`



Tras cada operación de saldo, el sistema debe actualizar el contenido del pase y registrar si la actualización se completó o necesita reintento.



## 7.6 Escaneo en caja y registro de compra



1. El empleado inicia sesión.

2. Selecciona el establecimiento en el que está operando.

3. Pulsa **Escanear tarjeta**.

4. Autoriza la cámara si es necesario.

5. Escanea el QR personal mostrado en Apple Wallet, Google Wallet o el portal web.

6. El backend valida:

   - Token existente

   - Token activo

   - Membresía activa

   - Programa activo

   - Establecimiento autorizado para el programa

   - Empleado autorizado en el establecimiento

7. Si es válido, se muestra una ficha rápida:

   - Nombre

   - Saldo actual

   - Progreso

   - Recompensas disponibles

   - Última operación

8. El empleado elige **Registrar compra**.

9. Introduce el importe total elegible de la compra.

10. El sistema muestra antes de confirmar:

    - Importe: 18,50 €

    - Regla: 1 € = 1 punto

    - Redondeo: hacia abajo

    - Puntos a sumar: 18

    - Saldo actual: 84

    - Nuevo saldo: 102

    - Nueva recompensa desbloqueada: Café gratis

11. El empleado pulsa **Confirmar operación**.

12. El backend crea una transacción atómica.

13. El saldo se obtiene del libro de movimientos o se actualiza de forma transaccional.

14. Aparece una pantalla de éxito.

15. El pase Wallet se marca para actualización.

16. El dashboard y el portal del cliente reflejan el nuevo saldo.



Campos opcionales de la compra:



- Referencia de ticket

- Nota interna

- Fecha/hora, por defecto actual y no editable por empleado



## 7.7 Cálculo de puntos



El programa debe soportar inicialmente:



- `points_per_currency_unit`: puntos obtenidos por cada euro.

- `currency_units_per_point`: euros necesarios para obtener un punto.



Ejemplos:



- 1 € = 1 punto

- 2 € = 1 punto

- 1 € = 10 puntos



Configurar método de redondeo:



- Hacia abajo

- Al entero más cercano

- Mantener decimales, preparado pero no recomendado visualmente



Fórmula habitual:



`puntos_obtenidos = floor(importe_elegible × puntos_por_euro)`



Los importes se almacenarán en céntimos enteros para evitar errores de coma flotante.



La configuración utilizada debe copiarse dentro de la transacción para conservar el cálculo histórico aunque la regla cambie posteriormente.



## 7.8 Desbloqueo y disponibilidad de recompensas



1. Al cambiar el saldo, se calculan las recompensas que el cliente puede pagar con sus puntos.

2. Una recompensa es **disponible** si:

   - Está activa.

   - Pertenece al programa.

   - Es válida en el establecimiento.

   - El saldo es igual o superior al coste en puntos.

3. No se descuenta ningún punto automáticamente.

4. La recompensa se muestra en Wallet, portal web y ficha del cliente.

5. Si hay varias recompensas, el cliente puede elegir cuál canjear en caja.



## 7.9 Canje de recompensa



1. El empleado escanea la tarjeta.

2. El sistema muestra recompensas disponibles.

3. El empleado pulsa **Canjear** en una recompensa.

4. Se muestra confirmación:

   - Recompensa

   - Coste en puntos

   - Saldo actual

   - Saldo posterior

5. El empleado confirma.

6. El backend vuelve a validar saldo y disponibilidad para evitar dobles canjes.

7. Se crea una transacción de tipo `redemption` con puntos negativos.

8. Se crea un registro de canje con establecimiento y empleado.

9. Se actualiza el saldo.

10. Se actualiza Wallet.

11. Se muestra una pantalla de éxito clara para que el personal entregue el producto.



El botón de confirmación debe evitar dobles pulsaciones y utilizar una clave de idempotencia.



## 7.10 Ajuste manual de puntos



Solo administradores y responsables autorizados.



1. Acceder a la ficha del cliente.

2. Pulsar **Ajustar saldo**.

3. Elegir sumar o retirar puntos.

4. Introducir cantidad.

5. Seleccionar motivo obligatorio:

   - Error de compra

   - Compensación

   - Promoción

   - Fraude

   - Otro

6. Escribir comentario obligatorio si se selecciona Otro.

7. Confirmar.

8. Crear transacción `manual_adjustment`; nunca modificar el saldo sin movimiento.

9. Registrar usuario, fecha, saldo anterior y saldo posterior.



## 7.11 Anulación de una transacción



No borrar transacciones financieras o de puntos.



1. Un administrador abre el detalle.

2. Pulsa **Anular operación**.

3. Introduce motivo.

4. El sistema crea una transacción inversa enlazada con la original.

5. La original queda marcada como anulada, pero permanece visible.

6. Se recalcula el saldo.

7. Se actualiza Wallet.



## 7.12 Acceso al portal del cliente



El cliente puede acceder:



- Desde un enlace dentro del Wallet.

- Desde el email de bienvenida.

- Introduciendo su email y recibiendo un enlace mágico o código de un solo uso.



No usar contraseña tradicional en el MVP.



## 7.13 Cliente sin Wallet o cámara no disponible



Alternativas:



- El cliente abre su QR desde el portal web.

- El empleado introduce el código corto visible bajo el QR.

- Un administrador busca al cliente por email desde el backoffice.



La búsqueda manual por datos personales no estará disponible para empleados básicos.



---



# 8. Configuración de programas y recompensas



## 8.1 Programa de fidelización



Campos:



- Nombre interno

- Nombre público

- Descripción

- Estado: borrador, activo, pausado, archivado

- Moneda: EUR inicialmente

- Tipo de cálculo

- Valor de equivalencia

- Método de redondeo

- Saldo inicial opcional

- Caducidad de puntos: sin caducidad o número de meses

- Establecimientos participantes

- Permitir acumulación

- Permitir canje

- Fecha de inicio

- Fecha de fin opcional

- Textos legales específicos



Reglas:



- Solo un programa activo principal por establecimiento en el MVP.

- Un programa archivado no se puede reactivar sin confirmación.

- Cambiar la equivalencia no modifica operaciones pasadas.

- Pausar acumulación no elimina saldos existentes.



## 8.2 Recompensa



Campos:



- Nombre

- Descripción

- Imagen opcional

- Coste en puntos

- Estado

- Establecimientos donde puede canjearse

- Límite total opcional, preparado para futuro

- Límite por cliente opcional, preparado para futuro

- Fecha de inicio

- Fecha de fin

- Orden de visualización

- Condiciones



Ejemplos:



- Café gratis: 100 puntos

- Desayuno gratis: 250 puntos

- 10 % de descuento: 400 puntos



En el MVP la recompensa representa un beneficio, no dinero electrónico.



---



# 9. Personalización y branding



## Nivel organización



- Logo principal

- Logo compacto/cuadrado

- Imagen de portada

- Color principal

- Color secundario

- Color de fondo

- Color de texto

- Bordes: suave, medio o redondeado

- Tipografía seleccionable entre fuentes web seguras

- Nombre comercial

- Mensaje de bienvenida

- Descripción del programa

- Web

- Instagram

- Teléfono

- Email



## Nivel establecimiento



Por defecto hereda el branding de la organización. Puede sobrescribir:



- Imagen de portada

- Color principal

- Nombre visible

- Mensaje de bienvenida

- Datos de contacto

- Dirección y horarios



## Vista previa



Mostrar simultáneamente:



- Landing móvil

- Portal del cliente

- Apple Wallet aproximado

- Google Wallet aproximado



Validar contraste y legibilidad. Si la combinación no cumple mínimos, mostrar advertencia.



---



# 10. Modelo de datos propuesto



Usar Supabase/PostgreSQL. Todas las entidades principales deben incluir `id`, `created_at`, `updated_at` y, cuando corresponda, `archived_at`.



## Tablas principales



### `profiles`



- id, relacionado con `auth.users`

- full_name

- phone

- platform_role

- status



### `organizations`



- id

- legal_name

- display_name

- slug

- contact_email

- contact_phone

- status

- timezone



### `organization_branding`



- organization_id

- logo_url

- compact_logo_url

- cover_url

- primary_color

- secondary_color

- background_color

- text_color

- font_family

- border_style

- welcome_message



### `locations`



- id

- organization_id

- name

- slug

- address fields

- latitude/longitude opcionales

- contact fields

- timezone

- status

- branding_override JSONB o tabla específica



### `organization_users`



- id

- organization_id

- user_id

- role

- status

- can_adjust_points



### `user_location_assignments`



- user_id

- location_id



### `loyalty_programs`



- id

- organization_id

- internal_name

- public_name

- description

- currency

- earning_mode

- earning_value

- rounding_mode

- initial_points

- points_expiry_months

- status

- starts_at

- ends_at



### `program_locations`



- program_id

- location_id

- can_earn

- can_redeem



### `rewards`



- id

- program_id

- name

- description

- image_url

- points_cost

- status

- starts_at

- ends_at

- display_order

- terms



### `reward_locations`



- reward_id

- location_id



### `customers`



- id

- normalized_email

- email

- first_name

- last_name opcional

- birth_date opcional

- status



Un cliente puede participar en varias organizaciones. Sus datos no deben cruzarse visualmente entre organizaciones.



### `customer_consents`



- id

- customer_id

- organization_id

- consent_type

- granted

- policy_version

- source

- captured_at



### `memberships`



- id

- public_id UUID aleatorio

- customer_id

- organization_id

- program_id

- status

- cached_points_balance

- joined_at

- acquisition_location_id

- acquisition_source_id



Restricción única por `customer_id + program_id`.



### `membership_tokens`



- id

- membership_id

- token_hash

- short_code

- status

- expires_at opcional

- rotated_at



No guardar el token QR en texto plano si puede evitarse; guardar hash y resolver de forma segura.



### `point_transactions`



- id

- membership_id

- organization_id

- location_id

- performed_by_user_id

- type: purchase, redemption, manual_adjustment, reversal, initial_bonus, expiry

- points_delta

- amount_cents opcional

- currency

- previous_balance

- resulting_balance

- earning_rule_snapshot JSONB

- ticket_reference

- note

- reversal_of_transaction_id

- idempotency_key

- created_at



### `redemptions`



- id

- transaction_id

- reward_id

- membership_id

- location_id

- performed_by_user_id

- points_spent

- status



### `wallet_passes`



- id

- membership_id

- provider: apple, google

- provider_object_id

- serial_number

- status

- installed_at opcional

- last_generated_at

- last_update_requested_at

- last_updated_at

- last_error_code

- last_error_message



### `wallet_devices`



- id

- wallet_pass_id

- device_identifier

- push_token cifrado

- status



Especialmente necesario para actualizaciones de Apple Wallet.



### `acquisition_sources`



- id

- organization_id

- location_id opcional

- name

- slug/token

- destination_url

- status



### `acquisition_events`



- id

- source_id

- event_type: scan, landing_view, registration_started, registration_completed, wallet_added

- anonymous_session_id

- customer_id opcional

- created_at



### `audit_logs`



- id

- actor_user_id

- organization_id opcional

- action

- entity_type

- entity_id

- before_data JSONB

- after_data JSONB

- metadata JSONB

- created_at



### `wallet_jobs`



- id

- wallet_pass_id

- job_type

- status

- attempts

- scheduled_at

- completed_at

- error



---



# 11. Seguridad y reglas de acceso



Usar Row Level Security de Supabase en todas las tablas con datos de negocio.



Reglas esenciales:



1. Un usuario solo accede a organizaciones a las que pertenece.

2. Un usuario asignado a ubicaciones solo accede a esas ubicaciones.

3. Un empleado no puede consultar listados masivos de clientes.

4. Las mutaciones de puntos deben ejecutarse en backend mediante función segura/RPC o Edge Function, nunca directamente desde el cliente.

5. El cálculo y la escritura del saldo deben hacerse dentro de una transacción de base de datos.

6. La generación de pases y certificados ocurre en backend.

7. Las claves de Apple y Google nunca llegan al navegador.

8. Los tokens QR son opacos, aleatorios y revocables.

9. Implementar idempotencia en compras y canjes.

10. Aplicar rate limiting a registro, login, resolución de QR y escaneo.

11. No eliminar transacciones; usar anulaciones.

12. Registrar operaciones sensibles en `audit_logs`.

13. El modo soporte del superadministrador debe mostrar banner y crear auditoría.

14. El cliente no puede acceder al portal solo con un ID predecible.

15. Los enlaces mágicos y códigos de acceso deben caducar.



---



# 12. Estados, validaciones y errores



## Errores del escáner



- QR no reconocido

- Tarjeta revocada

- Membresía suspendida

- Programa pausado

- Establecimiento no participante

- Usuario sin permisos

- Cámara denegada

- Sin conexión

- Operación duplicada

- Saldo insuficiente

- Recompensa no disponible



Cada error debe ofrecer una acción clara: reintentar, introducir código, seleccionar otra ubicación o contactar con administrador.



## Validaciones de compra



- Importe obligatorio.

- Mayor que cero.

- Máximo configurable; inicialmente 10.000 €.

- Dos decimales.

- Mostrar siempre puntos antes de confirmar.

- Confirmación adicional para importes anormalmente elevados.



## Concurrencia



Si dos empleados intentan canjear a la vez:



- Bloquear o serializar la membresía durante la operación.

- Volver a comprobar el saldo en servidor.

- Solo una operación puede completarse.

- La otra recibe saldo insuficiente o recompensa ya canjeada.



---



# 13. Métricas del MVP



## Superadministrador



- Organizaciones y establecimientos activos

- Altas por periodo

- Clientes totales

- Pases Apple/Google

- Transacciones

- Puntos emitidos y canjeados

- Errores de Wallet



## Comercio



- Clientes totales

- Nuevos clientes

- Clientes activos en 30 días

- Compras registradas

- Importe acumulado atribuido

- Ticket medio registrado

- Puntos emitidos

- Puntos canjeados

- Recompensas canjeadas

- Conversión QR → registro

- Conversión registro → Wallet añadido

- Distribución por establecimiento



No presentar estos importes como facturación contable: etiquetarlos como **importe registrado/atribuido al programa**.



---



# 14. Diseño de interfaz



## Estilo general



- SaaS moderno, limpio y profesional.

- Navegación lateral en desktop.

- Navegación simplificada o inferior en móvil.

- Tarjetas de métricas discretas.

- Tablas con filtros y buscador.

- Formularios divididos en pasos.

- Acciones destructivas con confirmación.

- Toasts para éxito no crítico.

- Pantallas completas de éxito para compras y canjes.



## Mobile first



Prioridad máxima para:



- Landing de registro.

- Formulario del cliente.

- Añadir a Wallet.

- Portal del cliente.

- Escáner del empleado.

- Confirmación de compra y canje.



## Accesibilidad



- Contraste WCAG AA.

- Labels visibles.

- Navegación por teclado en backoffice.

- No depender solo del color.

- Mensajes de error junto al campo.

- Botones táctiles de al menos 44 px.



---



# 15. Requisitos técnicos para Lovable



Construir con:



- React + TypeScript.

- Tailwind CSS y componentes reutilizables.

- Supabase Auth.

- Supabase PostgreSQL.

- Supabase Storage para logos e imágenes.

- Row Level Security.

- Edge Functions o funciones backend para operaciones sensibles.

- PWA responsive, especialmente para el escáner.

- Librería de lectura QR compatible con cámara móvil.



## Integración Wallet



Crear una abstracción `WalletProvider` con dos implementaciones:



- `AppleWalletProvider`

- `GoogleWalletProvider`



Funciones esperadas:



- `createPass(membershipId)`

- `updatePass(membershipId)`

- `revokePass(membershipId)`

- `getPassStatus(membershipId)`

- `retryUpdate(walletPassId)`



Si las credenciales reales no están disponibles durante la primera generación:



- Construir todo el flujo con un proveedor mock.

- Mantener endpoints, estados y estructura real.

- No simular que un pase se ha añadido realmente.

- Mostrar claramente estado de sandbox/mock al superadministrador.

- Preparar variables de entorno y documentación necesaria para conectar credenciales después.



## Operaciones backend obligatorias



- `register_customer_and_membership`

- `resolve_membership_qr`

- `record_purchase`

- `redeem_reward`

- `adjust_points`

- `reverse_transaction`

- `request_wallet_update`



Estas operaciones deben validar permisos y ejecutarse en servidor.



---



# 16. Datos demo



Crear datos de demostración:



## Organización



**Café Norte**



## Establecimientos



- Café Norte Malasaña

- Café Norte Chamberí



## Programa



- Nombre: Club Café Norte

- Regla: 1 € = 1 punto

- Redondeo: hacia abajo

- Compartido entre las dos ubicaciones



## Recompensas



- Café gratis: 100 puntos

- Desayuno gratis: 250 puntos

- 10 % de descuento: 400 puntos



## Usuarios demo



- Superadministrador

- Administrador de Café Norte

- Responsable de Malasaña

- Empleado de Malasaña



## Clientes demo



Crear clientes con saldos diferentes, incluyendo:



- Sin puntos

- Cerca de recompensa

- Con una recompensa disponible

- Con historial de canjes

- Membresía suspendida



---



# 17. Criterios de aceptación del MVP



El MVP se considera funcional cuando:



1. El superadministrador puede crear una organización y un establecimiento.

2. El administrador invitado puede iniciar sesión.

3. Puede configurar marca, programa y recompensa.

4. Puede publicar una landing personalizada.

5. Puede generar y descargar un QR de captación.

6. Un cliente puede escanearlo y registrarse.

7. El sistema evita membresías duplicadas en el mismo programa.

8. Se crea una membresía con saldo cero.

9. Se genera el QR personal del cliente.

10. Se ofrece el botón Wallet adecuado al dispositivo.

11. El cliente puede consultar su portal web.

12. Un empleado puede iniciar sesión y seleccionar ubicación.

13. Puede escanear el QR personal.

14. Puede introducir un importe y ver los puntos calculados.

15. Puede confirmar la compra una sola vez.

16. El saldo se actualiza correctamente.

17. La recompensa se muestra cuando el saldo es suficiente.

18. El empleado puede canjearla.

19. Los puntos se descuentan exactamente una vez.

20. La transacción y el usuario quedan auditados.

21. Un administrador puede anular una operación sin borrarla.

22. Los datos están aislados entre organizaciones mediante RLS.

23. El pase o proveedor mock recibe una solicitud de actualización después de cada movimiento.

24. Todas las interfaces esenciales funcionan en móvil.



---



# 18. Orden recomendado de construcción



## Fase 1 — Base SaaS



- Autenticación

- Roles

- Organizaciones

- Establecimientos

- RLS

- Navegación por rol



## Fase 2 — Configuración



- Branding

- Programas

- Recompensas

- Asistente inicial



## Fase 3 — Captación



- Landing pública

- QR de captación

- Registro

- Membresía

- Consentimientos



## Fase 4 — Operación



- QR personal

- Escáner

- Registro de compra

- Ledger de puntos

- Canjes

- Anulaciones



## Fase 5 — Experiencia cliente



- Portal web

- Progreso

- Historial

- Recompensas



## Fase 6 — Wallet



- Abstracción de proveedor

- Mock completo

- Apple Wallet

- Google Wallet

- Actualizaciones y errores



## Fase 7 — Métricas y endurecimiento



- Dashboards

- Auditoría

- Rate limiting

- Concurrencia

- Pruebas y estados de error



---



# 19. Prompt ejecutable para Lovable



Puedes copiar desde aquí:



> Construye una aplicación SaaS multiempresa de fidelización para comercios físicos basada en Apple Wallet, Google Wallet, puntos y recompensas. No construyas una landing comercial del SaaS. Construye el producto funcional: backoffice, landing personalizada por comercio, portal del cliente y escáner móvil.

>

> Usa React, TypeScript, Tailwind y Supabase. Implementa Supabase Auth, PostgreSQL, Storage, Row Level Security y funciones backend seguras. La aplicación debe ser responsive y mobile first en el registro del cliente, el portal de puntos y el escáner del empleado.

>

> La jerarquía es plataforma → organización comercial → establecimientos → programas de fidelización → membresías. Una organización puede tener varios establecimientos. Un programa puede compartirse entre varias ubicaciones o limitarse a una. Prepara estos roles: superadministrador, administrador de organización, responsable de establecimiento, empleado/cajero y cliente final.

>

> El superadministrador puede gestionar todas las organizaciones, establecimientos, usuarios, clientes, transacciones, auditoría y estado de Wallet. El administrador de organización solo gestiona su organización, puede crear establecimientos, configurar branding, programas, recompensas, QR públicos, clientes, usuarios y métricas. El responsable solo accede a establecimientos asignados. El empleado tiene una interfaz simplificada para seleccionar ubicación, escanear tarjetas, registrar compras, canjear recompensas y consultar sus operaciones recientes.

>

> El comercio debe poder personalizar logo, portada, colores, tipografía, textos, datos de contacto y nombre del programa. Debe existir herencia de branding desde organización y posibilidad de sobrescribir algunos datos por establecimiento. Incluye vistas previas de la landing, portal y Wallet.

>

> Permite crear programas de puntos basados en gasto. Deben soportar puntos por euro o euros por punto, redondeo hacia abajo o al entero más cercano, saldo inicial, caducidad opcional y establecimientos participantes. Permite crear varias recompensas con nombre, descripción, imagen, coste en puntos, fechas, estado y ubicaciones donde pueden canjearse. Ejemplo demo: 1 € = 1 punto; café gratis = 100 puntos.

>

> Cada establecimiento debe poder generar QR públicos de captación. El administrador puede crear variantes por origen: barra, carta, mesa, ticket o escaparate. Al escanearlo, el cliente ve una landing completamente personalizada con la marca del comercio, conoce el programa, introduce nombre y email, acepta privacidad obligatoria y consentimiento comercial opcional, y crea su tarjeta. Si el email ya pertenece al programa, no dupliques la membresía: ofrece acceso mediante enlace mágico o código de un solo uso.

>

> Tras registrarse, crea el cliente, su membresía, saldo inicial, identificador público aleatorio y token QR opaco. Detecta iPhone o Android y ofrece Añadir a Apple Wallet o Añadir a Google Wallet. En escritorio, muestra ambos y un QR para continuar en móvil. Crea también un portal web del cliente con saldo, barra de progreso, siguiente recompensa, recompensas disponibles, historial, establecimientos y botón para volver a añadir Wallet.

>

> La tarjeta Wallet debe mostrar marca, nombre del programa, nombre del cliente, puntos actuales, progreso a la siguiente recompensa, recompensas disponibles, QR personal, código corto de respaldo, enlace al portal, ubicaciones y última actualización. El QR nunca puede incluir datos personales o un ID secuencial; debe contener un token opaco y revocable.

>

> El flujo de caja es: empleado autenticado → selecciona establecimiento → abre cámara → escanea QR personal del Wallet → backend valida token, membresía, programa, ubicación y permisos → muestra ficha rápida → empleado elige Registrar compra → introduce importe elegible → el sistema muestra regla, puntos calculados, saldo anterior, saldo posterior y recompensa que se desbloquea → confirma → backend crea una transacción atómica e idempotente → actualiza saldo → solicita actualización del Wallet → muestra éxito.

>

> Los importes deben almacenarse en céntimos enteros. Conserva en cada transacción una copia de la regla de cálculo utilizada. Nunca permitas escribir el saldo directamente desde el frontend. Usa una función backend segura para registrar compras.

>

> Cuando el cliente tenga puntos suficientes, muestra la recompensa como disponible, pero no descuentes puntos automáticamente. El canje requiere que un empleado escanee la tarjeta, seleccione una recompensa, vea saldo anterior y posterior y confirme. El servidor debe volver a validar el saldo, evitar dobles pulsaciones con idempotencia y crear un movimiento negativo y un registro de canje.

>

> Los administradores autorizados pueden realizar ajustes manuales con motivo obligatorio. Las transacciones nunca se borran: una anulación crea una transacción inversa vinculada a la original. Audita usuario, establecimiento, saldo anterior, saldo posterior, fecha y motivo.

>

> Crea las tablas: profiles, organizations, organization_branding, locations, organization_users, user_location_assignments, loyalty_programs, program_locations, rewards, reward_locations, customers, customer_consents, memberships, membership_tokens, point_transactions, redemptions, wallet_passes, wallet_devices, acquisition_sources, acquisition_events, audit_logs y wallet_jobs. Aplica las relaciones, índices, restricciones únicas y políticas RLS necesarias.

>

> Implementa las operaciones backend seguras register_customer_and_membership, resolve_membership_qr, record_purchase, redeem_reward, adjust_points, reverse_transaction y request_wallet_update. El cálculo y cambio de saldo deben ser transaccionales. Controla concurrencia para que dos empleados no puedan gastar simultáneamente los mismos puntos.

>

> Para Wallet crea una abstracción WalletProvider con AppleWalletProvider y GoogleWalletProvider y métodos createPass, updatePass, revokePass, getPassStatus y retryUpdate. Si todavía no hay credenciales, crea un proveedor mock funcional y visible como sandbox, pero deja preparados estados, tablas, endpoints y variables de entorno reales. No simules una instalación real de Wallet.

>

> El backoffice del comercio debe incluir Inicio, Escanear, Clientes, Transacciones, Fidelización, Establecimientos, Captación y QR, Marca y tarjeta, Equipo y Configuración. El superadministrador debe incluir Resumen global, Organizaciones, Establecimientos, Clientes, Transacciones, Wallet, Usuarios y accesos, Auditoría y Configuración global.

>

> Incluye estados vacíos, carga, errores, confirmaciones, permisos de cámara denegados, alternativa mediante código corto, membresía suspendida, programa pausado, establecimiento no participante, saldo insuficiente, operación duplicada y error de actualización Wallet. Diseña todos los flujos esenciales para móvil y cumple contraste WCAG AA.

>

> Genera datos demo para Café Norte, con establecimientos Malasaña y Chamberí, programa compartido 1 € = 1 punto y recompensas Café gratis 100 puntos, Desayuno gratis 250 puntos y 10 % de descuento 400 puntos. Crea usuarios de cada rol y clientes con distintos saldos y estados.

>

> Desarrolla primero la base de datos, autenticación, roles y RLS; después configuración, captación, ledger de puntos, escáner, canjes, portal del cliente y finalmente integración Wallet. No añadas funciones fuera del alcance como TPV, pedidos, WhatsApp, cashback, gift cards o landing comercial.



---



# 20. Decisiones recomendadas para esta primera versión



1. Usar email obligatorio y autenticación del cliente sin contraseña.

2. Mantener puntos enteros y redondear hacia abajo.

3. No pedir teléfono ni fecha de nacimiento obligatorios.

4. No permitir que el cliente declare el importe de su compra.

5. No usar un QR público del comercio para sumar puntos.

6. Mantener separados el QR de captación y el QR personal del cliente.

7. Añadir el rol empleado desde el inicio para no compartir credenciales de administrador.

8. Usar un ledger inmutable de movimientos como fuente de verdad.

9. Permitir varias recompensas, aunque el piloto utilice una sola.

10. Preparar programas compartidos entre ubicaciones desde la base de datos.

11. Mantener Wallet detrás de una abstracción para probar el producto antes de completar todas las credenciales.

12. Posponer campañas, notificaciones comerciales y facturación SaaS hasta validar el flujo principal.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://digi-card-rewards.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fa25f32b-036f-440d-bd4f-16369b1932b8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
