const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CESAR_ID = '111733810844077073059';

async function run() {
  // Update FWC14 to qty=2
  const { error } = await supabase
    .from('user_stickers')
    .update({ quantity: 2 })
    .eq('user_id', CESAR_ID)
    .eq('sticker_id', 'FWC14');
    
  if (error) {
    console.error('Error updating FWC14:', error);
  } else {
    console.log('Successfully updated FWC14 to qty=2 for CesarG');
  }
}

run();
