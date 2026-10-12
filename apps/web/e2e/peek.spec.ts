/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { expect, test, type Page } from '@playwright/test';
import {
  charBox,
  collectPageErrors,
  ensureFixtureBook,
  installRecordingHost,
  openBook,
  readBookmark,
  setViewMode,
  turnPages,
  VIEW_MODES
} from './helpers';

/** Position of `目` in `目標の言葉`, chapter 2 (see positions.spec.ts). */
const TARGET = 4167;

for (const viewMode of VIEW_MODES) {
  test.describe(`peek (${viewMode})`, () => {
    let errors: string[];

    test.beforeEach(async ({ page }) => {
      errors = collectPageErrors(page);
      await setViewMode(page, viewMode);
    });

    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test.describe('in the app', () => {
      let id: number;

      test.beforeEach(async ({ page }) => {
        await installRecordingHost(page);
        id = await ensureFixtureBook(page);
      });

      // Proves that the checks below would see a bookmark being saved.
      test('without peek, the bookmark key saves a bookmark', async ({ page }) => {
        await openBook(page, id);
        await turnPages(page, 3);
        await page.keyboard.press('KeyB');

        await expect
          .poll(async () => {
            const bookmark = (await readBookmark(page, id)) as { exploredCharCount?: number };
            return bookmark?.exploredCharCount ?? 0;
          })
          .toBeGreaterThan(0);
      });

      test('opens at the peek position', async ({ page }) => {
        await openBook(page, id, TARGET);
        const box = await charBox(page, '目標の言葉', 0);
        expect(box?.onScreen).toBe(true);
      });

      for (const peek of [TARGET, 0, 99999999]) {
        test(`peek=${peek} never saves the bookmark`, async ({ page }) => {
          // Start from a saved bookmark, so a write would change it.
          await openBook(page, id);
          await turnPages(page, 2);
          await page.keyboard.press('KeyB');
          await expect.poll(() => readBookmark(page, id)).not.toBeNull();
          const before = JSON.stringify(await readBookmark(page, id));

          await openBook(page, id, peek);
          await turnPages(page, 3);
          await page.keyboard.press('KeyB');
          await page.goto('/manage.html');
          await page.waitForLoadState('networkidle');

          expect(JSON.stringify(await readBookmark(page, id))).toBe(before);
        });
      }
    });

    test('outside the app, peek is ignored', async ({ context, page }) => {
      // Import through a page that has the host, then read in one that has
      // not: the book is shared through the context's IndexedDB.
      const hostPage = await context.newPage();
      await installRecordingHost(hostPage);
      const id = await ensureFixtureBook(hostPage);
      await hostPage.close();

      expect(await readBookmarkFrom(page, id)).toBeNull();

      await openBook(page, id, TARGET);
      expect(await page.evaluate(() => !!window.flutter_inappwebview)).toBe(false);
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(600);
      await page.keyboard.press('KeyB');

      await expect.poll(() => readBookmark(page, id)).not.toBeNull();
    });
  });
}

/** `readBookmark` from a page that has not loaded the app yet. */
async function readBookmarkFrom(page: Page, id: number) {
  await page.goto('/manage.html');
  return readBookmark(page, id);
}
