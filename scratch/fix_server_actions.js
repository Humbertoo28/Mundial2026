const fs = require('fs');
const path = require('path');

const stickersPath = path.join(__dirname, '../src/app/actions/stickers.ts');
let stickersCode = fs.readFileSync(stickersPath, 'utf8');

// Replace all `throw new Error(...)` with `return { error: ... }` in stickers.ts
stickersCode = stickersCode.replace(/throw new Error\((.*?)\);/g, 'return { error: $1 };');
fs.writeFileSync(stickersPath, stickersCode);

const tradeManagerPath = path.join(__dirname, '../src/components/TradeManager.tsx');
let tradeManagerCode = fs.readFileSync(tradeManagerPath, 'utf8');

// Inside handleExecuteTrade, add error handling
tradeManagerCode = tradeManagerCode.replace(
  /const result = await executeTrade\(givenArray, receivedIds, traderName\);\s*if \(result\.success\) \{/,
  `const result = await executeTrade(givenArray, receivedIds, traderName);\n        if (result.error) {\n          throw new Error(result.error);\n        }\n        if (result.success) {`
);
fs.writeFileSync(tradeManagerPath, tradeManagerCode);

console.log('Successfully updated stickers.ts and TradeManager.tsx');
