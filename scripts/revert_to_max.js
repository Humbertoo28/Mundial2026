const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lista de correcciones basadas en la regla del máximo (evitando sumas duplicadas de slots repetidos)
const corrections = [
  { userId: '105665878741052768286', stickerId: 'FWC9', correctQty: 2 },
  { userId: '107980463107317111893', stickerId: 'FWC10', correctQty: 1 },
  { userId: '107980463107317111893', stickerId: 'FWC12', correctQty: 1 },
  { userId: '107980463107317111893', stickerId: 'FWC13', correctQty: 3 },
  { userId: '107980463107317111893', stickerId: 'FWC17', correctQty: 1 },
  { userId: '107980463107317111893', stickerId: 'FWC18', correctQty: 2 },
  { userId: '100745723194431177785', stickerId: 'FWC13', correctQty: 3 }
];

async function run() {
  console.log('Iniciando corrección global para todos los usuarios utilizando el método del máximo...');

  for (const correction of corrections) {
    const { userId, stickerId, correctQty } = correction;
    
    // Obtener el registro actual
    const { data: current } = await supabase
      .from('user_stickers')
      .select('quantity')
      .eq('user_id', userId)
      .eq('sticker_id', stickerId)
      .single();

    const currentQty = current ? current.quantity : 0;
    console.log(`\nUsuario ${userId} - Cromo ${stickerId}: Cantidad actual = ${currentQty}. Ajustando a cantidad correcta = ${correctQty}`);

    const { error } = await supabase
      .from('user_stickers')
      .update({ quantity: correctQty })
      .eq('user_id', userId)
      .eq('sticker_id', stickerId);

    if (error) {
      console.error(`Error actualizando:`, error.message);
    } else {
      console.log(`✓ Actualizado correctamente.`);
    }
  }

  console.log('\n¡Todas las cantidades de inventario han sido corregidas con éxito para evitar falsos duplicados!');
}

run();
