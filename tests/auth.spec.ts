import { test, expect } from "@playwright/test"

// Test suite for Authentication flows
test.describe("Authentication and Onboarding", () => {
  // Test case for the main sign-up navigation
  test("should allow a user to navigate to the sign-up page", async ({
    page,
  }) => {
    // 1. Start at the homepage
    await page.goto("/")

    // 2. Find and click the "Account" link in the main navigation bar.
    await page.getByRole("link", { name: "Account" }).click()

    // 3. We should now be on the /login page. Verify the "Get Started" heading is visible.
    await expect(
      page.getByRole("heading", { name: "Get Started" }),
    ).toBeVisible()

    // 4. Find and click the "Sign Up" button on the login page.
    await page.getByRole("button", { name: "Sign Up" }).click()

    // 5. Verify that the URL is now the login/sign_up page.
    await expect(page).toHaveURL("/login/sign_up")

    // 6. Verify that the "Sign Up" heading is visible on the final page.
    await expect(
      page.getByRole("heading", { name: "Sign Up" }).first(),
    ).toBeVisible()
  })
})
