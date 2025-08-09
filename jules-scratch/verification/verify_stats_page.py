from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # The dev server should be running on localhost:3000
    page.goto("http://localhost:3000/app/stats")

    # Wait for the page to load by looking for the main heading
    page.wait_for_selector("h1:has-text('İstatistikler ve İlerleme')")

    # Give the page a moment to render everything
    page.wait_for_timeout(2000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
