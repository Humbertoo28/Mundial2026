const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCesar() {
  // 1. Find Cesar's profile
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', '%cesar%');

  if (pError) {
    console.error("Error fetching profiles:", pError);
    return;
  }

  console.log("Profiles matching 'cesar':", profiles.map(p => ({ id: p.id, username: p.username })));

  if (profiles.length === 0) return;

  for (const profile of profiles) {
    const { count, error: cError } = await supabase
      .from('user_stickers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    console.log(`User ${profile.username} (${profile.id}) has ${count} sticker rows in DB.`);
    
    if (cError) console.error("Error counting stickers:", cError);
  }
}

checkCesar();
