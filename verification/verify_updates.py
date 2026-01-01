
from playwright.sync_api import sync_playwright, expect

def verify_updates_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Using a mobile-ish view to test responsiveness too, or standard desktop
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Navigate to the Updates page
        # Assuming server runs on localhost:3000 and basePath is /ai-travel-planner
        url = 'http://localhost:3000/ai-travel-planner/updates'
        print(f'Navigating to {url}')
        try:
            page.goto(url, timeout=30000) # Increased timeout just in case
        except Exception as e:
            print(f'Error navigating: {e}')
            # Try without basepath just in case config is weird, but memory says it has basepath
            # page.goto('http://localhost:3000/updates')
            raise e

        # 2. Check content
        expect(page.get_by_role('heading', name='Updates & Roadmap')).to_be_visible()
        expect(page.get_by_text('プランの保存機能')).to_be_visible()
        expect(page.get_by_text('開発中')).to_be_visible()

        # 3. Screenshot the updates page
        page.screenshot(path='verification/updates_page.png', full_page=True)
        print('Updates page screenshot saved.')

        # 4. Verify Footer Link
        # Go to home page
        home_url = 'http://localhost:3000/ai-travel-planner'
        page.goto(home_url)

        # Scroll to footer
        footer_link = page.get_by_role('link', name='更新情報・ロードマップ')
        footer_link.scroll_into_view_if_needed()
        expect(footer_link).to_be_visible()

        # Click the link
        footer_link.click()

        # Verify we are back on updates page
        expect(page).to_have_url(url)
        print('Footer link verification successful.')

        browser.close()

if __name__ == '__main__':
    verify_updates_page()
