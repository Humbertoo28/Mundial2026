const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: stickers, error } = await supabase
    .from('stickers')
    .select('*')
    .ilike('id', '%FWC%');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${stickers.length} stickers with FWC in ID:`);
  stickers.forEach(s => {
    console.log(`- ID: ${s.id}, Name: ${s.name}, Section: ${s.section}, Type: ${s.type}`);
  });
}

run();
