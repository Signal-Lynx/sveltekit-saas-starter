import { test, expect } from "@playwright/test"

test.describe("Authentication and Onboarding", () => {
  test("should redirect gated routes to site access gate", async ({ page }) => {
    await page.goto("/login")

    // Your site gate redirects to /access?gate=site&next=%2Flogin
    await expect(page).toHaveURL(/\/access\?gate=site&next=%2Flogin/)

    // Verify we are actually on the gate page (stable signals from your markup)
    await expect(page.getByLabel(/access passphrase/i)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /authenticate/i }),
    ).toBeVisible()
  })
})
