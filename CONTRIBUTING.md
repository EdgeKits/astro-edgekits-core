# Contributing to EdgeKits Core

First off, thank you for considering contributing to EdgeKits Core!

We welcome contributions of all forms: bug fixes, documentation improvements, new features, and translation updates.

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🛠 Development Setup

To get started with the project locally:

1.  **Fork and Clone** the repository.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup environment**:
    Run the setup script to create your `.dev.vars` and `wrangler.jsonc` from templates:
    ```bash
    npm run setup
    ```
4.  **Generate i18n artifacts**:
    **Important:** You must run the i18n bundler before starting the dev server, otherwise TypeScript will complain about missing generated files.
    ```bash
    npm run i18n:bundle
    ```
5.  **Start the dev server**:
    ```bash
    npm run dev
    ```

## 📐 Architecture Guidelines

EdgeKits Core is opinionated. When submitting PRs, please respect the following principles:

- **Zero-JS First:** We prioritize shipping HTML/CSS to the client. Avoid adding client-side JavaScript (React hydration) unless absolutely necessary for interactivity.
- **Edge-Native:** Remember this runs on Cloudflare Workers. Avoid Node.js-specific APIs (`fs`, `path`) in runtime code.
- **Type Safety:** We maintain strict TypeScript configuration. Do not use `any`. Ensure all i18n keys are typed via the generator.
- **Performance:** Keep external dependencies minimal.

## 🌍 Adding Translations

If you are adding new translation keys:

1.  Add the key to `src/locales/en/<namespace>.json` first.
2.  Run `npm run i18n:bundle` to regenerate the types.
3.  You can then add the same key to other locales.

## 📦 Pull Request Process

1.  Create a new branch for your feature or fix:
    ```bash
    git checkout -b feat/amazing-feature
    ```
2.  Make your changes.
3.  **Verify** that the project builds and types check:
    ```bash
    npm run build
    npm run typegen
    ```
4.  Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat: add new locale switcher`
    - `fix: resolve hydration mismatch in navbar`
    - `docs: update readme`
5.  Push to your fork and submit a Pull Request.

## 🐛 Reporting Bugs

If you find a bug, please create an Issue using the provided template. Include:

- Browser and OS version.
- Steps to reproduce.
- Expected vs. Actual behavior.

Thank you for helping us build the best Astro starter for Cloudflare!
