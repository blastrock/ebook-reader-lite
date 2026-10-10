/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { getParagraphNodes } from '$lib/components/book-reader/get-paragraph-nodes';
import { registerHostCommand, sendToHost } from '$lib/host/host-bridge';

interface ParagraphMap {
  text: string;
  nodes: Text[];
  starts: number[];
}

let lastParagraph: ParagraphMap | undefined;

function isInRubyAnnotation(node: Node) {
  return !!node.parentElement?.closest('rt, rp');
}

function findParagraph(node: Node): Element | undefined {
  let element: Element | null = node instanceof Element ? node : node.parentElement;

  const paragraph = element?.closest('p');
  if (paragraph) {
    return paragraph;
  }

  while (element && !element.classList.contains('book-content')) {
    const { display } = getComputedStyle(element);
    if (!display.startsWith('inline') && !display.startsWith('ruby')) {
      return element;
    }
    element = element.parentElement;
  }

  return undefined;
}

function mapParagraph(paragraph: Element): ParagraphMap {
  const nodes = getParagraphNodes(paragraph).filter(
    (node): node is Text => node.nodeType === Node.TEXT_NODE && !isInRubyAnnotation(node)
  );
  const starts: number[] = [];
  let text = '';

  for (const node of nodes) {
    starts.push(text.length);
    text += node.data;
  }

  return { text, nodes, starts };
}

function caretFromPoint(x: number, y: number) {
  const range = document.caretRangeFromPoint(x, y);

  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
    return undefined;
  }

  const node = range.startContainer as Text;
  let offset = range.startOffset;

  // The caret lands *after* a character when its second half is tapped.
  if (offset > 0) {
    const previous = new Range();
    previous.setStart(node, offset - 1);
    previous.setEnd(node, offset);

    const box = previous.getBoundingClientRect();
    if (box.left <= x && box.right >= x && box.top <= y && box.bottom >= y) {
      offset -= 1;
    }
  }

  return { node, offset };
}

function locate(map: ParagraphMap, position: number, isEnd: boolean) {
  for (let i = 0; i < map.nodes.length; i += 1) {
    const end = map.starts[i] + map.nodes[i].data.length;
    if (isEnd ? position <= end : position < end) {
      return { node: map.nodes[i], offset: position - map.starts[i] };
    }
  }

  return undefined;
}

function dismiss(x: number, y: number) {
  lastParagraph = undefined;
  sendToHost('tap', { text: '', offset: -1, x, y });
}

function onClick(event: MouseEvent) {
  const { target } = event;

  if (!(target instanceof Element) || !target.closest('.book-content')) {
    return;
  }

  const x = Math.round(event.clientX);
  const y = Math.round(event.clientY);
  const selection = window.getSelection();

  if ((selection && !selection.isCollapsed) || target.classList.contains('book-content')) {
    dismiss(x, y);
    return;
  }

  const caret = caretFromPoint(event.clientX, event.clientY);
  const paragraph = caret && findParagraph(caret.node);

  if (!caret || !paragraph) {
    dismiss(x, y);
    return;
  }

  const map = mapParagraph(paragraph);
  const nodeIndex = map.nodes.indexOf(caret.node);
  const offset = nodeIndex === -1 ? -1 : map.starts[nodeIndex] + caret.offset;

  if (offset < 0 || offset >= map.text.length) {
    dismiss(x, y);
    return;
  }

  lastParagraph = map;
  sendToHost('tap', { text: map.text, offset, x, y });
}

function highlight({ start, length }: Record<string, unknown>) {
  if (!lastParagraph || typeof start !== 'number' || typeof length !== 'number') {
    return;
  }

  const end = Math.min(start + length, lastParagraph.text.length);
  const from = locate(lastParagraph, start, false);
  const to = locate(lastParagraph, end, true);

  if (!from || !to) {
    return;
  }

  const range = new Range();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function clearSelection() {
  const selection = window.getSelection();

  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }
}

function getSelectedText() {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    return '';
  }

  const fragment = selection.getRangeAt(0).cloneContents();
  fragment.querySelectorAll('rt, rp').forEach((element) => element.remove());

  return (fragment.textContent ?? '').trim();
}

export function initHostLookup() {
  document.addEventListener('click', onClick, true);

  registerHostCommand('highlight', highlight);
  registerHostCommand('clearSelection', clearSelection);
  registerHostCommand('getSelectedText', getSelectedText);
}
