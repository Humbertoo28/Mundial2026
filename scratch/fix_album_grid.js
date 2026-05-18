const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AlbumGrid.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  /await updateStickerQuantity\(stickerId, newQ\);/,
  `const res = await updateStickerQuantity(stickerId, newQ);\n          if (res?.error) throw new Error(res.error);`
);

fs.writeFileSync(filePath, code);
console.log('Fixed AlbumGrid.tsx');
