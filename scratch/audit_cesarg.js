const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Buscar el perfil de cesarg
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', '%cesar%');

  if (profileErr) { console.error('Error:', profileErr.message); return; }
  console.log('Perfiles encontrados con "cesar":', profiles);

  if (!profiles || profiles.length === 0) return;

  for (const profile of profiles) {
    const userId = profile.user_id || profile.id;
    console.log(`\n=== Analizando usuario: ${profile.username} (ID: ${userId}) ===`);

    // Obtener inventario
    const { data: inv, error: invErr } = await supabase
      .from('user_stickers')
      .select('sticker_id, quantity')
      .eq('user_id', userId);

    if (invErr) { console.error('Error inventario:', invErr.message); continue; }

    const tengo = inv.filter(s => s.quantity > 0).length;
    const repetidas = inv.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);
    console.log(`Total stickers marcados (qty > 0): ${tengo}`);
    console.log(`Total repetidas (qty - 1 donde qty > 1): ${repetidas}`);

    // Buscar FWC en su inventario
    const fwcStickers = inv.filter(s => s.sticker_id.startsWith('FWC') || s.sticker_id === '00');
    console.log(`\nFWC stickers en su inventario:`);
    fwcStickers.forEach(s => console.log(`  - ${s.sticker_id}: qty=${s.quantity}`));

    // Ver si tiene algún FWC con cantidad 2+ (repetida doble contada)
    const fwcDobles = fwcStickers.filter(s => s.quantity > 1);
    if (fwcDobles.length > 0) {
      console.log(`\n⚠️  FWC con cantidad > 1 (posible fuente del error):`);
      fwcDobles.forEach(s => console.log(`  - ${s.sticker_id}: qty=${s.quantity}`));
    }
  }
}

run();
