/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import type { PageManager } from '$lib/components/book-reader/types';
import { registerHostCommand } from '$lib/host/host-bridge';

let currentPageManager: PageManager | undefined;

export function setHostPageManager(pageManager: PageManager | undefined) {
  currentPageManager = pageManager;
}

export function initHostPage() {
  registerHostCommand('nextPage', () => currentPageManager?.nextPage());
  registerHostCommand('prevPage', () => currentPageManager?.prevPage());
}
