from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to localhost
        try:
            page.goto("http://localhost:3000", timeout=60000)
        except Exception as e:
            print(f"Error loading page: {e}")
            return

        # Wait for content to load
        page.wait_for_load_state("networkidle")

        # Scroll down to trigger animations
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2) # Wait for animations
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1)

        # 1. Concept Section
        # Locate by text "Concept" or "Tabi x Idea x Deai"
        concept_section = page.locator("section").filter(has_text="Tabi × Idea × Deai").first
        if concept_section.count() > 0:
            concept_section.scroll_into_view_if_needed()
            time.sleep(1)
            concept_section.screenshot(path="homepage_concept_updated.png")
            print("Captured Concept Section")
        else:
            print("Concept section not found")

        # 2. Features Section
        # Locate by text "Why Tabidea?" or "旅を、もっと「自分らしく」。"
        features_section = page.locator("section").filter(has_text="Why Tabidea?").first
        if features_section.count() > 0:
            features_section.scroll_into_view_if_needed()
            time.sleep(1)
            features_section.screenshot(path="homepage_features_updated.png")
            print("Captured Features Section")
        else:
            print("Features section not found")

        browser.close()

if __name__ == "__main__":
    run()
