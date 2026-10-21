# Changelog

All notable changes to Syntaxer are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-10-21

A redesign with a native Figma (UI3) interface, automatic name levels and a round of correctness fixes. Some generated names change, so review the preview before re-applying syntax to existing files.

### Breaking changes

- camelCase inside a segment now splits into words: `typography/base/fontFamily` becomes `typography-base-font-family` instead of `typography-base-fontfamily`. Turn on **Keep original casing** to get `typography-base-fontFamily`.
- The **CSS variables** preset now produces `var(--name)` instead of `--name`.
- Word replacements match literal text (case-insensitive) instead of regular expressions.
- The fixed Root / Domain / Context / Element / Variant scopes are replaced by **Level 1 … Level N**, detected from the deepest variable path.

### Added

- Native Figma UI3 interface built with FigUI3 that follows the light and dark themes.
- Automatic detection of name levels, with an example segment for each level.
- **Keep original casing** option.
- Every naming convention is now selectable, including dot.case, path/case, Train-Case, lowercase, UPPERCASE and the Android and Tailwind rules.
- Selection of individual groups, with a mixed state on collections and on **All**.
- Keyboard reordering of levels.
- Inline validation for prefix, separator, suffix and duplicate replacements.
- Word replacements can now replace a word with nothing.
- Loading state on **Apply syntax** and **Clear syntax**.
- Automated tests for the plugin logic (`npm test`).

### Changed

- The plugin window is now 320 px wide, like Figma's own panels.
- The preview filter only narrows the preview. Apply and Clear always use the checked variables.
- Apply and Clear always report a result, and explain why nothing happened (no platform or no variables selected).
- The UI is built with Vite into a single offline file, `dist/ui.html`.
- Code-syntax calls use the typed Figma API instead of `any`.

### Fixed

- The **Naming Convention** dropdown had no effect.
- Clicking the **Select all collections** label did nothing.
- The prefilled `var(--` prefix and `)` suffix were shown but never applied.
- Selecting only some groups of a collection applied nothing.
- Variables with more than five levels silently lost the extra segments.
- The plugin showed no variables if the SortableJS CDN could not be reached.
- A replacement containing characters such as `(` broke the preview.
- Success messages appeared even when nothing was updated or an error occurred.
- Collection, group and variable names containing HTML were rendered as markup.

### Removed

- The CDN dependency (SortableJS) and all runtime network access.
- The unused Bootstrap dependency.

## [1.0.0] - 2025-08-20

### Added

- First release: set the code syntax of local variables from naming conventions, with presets, prefix, suffix, separator, scopes, word replacements, platforms and a preview.

[2.0.0]: https://github.com/maxavend/syntaxer-figma-plugin/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/maxavend/syntaxer-figma-plugin/releases/tag/v1.0.0
