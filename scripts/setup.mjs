import fs from 'node:fs'

// Copy the example files to real config files
fs.copyFileSync('wrangler.example.jsonc', 'wrangler.jsonc')
fs.copyFileSync('.dev.vars.example', '.dev.vars')

console.log('✔ Created wrangler.jsonc and .dev.vars')
