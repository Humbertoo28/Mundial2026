const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

async function run() {
  // Obtener inventario de cesarg
  const { data: inv, error: invErr } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID);
  if (invErr) { console.error(invErr.message); return; }

  // Obtener todos los stickers de la tabla maestra
  let allStickers = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from('stickers')
      .select('id')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (data && data.length > 0) allStickers = [...allStickers, ...data];
    if (!data || data.length < 1000) hasMore = false;
    page++;
  }

  const validIds = new Set(allStickers.map(s => s.id));
  console.log(`Total stickers válidos en DB: ${validIds.size}`);
  console.log(`Total registros en inventario de CesarG: ${inv.length}`);

  // Buscar stickers en inventario de cesarg que NO existen en la tabla principal
  const orphaned = inv.filter(s => !validIds.has(s.sticker_id));
  
  console.log(`\nStickers HUÉRFANOS (en inventario de CesarG pero NO en tabla stickers): ${orphaned.length}`);
  if (orphaned.length > 0) {
    orphaned.forEach(s => console.log(`  - "${s.sticker_id}" qty=${s.quantity}`));
  }

  // Ahora calcular cómo contaría la app los stickers:
  // La app solo debería contar stickers que existen en la tabla principal
  const validInv = inv.filter(s => validIds.has(s.sticker_id));
  const tengo = validInv.filter(s => s.quantity > 0).length;
  const repetidas = validInv.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);
  
  console.log('\n=== Stats considerando solo stickers válidos ===');
  console.log(`Tengo: ${tengo}`);
  console.log(`Repetidas: ${repetidas}`);
  
  // Stats brutas (lo que calcula la app basándose en user_stickers sin cruzar con stickers)
  const tengoBruto = inv.filter(s => s.quantity > 0).length;
  const repetidasBruto = inv.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);
  console.log(`\n=== Stats brutas del inventario (sin validar existencia) ===`);
  console.log(`Tengo: ${tengoBruto}`);
  console.log(`Repetidas: ${repetidasBruto}`);
}

run();
