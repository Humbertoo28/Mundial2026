const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/TradeListButton.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  /await clearRepeatedStickers\(\);/,
  `const res = await clearRepeatedStickers();\n        if (res?.error) throw new Error(res.error);`
);

fs.writeFileSync(filePath, code);
console.log('Fixed TradeListButton.tsx');
