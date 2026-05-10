const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  console.log("Checking for user 'cg0430'...");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', 'cg0430');

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data.length === 0) {
    console.log("❌ No user found with username 'cg0430' (case-insensitive).");
    
    console.log("\nRecent users in DB:");
    const { data: recent } = await supabase
      .from('profiles')
      .select('id, username, full_name, email')
      .order('created_at', { ascending: false })
      .limit(5);
    console.table(recent);
  } else {
    console.log("✅ User found:");
    console.table(data);
  }
}

checkUser();
