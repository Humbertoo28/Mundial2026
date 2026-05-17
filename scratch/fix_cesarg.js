const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

// Estos son los stickers que migramos (IDs viejos -> nuevos)
const migratedStickers = [
  { oldId: 'ITALIA 1934 FWC9', newId: 'FWC9' },
  { oldId: 'BRASIL 1950 FWC10', newId: 'FWC10' },
  { oldId: 'SUIZA 1954 FWC11', newId: 'FWC11' },
  { oldId: 'CHILE 1962 FWC12', newId: 'FWC12' },
  { oldId: 'ALEMANIA 1974 FWC13', newId: 'FWC13' },
  { oldId: 'MEXICO 1986 FWC14', newId: 'FWC14' },
  { oldId: 'ESTADOS UNIDOS 1994 FWC15', newId: 'FWC15' },
  { oldId: 'COREA DEL SUR/JAPON 2002 FWC16', newId: 'FWC16' },
  { oldId: 'ALEMANIA 2006 FWC17', newId: 'FWC17' },
  { oldId: 'BRASIL 2014 FWC18', newId: 'FWC18' },
  { oldId: 'QATAR 2022 FWC19', newId: 'FWC19' },
];

// Del log anterior sabemos que cesarg tuvo estos stickers migrados:
// FWC9 -> transferido (qty=1)
// FWC10 -> transferido (qty=1) 
// FWC11 -> transferido (qty=1) SIN suma
// FWC12 -> transferido (qty=1)
// FWC13 -> transferido (qty=1)
// FWC14 -> SUM (3+2=5? O algo raro)
// etc.

async function run() {
  // Revisemos el inventario COMPLETO de CesarG para FWC específicos que se migraron
  const newIds = migratedStickers.map(m => m.newId);
  
  const { data: inv, error } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID)
    .in('sticker_id', newIds);
  
  if (error) { console.error('Error:', error.message); return; }
  
  console.log('Inventario actual de CesarG para stickers FWC migrados:');
  inv.forEach(s => console.log(`  ${s.sticker_id}: qty=${s.quantity}`));

  // El problema: si cesarg tenía FWC11=1 (como sticker normal en sección 1) 
  // Y también tenía SUIZA 1954 FWC11=1 (como leyenda en sección 4),
  // el script los sumó -> FWC11=2. 
  // Pero para el usuario eran 2 stickers DISTINTOS (uno en sección 1 y otro en sección 4),
  // por eso percibía 703 "tengo" pero ahora tiene 702.

  // Para restaurar: necesitamos saber cuál de estos tiene qty=2 cuando debería ser 1
  // Si un sticker tiene qty=2 pero el usuario solo marcó 1 de cada "versión",
  // debemos reducirlo a 1.
  
  const dobles = inv.filter(s => s.quantity === 2);
  console.log('\nStickers con qty=2 (candidatos a tener una cantidad extra por la migración):');
  dobles.forEach(s => console.log(`  ${s.sticker_id}: qty=${s.quantity}`));

  // La solución es: restaurar todos los FWC migrados a qty=1 
  // si antes tenían qty=1+qty=1 (suma = 2 por la migración errada)
  console.log('\n--- Aplicando corrección: reducir FWC migrados con qty=2 a qty=1 ---');
  for (const sticker of dobles) {
    // Verificar si este sticker está en los migrados
    const isMigrated = migratedStickers.some(m => m.newId === sticker.sticker_id);
    if (isMigrated) {
      console.log(`Corrigiendo ${sticker.sticker_id}: de qty=2 a qty=1`);
      const { error: updateErr } = await supabase
        .from('user_stickers')
        .update({ quantity: 1 })
        .eq('user_id', CESAR_ID)
        .eq('sticker_id', sticker.sticker_id);
      
      if (updateErr) console.error(`Error corrigiendo ${sticker.sticker_id}:`, updateErr.message);
      else console.log(`  ✓ Corregido ${sticker.sticker_id} a qty=1`);
    } else {
      console.log(`${sticker.sticker_id} tiene qty=2 pero NO fue migrado. Verificar si es legítimo.`);
    }
  }

  // Verificación final
  const { data: invFinal } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID);
  
  const tengoFinal = invFinal.filter(s => s.quantity > 0).length;
  const repetidasFinal = invFinal.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);
  console.log(`\n=== Estado final de CesarG ===`);
  console.log(`Tengo: ${tengoFinal}`);
  console.log(`Repetidas: ${repetidasFinal}`);
}

run();
