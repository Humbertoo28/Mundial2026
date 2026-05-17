const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  // 1. Update JSON file
  const jsonPath = path.join(__dirname, '../data/panini_world_cup_2026_tracker.json');
  if (fs.existsSync(jsonPath)) {
    let jsonContent = fs.readFileSync(jsonPath, 'utf8');
    for (let i = 1; i <= 20; i++) {
      const suffix = String(i).padStart(2, '0');
      jsonContent = jsonContent.replace(new RegExp(`"JAP${suffix}"`, 'g'), `"JPN${suffix}"`);
    }
    fs.writeFileSync(jsonPath, jsonContent, 'utf8');
    console.log('JSON file updated successfully from JAP to JPN.');
  } else {
    console.log('JSON file not found.');
  }

  // 2. Update Supabase
  console.log('Updating Supabase database...');
  for (let i = 1; i <= 20; i++) {
    const suffix = String(i).padStart(2, '0');
    const oldId = `JAP${suffix}`;
    const newId = `JPN${suffix}`;

    console.log(`Processing ${oldId} -> ${newId}...`);

    // A. Fetch the sticker details
    const { data: sticker, error: fetchErr } = await supabase
      .from('stickers')
      .select('*')
      .eq('id', oldId)
      .single();

    if (fetchErr) {
      console.log(`Sticker ${oldId} not found or error: ${fetchErr.message}`);
      continue;
    }

    // B. Upsert new sticker JPNxx
    const { error: insertErr } = await supabase
      .from('stickers')
      .upsert({
        id: newId,
        section: sticker.section,
        type: sticker.type,
        name: sticker.name
      });

    if (insertErr) {
      console.error(`Error inserting ${newId}:`, insertErr.message);
      continue;
    }

    // C. Update user_stickers
    const { error: userStickersErr } = await supabase
      .from('user_stickers')
      .update({ sticker_id: newId })
      .eq('sticker_id', oldId);

    if (userStickersErr) {
      console.error(`Error updating user_stickers for ${oldId}:`, userStickersErr.message);
    } else {
      console.log(`Updated user_stickers for ${oldId} -> ${newId}`);
    }

    // D. Delete old JAP sticker
    const { error: deleteErr } = await supabase
      .from('stickers')
      .delete()
      .eq('id', oldId);

    if (deleteErr) {
      console.error(`Error deleting ${oldId}:`, deleteErr.message);
    } else {
      console.log(`Deleted old sticker ${oldId}`);
    }
  }

  // 3. Update trade_logs (given_ids and received_ids text arrays)
  const { data: logs, error: logsErr } = await supabase
    .from('trade_logs')
    .select('*');

  if (logsErr) {
    console.error('Error fetching trade logs:', logsErr.message);
  } else if (logs) {
    console.log(`Checking ${logs.length} trade logs for JAP references...`);
    for (const log of logs) {
      let updated = false;
      const givenIds = log.given_ids || [];
      const receivedIds = log.received_ids || [];

      const newGivenIds = givenIds.map(id => {
        if (id.startsWith('JAP')) {
          updated = true;
          return id.replace('JAP', 'JPN');
        }
        return id;
      });

      const newReceivedIds = receivedIds.map(id => {
        if (id.startsWith('JAP')) {
          updated = true;
          return id.replace('JAP', 'JPN');
        }
        return id;
      });

      if (updated) {
        const { error: updateLogErr } = await supabase
          .from('trade_logs')
          .update({
            given_ids: newGivenIds,
            received_ids: newReceivedIds
          })
          .eq('id', log.id);

        if (updateLogErr) {
          console.error(`Error updating trade log ${log.id}:`, updateLogErr.message);
        } else {
          console.log(`Updated trade log ${log.id} JAP -> JPN references.`);
        }
      }
    }
  }

  console.log('Database patch complete!');
}

run();
