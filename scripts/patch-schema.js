const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function patchSchema() {
  const sql = `
    -- Drop constraints and change ID types to TEXT for NextAuth compatibility
    ALTER TABLE public.user_stickers DROP CONSTRAINT user_stickers_user_id_fkey;
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    
    ALTER TABLE public.user_stickers ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
    
    ALTER TABLE public.user_stickers ADD CONSTRAINT user_stickers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  `;

  // We have to use rpc to run arbitrary SQL or just drop/recreate via the editor.
  console.log("Please run this in your Supabase SQL Editor to fix the login:");
  console.log(sql);
}

patchSchema();
