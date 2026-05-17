const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: stickers, error } = await supabase
    .from('stickers')
    .select('*');

  if (error) {
    console.error('Error fetching stickers:', error.message);
    return;
  }

  console.log(`Fetched ${stickers.length} stickers.`);
  
  // Count by ID
  const counts = {};
  stickers.forEach(s => {
    counts[s.id] = (counts[s.id] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([id, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('Duplicate IDs found in stickers table:', duplicates);
  } else {
    console.log('No duplicate IDs in stickers table.');
  }

  // Check for duplicate names or sections
  const fwcStickers = stickers.filter(s => s.id.startsWith('FWC') || s.id === '00');
  console.log('FWC stickers count:', fwcStickers.length);
  console.log('Sample FWC stickers:', fwcStickers.slice(0, 5));

  const leyendaStickers = stickers.filter(s => s.section.toUpperCase().includes('LEYENDA'));
  console.log('Leyenda stickers count:', leyendaStickers.length);
  console.log('Sample Leyenda stickers:', leyendaStickers.slice(0, 5));
}

run();
