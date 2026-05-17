const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { count, error } = await supabase
    .from('stickers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching count:', error.message);
    return;
  }

  console.log(`The stickers table has EXACTLY ${count} rows total in the database.`);
}

run();
