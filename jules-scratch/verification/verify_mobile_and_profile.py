from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)

    # Test mobile view
    mobile_context = browser.new_context(**playwright.devices['iPhone 13'])
    mobile_page = mobile_context.new_page()
    mobile_page.goto("http://localhost:3000/app/stats")
    mobile_page.wait_for_selector("h1:has-text('İstatistikler ve İlerleme')")
    mobile_page.wait_for_timeout(2000)
    mobile_page.screenshot(path="jules-scratch/verification/mobile_stats_page.png")

    # Test profile page
    profile_context = browser.new_context()
    profile_page = profile_context.new_page()
    profile_page.goto("http://localhost:3000/app/profile")
    profile_page.wait_for_selector("div:has-text('Profil Resmi')")

    # Click the first avatar
    avatar_button = profile_page.locator("button[data-selected]").first
    avatar_button.click()

    # Save the changes
    save_button = profile_page.get_by_role("button", name="Kaydet")
    save_button.click()

    # Wait for the toast message
    expect(profile_page.locator("text=Profiliniz güncellendi.")).to_be_visible()

    profile_page.screenshot(path="jules-scratch/verification/profile_page.png")

    # Go to stats page to see the avatar in the header
    profile_page.goto("http://localhost:3000/app/stats")
    profile_page.wait_for_timeout(1000)
    profile_page.screenshot(path="jules-scratch/verification/header_avatar.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
