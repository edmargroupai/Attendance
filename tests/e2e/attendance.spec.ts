import { test, expect } from "@playwright/test";
import { e2eEmail, signUp } from "./helpers";

// Real end-to-end walk of the whole app through an actual browser -
// closes the gap noted in Stages 5/7, where the same flows were only
// verified via direct API calls (no browser-automation tool was
// available in the assistant session that built them).
test("sign up, create a class, add a student, mark attendance, and confirm it persists after reload", async ({ page }) => {
  const email = e2eEmail();
  await signUp(page, email);

  // Calendar: academic year + class.
  await page.goto("/calendar");
  await page.getByPlaceholder("2026-2027").fill("E2E Year");
  await page.locator('input[name="start_date"]').fill("2026-09-01");
  await page.locator('input[name="end_date"]').fill("2027-06-30");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/academic-years") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Add academic year" }).click(),
  ]);
  await expect(page.getByRole("option", { name: "E2E Year" })).toBeAttached();

  await page.getByPlaceholder("Grade 1A").fill("E2E Class");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/classes") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Add class" }).click(),
  ]);
  await expect(page.getByRole("link", { name: "E2E Class" })).toBeVisible();

  await page.getByRole("button", { name: "Generate sessions" }).click();
  await expect(page.getByText(/Generated sessions for \d+ open date/)).toBeVisible();

  // Students: typed entry.
  await page.getByRole("link", { name: "E2E Class" }).click();
  await page.waitForURL(/\/students\?classId=/);
  await page.locator('input[name="surname"]').fill("Brown");
  await page.locator('input[name="given_names"]').fill("Adam");
  await page.locator('select[name="register_group"]').selectOption("Boy");
  await page.locator('input[name="start_date"]').fill("2026-09-01");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/students") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Add student" }).click(),
  ]);
  await expect(page.getByText("Brown, Adam")).toBeVisible();

  const classId = new URL(page.url()).searchParams.get("classId")!;

  // Register: mark a cell L, then P, then reload and confirm both persisted.
  await page.goto(`/register/${classId}?month=2026-09`);
  const cells = page.locator('button[data-cell-coord]:not([disabled])');
  await expect(cells.first()).toBeVisible();

  await cells.nth(0).click();
  await page.getByRole("menuitem", { name: /^L /, exact: false }).click();
  await expect(cells.nth(0)).toHaveText("L");

  await cells.nth(1).click();
  await page.getByRole("menuitem", { name: /^P /, exact: false }).click();
  await expect(cells.nth(1)).toHaveText("P");

  // Wait for the "Saving..." indicator to clear before reloading.
  await expect(page.getByText("Saving…")).toHaveCount(0);

  await page.reload();
  await expect(page.locator('button[data-cell-coord]').nth(0)).toHaveText("L");
  await expect(page.locator('button[data-cell-coord]').nth(1)).toHaveText("P");

  // Reports: the same class/period should show a non-zero attended total.
  await page.goto(`/reports?classId=${classId}&month=2026-09`);
  await expect(page.getByText(/Attended student-sessions: [1-9]/)).toBeVisible();
});
