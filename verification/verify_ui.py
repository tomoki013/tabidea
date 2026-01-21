from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Landing Page
        print("Checking Landing Page...")
        page.goto("http://localhost:3000")
        page.wait_for_timeout(2000) # Wait for animations
        page.screenshot(path="verification/landing_page.png", full_page=True)
        print("Landing Page screenshot saved.")

        # 2. Travel Info Page
        print("Checking Travel Info Page...")
        page.goto("http://localhost:3000/travel-info")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/travel_info.png")
        print("Travel Info screenshot saved.")

        # 3. About Page
        print("Checking About Page...")
        page.goto("http://localhost:3000/about")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/about_page.png", full_page=True)
        print("About Page screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
