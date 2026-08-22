import { Link } from "@tanstack/react-router";

export type LegalDocumentType = "terminos" | "privacidad" | "aviso-legal" | "cookies";

export interface LegalEntity {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  registryDetails?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

const titles: Record<LegalDocumentType, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  "aviso-legal": "Aviso legal",
  cookies: "Política de cookies",
};

export function LegalDocumentLayout({
  type,
  entity,
  backTo,
  customText,
  programTerms,
  isCustomer = false,
}: {
  type: LegalDocumentType;
  entity: LegalEntity;
  backTo: string;
  customText?: string | null;
  programTerms?: string | null;
  isCustomer?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-8 text-[#171717] sm:py-12">
      <article className="mx-auto max-w-3xl rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center justify-between gap-4 border-b pb-6">
          <Link to={backTo} className="flex items-center gap-2" aria-label="Volver">
            <img src="/isotipo.svg" alt="" className="size-8" />
            <span className="text-sm font-semibold">{entity.name}</span>
          </Link>
          <span className="text-xs text-black/45">Actualizado: 22/08/2026</span>
        </div>
        <h1 className="mt-9 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
          {titles[type]}
        </h1>
        {customText ? (
          <div className="mt-8 whitespace-pre-wrap text-sm leading-7 text-black/70">
            {customText}
          </div>
        ) : (
          <DefaultLegalContent
            type={type}
            entity={entity}
            programTerms={programTerms}
            isCustomer={isCustomer}
          />
        )}
        <p className="mt-10 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          Este texto es una plantilla operativa y debe ser revisado por el responsable legal antes
          de su publicación definitiva, especialmente los datos identificativos, plazos de
          conservación, proveedores y transferencias internacionales.
        </p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-black/65">{children}</div>
    </section>
  );
}

function Identity({ entity }: { entity: LegalEntity }) {
  return (
    <ul className="list-disc pl-5">
      <li>Responsable: {entity.legalName || entity.name}</li>
      {entity.taxId ? <li>NIF/CIF: {entity.taxId}</li> : null}
      {entity.address ? <li>Domicilio: {entity.address}</li> : null}
      {entity.registryDetails ? <li>Registro: {entity.registryDetails}</li> : null}
      {entity.email ? <li>Email: {entity.email}</li> : null}
      {entity.phone ? <li>Teléfono: {entity.phone}</li> : null}
    </ul>
  );
}

function DefaultLegalContent({
  type,
  entity,
  programTerms,
  isCustomer,
}: {
  type: LegalDocumentType;
  entity: LegalEntity;
  programTerms?: string | null;
  isCustomer: boolean;
}) {
  if (type === "aviso-legal")
    return (
      <>
        <Section title="1. Titular del sitio">
          <Identity entity={entity} />
          <p>
            El acceso a este sitio atribuye la condición de usuario e implica la aceptación de las
            condiciones aquí recogidas.
          </p>
        </Section>
        <Section title="2. Objeto">
          <p>
            Este sitio facilita información sobre{" "}
            {isCustomer
              ? "el programa de fidelización del establecimiento, el registro de clientes y el acceso a la tarjeta digital"
              : "los servicios de Fideleo y el acceso a su plataforma de gestión"}
            .
          </p>
        </Section>
        <Section title="3. Uso responsable">
          <p>
            El usuario se compromete a utilizar el sitio de forma lícita, sin causar daños,
            interferencias o accesos no autorizados. Los contenidos, marcas y elementos gráficos
            pertenecen a sus respectivos titulares.
          </p>
        </Section>
        <Section title="4. Responsabilidad y enlaces">
          <p>
            El titular procura mantener la información disponible y segura, pero no garantiza la
            ausencia absoluta de errores o interrupciones. Los enlaces externos se ofrecen como
            referencia y quedan sujetos a las condiciones de sus titulares.
          </p>
        </Section>
      </>
    );

  if (type === "privacidad")
    return (
      <>
        <Section title="1. Responsable">
          <Identity entity={entity} />
          {isCustomer ? (
            <p>
              El negocio es responsable de los datos utilizados para gestionar su programa de
              fidelización. Fideleo presta la plataforma tecnológica y actúa como proveedor
              encargado del tratamiento conforme al contrato aplicable.
            </p>
          ) : null}
        </Section>
        <Section title="2. Datos y finalidades">
          <p>
            Se tratan los datos facilitados en formularios, datos identificativos y de contacto,
            preferencias, consentimientos y, en los clubes, actividad de visitas, puntos, compras
            asociadas y recompensas.
          </p>
          <p>
            Las finalidades son gestionar la relación solicitada, verificar el email, prestar el
            programa de fidelización, atender consultas, prevenir abusos y, solo cuando exista
            consentimiento independiente, enviar comunicaciones comerciales.
          </p>
        </Section>
        <Section title="3. Legitimación">
          <p>
            La gestión del registro y del programa se basa en la ejecución de la relación solicitada
            y la aceptación de sus condiciones. Las comunicaciones promocionales se basan en el
            consentimiento, que puede retirarse en cualquier momento sin afectar al resto del
            servicio. También pueden tratarse datos para cumplir obligaciones legales o proteger la
            seguridad del servicio.
          </p>
        </Section>
        <Section title="4. Conservación y destinatarios">
          <p>
            Los datos se conservarán mientras la relación permanezca activa y posteriormente durante
            los plazos necesarios para atender responsabilidades legales. Podrán acceder proveedores
            tecnológicos sujetos a contrato y autoridades cuando exista obligación legal.
          </p>
        </Section>
        <Section title="5. Derechos">
          <p>
            Puedes solicitar acceso, rectificación, supresión, portabilidad, limitación u oposición,
            y retirar consentimientos escribiendo al email indicado. También puedes reclamar ante la
            Agencia Española de Protección de Datos.
          </p>
        </Section>
      </>
    );

  if (type === "cookies")
    return (
      <>
        <Section title="1. Uso de cookies">
          <p>
            Este sitio utiliza almacenamiento y tecnologías técnicas necesarias para mantener la
            seguridad, recordar el estado de sesión y prestar las funciones solicitadas. No se
            utilizan con fines publicitarios en la configuración actual.
          </p>
        </Section>
        <Section title="2. Cookies opcionales">
          <p>
            Si en el futuro se incorporan analítica, personalización no esencial o publicidad, se
            solicitará consentimiento previo mediante un panel que permita aceptar o rechazar con la
            misma facilidad.
          </p>
        </Section>
        <Section title="3. Gestión">
          <p>
            Puedes eliminar o bloquear cookies desde la configuración del navegador. Al hacerlo,
            algunas funciones técnicas pueden dejar de estar disponibles.
          </p>
        </Section>
      </>
    );

  return (
    <>
      <Section title="1. Participación">
        <p>
          El programa permite acumular puntos o progreso y obtener las recompensas definidas por{" "}
          {entity.name}. El registro es personal, requiere información veraz y la verificación de la
          dirección de email.
        </p>
      </Section>
      <Section title="2. Uso de la tarjeta">
        <p>
          La tarjeta digital es personal y no debe cederse ni utilizarse de forma fraudulenta. El
          negocio puede solicitar información razonable para comprobar la titularidad y corregir
          errores operativos.
        </p>
      </Section>
      <Section title="3. Puntos y recompensas">
        <p>
          Los puntos no son dinero, no generan intereses y no pueden canjearse por efectivo. Las
          recompensas están sujetas a disponibilidad, condiciones, fechas y establecimientos
          participantes.
        </p>
        {programTerms ? (
          <div className="whitespace-pre-wrap rounded-xl bg-black/5 p-4">{programTerms}</div>
        ) : null}
      </Section>
      <Section title="4. Cambios y baja">
        <p>
          El negocio podrá modificar o finalizar el programa informando con antelación razonable
          cuando sea posible. Podrá suspender cuentas por fraude o incumplimiento. El cliente puede
          solicitar la baja y eliminación de su cuenta a través del email de contacto.
        </p>
      </Section>
    </>
  );
}
