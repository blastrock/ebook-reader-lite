# CLAUDE.md

## What this is

**ebook-reader-lite** is a fork of the ッツ (ttu) Ebook Reader
([ttu-ttu/ebook-reader](https://github.com/ttu-ttu/ebook-reader), remote `upstream`), made for
one consumer: **[Yomimoto](https://github.com/blastrock/yomimoto)**, a Flutter/Android app for
reading Japanese with instant dictionary lookup and Anki card creation (itself a fork of
jidoujisho, which is why some comments here say "the jidoujisho app"). The Yomimoto checkout
normally sits next to this one, at `../yomimoto`.

It is not deployed as a website. Yomimoto embeds the static build:

- `tool/fetch_ttu.sh` (in Yomimoto) downloads a release zip of this repo, pinned in
  `tool/ttu.lock`, into `assets/ttu-ebook-reader/`.
- The app serves it through a `WebViewAssetLoader` on `https://appassets.androidplatform.net` and
  shows it in `flutter_inappwebview`. The WebView is Chromium; nothing else matters.
- Books live in the WebView's IndexedDB, which stays the source of truth. The app keeps a
  database mirror of the library and drives everything through the host protocol below. It never
  injects JS: anything new the app needs is a new command or event here.

The "lite" is the point of the fork: here ttu is **only the reader**. The library (shelf,
import, deletion, covers), the book manager, statistics and anything else that is collection
management belong to the Flutter app, which runs ttu's own code for them through the headless
`/host` route rather than showing ttu's pages. Do not build collection features here; expose a
command for the app instead.

Upstream is in maintenance mode. Its own commits (mostly `renovate[bot]` dependency bumps) still
arrive through `upstream`.

### Fork ground rules

- **Stay rebaseable.** Fork commits are a linear stack on top of upstream. The overlay lives in
  new files under `apps/web/src/lib/host/`; upstream files only get small hooks (an import and a
  call, an extra interface method, an `isHost()` branch). Keep each hook as small as possible so
  rebases stay cheap. Do not reformat or refactor upstream code on the side.
- **Inert outside the app.** Everything is gated on `isHost()` (`window.flutter_inappwebview`
  exists). Opened in a normal browser the reader behaves exactly like upstream.
- Upstream's deploy workflow, Dockerfile, nginx config and docker-compose are leftovers. They are
  unused; leave them unless they get in the way of a rebase.

## The host overlay (`apps/web/src/lib/host/`)

| File               | Role                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `host-bridge.ts`   | Transport, `isHost()`, `PROTOCOL_VERSION`, command registry                                                                  |
| `host-init.ts`     | `initHost()`, called from the root `+layout.svelte`; wires everything and sends `ready`                                      |
| `host-debug.ts`    | Fake host for desktop browsers (see Testing)                                                                                 |
| `host-styles.ts`   | `ttu-host` class on `<html>`, unselectable ruby annotations, selection colour                                                |
| `host-page.ts`     | `nextPage` / `prevPage` (the reader page hands over its `PageManager`)                                                       |
| `host-lookup.ts`   | Tap-to-lookup: the `tap` event, `highlight`, `clearSelection`, `getSelectedText`, `getContext`                               |
| `host-position.ts` | Tap positions in bookmark units, the `peek` URL parameter                                                                    |
| `host-theme.ts`    | `theme` event: background and font colours, as RGBA, whenever the theme changes                                              |
| `host-library.ts`  | Library commands, run on the empty `/host` route in a headless WebView: `listBooks`, `getCover`, `importBooks`, `deleteBook` |

**Transport.** Events go to the app with
`flutter_inappwebview.callHandler('ttuHost', { type, ...payload })` (`sendToHost`, which waits for
the platform to be ready). Commands are registered with `registerHostCommand` and exposed as
`window.ttuHost.<name>(args)`; the app calls them with `callAsyncJavaScript` and awaits the result.

**Events:** `ready` (`protocolVersion`, `route`), `tap` (`text` of the paragraph, `offset` in it,
`x`, `y`, `position`; a tap on nothing sends `offset: -1`), `theme`, `exit` (the Exit entry that
replaces Manage in the reader and settings headers).

**Sentence context.** `getContext({ paragraphs })` returns the last tapped paragraph and up to
`paragraphs` paragraphs before it, oldest first, for Yomimoto's sentence explanation. Each is its
text with furigana written `kanji(reading)` (one parenthesis per `<rt>`, `<rp>` dropped).
Paragraphs are found as the tap finds them (`findParagraph`) and never cross the book section
(`.ttu-book-html-wrapper`), so both view modes give the same answer. Empty until a tap.

**Protocol version.** `PROTOCOL_VERSION` in `host-bridge.ts` mirrors `TtuBridge.protocolVersion`
in Yomimoto's `lib/src/media/sources/ttu_bridge.dart`. Bump **both** whenever an event or
command changes shape; a mismatch shows a snackbar in the reader. The app side of the protocol
is `ttu_bridge.dart`, `ttu_host_operations.dart` (the headless `/host` WebView) and
`reader_ttu_source.dart`, all in that directory.

**Positions and peek.** A `tap`'s `position` is in bookmark units (`exploredCharCount`): ttu's
character count, which only counts Japanese characters (`get-character-count.ts`). It is computed
through `BookmarkManager.charCountAtRange`, a hook added to both view modes' bookmark managers.
`b.html?id=N&peek=<position>` opens a book at that position and saves no bookmark for the whole
session (auto-bookmark and the manual bookmark are both suppressed); Yomimoto uses it to show a
stashed word in context.

In host mode the book manager and statistics are not reachable: the app owns the library.

## Commands

Run from the repo root unless noted. Node and pnpm versions are pinned (`engine-strict=true`; CI
uses the versions in `.github/workflows/ci.yml`).

```sh
pnpm install
(cd apps/web && pnpm svelte-kit sync)   # after install, as CI does
pnpm dev                                # vite dev server
pnpm build                              # → apps/web/build/, the tree Yomimoto ships
pnpm eslint .                           # from the root, NOT apps/web
pnpm format                             # prettier --write .
(cd apps/web && pnpm test:e2e)          # needs pnpm build first; playwright install chromium once
```

CI (`ci.yml`, every push and pull request) runs `pnpm eslint .`, `pnpm build` and the end-to-end
tests. Upstream's `pnpm check` (svelte-check) already fails with about 42 errors; it is not
expected to pass, but do not add new errors to it.

To try a change in the app: `tool/fetch_ttu.sh --local ../ebook-reader-lite` from the Yomimoto
checkout builds this tree and installs it as the app's assets.

## Testing

- **In a desktop browser:** set `localStorage.ttuHostDebug = '1'` and reload. A fake host logs
  every event to the console, and commands can be called as `window.ttuHost.<command>({...})`.
- **End-to-end (Playwright, `apps/web/e2e/`):** runs against the build served by
  `python3 -m http.server`, Chromium only. A recording `flutter_inappwebview` is defined before
  the app loads (so the reader runs in host mode and events land in `window.__hostEvents`), and a
  two-chapter fixture EPUB is generated in `fixture-book.ts`. Every case runs in both paginated
  and continuous view modes. A change to tap positions or peek should come with a case here.
- Anything involving the real WebView (volume keys, the asset loader, the snackbar) is checked on
  a device or emulator through Yomimoto.

Known quirks, all harmless: the SvelteKit service worker fails to register under the asset loader
(an `Uncaught (in promise) TypeError` in the WebView console; do not chase it), and tapping
another word while one is highlighted starts a new lookup, because the tap's mousedown clears the
selection before `click` fires.

## Conventions

- **Svelte 4** in `apps/web` (the root `package.json`'s Svelte 5 is only for the ESLint tooling):
  no runes. TypeScript, RxJS stores in `$lib/data/store`, Tailwind.
- Every `.ts` file starts with the BSD-3-Clause header (`@license BSD-3-Clause`, `Copyright (c)
<year>, ッツ Reader Authors`), enforced by ESLint. Copy it from a neighbouring file.
- Prettier: single quotes, no trailing commas, 100 columns.
- Commit messages are Conventional Commits (`commitlint`). Overlay work uses the `host` scope:
  `feat(host): ...`, `test(host): ...`; workflow changes are `ci: ...`.
- Spelling is British in comments and identifiers (`initialise`, `colours`), matching Yomimoto.

## Version control and releases

This is a **git-colocated jj repo**; prefer `jj`. `main` is the fork's branch, remotes are
`origin` (blastrock/ebook-reader-lite) and `upstream`. jj does not run git hooks, so husky's
`commit-msg` (commitlint) and `pre-commit` (lint-staged) never fire: run `pnpm eslint .` and
prettier yourself before committing, and write the commit message in the conventional format by
hand.

Releases are `vX.Y.Z` tags. Pushing one runs `release.yml`, which builds and publishes
`ebook-reader-lite-vX.Y.Z.zip` as a GitHub release. Then, in Yomimoto,
`tool/fetch_ttu.sh --update vX.Y.Z` re-pins `tool/ttu.lock`, which is committed there. Create the
tag locally; pushing commits and tags is left to the user.

A protocol change is a minor release, not a major one: the tag's version does not track
`PROTOCOL_VERSION`.
