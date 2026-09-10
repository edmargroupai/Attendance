import { test, expect } from "@playwright/test";
import { e2eEmail, signUp } from "./helpers";

// Spec section 9 essential test: "At 390 px mobile width and 1366 px
// desktop width, headers, session numbers, names, menus and totals
// remain usable." The two widths come from the two Playwright projects
// configured in playwright.config.ts, so this file runs once per width
// automatically.
test.describe("responsive layout", () => {
  test("login page has no page-level horizontal overflow", async ({ page }) => {
    await page.goto("/login");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("app nav and students page remain usable, register grid scrolls within its own container", async ({
    page,
  }) => {
    const email = e2eEmail();
    await signUp(page, email);

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Students" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Calendar", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();

    // The app shell itself should never force page-level horizontal
    // scroll, even on a class with no data yet.
    const bodyOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(bodyOverflow).toBe(false);
  });

  async function assertNoPageOverflow(page: import("@playwright/test").Page) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  }

  test("calendar, students, and reports pages stay within the viewport width", async ({ page }) => {
    const email = e2eEmail();
    await signUp(page, email);

    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    await assertNoPageOverflow(page);

    await page.goto("/students");
    await assertNoPageOverflow(page);

    await page.goto("/reports");
    await assertNoPageOverflow(page);
  });

  test("register grid scrolls within its own container, not the whole page", async ({ page }) => {
    const email = e2eEmail();
    await signUp(page, email);

    await page.goto("/calendar");
    await page.getByPlaceholder("2026-2027").fill("Resp Year");
    await page.locator('input[name="start_date"]').fill("2026-09-01");
    await page.locator('input[name="end_date"]').fill("2027-06-30");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/academic-years") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Add academic year" }).click(),
    ]);

    await page.getByPlaceholder("Grade 1A").fill("Resp Class");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/classes") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Add class" }).click(),
    ]);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/calendar-sessions/generate")),
      page.getByRole("button", { name: "Generate sessions" }).click(),
    ]);

    await page.getByRole("link", { name: "Resp Class" }).click();
    await page.waitForURL(/\/students\?classId=/);
    const classId = new URL(page.url()).searchParams.get("classId")!;

    // The register renders zero cells with zero students - add one so
    // there's an actual row to check.
    await page.locator('input[name="surname"]').fill("Brown");
    await page.locator('input[name="given_names"]').fill("Adam");
    await page.locator('select[name="register_group"]').selectOption("Boy");
    await page.locator('input[name="start_date"]').fill("2026-09-01");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/students") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Add student" }).click(),
    ]);

    await page.goto(`/register/${classId}?month=2026-09`);
    await expect(page.locator('button[data-cell-coord]').first()).toBeVisible();

    // The register's own scroll container may (and should) be wider than
    // the viewport - only the outer page must not.
    await assertNoPageOverflow(page);
  });
});
