# Publishing Syntaxer to the Figma Community

Everything needed to publish this version as an update of the existing Syntaxer listing (plugin id `1539836560254884135`).

## 1. Build and check

```bash
npm ci
npm run release
```

`npm run release` cleans, builds, lints, runs the tests and validates the manifest, the build output and the assets in this folder. Publish only when it ends with **Ready to publish**.

If the UI changed, regenerate the listing images first (needs Google Chrome):

```bash
npm run assets
```

## 2. Test in Figma (required before submitting)

Figma rejects plugins that crash or have obvious bugs, so run through this in the **Figma desktop app** with **Plugins → Development → Import plugin from manifest…** → `manifest.json`. Use a test file with local variables, including some with camelCase segments and paths of different depths.

- [ ] Opens in light and dark themes with Figma's colors.
- [ ] Every collection and group is listed with correct counts.
- [ ] Name structure shows as many levels as the deepest variable path.
- [ ] Changing preset, naming, prefix, separator, suffix and casing updates the preview.
- [ ] Dropping and reordering levels (mouse and arrow keys) updates the preview.
- [ ] Word replacements apply; a duplicate shows an error.
- [ ] **Apply syntax** writes the expected value for each selected platform (check a variable in Dev Mode or in the variable's code syntax settings).
- [ ] **Clear syntax** removes it only for the selected platforms and variables.
- [ ] With no platform or no variables selected, Apply shows a clear message and changes nothing.
- [ ] A file with no local variables shows "This file has no local variables."
- [ ] No errors in **Plugins → Development → Show/Hide console**.

## 3. Publish

Requirements: Figma desktop app (macOS or Windows), two-factor authentication on the account that owns the plugin.

1. In the desktop app, go to **Plugins → Manage plugins**, open Syntaxer and choose **Publish new version** (or right-click the development plugin → **Publish**).
2. Fill in the listing with the content below and upload the images from this folder.
3. Submit. Material updates go through Figma's review again; you can keep pushing fixes while it's in review.

## Listing content

### Name

Syntaxer

### Tagline

Generate code syntax for your Figma variables

### Description

Syntaxer fills in the **code syntax** of your variables — the name developers see and copy in Dev Mode — for Web, Android and iOS, from the variable paths you already have.

**How it works**
1. Pick a preset (CSS variables, SCSS, Less, Tailwind, Android or iOS) or build your own naming: 12 conventions plus prefix, separator and suffix.
2. Shape the names: Syntaxer detects every level in your variable paths, so you can drop or reorder levels, replace words (background → bg) and keep camelCase if your code uses it.
3. Choose the platforms and the collections or groups to update.
4. Review every generated name in the preview, then click **Apply syntax**. Nothing changes until you apply, and **Clear syntax** removes it again.

**Examples for color/background/primary**
- Web: var(--color-background-primary)
- Android: colorBackgroundPrimary
- iOS: ColorBackgroundPrimary

Syntaxer never renames your variables and never connects to the internet. It runs entirely in your file.

Documentation, changelog and support: https://github.com/maxavend/syntaxer-figma-plugin

### Category

Software development (or the closest development category Figma offers).

### Images

| Field | File | Size |
| --- | --- | --- |
| Icon | `icon-128.png` | 128 × 128 |
| Thumbnail / cover | `cover-1920x1080.png` | 1920 × 1080 (content inside the 1800 × 1080 safe area) |
| Carousel (optional) | `carousel-1-presets.png`, `carousel-2-levels.png`, `carousel-3-preview.png` | 1920 × 1080 |

### Support contact

https://github.com/maxavend/syntaxer-figma-plugin/issues

### Network access

The manifest declares no network access, so the listing shows **No access**.

### Data security disclosure (optional form)

Suggested answers, based on what the code does:

- **Network:** the plugin makes no network requests and the manifest allows no domains.
- **Data collected or shared:** none. No analytics, accounts, cookies or third-party services.
- **Data stored:** none. Settings live only while the plugin is open; nothing is written to `clientStorage` or outside the file.
- **File access:** reads the names of local variables and collections in the current file. Writes only the variables' code syntax, and only when the user clicks **Apply syntax** or **Clear syntax**.

Figma reviews these answers separately; it can take up to two weeks.

### Version notes for this update

Syntaxer 2.0 — redesigned with Figma's native UI3 look in light and dark themes.

- Name levels are detected automatically, however deep your variable paths go.
- camelCase segments split correctly (fontFamily → font-family), with an option to keep the original casing.
- The CSS variables preset now produces var(--name).
- Select single groups, preview every name, and get clear messages when there's nothing to apply.
- Many fixes: the Naming dropdown, prefilled prefix/suffix, group selection and more.

Some generated names change in this version: review the preview before re-applying to files you've already processed.
