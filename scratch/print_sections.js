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

  // Count by section
  const sectionCounts = {};
  stickers.forEach(s => {
    sectionCounts[s.section] = (sectionCounts[s.section] || 0) + 1;
  });

  console.log('Database Sections:', sectionCounts);

  // Let's print any sticker containing "LEYENDA" or "LEYENDAS" in their name or type or section
  const leyendas = stickers.filter(s => 
    s.id.toUpperCase().includes('LEYENDA') ||
    s.name.toUpperCase().includes('LEYENDA') ||
    s.section.toUpperCase().includes('LEYENDA') ||
    s.type.toUpperCase().includes('LEYENDA')
  );

  console.log(`Found ${leyendas.length} leyenda-related stickers:`);
  console.log(leyendas);
}

run();
