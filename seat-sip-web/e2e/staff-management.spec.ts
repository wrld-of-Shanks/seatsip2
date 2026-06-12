import { test, expect } from '@playwright/test'

test.describe('Staff Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.goto('http://localhost:3000/staff')
  })

  test('should display staff management page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Staff Management')
    await expect(page.locator('table')).toBeVisible()
  })

  test('should display staff list', async ({ page }) => {
    await expect(page.locator('table tbody tr')).toHaveCount(3)
    await expect(page.locator('table')).toContainText('Staff One')
    await expect(page.locator('table')).toContainText('Staff Two')
  })

  test('should open create staff modal', async ({ page }) => {
    await page.click('button:has-text("Add Staff")')
    
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal')).toContainText('Add Staff')
  })

  test('should create new staff member', async ({ page }) => {
    await page.click('button:has-text("Add Staff")')
    
    await page.fill('input[name="name"]', 'New Staff Member')
    await page.fill('input[name="email"]', 'newstaff@example.com')
    await page.fill('input[name="phone"]', '+1234567890')
    await page.selectOption('select[name="role"]', 'STAFF')
    await page.click('button:has-text("Save")')
    
    await expect(page.locator('.toast')).toContainText('Staff created successfully')
    await expect(page.locator('table')).toContainText('New Staff Member')
  })

  test('should edit existing staff member', async ({ page }) => {
    await page.click('table tbody tr:first-child button:has-text("Edit")')
    
    await expect(page.locator('.modal')).toBeVisible()
    await page.fill('input[name="name"]', 'Updated Staff Name')
    await page.click('button:has-text("Save")')
    
    await expect(page.locator('.toast')).toContainText('Staff updated successfully')
    await expect(page.locator('table')).toContainText('Updated Staff Name')
  })

  test('should delete staff member with confirmation', async ({ page }) => {
    await page.click('table tbody tr:first-child button:has-text("Delete")')
    await page.click('button:has-text("Confirm")')
    
    await expect(page.locator('.toast')).toContainText('Staff deleted successfully')
  })

  test('should bulk delete staff members', async ({ page }) => {
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    await page.click('table tbody tr:nth-child(2) input[type="checkbox"]')
    await page.click('button:has-text("Delete Selected")')
    await page.click('button:has-text("Confirm")')
    
    await expect(page.locator('.toast')).toContainText('Staff deleted successfully')
  })

  test('should filter staff by role', async ({ page }) => {
    await page.click('button:has-text("Filters")')
    await page.selectOption('select[name="role"]', 'ADMIN')
    await page.click('button:has-text("Apply")')
    
    await expect(page.locator('table tbody tr')).toHaveCount(1)
  })

  test('should search staff by name', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'Staff One')
    await page.waitForTimeout(500)
    
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await expect(page.locator('table')).toContainText('Staff One')
  })
})
