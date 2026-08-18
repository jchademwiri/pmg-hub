import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'PMG Control Center' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Login Link' })).toBeVisible();
  });

  test('unauthenticated dashboard access redirects to login', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'PMG Control Center' })).toBeVisible();
  });
});
