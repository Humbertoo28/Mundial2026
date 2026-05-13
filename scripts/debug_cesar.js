require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error: uErr } = await supabase.from('profiles').select('id, username').ilike('username', '%cesar%');
  if(uErr) { console.error('Error fetching users:', uErr); return; }
  
  if (users.length === 0) { console.log('User not found'); return; }
  const userId = users[0].id;
  
  const { data: userStickers, error: usErr } = await supabase.from('user_stickers').select('*').eq('user_id', userId);
  
  let tengo = 0;
  let repetidas = 0;
  let uniqueRepeated = 0;
  
  const { data: catalog, error: cErr } = await supabase.from('stickers').select('id');
  
  const catalogIds = catalog.map(c => c.id.replace(/\s/g, '').toUpperCase());
  
  let matchCount = 0;
  let unmatchCount = 0;
  let unmatchedList = [];
  
  userStickers.filter(s => s.quantity > 1).forEach(s => {
    const normalized = s.sticker_id.replace(/\s/g, '').toUpperCase();
    if (catalogIds.includes(normalized)) {
      matchCount++;
    } else {
      unmatchCount++;
      unmatchedList.push(s.sticker_id);
    }
  });
  
  console.log(`Matched repeated: ${matchCount}`);
  console.log(`Unmatched repeated: ${unmatchCount}`);
  if (unmatchedList.length > 0) console.log('Unmatched IDs:', unmatchedList);
}
run();
