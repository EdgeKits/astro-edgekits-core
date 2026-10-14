/** @type {import("prettier").Config} */
export default {
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        // Disable wrapping each attribute to a new line for links
        singleAttributePerLine: false,
        // Prevent unwanted line breaks around tags
        htmlWhitespaceSensitivity: 'ignore',
        printWidth: 500,
        // Disable forced wrapping of long lines of text
        proseWrap: 'preserve',
      },
    },
  ],
  semi: false,
  singleQuote: true,
  // LF everywhere (paired with .gitattributes `* text=auto eol=lf`)
  endOfLine: 'lf',
  // Increase the line length limit for content
  printWidth: 120,
}
