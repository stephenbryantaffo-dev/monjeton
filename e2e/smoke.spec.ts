import { test, expect } from "@playwright/test";

test.describe("Mon Jeton — smoke", () => {
  test("la landing se charge", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Au moins un lien ou bouton doit être présent
    await expect(page.locator("a, button").first()).toBeVisible();
  });

  test("la page login s'affiche", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("textbox", { name: /email/i }).first()
    ).toBeVisible();
    await expect(
      page.locator('input[type="password"]').first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /se connecter/i }).first()
    ).toBeVisible();
  });

  test("la page signup s'affiche", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.locator('input[type="password"]').first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /inscri|créer|commencer/i }).first()
    ).toBeVisible();
  });

  test("une route inexistante affiche la 404", async ({ page }) => {
    await page.goto("/page-qui-nexiste-pas");
    await expect(page.getByText(/404|not found|introuvable/i).first()).toBeVisible();
  });
});
