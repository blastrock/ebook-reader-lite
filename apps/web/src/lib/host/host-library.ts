/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { getStorageHandler } from '$lib/data/storage/storage-handler-factory';
import { StorageKey } from '$lib/data/storage/storage-types';
import { database } from '$lib/data/store';
import { importData } from '$lib/functions/replication/replicator';
import { registerHostCommand } from '$lib/host/host-bridge';

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Ids and titles only: walks the title index so book contents are never loaded. */
async function listBooks() {
  const db = await database.db;
  const books: { id: number; title: string }[] = [];
  let cursor = await db.transaction('data').store.index('title').openKeyCursor();

  while (cursor) {
    books.push({ id: cursor.primaryKey as number, title: cursor.key as string });
    cursor = await cursor.continue();
  }

  return books;
}

async function getCover({ id }: Record<string, unknown>) {
  if (typeof id !== 'number') {
    throw new Error('getCover: id must be a number');
  }

  const db = await database.db;
  const cover = (await db.get('data', id))?.coverImage;

  return cover instanceof Blob ? blobToDataUrl(cover) : null;
}

async function importBooks({ urls }: Record<string, unknown>) {
  if (!Array.isArray(urls)) {
    throw new Error('importBooks: urls must be an array');
  }

  const files = await Promise.all(
    urls.map(async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Cannot read ${url}: ${response.status}`);
      }
      const name = decodeURIComponent(url.split('/').pop() || 'book.epub');
      return new File([await response.blob()], name);
    })
  );

  const error = await importData(
    document,
    getStorageHandler(window, StorageKey.BROWSER),
    files,
    new AbortController().signal
  );

  if (error) {
    throw new Error(error);
  }
}

async function deleteBook({ id }: Record<string, unknown>) {
  if (typeof id !== 'number') {
    throw new Error('deleteBook: id must be a number');
  }

  const db = await database.db;
  const book = await db.get('data', id);
  if (!book) {
    return;
  }

  const { error } = await database.deleteData(
    [id],
    new Map([[id, book.title]]),
    new AbortController().signal,
    false
  );

  if (error) {
    throw new Error(error);
  }
}

export function initHostLibrary() {
  registerHostCommand('listBooks', listBooks);
  registerHostCommand('getCover', getCover);
  registerHostCommand('importBooks', importBooks);
  registerHostCommand('deleteBook', deleteBook);
}
