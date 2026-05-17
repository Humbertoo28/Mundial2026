const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

// Del log del script de migración, para CesarG aparecen estos:
// FWC9:  "Transfiriendo registro a FWC9 para usuario 111733810844077073059 (Cantidad: 1)"
// FWC10: "Transfiriendo registro a FWC10 para usuario 111733810844077073059 (Cantidad: 1)"
// FWC11: "Transfiriendo registro a FWC11 para usuario 111733810844077073059 (Cantidad: 1)"
// FWC12: "Transfiriendo registro a FWC12 para usuario 111733810844077073059 (Cantidad: 1)"
// FWC18: "Transfiriendo registro a FWC18 para usuario 111733810844077073059 (Cantidad: 1)"
// FWC19: "Transfiriendo registro a FWC19 para usuario 111733810844077073059 (Cantidad: 2)"

// "Transferir" significa que el ID viejo fue movido al nuevo ID.
// Eso implica que ANTES de la migración, cesarg NO tenía estos IDs nuevos en su inventario.
// Por tanto, después de la migración debería tener:
// FWC9, FWC10, FWC11, FWC12, FWC18, FWC19 todos con qty = la cantidad original del ID viejo

// Pero el log también muestra para OTROS usuarios "Sumando cantidades":
// Ej: "Sumando cantidades para usuario 105665878741052768286: 2 + 1 = 3"
// Esto ocurrió cuando el usuario YA tenía el ID nuevo Y también el viejo.

// Para CesarG NO hubo "Sumando cantidades" en ningún sticker del log visible.
// Por tanto, la migración para CesarG solo transfirió directamente (no sumó nada).

// Entonces la diferencia de 703->702 NO viene de la migración FWC.
// Debe venir de OTRO cambio que pasó en paralelo.

// Hipótesis: los stickers FWC20-FWC29 que CesarG podría haber tenido marcados,
// fueron eliminados cuando borramos esos IDs de la tabla.

async function run() {
  console.log('Verificando si cesarg tenía FWC20-FWC29 en su inventario (ya eliminados)...');
  
  // Los stickers FWC20-FWC29 ya no existen en la tabla, pero si el borrado de user_stickers
  // no cubrió a cesarg, ya no aparecerán. Si el borrado SÍ los eliminó, ese sería el problema.

  // Verifiquemos mirando en user_stickers directamente (incluso stickers huérfanos)
  const { data: allUserStickers } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', CESAR_ID);

  const deletedFWC = [];
  for (let i = 20; i <= 29; i++) {
    const found = allUserStickers?.find(s => s.sticker_id === `FWC${i}`);
    if (found) deletedFWC.push(found);
  }

  if (deletedFWC.length > 0) {
    console.log('⚠️  CesarG AÚN tiene registros en user_stickers para FWC20-FWC29 (no se borraron):');
    deletedFWC.forEach(s => console.log(`  ${s.sticker_id}: qty=${s.quantity}`));
  } else {
    console.log('No hay rastro de FWC20-FWC29 en el inventario de CesarG en user_stickers.');
    console.log('Los registros fueron eliminados junto con la tabla stickers.');
    console.log('');
    console.log('CONCLUSIÓN: Si cesarg tenía marcado algún FWC20-FWC29, ese cromo fue borrado');
    console.log('de user_stickers cuando ejecutamos delete_extra_fwc.js');
    console.log('');
    console.log('Para restaurar, necesitamos saber exactamente qué FWC20-29 tenía marcados.');
    console.log('Esto ya no es recuperable desde la DB sin un backup previo.');
  }

  // Verificar la cantidad de registros borrados del script delete_extra_fwc.js
  // Ese script dijo: "Borrando 0 registros de inventario de usuarios..." para FWC20-29
  // Si dijo 0, entonces cesarg NO tenía ninguno de esos y el problema es otro.
  
  console.log('\n--- Inventario completo de CesarG (702 stickers): ---');
  const tengo = allUserStickers.filter(s => s.quantity > 0).length;
  const repetidas = allUserStickers.reduce((acc, s) => acc + (s.quantity > 1 ? s.quantity - 1 : 0), 0);
  console.log(`Total registros: ${allUserStickers.length}, Tengo: ${tengo}, Repetidas: ${repetidas}`);
  
  // La diferencia real es de 1 "tengo" menos. Debemos buscar si hay un sticker que cesarg
  // debería tener con qty=1 pero que ahora tiene qty=0 o que desapareció completamente.
  // Como no hay stickers huérfanos, el sticker que "falta" en tengo debe haber sido sumado
  // a otro convirtiéndose en qty=2 (contando como 1 tengo + 1 repetida en vez de 2 tengo).
  
  // Ya verificamos FWC y no hay problemas ahí.
  // El log de migración mostró "Sumando cantidades para usuario 111733810844077073059: 2 + 1 = 3"
  // para FWC9: el usuario 105665878741052768286 (NO cesarg).
  // Para cesarg solo hubo "Transfiriendo" sin sumas.
  
  // NUEVA HIPÓTESIS: el sticker "FWC9" de cesarg (el ID viejo "ITALIA 1934 FWC9")
  // fue TRANSFERIDO pero cesarg ya tenía "FWC9" → error silencioso en el script que no detectó
  // que ambas condiciones eran verdaderas (NO entró en el if "Sumando" sino en el "Transfiriendo")
  
  // Verifiquemos el estado de FWC9 específicamente
  const fwc9 = allUserStickers.find(s => s.sticker_id === 'FWC9');
  console.log('\nEstado actual FWC9:', fwc9);
  
  // Si cesarg tenía qty=1 en FWC9 (el "nuevo") Y qty=1 en "ITALIA 1934 FWC9" (el viejo),
  // el script vio que NO debía sumar (buscó en user_stickers con newId y no encontró)
  // PERO si el orden de operaciones fue: delete old THEN transfer, o si había una race condition...
  
  // En realidad el bug está en el script fix_fwc_duplicates.js:
  // Si cesarg tenía FWC9 (qty=1) y "ITALIA 1934 FWC9" (qty=1),
  // El script buscó userStickerNew para user 111733810844077073059 con sticker_id=FWC9
  // Y lo encontró → debería haber mostrado "Sumando cantidades X + 1"
  // Pero el log dice "Transfiriendo"... lo que sugiere que NO lo encontró.
  
  // Puede ser que al momento de procesar FWC9, cesarg NO tenía el ID nuevo FWC9 en user_stickers.
  // (Lo tenía después de transferir el viejo "ITALIA 1934 FWC9")
  
  // Verifiquemos el estado de TODOS los FWC migrados para cesarg
  const migratedIds = ['FWC9','FWC10','FWC11','FWC12','FWC13','FWC14','FWC15','FWC16','FWC17','FWC18','FWC19'];
  console.log('\nEstado de FWC migrados para CesarG:');
  migratedIds.forEach(id => {
    const s = allUserStickers.find(x => x.sticker_id === id);
    console.log(`  ${id}: ${s ? `qty=${s.quantity}` : 'NO ENCONTRADO'}`);
  });
}

run();
