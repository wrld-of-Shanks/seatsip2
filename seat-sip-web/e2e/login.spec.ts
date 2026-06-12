import { test, expect } from '@playwright/test'

test.describe('Admin Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error')).toBeVisible()
    await expect(page.locator('.error')).toContainText('Invalid credentials')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('http://localhost:3000/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should navigate to registration page', async ({ page }) => {
    await page.click('text=Register')

    await expect(page).toHaveURL('http://localhost:3000/register')
  })

  test('should validate email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error')).toContainText('Invalid email')
  })

  test('should require password field', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error')).toContainText('Password is required')
  })

  test('should show loading state during login', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.fill('input[type="password"]', 'admin123')
    
    const button = page.locator('button[type="submit"]')
    await button.click()
    
    await expect(button).toBeDisabled()
    await expect(button).toContainText('Loading...')
  })
})
