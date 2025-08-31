import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console messages
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    # 1. Arrange: Go to the application.
    page.goto("http://localhost:5173/")

    # 2. Act: Create a new task.
    page.get_by_placeholder("Task title*").fill("My new amazing task")
    page.get_by_placeholder("tags (comma-separated)").fill("frontend, ui, improvement")

    # Wait for the projects to load before selecting one
    expect(page.get_by_role("option", name="No project")).to_be_enabled(timeout=15000)

    # There may not be any projects or goals, so we'll handle that.
    project_selector = page.locator('select:has(option[value=""])').first
    project_options = project_selector.locator('option')
    if project_options.count() > 1:
        project_selector.select_option(index=1)

    goal_selector = page.locator('select:has(option[value=""])').nth(1)
    goal_options = goal_selector.locator('option')
    if goal_options.count() > 1:
        goal_selector.select_option(index=1)

    page.get_by_role("button", name="Add Task").click()

    # 3. Assert: Wait for the task to appear in the backlog.
    expect(page.get_by_text("My new amazing task")).to_be_visible(timeout=15000)

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/task-board-updated.png")

    # 5. Teardown
    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
