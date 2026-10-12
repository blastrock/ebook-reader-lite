/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { expect, type Page } from '@playwright/test';
import { FIXTURE_BOOK, FIXTURE_TITLE } from './fixture-book';

export const VIEW_MODES = ['paginated', 'continuous'] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export interface TapEvent {
  type: 'tap';
  text: string;
  offset: number;
  x: number;
  y: number;
  position: number;
}

declare global {
  interface Window {
    __hostEvents: Record<string, unknown>[];
  }
}

/** Mirror of `get-character-count.ts`: only these characters are counted. */
const isNotJapanese =
  /[^0-9A-Z○◯々-〇〻ぁ-ゖゝ-ゞァ-ヺー０-９Ａ-Ｚｦ-ﾝ\p{Radical}\p{Unified_Ideograph}]+/gimu;

/** ttu's character count of `text`, in bookmark units. */
export function ttuCount(text: string) {
  return Array.from(text.replace(isNotJapanese, '')).length;
}

/**
 * Makes `page` look like the app's WebView: defines `flutter_inappwebview`
 * before any app script runs (so the debug host stands aside) and records
 * every event sent to the host in `window.__hostEvents`.
 */
export async function installRecordingHost(page: Page) {
  await page.addInitScript(() => {
    window.__hostEvents = [];
    window.flutter_inappwebview = {
      _platformReady: true,
      callHandler(name: string, payload: unknown) {
        if (name === 'ttuHost') {
          window.__hostEvents.push(payload as Record<string, unknown>);
        }
        return Promise.resolve(null);
      }
    };
  });
}

export async function setViewMode(page: Page, viewMode: ViewMode) {
  await page.addInitScript((mode) => window.localStorage.setItem('viewMode', mode), viewMode);
}

/**
 * Collects uncaught page errors, except the service worker's failure to
 * register, which is expected when the build is served this way.
 */
export function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    if (!/service.?worker/i.test(`${error.message}\n${error.stack ?? ''}`)) {
      errors.push(error.message);
    }
  });
  return errors;
}

/** Id of the fixture book, imported through the host commands if missing. */
export async function ensureFixtureBook(page: Page) {
  await page.goto('/host.html');
  await page.waitForFunction(() => !!window.ttuHost?.listBooks);

  const findBook = () =>
    page.evaluate(async (title) => {
      const books = (await window.ttuHost!.listBooks({})) as { id: number; title: string }[];
      return books.find((book) => book.title === title)?.id;
    }, FIXTURE_TITLE);

  let id = await findBook();
  if (id === undefined) {
    await page.evaluate((url) => window.ttuHost!.importBooks({ urls: [url] }), `/${FIXTURE_BOOK}`);
    id = await findBook();
  }

  expect(id, 'fixture book imported').toBeDefined();
  return id!;
}

/** Opens the reader on book `id` and waits for its content. */
export async function openBook(page: Page, id: number, peek?: number) {
  const query = peek === undefined ? `id=${id}` : `id=${id}&peek=${peek}`;
  await page.goto(`/b.html?${query}`);
  await page.locator('.book-content').waitFor();
  // Let the reader restore its position before anything measures it.
  await page.waitForTimeout(600);
}

interface CharBox {
  x: number;
  y: number;
  onScreen: boolean;
}

/**
 * Centre of the `index`-th character of the first text node containing
 * `needle` inside the book, and whether it is fully on screen.
 */
export function charBox(page: Page, needle: string, index: number) {
  return page.evaluate(
    ([needle, index]) => {
      const walker = document.createTreeWalker(
        document.querySelector('.book-content')!,
        NodeFilter.SHOW_TEXT
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node as Text;
        const at = text.data.indexOf(needle);
        if (at === -1) continue;
        const range = new Range();
        range.setStart(text, at + index);
        range.setEnd(text, at + index + 1);
        const box = range.getBoundingClientRect();
        return {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          onScreen:
            box.width > 0 &&
            box.left >= 0 &&
            box.top >= 0 &&
            box.right <= window.innerWidth &&
            box.bottom <= window.innerHeight
        };
      }
      return null;
    },
    [needle, index] as const
  ) as Promise<CharBox | null>;
}

/**
 * Turns pages until the character is on screen, then lets the scroll settle.
 * In paginated mode, later chapters are only in the DOM once reached.
 */
export async function bringOnScreen(page: Page, needle: string, index: number) {
  for (let turns = 0; turns < 200; turns += 1) {
    const box = await charBox(page, needle, index);
    if (box?.onScreen) {
      // Page turns animate: measure again once the scroll has settled.
      await page.waitForTimeout(600);
      const settled = await charBox(page, needle, index);
      if (settled?.onScreen) {
        return settled;
      }
      continue;
    }
    await page.evaluate(() => window.ttuHost!.nextPage({}));
    await page.waitForTimeout(150);
  }
  throw new Error(`"${needle}" never came on screen`);
}

/**
 * Taps the `index`-th character of `needle` and returns the resulting tap
 * event, after checking that the tap hit that character.
 */
export async function tapCharacter(page: Page, needle: string, index: number) {
  const box = await bringOnScreen(page, needle, index);
  const before = await page.evaluate(() => window.__hostEvents.length);

  await page.mouse.click(box.x, box.y);

  const handle = await page.waitForFunction(
    (from) => window.__hostEvents.slice(from).find((event) => event.type === 'tap'),
    before
  );
  const tap = (await handle.jsonValue()) as TapEvent;

  expect(tap.text[tap.offset], `tap hit "${needle[index]}" of "${needle}"`).toBe(needle[index]);
  return tap;
}

export async function turnPages(page: Page, count: number) {
  for (let i = 0; i < count; i += 1) {
    await page.evaluate(() => window.ttuHost!.nextPage({}));
    await page.waitForTimeout(150);
  }
}

/** Stored bookmark of book `id`, or null when there is none. */
export function readBookmark(page: Page, id: number) {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('books');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction('bookmark').objectStore('bookmark').get(id);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, id);
}
