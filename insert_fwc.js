const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const newStickers = [];
  
  // Agregamos desde FWC9 hasta FWC29 por seguridad (el usuario mencionó tener la 18)
  // El ID va todo junto: FWC9, FWC18
  for (let i = 0; i <= 29; i++) {
    // Para el 00
    if (i === 0) {
      newStickers.push({
        id: '00',
        name: 'Logo Panini / FWC 0',
        section: 'FWC',
        type: 'ESPECIAL'
      });
    } else {
      newStickers.push({
        id: `FWC${i}`,
        name: `FWC ${i}`,
        section: 'FWC',
        type: 'ESPECIAL'
      });
    }
  }

  const { data, error } = await supabase
    .from('stickers')
    .upsert(newStickers, { onConflict: 'id' });

  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Insertadas figuritas FWC 0-29 con éxito.");
  }
}

run();
