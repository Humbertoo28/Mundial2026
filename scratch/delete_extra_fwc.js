const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const idsToDelete = [];
  for (let i = 20; i <= 29; i++) {
    idsToDelete.push(`FWC${i}`);
  }

  console.log('Eliminando los siguientes stickers no oficiales:', idsToDelete);

  // 1. Eliminar inventario de los usuarios para estos stickers
  const { data: userStickers, error: fetchErr } = await supabase
    .from('user_stickers')
    .select('id')
    .in('sticker_id', idsToDelete);

  if (fetchErr) {
    console.error('Error buscando inventario viejo:', fetchErr.message);
  } else if (userStickers && userStickers.length > 0) {
    console.log(`Borrando ${userStickers.length} registros de inventario de usuarios...`);
    const { error: delUserErr } = await supabase
      .from('user_stickers')
      .delete()
      .in('id', userStickers.map(us => us.id));
    if (delUserErr) console.error('Error borrando inventario:', delUserErr.message);
  }

  // 2. Eliminar los stickers de la tabla principal
  const { error: delErr } = await supabase
    .from('stickers')
    .delete()
    .in('id', idsToDelete);

  if (delErr) {
    console.error('Error eliminando los stickers de la tabla principal:', delErr.message);
  } else {
    console.log('Stickers eliminados correctamente de la tabla principal.');
  }

  // 3. Verificar el conteo total
  const { count, error: countErr } = await supabase
    .from('stickers')
    .select('*', { count: 'exact', head: true });
    
  if (countErr) {
    console.error('Error verificando conteo:', countErr.message);
  } else {
    console.log(`\n¡CONTEO FINAL EXACTO EN LA BASE DE DATOS: ${count} CROMOS!`);
  }
}

run();
