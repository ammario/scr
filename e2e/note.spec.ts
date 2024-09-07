import { test, expect } from "@playwright/test";

test("Create and view a note", async ({ page }) => {
  // Navigate to the home page
  await page.goto("http://localhost:3010");

  const noteValue = "This is a test note";

  // Fill in the note content
  await page.fill("textarea#secret-input", noteValue);

  // Click the create button
  await page.click('button:has-text("Create")');

  // Wait for the note URL to appear
  const noteUrl = await page.waitForSelector(
    'textarea[data-testid="note-url"]'
  );
  const url = await noteUrl.inputValue();

  // Navigate to the note URL
  await page.goto(url);

  // Click the "Read Note" button if it exists
  const readNoteButton = page.locator('button[data-testid="read-note-button"]');
  expect(readNoteButton.isVisible()).toBeTruthy();

  await readNoteButton.click();
  await page.waitForLoadState("networkidle");

  // Check if the note content is visible
  await expect(page.locator(".view-box")).toContainText(noteValue, {
    timeout: 10000,
  });
});
