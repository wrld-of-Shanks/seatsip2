import { test, expect } from '@playwright/test'

test.describe('User Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.goto('http://localhost:3000/users')
  })

  test('should display user management page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('User Management')
    await expect(page.locator('table')).toBeVisible()
  })

  test('should display user list', async ({ page }) => {
    await expect(page.locator('table tbody tr')).toHaveCount(3)
    await expect(page.locator('table')).toContainText('John Doe')
    await expect(page.locator('table')).toContainText('Jane Smith')
  })

  test('should filter users by search', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'John')
    await page.waitForTimeout(500)
    
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await expect(page.locator('table')).toContainText('John Doe')
  })

  test('should filter users by role', async ({ page }) => {
    await page.click('button:has-text("Filters")')
    await page.click('select[name="role"]')
    await page.selectOption('select[name="role"]', 'ADMIN')
    await page.click('button:has-text("Apply")')
    
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await expect(page.locator('table')).toContainText('ADMIN')
  })

  test('should select multiple users for bulk action', async ({ page }) => {
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    await page.click('table tbody tr:nth-child(2) input[type="checkbox"]')
    
    await expect(page.locator('text=2 user(s) selected')).toBeVisible()
  })

  test('should activate selected users', async ({ page }) => {
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("Activate")')
    await page.click('button:has-text("Confirm")')
    
    await expect(page.locator('.toast')).toContainText('Users activated successfully')
  })

  test('should suspend selected users', async ({ page }) => {
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("Suspend")')
    await page.click('button:has-text("Confirm")')
    
    await expect(page.locator('.toast')).toContainText('Users suspended successfully')
  })

  test('should delete selected users with confirmation', async ({ page }) => {
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("Delete")')
    await page.click('button:has-text("Confirm")')
    
    await expect(page.locator('.toast')).toContainText('Users deleted successfully')
  })

  test('should export user data', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/users.*\.csv$/)
  })

  test('should navigate through pagination', async ({ page }) => {
    await page.click('button[aria-label="Next page"]')
    
    await expect(page.locator('.pagination')).toContainText('Page 2')
  })
})
