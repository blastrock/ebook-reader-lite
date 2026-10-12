/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { BlobWriter, configure, TextReader, ZipWriter } from '@zip.js/zip.js';

/** File name of the fixture book, served next to the build. */
export const FIXTURE_BOOK = 'e2e-fixture.epub';

export const FIXTURE_TITLE = '試験の本';

const FILLER = 'これは試験のための文章です。猫が静かに窓の外を見ていました。';

/** Paragraphs of chapter 1: furigana and Latin letters in paragraph 6. */
export const CHAPTER_1 = Array.from({ length: 40 }, () => FILLER.repeat(3));
CHAPTER_1[5] = `彼は<ruby>漢字<rt>かんじ</rt></ruby>を書いた。ABCとあいうえお。${FILLER}`;

/** Paragraphs of chapter 2: the target phrase in paragraph 11. */
export const CHAPTER_2 = Array.from({ length: 40 }, () => FILLER.repeat(3));
CHAPTER_2[10] = `目標の言葉はここにある。探偵が<ruby>謎<rt>なぞ</rt></ruby>を解いた。${FILLER}`;

function chapter(n: number, paragraphs: string[]) {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja"><head><title>第${n}章</title></head>
<body><h1>第${n}章</h1>
${body}
</body></html>`;
}

const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;

const PACKAGE = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">stash-test</dc:identifier>
<dc:title>${FIXTURE_TITLE}</dc:title><dc:language>ja</dc:language><meta property="dcterms:modified">2026-10-11T00:00:00Z</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/></manifest>
<spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`;

const NAV = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>目次</title></head>
<body><nav epub:type="toc"><ol><li><a href="c1.xhtml">第1章</a></li><li><a href="c2.xhtml">第2章</a></li></ol></nav></body></html>`;

/** A two-chapter EPUB 3 of `CHAPTER_1` and `CHAPTER_2`. */
export async function buildFixtureBook() {
  configure({ useWebWorkers: false });

  const writer = new ZipWriter(new BlobWriter('application/epub+zip'));
  // EPUB requires `mimetype` first and uncompressed.
  await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
  await writer.add('META-INF/container.xml', new TextReader(CONTAINER));
  await writer.add('OEBPS/content.opf', new TextReader(PACKAGE));
  await writer.add('OEBPS/nav.xhtml', new TextReader(NAV));
  await writer.add('OEBPS/c1.xhtml', new TextReader(chapter(1, CHAPTER_1)));
  await writer.add('OEBPS/c2.xhtml', new TextReader(chapter(2, CHAPTER_2)));
  const blob = await writer.close();

  return Buffer.from(await blob.arrayBuffer());
}
