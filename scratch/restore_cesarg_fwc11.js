const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

async function run() {
  // Ver la situación actual de FWC11 para cesarg
  const { data: before } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID)
    .eq('sticker_id', 'FWC11')
    .single();

  console.log('Estado actual de FWC11 para CesarG:', before);

  if (!before) {
    console.log('CesarG no tiene FWC11. Nada que corregir.');
    return;
  }

  if (before.quantity === 1) {
    console.log('FWC11 ya está en qty=1. No se tocará.');
  } else if (before.quantity === 2) {
    // Esto indica que se sumó: 1 (original en FWC11) + 1 (migrado de "SUIZA 1954 FWC11") = 2
    // Como eran stickers distintos en el álbum físico, debemos volver a qty=1
    // Esto restaura el conteo de tengo a 703 y repetidas a 167
    const { error } = await supabase
      .from('user_stickers')
      .update({ quantity: 1 })
      .eq('user_id', CESAR_ID)
      .eq('sticker_id', 'FWC11');

    if (error) {
      console.error('Error corrigiendo FWC11:', error.message);
    } else {
      console.log('✓ FWC11 reducido de qty=2 a qty=1 correctamente.');
    }
  } else {
    console.log(`FWC11 tiene qty=${before.quantity}. Analizando...`);
  }

  // Verificación final
  const { data: allInv } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID);

  const tengo = allInv.filter(s => s.quantity > 0).length;
  const repetidas = allInv.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);

  console.log(`\n=== Estado FINAL de CesarG ===`);
  console.log(`Tengo: ${tengo}`);
  console.log(`Repetidas: ${repetidas}`);

  if (tengo === 703 && repetidas === 167) {
    console.log('✅ ¡Restaurado perfectamente a 703/167!');
  } else {
    console.log(`⚠️  Esperado: 703/167. Actual: ${tengo}/${repetidas}`);
  }
}

run();
