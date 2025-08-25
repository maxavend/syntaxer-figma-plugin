
# Syntaxer – Figma Plugin

Automate the transformation and standardization of local variable names in Figma. Apply naming conventions, prefixes, suffixes, and custom separators to your design tokens for consistent, scalable design systems.

---

## Features

- View and manage local variable collections in Figma
- Apply naming conventions: kebab-case, camelCase, PascalCase, snake_case, and more
- Configure custom prefixes, suffixes, and separators
- Multi-platform support: web, Android, iOS
- Compact, responsive, and accessible UI inspired by Figma dark mode
- Drag & drop to reorder scopes
- Bulk selection and advanced filtering for collections
- Fully customizable and easy to use

---

## Installation & Usage

1. **Clone or download this repository.**
2. Install dependencies:
  ```sh
  npm install
  ```
3. Build the plugin:
  ```sh
  npm run build
  ```
4. In Figma, go to `Plugins > Development > Import plugin from manifest...` and select the `manifest.json` file from this project.
5. Open the plugin in Figma and start transforming your variables.

---

## Available Scripts

- `npm run build` – Compile TypeScript to JavaScript
- `npm run watch` – Compile in watch mode
- `npm run lint` – Lint the codebase
- `npm run lint:fix` – Auto-fix lint issues

---

## Project Structure

- `code.ts` – Main plugin logic (TypeScript)
- `ui.html` – User interface (HTML, CSS, JS)
- `manifest.json` – Figma plugin configuration

---

## Requirements

- Node.js and npm ([download here](https://nodejs.org/en/download/))
- Figma Desktop App

---

## Contributing

Ideas and improvements are welcome. Feel free to open issues or submit pull requests.

---

Thank you for using Syntaxer!
