import type { Page } from "@playwright/test";

// Every E2E test account uses this prefix so `npm run test:e2e:cleanup`
// can find and delete them afterward (Supabase has no public self-delete
// endpoint - deleting requires the CLI/Management API, same mechanism
// used for manual gate testing throughout this project).
export function e2eEmail(): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${id}@example.com`;
}

export const E2E_PASSWORD = "TestPass123!";

export async function signUp(page: Page, email: string) {
  await page.goto("/login?mode=signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/students");
}
