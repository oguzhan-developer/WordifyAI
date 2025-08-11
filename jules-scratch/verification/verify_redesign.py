import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Verify Login Page
        print("Navigating to login page...")
        await page.goto("http://localhost:3000/login", wait_until="networkidle")
        await page.wait_for_timeout(2000) # Wait for animations
        print("Taking screenshot of login page...")
        await page.screenshot(path="jules-scratch/verification/login_page.png")

        # Verify Dashboard Page
        print("Navigating to dashboard page...")
        await page.goto("http://localhost:3000/app", wait_until="networkidle")
        await page.wait_for_timeout(2000) # Wait for data to load and animations
        print("Taking screenshot of dashboard page...")
        await page.screenshot(path="jules-scratch/verification/dashboard_page.png")

        await browser.close()
        print("Verification script finished.")

if __name__ == "__main__":
    asyncio.run(main())
