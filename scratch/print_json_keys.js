const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/panini_world_cup_2026_tracker.json');
const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('JSON Keys:', Object.keys(fileData));

// Print the first few elements of each key
for (const key of Object.keys(fileData)) {
  if (Array.isArray(fileData[key])) {
    console.log(`Key ${key} has array of length ${fileData[key].length}`);
    console.log(`Sample item in ${key}:`, fileData[key].slice(0, 2));
  } else {
    console.log(`Key ${key} keys:`, Object.keys(fileData[key]));
    // If it's an object, print its subkeys
    for (const subkey of Object.keys(fileData[key])) {
      if (Array.isArray(fileData[key][subkey])) {
        console.log(`  Subkey ${subkey} has array of length ${fileData[key][subkey].length}`);
        console.log(`  Sample item in ${subkey}:`, fileData[key][subkey].slice(0, 2));
      }
    }
  }
}
