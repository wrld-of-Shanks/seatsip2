import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@seatsip.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('Dashboard page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('Users page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('http://localhost:3000/users')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('Staff page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('http://localhost:3000/staff')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('Analytics page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('http://localhost:3000/analytics')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('Dashboard page should have good Core Web Vitals', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        ttfb: perfData.responseStart - perfData.fetchStart,
      }
    })
    
    expect(metrics.domContentLoaded).toBeLessThan(1000)
    expect(metrics.ttfb).toBeLessThan(500)
  })

  test('Table rendering should be fast', async ({ page }) => {
    await page.goto('http://localhost:3000/users')
    const startTime = Date.now()
    await page.waitForSelector('table tbody tr')
    const renderTime = Date.now() - startTime
    
    expect(renderTime).toBeLessThan(500)
  })

  test('Filter operations should be fast', async ({ page }) => {
    await page.goto('http://localhost:3000/users')
    const startTime = Date.now()
    await page.fill('input[placeholder*="Search"]', 'John')
    await page.waitForTimeout(500)
    const filterTime = Date.now() - startTime
    
    expect(filterTime).BeLessThan(1000)
  })

  test('Modal should open quickly', async ({ page }) => {
    await page.goto('http://localhost:3000/staff')
    const startTime = Date.now()
    await page.click('button:has-text("Add Staff")')
    await page.waitForSelector('.modal')
    const modalOpenTime = Date.now() - startTime
    
    expect(modalOpenTime).toBeLessThan(300)
  })
})
