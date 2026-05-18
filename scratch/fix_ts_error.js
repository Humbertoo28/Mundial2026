const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/actions/stickers.ts');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  /errs\.map\(e => e\.error\.message\)/g,
  `errs.map(e => e.error?.message || "Error desconocido")`
);

fs.writeFileSync(filePath, code);
console.log('Fixed TypeScript error in stickers.ts');
