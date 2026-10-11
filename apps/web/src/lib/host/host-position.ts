/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import type { BookmarkManager } from '$lib/components/book-reader/types';
import { getCharacterCount } from '$lib/functions/get-character-count';
import { isHost } from '$lib/host/host-bridge';

let currentBookmarkManager: BookmarkManager | undefined;

export function setHostBookmarkManager(bookmarkManager: BookmarkManager | undefined) {
  currentBookmarkManager = bookmarkManager;
}

/**
 * Position of the character at `offset` in `node`, in bookmark units
 * (`exploredCharCount`), or -1 when no book is laid out.
 */
export function positionAt(node: Text, offset: number) {
  if (!currentBookmarkManager) {
    return -1;
  }

  const range = new Range();
  range.setStart(node, offset);
  range.collapse(true);

  const before = currentBookmarkManager.charCountAtRange(range);
  if (before < 0) {
    return -1;
  }

  return before + getCharacterCount(document.createTextNode(node.data.slice(0, offset)));
}

/**
 * The `peek` URL parameter: open the book at this position and never save
 * its bookmark during this session. Undefined outside the app.
 */
export function getPeekPosition() {
  if (!isHost()) {
    return undefined;
  }

  const raw = new URLSearchParams(window.location.search).get('peek');
  if (raw === null) {
    return undefined;
  }

  const position = Number(raw);
  return Number.isInteger(position) && position >= 0 ? position : undefined;
}
