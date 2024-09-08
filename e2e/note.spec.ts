import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

test("Create and view a note", async ({ page }) => {
  // Navigate to the home page
  await page.goto("http://localhost:3010", {
    timeout: 10000,
  });

  const noteValue = "This is a test note";

  // Fill in the note content
  await page.fill("textarea#secret-input", noteValue);

  // Check the "Destroy after read" checkbox
  await page.check("input#destroy-after-read");

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

test("Create and view a note with a binary file attachment", async ({
  page,
}) => {
  // Navigate to the home page
  await page.goto("http://localhost:3010", {
    timeout: 10000,
  });

  const noteValue = "This is a test note with a file attachment";

  // Fill in the note content
  await page.fill("textarea#secret-input", noteValue);

  // Create a temporary binary file
  const tempFilePath = path.join(__dirname, "temp_binary_file.bin");
  const fileContent = crypto.randomBytes(1024); // 1KB of random data
  fs.writeFileSync(tempFilePath, fileContent);

  // Attach the file
  await page.setInputFiles('input[type="file"]', tempFilePath);

  // Uncheck the "Destroy after read" checkbox
  await page.uncheck("input#destroy-after-read");

  // Click the create button
  await page.click('button:has-text("Create")');

  // Wait for the note URL to appear
  const noteUrl = await page.waitForSelector(
    'textarea[data-testid="note-url"]'
  );
  const url = await noteUrl.inputValue();

  // Navigate to the note URL
  await page.goto(url);

  // Check if the note content is visible
  await expect(page.locator(".view-box")).toContainText(noteValue, {
    timeout: 10000,
  });

  // Check if the file attachment is visible
  const fileAttachment = page.locator(".view-file");
  await expect(fileAttachment).toBeVisible();
  await expect(fileAttachment).toContainText("temp_binary_file.bin");

  // Check if the download button is present
  const downloadButton = page.locator('a:has-text("Download")');
  await expect(downloadButton).toBeVisible();

  // Set up download listener
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.click(),
  ]);

  // Wait for the download to complete and get the downloaded file path
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  // Read the contents of the downloaded file
  const downloadedContent = fs.readFileSync(downloadPath!);

  // Compare the downloaded content with the original content
  expect(downloadedContent.equals(fileContent)).toBeTruthy();

  // Clean up the temporary files
  fs.unlinkSync(tempFilePath);
  fs.unlinkSync(downloadPath!);

  // Verify that the note is still accessible by visiting the URL again
  await page.goto(url);
  await expect(page.locator(".view-box")).toContainText(noteValue, {
    timeout: 10000,
  });
  await expect(fileAttachment).toBeVisible();
  await expect(downloadButton).toBeVisible();
});
