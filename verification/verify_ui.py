
from playwright.sync_api import sync_playwright
import time

def verify_travel_info_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 2000})
        page = context.new_page()

        print("Navigating to travel info page...")
        # Use a destination that likely returns data
        page.goto("http://localhost:3000/travel-info/Bangkok")

        # Wait for the page to load and potentially fetch data
        print("Waiting for content...")
        # We look for the header text "Bangkok" which is in the Hero section now (DestinationClient)
        page.wait_for_selector("text=Bangkok", timeout=60000)

        # Wait a bit more for the async data loading (InfoSections)
        # We can look for "基本情報" (Basic Info) which is usually the first category
        try:
            page.wait_for_selector("text=基本情報", timeout=30000)
            print("Basic Info loaded.")
        except:
            print("Basic Info not found or timed out.")

        # Give it a few more seconds for animations and other sections
        time.sleep(5)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/travel_info_ui.png", full_page=True)

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_travel_info_ui()
