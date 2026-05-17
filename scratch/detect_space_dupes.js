const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

async function run() {
  const { data: inv, error } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID);

  if (error) { console.error('Error:', error.message); return; }

  // Buscar stickers con espacio en el ID
  const conEspacio = inv.filter(s => s.sticker_id.includes(' '));
  console.log(`Stickers CON espacio en el ID (${conEspacio.length}):`);
  conEspacio.forEach(s => console.log(`  "${s.sticker_id}" qty=${s.quantity}`));

  // Buscar si hay stickers "duplicados" por espacio: ej. "POR 03" y "POR03" al mismo tiempo
  console.log('\n=== Buscando duplicados con/sin espacio ===');
  const conEspacioNormalizado = conEspacio.map(s => ({
    ...s,
    normalized: s.sticker_id.replace(/\s/g, '').toUpperCase()
  }));

  const sinEspacio = inv.filter(s => !s.sticker_id.includes(' '));
  const sinEspacioNormalized = sinEspacio.map(s => s.sticker_id.replace(/\s/g, '').toUpperCase());

  for (const s of conEspacioNormalizado) {
    if (sinEspacioNormalized.includes(s.normalized)) {
      const duplicate = sinEspacio.find(x => x.sticker_id.replace(/\s/g, '').toUpperCase() === s.normalized);
      console.log(`⚠️  DUPLICADO ENCONTRADO: "${s.sticker_id}" (qty=${s.quantity}) Y "${duplicate.sticker_id}" (qty=${duplicate.quantity})`);
      console.log(`   -> Ambos representan el mismo cromo pero tienen IDs distintos en la DB`);
      console.log(`   -> Combinados: qty=${s.quantity + duplicate.quantity}, deberían ser tengo=2, repetidas=${s.quantity + duplicate.quantity - 1}`);
    }
  }

  // Calcular stats correctas si hubiera duplicados
  const combinedMap = {};
  for (const s of inv) {
    const key = s.sticker_id.replace(/\s/g, '').toUpperCase();
    combinedMap[key] = (combinedMap[key] || 0) + s.quantity;
  }

  const tengoReal = Object.values(combinedMap).filter(q => q > 0).length;
  const repetidasReal = Object.values(combinedMap).reduce((acc, q) => acc + (q > 1 ? q - 1 : 0), 0);
  
  // Stats sin normalizar (como las calcula la app actualmente)
  const tengoApp = inv.filter(s => s.quantity > 0).length;
  const repetidasApp = inv.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);
  
  console.log('\n=== COMPARACIÓN DE STATS ===');
  console.log(`Como ve la app (sin normalizar IDs): tengo=${tengoApp}, repetidas=${repetidasApp}`);
  console.log(`Con IDs normalizados (sin espacios):  tengo=${tengoReal}, repetidas=${repetidasReal}`);
  console.log(`Diferencia:                           tengo=${tengoApp - tengoReal}, repetidas=${repetidasApp - repetidasReal}`);
}

run();
