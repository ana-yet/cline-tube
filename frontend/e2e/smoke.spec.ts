/**
 * Critical smoke E2E tests for CineTube.
 *
 * Phase 1: verifies that the public pages load and the auth forms render.
 * These tests run against a local dev server (not a deployed environment).
 */

import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads and shows CineTube branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CineTube/i);
  });

  test("browse page loads", async ({ page }) => {
    await page.goto("/browse");
    // The page should load without crashing
    await expect(page.locator("body")).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Auth pages", () => {
  test("login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|log in/i })
    ).toBeVisible();
  });

  test("register page renders form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test("forgot-password page renders form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send|reset/i })
    ).toBeVisible();
  });
});
