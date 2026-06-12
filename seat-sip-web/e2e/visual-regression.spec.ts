import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('Dashboard page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true })
  })

  test('Users page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/users')
    await expect(page).toHaveScreenshot('users-page.png', { fullPage: true })
  })

  test('Staff page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/staff')
    await expect(page).toHaveScreenshot('staff-page.png', { fullPage: true })
  })

  test('Analytics page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    await expect(page).toHaveScreenshot('analytics-page.png', { fullPage: true })
  })

  test('Settings page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/settings')
    await expect(page).toHaveScreenshot('settings-page.png', { fullPage: true })
  })

  test('Permissions page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/permissions')
    await expect(page).toHaveScreenshot('permissions-page.png', { fullPage: true })
  })

  test('Audit logs page visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/audit-logs')
    await expect(page).toHaveScreenshot('audit-logs-page.png', { fullPage: true })
  })

  test('Mobile responsive view - dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000/dashboard')
    await expect(page).toHaveScreenshot('dashboard-mobile.png', { fullPage: true })
  })

  test('Dark mode visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.click('button[aria-label="Toggle dark mode"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('dashboard-dark.png', { fullPage: true })
  })
})
