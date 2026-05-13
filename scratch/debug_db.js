const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('stickers').select('id, name, section').ilike('name', '%Messi%');
  if (error) console.error(error);
  console.log('MESSI SEARCH:', data);

  const { data: sections } = await supabase.from('stickers').select('section');
  const uniqueSections = [...new Set(sections.map(s => s.section))];
  console.log('UNIQUE SECTIONS:', uniqueSections);
}

check();
