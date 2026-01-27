import fs from 'node:fs'

// Copy the example files to real config files
fs.copyFileSync('.dev.vars.example', '.dev.vars')

console.log('✔ Created .dev.vars')
