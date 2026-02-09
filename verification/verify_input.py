from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000")

        # Wait for hydration
        page.wait_for_timeout(3000)

        # Take screenshot of the top part (Input Flow)
        page.screenshot(path="verification/input_flow.png", full_page=True)

        print("Screenshot taken.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
