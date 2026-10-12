/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildFixtureBook, FIXTURE_BOOK } from './fixture-book';

/** Writes the fixture book into the served build, so the reader can fetch it. */
export default async function globalSetup() {
  const build = join(import.meta.dirname, '..', 'build');
  if (!existsSync(join(build, 'b.html'))) {
    throw new Error('No build found in apps/web/build: run `pnpm build` first.');
  }

  writeFileSync(join(build, FIXTURE_BOOK), await buildFixtureBook());
}
