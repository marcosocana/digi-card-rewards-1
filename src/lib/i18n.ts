import { useCallback, useEffect, useState } from "react";

export type Language = "es" | "ca" | "en";

const storageKey = "fideleo:language";
export const languageChangeEvent = "fideleo:language-changed";
type Values = Record<string, string | number>;
type Dictionary = Record<string, string>;

const ca: Dictionary = {
  Inicio: "Inici",
  Escáner: "Escàner",
  Clientes: "Clients",
  Campañas: "Campanyes",
  Programa: "Programa",
  Recompensas: "Recompenses",
  "Cupones y regalo": "Cupons i targetes regal",
  Notificaciones: "Notificacions",
  Automatizaciones: "Automatitzacions",
  Estadísticas: "Estadístiques",
  Captación: "Captació",
  Tienda: "Botiga",
  Actividad: "Activitat",
  Establecimientos: "Establiments",
  Equipo: "Equip",
  Usuarios: "Usuaris",
  "Mi suscripción": "La meva subscripció",
  Configuración: "Configuració",
  Operaciones: "Operacions",
  Fidelización: "Fidelització",
  Analítica: "Analítica",
  Administración: "Administració",
  Plataforma: "Plataforma",
  "Mi perfil": "El meu perfil",
  Superadmin: "Superadministrador",
  admin: "administrador",
  manager: "responsable",
  staff: "empleat",
  "Plan {plan}": "Pla {plan}",
  "Sin plan": "Sense pla",
  "Consulta tu plan, amplía sus límites o gestiona su cancelación.":
    "Consulta el teu pla, amplia'n els límits o gestiona'n la cancel·lació.",
  "Plan actual": "Pla actual",
  "Incluido en tu plan": "Inclòs en el teu pla",
  "No hay un plan activo asociado a esta cuenta.":
    "No hi ha cap pla actiu associat a aquest compte.",
  "Próxima renovación: {date}": "Pròxima renovació: {date}",
  "Mejorar el plan": "Millora el pla",
  "Cancelar plan": "Cancel·la el pla",
  "Cancelar suscripción": "Cancel·la la subscripció",
  "No se pudo abrir la gestión de la suscripción":
    "No s'ha pogut obrir la gestió de la subscripció",
  Administrador: "Administrador",
  Responsable: "Responsable",
  Empleado: "Empleat",
  "Todos los locales": "Tots els locals",
  "{count} locales": "{count} locals",
  "1 local": "1 local",
  "Cerrar menú": "Tanca el menú",
  "Abrir menú": "Obre el menú",
  "Cerrar sesión": "Tanca la sessió",
  "Cambiar tema": "Canvia el tema",
  "Mostrar textos del menú": "Mostra els textos del menú",
  "Ocultar textos del menú": "Amaga els textos del menú",
  "Mostrar menú": "Mostra el menú",
  "Contraer menú": "Contrau el menú",
  "Buscar una sección de Fideleo": "Cerca una secció de Fideleo",
  "Seleccionar idioma": "Selecciona l'idioma",
  Ayuda: "Ajuda",
  "¿Necesitas ayuda?": "Necessites ajuda?",
  "Ponte en contacto con el equipo de Fideleo y te ayudaremos con tu cuenta.":
    "Posa't en contacte amb l'equip de Fideleo i t'ajudarem amb el teu compte.",
  "Activar modo claro": "Activa el mode clar",
  "Activar modo oscuro": "Activa el mode fosc",
  "Modo claro": "Mode clar",
  "Modo oscuro": "Mode fosc",
  "Aún no perteneces a ninguna organización": "Encara no pertanys a cap organització",
  "Pide una invitación al administrador de tu empresa para acceder al panel.":
    "Demana una invitació a l'administrador de la teva empresa per accedir al panell.",
  Periodo: "Període",
  "Seleccionar periodo": "Selecciona el període",
  "No se pudieron cargar los indicadores": "No s'han pogut carregar els indicadors",
  Hoy: "Avui",
  Ayer: "Ahir",
  "Semana pasada": "Setmana passada",
  "Mes pasado": "Mes passat",
  "Año actual": "Any actual",
  "Rango personalizado": "Interval personalitzat",
  Desde: "Des de",
  Hasta: "Fins a",
  "Puntos emitidos": "Punts emesos",
  "Puntos canjeados": "Punts bescanviats",
  "Ventas asociadas": "Vendes associades",
  "Compras registradas": "Compres registrades",
  "Ticket medio": "Tiquet mitjà",
  "+{count} nuevos": "+{count} nous",
  "{count} canjes": "{count} bescanvis",
  "Oportunidad del mes": "Oportunitat del mes",
  "Has registrado {members} nuevas altas y {redemptions} canjes en el periodo seleccionado. Revisa los clientes próximos a recompensa para impulsar su próxima visita.":
    "Has registrat {members} altes noves i {redemptions} bescanvis en el període seleccionat. Revisa els clients propers a una recompensa per impulsar la seva pròxima visita.",
  "Crear campaña de retorno": "Crea una campanya de retorn",
  "Actividad reciente": "Activitat recent",
  "Ver clientes": "Veure clients",
  "Todavía no hay movimientos.": "Encara no hi ha moviments.",
  "Por establecimiento": "Per establiment",
  "Ventas asociadas · periodo seleccionado": "Vendes associades · període seleccionat",
  "Gráfica de ventas asociadas por establecimiento": "Gràfic de vendes associades per establiment",
  "Todavía no hay ventas asociadas.": "Encara no hi ha vendes associades.",
  "{count} compras": "{count} compres",
  Compra: "Compra",
  Canje: "Bescanvi",
  "Ajuste manual": "Ajust manual",
  Anulación: "Anul·lació",
  "Saldo inicial": "Saldo inicial",
  Caducidad: "Caducitat",
  "Ver detalle": "Veure detall",
  "Roles y permisos de acceso al panel.": "Rols i permisos d'accés al panell.",
  Invitar: "Convida",
  "Invitar a una persona": "Convida una persona",
  "Recibirá el rol al crear su cuenta con este email.":
    "Rebrà el rol quan creï el seu compte amb aquest correu electrònic.",
  "Establecimientos asignados": "Establiments assignats",
  Nombre: "Nom",
  Rol: "Rol",
  "Enviar invitación": "Envia la invitació",
  "cuenta activa": "compte actiu",
  "pendiente de registro": "pendent de registre",
  "Todos los establecimientos": "Tots els establiments",
  "{count} establecimientos": "{count} establiments",
  "1 establecimiento": "1 establiment",
  "Selecciona establecimientos": "Selecciona establiments",
  "Sin establecimientos": "Sense establiments",
  "Editar {name}": "Edita {name}",
  "Editar perfil del equipo": "Edita el perfil de l'equip",
  "Actualiza sus datos, rol y establecimientos asignados.":
    "Actualitza les seves dades, el rol i els establiments assignats.",
  "Guardar cambios": "Desa els canvis",
  "Introduce un email válido": "Introdueix un correu electrònic vàlid",
  "Asigna al menos un establecimiento": "Assigna com a mínim un establiment",
  "No se pudo invitar": "No s'ha pogut convidar",
  "Usuario creado, pero no se pudo asignar el establecimiento":
    "S'ha creat l'usuari, però no s'ha pogut assignar l'establiment",
  "Invitación creada": "Invitació creada",
  "Al registrarse con ese email heredará el rol.":
    "Quan es registri amb aquest correu electrònic heretarà el rol.",
  "No se pudo actualizar": "No s'ha pogut actualitzar",
  "No se pudieron actualizar los establecimientos": "No s'han pogut actualitzar els establiments",
  "No se pudo asignar el establecimiento": "No s'ha pogut assignar l'establiment",
  "Perfil del equipo actualizado": "Perfil de l'equip actualitzat",
  Caja: "Caixa",
  "Cupones y tarjetas regalo": "Cupons i targetes regal",
  "Programa de fidelización": "Programa de fidelització",
  "Publicar tu club": "Publica el teu club",
  Cliente: "Client",
  "Datos, identidad y presencia pública del negocio.":
    "Dades, identitat i presència pública del negoci.",
  "Mensajes activados por comportamiento, fechas y recompensas.":
    "Missatges activats pel comportament, les dates i les recompenses.",
  "Miembros del programa y su saldo actual.": "Membres del programa i el seu saldo actual.",
  "Registro auditable de acciones sensibles.": "Registre auditable d'accions sensibles.",
  "Escanea la tarjeta o busca al cliente para registrar una operación.":
    "Escaneja la targeta o cerca el client per registrar una operació.",
  "Beneficios monetarios con uso, saldo e historial controlados en backend.":
    "Beneficis monetaris amb ús, saldo i historial controlats al servidor.",
  "Crea, programa y controla las iniciativas de fidelización.":
    "Crea, programa i controla les iniciatives de fidelització.",
  "Cada local tiene su propio QR de captación y su equipo asignado.":
    "Cada local té el seu propi QR de captació i el seu equip assignat.",
  "Materiales para dar visibilidad a tu club en cada punto de contacto.":
    "Materials per donar visibilitat al teu club en cada punt de contacte.",
  "Evolución anual, actividad, ingresos registrados y fidelidad.":
    "Evolució anual, activitat, ingressos registrats i fidelitat.",
  "QR y enlaces públicos de alta por establecimiento.":
    "QR i enllaços públics d'alta per establiment.",
  "Mensajes Wallet segmentados, con límite diario validado en backend.":
    "Missatges de Wallet segmentats, amb límit diari validat al servidor.",
  "Estado de las tarjetas digitales. El proveedor está en modo simulación hasta cargar los certificados.":
    "Estat de les targetes digitals. El proveïdor està en mode simulació fins que es carreguin els certificats.",
  "Enviar mensaje de retorno": "Envia un missatge de retorn",
  "Gestiona las tarjetas digitales y personaliza su aspecto visual.":
    "Gestiona les targetes digitals i personalitza'n l'aspecte visual.",
  "Consulta el uso de cada Wallet y personaliza el aspecto de las tarjetas.":
    "Consulta l'ús de cada Wallet i personalitza l'aspecte de les targetes.",
  Conectado: "Connectat",
  Incompleto: "Incomplet",
  "Uso general de las tarjetas emitidas para Google Wallet.":
    "Ús general de les targetes emeses per a Google Wallet.",
  "Métricas preparadas para la futura integración con Apple Wallet.":
    "Mètriques preparades per a la futura integració amb Apple Wallet.",
  "Tarjetas emitidas": "Targetes emeses",
  "Tarjetas activas": "Targetes actives",
  Pendientes: "Pendents",
  "En pruebas": "En proves",
  "Integración en preparación": "Integració en preparació",
  "Puedes adelantar el diseño visual. La emisión y actualización de pases Apple se activará cuando se incorporen sus credenciales.":
    "Pots avançar el disseny visual. L'emissió i l'actualització de passis Apple s'activarà quan s'incorporin les credencials.",
  "Diseño del pase {provider}": "Disseny del passi {provider}",
  "Personaliza el aspecto del pase digital y comprueba el resultado en tiempo real.":
    "Personalitza l'aspecte del passi digital i comprova el resultat en temps real.",
  Resumen: "Resum",
  "Personalizar tarjeta": "Personalitza la targeta",
  "Tarjetas totales": "Targetes totals",
  "Pendientes de actualizar": "Pendents d'actualitzar",
  "Proveedor de emisión": "Proveïdor d'emissió",
  "Google Wallet está conectado. Las tarjetas se generan desde el perfil de cada cliente y conservan su saldo actualizado.":
    "Google Wallet està connectat. Les targetes es generen des del perfil de cada client i mantenen el saldo actualitzat.",
  "Aspecto de la tarjeta": "Aspecte de la targeta",
  "Los cambios aparecen al instante en la vista previa.":
    "Els canvis apareixen a l'instant a la vista prèvia.",
  "Nombre del programa": "Nom del programa",
  "Color de la tarjeta": "Color de la targeta",
  "Color del texto": "Color del text",
  "Etiqueta del saldo": "Etiqueta del saldo",
  "Logo de la tarjeta": "Logotip de la targeta",
  "Imagen destacada": "Imatge destacada",
  "Recomendado: imagen horizontal de al menos 1032 × 336 px.":
    "Recomanat: imatge horitzontal d'almenys 1032 × 336 px.",
  "Guardar diseño": "Desa el disseny",
  "Diseño de Wallet actualizado": "Disseny de Wallet actualitzat",
  "En tiempo real": "En temps real",
  "Tarjeta de fidelidad": "Targeta de fidelitat",
  "Vista previa del logo": "Vista prèvia del logotip",
  "Vista previa de la imagen destacada": "Vista prèvia de la imatge destacada",
  "La posición final puede variar ligeramente según el dispositivo y la versión de Wallet.":
    "La posició final pot variar lleugerament segons el dispositiu i la versió de Wallet.",
  "Formato no compatible": "Format no compatible",
  "Utiliza PNG, JPG o WebP.": "Utilitza PNG, JPG o WebP.",
  "La imagen no puede superar 5 MB": "La imatge no pot superar els 5 MB",
  "No se pudo subir la imagen": "No s'ha pogut pujar la imatge",
  "No se pudo preparar la imagen": "No s'ha pogut preparar la imatge",
  "Imagen preparada": "Imatge preparada",
  "Completa el nombre del programa y la etiqueta de puntos":
    "Completa el nom del programa i l'etiqueta de punts",
  Seleccionar: "Selecciona",
  Cambiar: "Canvia",
  Quitar: "Treu",
  "Gestiona tus datos personales y el acceso a tu cuenta.":
    "Gestiona les teves dades personals i l'accés al teu compte.",
  "Catálogo canjeable por puntos en tus establecimientos.":
    "Catàleg bescanviable per punts als teus establiments.",
  "Configura y previsualiza el programa en cinco pasos. Puedes continuar más tarde.":
    "Configura i previsualitza el programa en cinc passos. Pots continuar més tard.",
  "Sin clientes todavía": "Encara no hi ha clients",
  "Comparte el QR de captación de tus establecimientos para empezar a sumar miembros.":
    "Comparteix el QR de captació dels teus establiments per començar a sumar membres.",
  "Sin campañas": "Sense campanyes",
  "Crea una campaña y guárdala como borrador antes de publicarla.":
    "Crea una campanya i desa-la com a esborrany abans de publicar-la.",
  "Crea el primero para empezar a operar.": "Crea el primer per començar a operar.",
  "Sin notificaciones": "Sense notificacions",
  "Crea una notificación y selecciona un segmento de clientes.":
    "Crea una notificació i selecciona un segment de clients.",
  "Sin programa configurado": "Sense cap programa configurat",
  "Crea un programa desde la plataforma.": "Crea un programa des de la plataforma.",
  "Aún no hay recompensas": "Encara no hi ha recompenses",
  "Crea la primera para que tus clientes tengan un objetivo.":
    "Crea la primera perquè els teus clients tinguin un objectiu.",
  "Elige un plan para acceder a Fideleo": "Tria un pla per accedir a Fideleo",
  "Tu cuenta ya está creada. Activa uno de los planes para desbloquear el panel de gestión.":
    "El teu compte ja està creat. Activa un dels plans per desbloquejar el panell de gestió.",
  "Plan activado": "Pla activat",
  "Estamos confirmando el pago con Stripe…": "Estem confirmant el pagament amb Stripe…",
  "El pago todavía se está validando. Puedes volver a comprobarlo.":
    "El pagament encara s'està validant. Pots tornar a comprovar-lo.",
  "Más elegido": "Més escollit",
  "al mes · IVA no incluido": "al mes · IVA no inclòs",
  "Hasta 1.000 clientes": "Fins a 1.000 clients",
  "Tarjeta digital y QR": "Targeta digital i QR",
  "Panel de métricas": "Panell de mètriques",
  "Hasta 3 establecimientos": "Fins a 3 establiments",
  "Hasta 15 establecimientos": "Fins a 15 establiments",
  "Hasta 5.000 clientes": "Fins a 5.000 clients",
  "Notificaciones y automatizaciones": "Notificacions i automatitzacions",
  "Soporte prioritario": "Suport prioritari",
  "Establecimientos ilimitados": "Establiments il·limitats",
  "Clientes ilimitados": "Clients il·limitats",
  "Integraciones a medida": "Integracions a mida",
  "Acompañamiento dedicado": "Acompanyament dedicat",
  "Elegir plan": "Triar pla",
  "Solicitar plan": "Sol·licitar pla",
  "Comprobar acceso": "Comprovar l'accés",
  "Solo un administrador puede contratar el plan": "Només un administrador pot contractar el pla",
  "No se pudo iniciar el pago": "No s'ha pogut iniciar el pagament",
  "No se pudo iniciar el cambio de plan": "No s'ha pogut iniciar el canvi de pla",
  "Necesitas un plan superior": "Necessites un pla superior",
  "Has alcanzado el máximo de establecimientos de tu plan {plan}.":
    "Has arribat al màxim d'establiments del teu pla {plan}.",
  "Elige un plan para añadir más establecimientos.": "Tria un pla per afegir més establiments.",
  "Mejorar a {plan}": "Millora a {plan}",
  "Ya tienes el plan con mayor capacidad. Contacta con Fideleo si necesitas más establecimientos.":
    "Ja tens el pla amb més capacitat. Contacta amb Fideleo si necessites més establiments.",
  "Pide a un administrador de la cuenta que seleccione el plan.":
    "Demana a un administrador del compte que seleccioni el pla.",
};

