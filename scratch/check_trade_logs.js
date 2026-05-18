const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Intentar insertar un log para cesarg directamente
  console.log('Probando inserción en trade_logs...');
  const { data, error } = await supabase
    .from('trade_logs')
    .insert({
      user_id: '111733810844077073059',
      trader_name: 'TEST_AGENT',
      given_ids: ['FWC1'],
      received_ids: ['FWC2']
    });

  if (error) {
    console.error('Error insertando en trade_logs:', error);
  } else {
    console.log('Inserción exitosa en trade_logs:', data);
  }
}

run();
