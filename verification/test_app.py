import os
import time
import unittest
import threading
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from playwright.sync_api import sync_playwright

PORT = 3001

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

class ReusableTCPServer(TCPServer):
    allow_reuse_address = True

class TestCookieClickerAchievements(unittest.TestCase):
    server = None
    server_thread = None
    playwright = None
    browser = None
    port = None

    @classmethod
    def setUpClass(cls):
        # Start local test server with dynamic free port or reuse
        cls.server = ReusableTCPServer(('127.0.0.1', 0), QuietHandler)
        cls.port = cls.server.server_address[1]
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        if cls.browser:
            cls.browser.close()
        if cls.playwright:
            cls.playwright.stop()
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        # Ensure fresh state by clearing cookies before loading
        self.context.clear_cookies()
        self.page.goto(f'http://127.0.0.1:{self.port}/index.html')

    def tearDown(self):
        self.context.close()

    def test_initial_state(self):
        """Initial state should show 0 cookies and all trophies locked."""
        counter = self.page.locator('#counter')
        self.assertEqual(counter.inner_text().strip(), '0')

        for milestone in ['10', '100', '1000']:
            trophy = self.page.locator(f'#trophy-{milestone}')
            badge = self.page.locator(f'#badge-{milestone}')
            self.assertIn('locked', trophy.get_attribute('class'))
            self.assertNotIn('unlocked', trophy.get_attribute('class'))
            self.assertEqual(badge.inner_text().strip().upper(), 'LOCKED')

    def test_single_click_increments_counter(self):
        """Clicking cookie increments counter and creates floating feedback."""
        cookie_btn = self.page.locator('#cookieBtn')
        counter = self.page.locator('#counter')

        cookie_btn.click()
        self.assertEqual(counter.inner_text().strip(), '1')

    def test_milestone_10_unlocks_trophy(self):
        """Reaching 10 clicks unlocks the 10-click trophy and shows toast."""
        cookie_btn = self.page.locator('#cookieBtn')
        counter = self.page.locator('#counter')
        toast = self.page.locator('#achievementToast')
        toast_title = self.page.locator('#toastTitle')
        trophy_10 = self.page.locator('#trophy-10')
        badge_10 = self.page.locator('#badge-10')

        # Click 9 times - still locked
        for _ in range(9):
            cookie_btn.click()
        self.assertEqual(counter.inner_text().strip(), '9')
        self.assertIn('locked', trophy_10.get_attribute('class'))

        # 10th click triggers unlock
        cookie_btn.click()
        self.assertEqual(counter.inner_text().strip(), '10')
        self.assertIn('unlocked', trophy_10.get_attribute('class'))
        self.assertEqual(badge_10.inner_text().strip().upper(), 'UNLOCKED')
        self.assertIn('show', toast.get_attribute('class'))
        self.assertIn('Bronze Baker', toast_title.inner_text())

    def test_milestone_100_and_1000_unlocks(self):
        """Setting count to 100 and 1000 unlocks silver and gold trophies."""
        trophy_10 = self.page.locator('#trophy-10')
        trophy_100 = self.page.locator('#trophy-100')
        trophy_1000 = self.page.locator('#trophy-1000')

        # Test reaching 100 clicks
        self.page.evaluate("updateCounter(99);")
        self.assertIn('locked', trophy_100.get_attribute('class'))

        self.page.locator('#cookieBtn').click()
        self.assertEqual(self.page.locator('#counter').inner_text().strip(), '100')
        self.assertIn('unlocked', trophy_10.get_attribute('class'))
        self.assertIn('unlocked', trophy_100.get_attribute('class'))
        self.assertIn('locked', trophy_1000.get_attribute('class'))

        # Test reaching 1000 clicks
        self.page.evaluate("updateCounter(999);")
        self.assertIn('locked', trophy_1000.get_attribute('class'))

        self.page.locator('#cookieBtn').click()
        self.assertEqual(self.page.locator('#counter').inner_text().strip(), '1,000')
        self.assertIn('unlocked', trophy_10.get_attribute('class'))
        self.assertIn('unlocked', trophy_100.get_attribute('class'))
        self.assertIn('unlocked', trophy_1000.get_attribute('class'))
        self.assertEqual(self.page.locator('#badge-1000').inner_text().strip().upper(), 'UNLOCKED')

    def test_persistence_across_reloads(self):
        """Unlocked achievements and click count persist after page refresh."""
        self.page.evaluate("updateCounter(15);")
        self.page.reload()

        counter = self.page.locator('#counter')
        trophy_10 = self.page.locator('#trophy-10')
        badge_10 = self.page.locator('#badge-10')

        self.assertEqual(counter.inner_text().strip(), '15')
        self.assertIn('unlocked', trophy_10.get_attribute('class'))
        self.assertEqual(badge_10.inner_text().strip().upper(), 'UNLOCKED')

    def test_reset_functionality(self):
        """Clicking reset restores counter to 0 and locks achievements."""
        self.page.evaluate("updateCounter(15);")
        trophy_10 = self.page.locator('#trophy-10')
        self.assertIn('unlocked', trophy_10.get_attribute('class'))

        reset_btn = self.page.locator('#resetBtn')
        reset_btn.click()

        counter = self.page.locator('#counter')
        self.assertEqual(counter.inner_text().strip(), '0')
        self.assertIn('locked', trophy_10.get_attribute('class'))
        self.assertEqual(self.page.locator('#badge-10').inner_text().strip().upper(), 'LOCKED')

if __name__ == '__main__':
    unittest.main()
