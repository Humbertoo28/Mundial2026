const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/actions/stickers.ts');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  /const results = await Promise\.all\(promises\);\s*if \(results\.some\(r => r\.error\)\) return \{ error: "Error al ejecutar el intercambio sincrónico" \};/,
  `const results = await Promise.all(promises);
  const errs = results.filter(r => r.error);
  if (errs.length > 0) {
    console.error("Supabase executeTrade errors:", errs.map(e => e.error));
    return { error: "Error al ejecutar el intercambio en la base de datos: " + errs.map(e => e.error.message).join(", ") };
  }`
);

fs.writeFileSync(filePath, code);
console.log('Added logging to executeTrade');
