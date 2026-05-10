const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedStickers() {
  const filePath = path.join(__dirname, '../data/panini_world_cup_2026_tracker.json');
  const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stickers = fileData.FALTANTES;

  console.log(`Preparando ${stickers.length} láminas para subir...`);

  // Dividir en grupos de 100 para evitar límites de payload
  const chunkSize = 100;
  for (let i = 0; i < stickers.length; i += chunkSize) {
    const chunk = stickers.slice(i, i + chunkSize).map(s => ({
      id: s.ID,
      section: s.SECCIÓN,
      type: s.TIPO,
      name: s.NOMBRE_APELLIDO
    }));

    const { error } = await supabase
      .from('stickers')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`Error en chunk ${i}:`, error.message);
    } else {
      console.log(`Subido: ${i + chunk.length}/${stickers.length}`);
    }
  }

  console.log('¡Proceso de seeding completado!');
}

seedStickers();
