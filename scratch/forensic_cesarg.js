const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

// Stickers migrados y sus IDs nuevos
const migratedMap = {
  'FWC9':  { oldId: 'ITALIA 1934 FWC9',            hadOldQty: 1 }, // del log: "Transfiriendo registro a FWC9 para usuario 111733810844077073059 (Cantidad: 1)"
  'FWC10': { oldId: 'BRASIL 1950 FWC10',            hadOldQty: 1 }, // "Transfiriendo registro a FWC10 para usuario 111733810844077073059 (Cantidad: 1)"
  'FWC11': { oldId: 'SUIZA 1954 FWC11',             hadOldQty: 1 }, // "Transfiriendo registro a FWC11 para usuario 111733810844077073059 (Cantidad: 1)"
  'FWC12': { oldId: 'CHILE 1962 FWC12',             hadOldQty: 1 }, // "Transfiriendo registro a FWC12 para usuario 111733810844077073059 (Cantidad: 1)"
  'FWC13': { oldId: 'ALEMANIA 1974 FWC13',          hadOldQty: null }, // no aparece en log -> no tenía
  'FWC14': { oldId: 'MEXICO 1986 FWC14',            hadOldQty: null }, // no aparece en log -> no tenía
  'FWC15': { oldId: 'ESTADOS UNIDOS 1994 FWC15',    hadOldQty: null }, // no aparece
  'FWC16': { oldId: 'COREA DEL SUR/JAPON 2002 FWC16', hadOldQty: null }, // no aparece
  'FWC17': { oldId: 'ALEMANIA 2006 FWC17',          hadOldQty: null }, // no aparece
  'FWC18': { oldId: 'BRASIL 2014 FWC18',            hadOldQty: 1 }, // "Transfiriendo registro a FWC18 para usuario 111733810844077073059 (Cantidad: 1)"
  'FWC19': { oldId: 'QATAR 2022 FWC19',             hadOldQty: 2 }, // "Transfiriendo registro a FWC19 para usuario 111733810844077073059 (Cantidad: 2)"
};

async function run() {
  const { data: inv, error } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID)
    .in('sticker_id', Object.keys(migratedMap));

  if (error) { console.error('Error:', error.message); return; }

  console.log('=== ANÁLISIS FORENSE DEL INVENTARIO FWC DE CESARG ===\n');
  
  let problemFound = null;

  for (const [newId, info] of Object.entries(migratedMap)) {
    const current = inv.find(s => s.sticker_id === newId);
    const currentQty = current ? current.quantity : 0;
    const oldQty = info.hadOldQty;
    
    if (oldQty === null) {
      // cesarg no tenía el ID viejo, así que la qty actual es solo del sticker nuevo original
      console.log(`${newId}: No tenía el viejo. Qty actual: ${currentQty} (sin cambio esperado)`);
    } else {
      // cesarg SÍ tenía el viejo. El script debería haber sumado o transferido.
      // Si antes del script tenía qty_nueva_original en el nuevo ID:
      // La nueva qty debería ser: qty_nueva_original + qty_viejo
      // Pero si antes solo tenía el ID viejo y NO el nuevo ID, la "suma" fue: 0 + oldQty = oldQty (correcto)
      // Si antes tenía AMBOS: la suma fue: qty_nueva + oldQty (puede ser incorrecto si eran stickers distintos)
      
      console.log(`${newId}: Tenía el ID viejo (qty=${oldQty}). Qty ACTUAL: ${currentQty}`);
      
      if (currentQty > oldQty) {
        // Esto indica que ya tenía una entry para el newId ANTES de la migración
        // La migración sumó, pero eran figuritas separadas
        const qtyBefore = currentQty - oldQty;
        console.log(`  ⚠️  PROBLEMA: Antes tenía ${qtyBefore} en ${newId} + ${oldQty} en ${info.oldId} = sumó a ${currentQty}`);
        console.log(`  La corrección sería: volver ${newId} a qty=${qtyBefore + oldQty} si eran lo mismo`);
        console.log(`  O si eran figuritas DISTINTAS: volver a qty=${qtyBefore}`);
        problemFound = { newId, qtyBefore, oldQty, currentQty };
      } else {
        console.log(`  ✓ Correcto: se transfirió directamente sin sumar`);
      }
    }
  }

  if (!problemFound) {
    console.log('\n✅ No se encontró ninguna inconsistencia numérica en el inventario FWC de CesarG.');
    console.log('La diferencia de tengo/repetidas puede venir de otro sticker no FWC.');
    
    // Buscar cualquier sticker con qty > 1 que no sea FWC
    const { data: allInv } = await supabase
      .from('user_stickers')
      .select('sticker_id, quantity')
      .eq('user_id', CESAR_ID)
      .gt('quantity', 1);
    
    console.log('\nTodos los stickers con qty > 1 en el inventario de CesarG:');
    allInv.forEach(s => console.log(`  ${s.sticker_id}: qty=${s.quantity}`));
  }
}

run();
