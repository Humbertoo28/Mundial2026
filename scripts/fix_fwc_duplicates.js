const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const duplicatesMap = {
  'ITALIA 1934 FWC9': { newId: 'FWC9', name: 'ITALIA 1934 (FWC 9)', section: 'SECCION 4' },
  'BRASIL 1950 FWC10': { newId: 'FWC10', name: 'BRASIL 1950 (FWC 10)', section: 'SECCION 4' },
  'SUIZA 1954 FWC11': { newId: 'FWC11', name: 'SUIZA 1954 (FWC 11)', section: 'SECCION 4' },
  'CHILE 1962 FWC12': { newId: 'FWC12', name: 'CHILE 1962 (FWC 12)', section: 'SECCION 4' },
  'ALEMANIA 1974 FWC13': { newId: 'FWC13', name: 'ALEMANIA 1974 (FWC 13)', section: 'SECCION 4' },
  'MEXICO 1986 FWC14': { newId: 'FWC14', name: 'MEXICO 1986 (FWC 14)', section: 'SECCION 4' },
  'ESTADOS UNIDOS 1994 FWC15': { newId: 'FWC15', name: 'ESTADOS UNIDOS 1994 (FWC 15)', section: 'SECCION 4' },
  'COREA DEL SUR/JAPON 2002 FWC16': { newId: 'FWC16', name: 'COREA DEL SUR/JAPON 2002 (FWC 16)', section: 'SECCION 4' },
  'ALEMANIA 2006 FWC17': { newId: 'FWC17', name: 'ALEMANIA 2006 (FWC 17)', section: 'SECCION 4' },
  'BRASIL 2014 FWC18': { newId: 'FWC18', name: 'BRASIL 2014 (FWC 18)', section: 'SECCION 4' },
  'QATAR 2022 FWC19': { newId: 'FWC19', name: 'QATAR 2022 (FWC 19)', section: 'SECCION 4' }
};

async function run() {
  console.log('Iniciando corrección de duplicados de FWC y Leyendas...');

  // 1. Procesar duplicados
  for (const [oldId, info] of Object.entries(duplicatesMap)) {
    const { newId, name, section } = info;
    console.log(`\nProcesando duplicado: ${oldId} -> ${newId}`);

    // A. Asegurar que exista el nuevo ID con la sección y nombre correctos
    const { data: existingNewSticker } = await supabase
      .from('stickers')
      .select('*')
      .eq('id', newId)
      .single();

    if (existingNewSticker) {
      console.log(`El sticker destino ${newId} ya existe. Actualizando nombre y sección...`);
      await supabase
        .from('stickers')
        .update({ name, section })
        .eq('id', newId);
    } else {
      console.log(`Insertando sticker destino ${newId}...`);
      await supabase
        .from('stickers')
        .insert({ id: newId, name, section, type: 'ESPECIAL' });
    }

    // B. Buscar si hay inventario para el ID viejo
    const { data: userStickersOld } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('sticker_id', oldId);

    if (userStickersOld && userStickersOld.length > 0) {
      console.log(`Se encontraron ${userStickersOld.length} registros de inventario para el ID viejo.`);
      
      for (const record of userStickersOld) {
        const { user_id, quantity } = record;

        // Buscar si el usuario ya tiene el registro del nuevo ID
        const { data: userStickerNew } = await supabase
          .from('user_stickers')
          .select('*')
          .eq('user_id', user_id)
          .eq('sticker_id', newId)
          .single();

        if (userStickerNew) {
          // Sumar cantidades
          const newQty = userStickerNew.quantity + quantity;
          console.log(`Sumando cantidades para usuario ${user_id}: ${userStickerNew.quantity} + ${quantity} = ${newQty}`);
          await supabase
            .from('user_stickers')
            .update({ quantity: newQty })
            .eq('id', userStickerNew.id);
            
          // Eliminar el registro viejo
          await supabase
            .from('user_stickers')
            .delete()
            .eq('id', record.id);
        } else {
          // Simplemente transferir el ID
          console.log(`Transfiriendo registro a ${newId} para usuario ${user_id} (Cantidad: ${quantity})`);
          await supabase
            .from('user_stickers')
            .update({ sticker_id: newId })
            .eq('id', record.id);
        }
      }
    }

    // C. Actualizar trade_logs
    const { data: logs } = await supabase.from('trade_logs').select('*');
    if (logs) {
      for (const log of logs) {
        let updated = false;
        const given = log.given_ids || [];
        const received = log.received_ids || [];

        const newGiven = given.map(id => (id === oldId ? newId : id));
        const newReceived = received.map(id => (id === oldId ? newId : id));

        if (JSON.stringify(given) !== JSON.stringify(newGiven) || JSON.stringify(received) !== JSON.stringify(newReceived)) {
          await supabase
            .from('trade_logs')
            .update({ given_ids: newGiven, received_ids: newReceived })
            .eq('id', log.id);
          console.log(`Actualizado log de intercambio ${log.id}`);
        }
      }
    }

    // D. Eliminar el ID viejo de la tabla stickers
    const { error: delErr } = await supabase
      .from('stickers')
      .delete()
      .eq('id', oldId);

    if (delErr) {
      console.error(`Error eliminando sticker viejo ${oldId}:`, delErr.message);
    } else {
      console.log(`Eliminado con éxito el sticker duplicado viejo: ${oldId}`);
    }
  }

  // 2. Mover los demás stickers FWC a la SECCIÓN 1 (Estadios y Sedes)
  console.log('\nMoviendo los stickers FWC iniciales y finales a SECCIÓN 1...');
  
  // 00, FWC1 a FWC8, y FWC20 a FWC29
  const idsToMove = ['00'];
  for (let i = 1; i <= 8; i++) idsToMove.push(`FWC${i}`);
  for (let i = 20; i <= 29; i++) idsToMove.push(`FWC${i}`);

  for (const id of idsToMove) {
    const { error: updateErr } = await supabase
      .from('stickers')
      .update({ section: 'SECCIÓN 1' })
      .eq('id', id);

    if (updateErr) {
      console.error(`Error actualizando sección para ${id}:`, updateErr.message);
    } else {
      console.log(`Sticker ${id} movido exitosamente a SECCIÓN 1.`);
    }
  }

  console.log('\n¡Proceso de desduplicación y organización completado con éxito!');
}

run();
