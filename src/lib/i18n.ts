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
