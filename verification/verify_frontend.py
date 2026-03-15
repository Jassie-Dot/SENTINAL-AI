import os
import time
import subprocess
import signal
from playwright.sync_api import sync_playwright, expect

def run_verification():
    # 1. Start the server in the background
    print("Starting server...")
    server_process = subprocess.Popen(["node", "server.mjs"],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True)

    port = None
    # Wait for the server to report its port
    start_time = time.time()
    while time.time() - start_time < 60:
        line = server_process.stdout.readline()
        if not line:
            break
        print(line.strip())
        if "Running on port" in line:
            port = line.split("port")[-1].strip()
            break

    if not port:
        print("Failed to start server or find port.")
        server_process.kill()
        return

    url = f"http://localhost:{port}"
    print(f"Server started at {url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            print(f"Navigating to {url}...")
            page.goto(url)

            # Wait for BIOS sequence and transition
            print("Waiting for BIOS sequence...")
            time.sleep(20) # bios takes a while

            # Check if messages container is visible
            # expect(page.locator("#messages")).to_be_visible(timeout=60000)

            # Take initial screenshot
            page.screenshot(path="verification/main_view.png")
            print("Main view screenshot saved.")

            # Send a message to test bubbles and scroll
            print("Sending test message...")
            page.fill("#input", "Hello SENTINAL, show me some markdown with a list and code block.")
            page.press("#input", "Enter")

            # Wait for response
            time.sleep(15)

            # Take screenshot of chat
            page.screenshot(path="verification/chat_view.png")
            print("Chat view screenshot saved.")

            # Scroll up to trigger "Scroll to Bottom" button
            print("Scrolling up...")
            page.evaluate("document.getElementById('messages').scrollTop = 0")
            time.sleep(2)

            # Take screenshot of scroll button
            page.screenshot(path="verification/scroll_button_view.png")
            print("Scroll button view screenshot saved.")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
            print("Stopping server...")
            os.kill(server_process.pid, signal.SIGINT)

if __name__ == "__main__":
    run_verification()
