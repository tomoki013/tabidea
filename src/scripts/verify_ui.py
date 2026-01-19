from playwright.sync_api import sync_playwright, expect
import time

def verify_ui():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        page = browser.new_page(viewport={"width": 375, "height": 812})

        try:
            # 1. Verify Home Page
            print("Navigating to Home Page...")
            page.goto("http://localhost:3000/travel-info", timeout=60000)

            # Wait for content
            page.wait_for_selector("h1", timeout=10000)

            # Check Popular Destinations updates
            print("Checking popular destinations...")
            # We expect London and Bali to be present
            expect(page.get_by_role("button", name="ロンドン")).to_be_visible(timeout=5000)
            expect(page.get_by_role("button", name="バリ島")).to_be_visible()

            print("Taking Home Page screenshot...")
            page.screenshot(path="/home/jules/verification/home_mobile.png")

            # 2. Verify Destination Page
            print("Navigating to Paris page with Technology category...")
            # Using direct URL to bypass form interaction and ensure specific state
            # Note: Assuming 'technology' is the key
            page.goto("http://localhost:3000/travel-info/パリ?categories=basic,technology", timeout=60000)

            # Wait for content to load.
            # Since real API might be slow or fail, we wait for header first.
            page.wait_for_selector("h1", state="visible", timeout=30000)

            # Wait a bit for potential async content rendering
            time.sleep(5)

            print("Taking Destination Page screenshot...")
            page.screenshot(path="/home/jules/verification/destination_mobile.png")

            print("Verification script completed successfully.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui()
