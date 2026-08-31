import { expect, test, type Page } from "@playwright/test";

const watchCriticalFailures = (page: Page) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    const hostname = new URL(response.url()).hostname;
    const isApplicationRequest =
      hostname === "127.0.0.1" || hostname === "localhost" || hostname.endsWith("supabase.co");
    if (response.status() >= 500 || (isApplicationRequest && response.status() >= 400)) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  return failures;
};

const signIn = async (page: Page, email: string, next = "/panel") => {
  await page.goto(`/auth?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(email);
  await page
    .getByRole("tabpanel", { name: "Iniciar sesión" })
    .getByRole("button", { name: "Entrar", exact: true })
    .click();
  await page.waitForURL(/\/panel(?:\/|$)/, { timeout: 30_000 });
};

test("the public home, navigation and 404 render without critical failures", async ({ page }) => {
  const failures = watchCriticalFailures(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Acceder" }).first()).toHaveAttribute(
    "href",
    /\/auth/,
  );
  await page.goto("/ruta-que-no-existe");
  await expect(page.getByRole("heading", { name: "Esta visita no suma puntos." })).toBeVisible();
  expect(failures.filter((failure) => !failure.includes("/ruta-que-no-existe"))).toEqual([]);
});

test("login, signup and password recovery expose the expected safe states", async ({ page }) => {
  const failures = watchCriticalFailures(page);
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: /Continuar con Google/i })).toHaveCount(0);
  await page.getByRole("link", { name: "¿Has olvidado tu contraseña?" }).click();
  await expect(page).toHaveURL(/\/recuperar-contrasena/);
  await expect(page.getByRole("heading", { name: "Recupera tu contraseña" })).toBeVisible();

  await page.goto("/auth?tab=signup");
  await expect(page.getByLabel("Nombre completo")).toBeVisible();
  await expect(page.getByLabel("Nombre del negocio")).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear cuenta", exact: true })).toBeVisible();
  expect(failures).toEqual([]);
});

test("administrator can enter the dashboard and open the main read-only modules", async ({
  page,
}) => {
  const failures = watchCriticalFailures(page);
  await signIn(page, "admin.pro@demo.fideleo.app");
  await expect(page.getByText("Admin Pro").first()).toBeVisible();

  for (const path of [
    "/panel",
    "/panel/clientes",
    "/panel/programa",
    "/panel/notificaciones",
    "/panel/establecimientos",
    "/panel/equipo",
    "/panel/configuracion",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
  }
  expect(failures).toEqual([]);
});

test("employee is sent to the scanner and can see customers", async ({ page }) => {
  const failures = watchCriticalFailures(page);
  await signIn(page, "staff.pro@demo.fideleo.app");
  await expect(page).toHaveURL(/\/panel\/caja/);
  await expect(page.getByText("Escáner").first()).toBeVisible();
  await page.goto("/panel/clientes");
  await expect(page.locator("main")).toBeVisible();
  expect(failures).toEqual([]);
});

test("employee can open the scanner directly", async ({ page }) => {
  const failures = watchCriticalFailures(page);
  await signIn(page, "staff.pro@demo.fideleo.app", "/panel/caja");
  await expect(page).toHaveURL(/\/panel\/caja/);
  await expect(page.getByText("Escáner").first()).toBeVisible();
  await page.goto("/panel/clientes");
  await expect(page.locator("main")).toBeVisible();
  expect(failures).toEqual([]);
});

test("superadministrator can open the global companies view", async ({ page }) => {
  const failures = watchCriticalFailures(page);
  await signIn(page, "dios@demo.fideleo.app");
  await page.goto("/panel/empresas");
  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Nueva empresa/ })).toBeVisible();
  expect(failures).toEqual([]);
});

test("mobile public pages do not create horizontal document overflow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout assertion");
  const failures = watchCriticalFailures(page);
  for (const path of ["/", "/auth", "/recuperar-contrasena", "/solicitar-demo"]) {
    await page.goto(path);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow, `${path} has horizontal overflow`).toBe(false);
  }
  expect(failures).toEqual([]);
});