const en: Dictionary = {
  Inicio: "Home",
  Escáner: "Scanner",
  Clientes: "Customers",
  Campañas: "Campaigns",
  Programa: "Program",
  Recompensas: "Rewards",
  "Cupones y regalo": "Coupons & gift cards",
  Notificaciones: "Notifications",
  Automatizaciones: "Automations",
  Estadísticas: "Analytics",
  Captación: "Acquisition",
  Tienda: "Store",
  Actividad: "Activity",
  Establecimientos: "Locations",
  Equipo: "Team",
  Usuarios: "Users",
  "Mi suscripción": "My subscription",
  Configuración: "Settings",
  Operaciones: "Operations",
  Fidelización: "Loyalty",
  Analítica: "Analytics",
  Administración: "Administration",
  Plataforma: "Platform",
  "Mi perfil": "My profile",
  Superadmin: "Super admin",
  admin: "administrator",
  manager: "manager",
  staff: "employee",
  "Plan {plan}": "{plan} plan",
  "Sin plan": "No plan",
  "Consulta tu plan, amplía sus límites o gestiona su cancelación.":
    "Review your plan, increase its limits, or manage cancellation.",
  "Plan actual": "Current plan",
  "Incluido en tu plan": "Included in your plan",
  "No hay un plan activo asociado a esta cuenta.":
    "There is no active plan associated with this account.",
  "Próxima renovación: {date}": "Next renewal: {date}",
  "Mejorar el plan": "Upgrade plan",
  "Cancelar plan": "Cancel plan",
  "Cancelar suscripción": "Cancel subscription",
  "No se pudo abrir la gestión de la suscripción": "Subscription management could not be opened",
  Administrador: "Administrator",
  Responsable: "Manager",
  Empleado: "Employee",
  "Todos los locales": "All locations",
  "{count} locales": "{count} locations",
  "1 local": "1 location",
  "Cerrar menú": "Close menu",
  "Abrir menú": "Open menu",
  "Cerrar sesión": "Sign out",
  "Cambiar tema": "Change theme",
  "Mostrar textos del menú": "Show menu labels",
  "Ocultar textos del menú": "Hide menu labels",
  "Mostrar menú": "Show menu",
  "Contraer menú": "Collapse menu",
  "Buscar una sección de Fideleo": "Search Fideleo sections",
  "Seleccionar idioma": "Select language",
  Ayuda: "Help",
  "¿Necesitas ayuda?": "Need help?",
  "Ponte en contacto con el equipo de Fideleo y te ayudaremos con tu cuenta.":
    "Contact the Fideleo team and we will help you with your account.",
  "Activar modo claro": "Enable light mode",
  "Activar modo oscuro": "Enable dark mode",
  "Modo claro": "Light mode",
  "Modo oscuro": "Dark mode",
  "Aún no perteneces a ninguna organización": "You do not belong to an organization yet",
  "Pide una invitación al administrador de tu empresa para acceder al panel.":
    "Ask your company administrator for an invitation to access the dashboard.",
  Periodo: "Period",
  "Seleccionar periodo": "Select period",
  "No se pudieron cargar los indicadores": "The indicators could not be loaded",
  Hoy: "Today",
  Ayer: "Yesterday",
  "Semana pasada": "Last week",
  "Mes pasado": "Last month",
  "Año actual": "Current year",
  "Rango personalizado": "Custom range",
  Desde: "From",
  Hasta: "To",
  "Puntos emitidos": "Points issued",
  "Puntos canjeados": "Points redeemed",
  "Ventas asociadas": "Attributed sales",
  "Compras registradas": "Recorded purchases",
  "Ticket medio": "Average order value",
  "+{count} nuevos": "+{count} new",
  "{count} canjes": "{count} redemptions",
  "Oportunidad del mes": "Opportunity of the month",
  "Has registrado {members} nuevas altas y {redemptions} canjes en el periodo seleccionado. Revisa los clientes próximos a recompensa para impulsar su próxima visita.":
    "You recorded {members} new sign-ups and {redemptions} redemptions in the selected period. Review customers who are close to a reward to encourage their next visit.",
  "Crear campaña de retorno": "Create a return campaign",
  "Actividad reciente": "Recent activity",
  "Ver clientes": "View customers",
  "Todavía no hay movimientos.": "There is no activity yet.",
  "Por establecimiento": "By location",
  "Ventas asociadas · periodo seleccionado": "Attributed sales · selected period",
  "Gráfica de ventas asociadas por establecimiento": "Attributed sales by location chart",
  "Todavía no hay ventas asociadas.": "There are no attributed sales yet.",
  "{count} compras": "{count} purchases",
  Compra: "Purchase",
  Canje: "Redemption",
  "Ajuste manual": "Manual adjustment",
  Anulación: "Reversal",
  "Saldo inicial": "Initial balance",
  Caducidad: "Expiry",
  "Ver detalle": "View details",
  "Roles y permisos de acceso al panel.": "Dashboard access roles and permissions.",
  Invitar: "Invite",
  "Invitar a una persona": "Invite someone",
  "Recibirá el rol al crear su cuenta con este email.":
    "They will receive this role when they create an account with this email.",
  "Establecimientos asignados": "Assigned locations",
  Nombre: "Name",
  Rol: "Role",
  "Enviar invitación": "Send invitation",
  "cuenta activa": "active account",
  "pendiente de registro": "pending registration",
  "Todos los establecimientos": "All locations",
  "{count} establecimientos": "{count} locations",
  "1 establecimiento": "1 location",
  "Selecciona establecimientos": "Select locations",
  "Sin establecimientos": "No locations",
  "Editar {name}": "Edit {name}",
  "Editar perfil del equipo": "Edit team profile",
  "Actualiza sus datos, rol y establecimientos asignados.":
    "Update their details, role and assigned locations.",
  "Guardar cambios": "Save changes",
  "Introduce un email válido": "Enter a valid email address",
  "Asigna al menos un establecimiento": "Assign at least one location",
  "No se pudo invitar": "Could not send the invitation",
  "Usuario creado, pero no se pudo asignar el establecimiento":
    "The user was created, but the location could not be assigned",
  "Invitación creada": "Invitation created",
  "Al registrarse con ese email heredará el rol.":
    "They will inherit the role when registering with that email.",
  "No se pudo actualizar": "Could not update the profile",
  "No se pudieron actualizar los establecimientos": "Could not update the locations",
  "No se pudo asignar el establecimiento": "Could not assign the location",
  "Perfil del equipo actualizado": "Team profile updated",
  Caja: "Checkout",
  "Cupones y tarjetas regalo": "Coupons & gift cards",
  "Programa de fidelización": "Loyalty program",
  "Publicar tu club": "Publish your club",
  Cliente: "Customer",
  "Datos, identidad y presencia pública del negocio.":
    "Business details, identity and public presence.",
  "Mensajes activados por comportamiento, fechas y recompensas.":
    "Messages triggered by behavior, dates and rewards.",
  "Miembros del programa y su saldo actual.": "Program members and their current balance.",
  "Registro auditable de acciones sensibles.": "Auditable log of sensitive actions.",
  "Escanea la tarjeta o busca al cliente para registrar una operación.":
    "Scan the card or find the customer to record a transaction.",
  "Beneficios monetarios con uso, saldo e historial controlados en backend.":
    "Monetary benefits with server-controlled usage, balance and history.",
  "Crea, programa y controla las iniciativas de fidelización.":
    "Create, schedule and manage loyalty initiatives.",
  "Cada local tiene su propio QR de captación y su equipo asignado.":
    "Each location has its own acquisition QR code and assigned team.",
  "Materiales para dar visibilidad a tu club en cada punto de contacto.":
    "Materials that make your club visible at every customer touchpoint.",
  "Evolución anual, actividad, ingresos registrados y fidelidad.":
    "Annual trends, activity, recorded revenue and loyalty.",
  "QR y enlaces públicos de alta por establecimiento.":
    "QR codes and public sign-up links for each location.",
  "Mensajes Wallet segmentados, con límite diario validado en backend.":
    "Segmented Wallet messages with a server-enforced daily limit.",
  "Estado de las tarjetas digitales. El proveedor está en modo simulación hasta cargar los certificados.":
    "Digital card status. The provider remains in simulation mode until certificates are uploaded.",
  "Enviar mensaje de retorno": "Send a return message",
  "Gestiona las tarjetas digitales y personaliza su aspecto visual.":
    "Manage digital cards and customize their visual appearance.",
  "Consulta el uso de cada Wallet y personaliza el aspecto de las tarjetas.":
    "Review usage for each Wallet and customize the cards' appearance.",
  Conectado: "Connected",
  Incompleto: "Incomplete",
  "Uso general de las tarjetas emitidas para Google Wallet.":
    "Overall usage of cards issued for Google Wallet.",
  "Métricas preparadas para la futura integración con Apple Wallet.":
    "Metrics prepared for the future Apple Wallet integration.",
  "Tarjetas emitidas": "Cards issued",
  "Tarjetas activas": "Active cards",
  Pendientes: "Pending",
  "En pruebas": "Test cards",
  "Integración en preparación": "Integration in progress",
  "Puedes adelantar el diseño visual. La emisión y actualización de pases Apple se activará cuando se incorporen sus credenciales.":
    "You can prepare the visual design now. Apple pass issuance and updates will be enabled when its credentials are added.",
  "Diseño del pase {provider}": "{provider} pass design",
  "Personaliza el aspecto del pase digital y comprueba el resultado en tiempo real.":
    "Customize the digital pass and preview the result in real time.",
  Resumen: "Overview",
  "Personalizar tarjeta": "Customize card",
  "Tarjetas totales": "Total cards",
  "Pendientes de actualizar": "Pending updates",
  "Proveedor de emisión": "Issuing provider",
  "Google Wallet está conectado. Las tarjetas se generan desde el perfil de cada cliente y conservan su saldo actualizado.":
    "Google Wallet is connected. Cards are generated from each customer profile and keep their balance updated.",
  "Aspecto de la tarjeta": "Card appearance",
  "Los cambios aparecen al instante en la vista previa.":
    "Changes appear instantly in the preview.",
  "Nombre del programa": "Program name",
  "Color de la tarjeta": "Card color",
  "Color del texto": "Text color",
  "Etiqueta del saldo": "Balance label",
  "Logo de la tarjeta": "Card logo",
  "Imagen destacada": "Hero image",
  "Recomendado: imagen horizontal de al menos 1032 × 336 px.":
    "Recommended: a landscape image of at least 1032 × 336 px.",
  "Guardar diseño": "Save design",
  "Diseño de Wallet actualizado": "Wallet design updated",
  "En tiempo real": "Live",
  "Tarjeta de fidelidad": "Loyalty card",
  "Vista previa del logo": "Logo preview",
  "Vista previa de la imagen destacada": "Hero image preview",
  "La posición final puede variar ligeramente según el dispositivo y la versión de Wallet.":
    "The final layout may vary slightly depending on the device and Wallet version.",
  "Formato no compatible": "Unsupported format",
  "Utiliza PNG, JPG o WebP.": "Use PNG, JPG or WebP.",
  "La imagen no puede superar 5 MB": "The image cannot exceed 5 MB",
  "No se pudo subir la imagen": "The image could not be uploaded",
  "No se pudo preparar la imagen": "The image could not be prepared",
  "Imagen preparada": "Image ready",
  "Completa el nombre del programa y la etiqueta de puntos":
    "Complete the program name and points label",
  Seleccionar: "Select",
  Cambiar: "Change",
  Quitar: "Remove",
  "Gestiona tus datos personales y el acceso a tu cuenta.":
    "Manage your personal details and account access.",
  "Catálogo canjeable por puntos en tus establecimientos.":
    "A catalog customers can redeem with points at your locations.",
  "Configura y previsualiza el programa en cinco pasos. Puedes continuar más tarde.":
    "Configure and preview the program in five steps. You can continue later.",
  "Sin clientes todavía": "No customers yet",
  "Comparte el QR de captación de tus establecimientos para empezar a sumar miembros.":
    "Share your locations' acquisition QR code to start adding members.",
  "Sin campañas": "No campaigns",
  "Crea una campaña y guárdala como borrador antes de publicarla.":
    "Create a campaign and save it as a draft before publishing it.",
  "Crea el primero para empezar a operar.": "Create the first one to get started.",
  "Sin notificaciones": "No notifications",
  "Crea una notificación y selecciona un segmento de clientes.":
    "Create a notification and select a customer segment.",
  "Sin programa configurado": "No program configured",
  "Crea un programa desde la plataforma.": "Create a program from the platform.",
  "Aún no hay recompensas": "No rewards yet",
  "Crea la primera para que tus clientes tengan un objetivo.":
    "Create the first one so your customers have a goal.",
  "Elige un plan para acceder a Fideleo": "Choose a plan to access Fideleo",
  "Tu cuenta ya está creada. Activa uno de los planes para desbloquear el panel de gestión.":
    "Your account is ready. Activate a plan to unlock the management dashboard.",
  "Plan activado": "Plan activated",
  "Estamos confirmando el pago con Stripe…": "We are confirming your payment with Stripe…",
  "El pago todavía se está validando. Puedes volver a comprobarlo.":
    "Your payment is still being validated. You can check again.",
  "Más elegido": "Most popular",
  "al mes · IVA no incluido": "per month · VAT not included",
  "Hasta 1.000 clientes": "Up to 1,000 customers",
  "Tarjeta digital y QR": "Digital card and QR",
  "Panel de métricas": "Metrics dashboard",
  "Hasta 3 establecimientos": "Up to 3 locations",
  "Hasta 15 establecimientos": "Up to 15 locations",
  "Hasta 5.000 clientes": "Up to 5,000 customers",
  "Notificaciones y automatizaciones": "Notifications and automations",
  "Soporte prioritario": "Priority support",
  "Establecimientos ilimitados": "Unlimited locations",
  "Clientes ilimitados": "Unlimited customers",
  "Integraciones a medida": "Custom integrations",
  "Acompañamiento dedicado": "Dedicated support",
  "Elegir plan": "Choose plan",
  "Solicitar plan": "Request plan",
  "Comprobar acceso": "Check access",
  "Solo un administrador puede contratar el plan": "Only an administrator can purchase a plan",
  "No se pudo iniciar el pago": "Could not start payment",
  "No se pudo iniciar el cambio de plan": "Could not start the plan change",
  "Necesitas un plan superior": "You need a higher plan",
  "Has alcanzado el máximo de establecimientos de tu plan {plan}.":
    "You have reached the location limit for your {plan} plan.",
  "Elige un plan para añadir más establecimientos.": "Choose a plan to add more locations.",
  "Mejorar a {plan}": "Upgrade to {plan}",
  "Ya tienes el plan con mayor capacidad. Contacta con Fideleo si necesitas más establecimientos.":
    "You already have the highest-capacity plan. Contact Fideleo if you need more locations.",
  "Pide a un administrador de la cuenta que seleccione el plan.":
    "Ask an account administrator to select the plan.",
};

const dictionaries: Record<Exclude<Language, "es">, Dictionary> = { ca, en };

const storedLanguage = (): Language => {
  if (typeof window === "undefined") return "es";
  const stored = window.localStorage.getItem(storageKey);
  return stored === "ca" || stored === "en" ? stored : "es";
};

export const translate = (key: string, language: Language, values: Values = {}) => {
  const template = language === "es" ? key : (dictionaries[language][key] ?? key);
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
};

export function useI18n() {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const saved = storedLanguage();
    setLanguageState(saved);
    document.documentElement.lang = saved;
    const update = (event: Event) => {
      setLanguageState((event as CustomEvent<Language>).detail ?? storedLanguage());
    };
    window.addEventListener(languageChangeEvent, update);
    return () => window.removeEventListener(languageChangeEvent, update);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    window.localStorage.setItem(storageKey, next);
    document.documentElement.lang = next;
    setLanguageState(next);
    window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: next }));
  }, []);

  const t = useCallback(
    (key: string, values?: Values) => translate(key, language, values),
    [language],
  );

  return { language, setLanguage, t };
}
