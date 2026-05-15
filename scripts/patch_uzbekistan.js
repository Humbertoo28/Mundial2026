const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const uzbekistanStickers = [
  { id: 'UZB01', section: 'UZBEKISTAN', type: 'ESCUDO', name: 'SELECCION NACIONAL DE UZBEKISTAN' },
  { id: 'UZB02', section: 'UZBEKISTAN', type: 'NORMAL', name: 'UTKIR YUSUPOV' },
  { id: 'UZB03', section: 'UZBEKISTAN', type: 'NORMAL', name: 'FARRUKH SAYFIEV' },
  { id: 'UZB04', section: 'UZBEKISTAN', type: 'NORMAL', name: 'SHERZOO NASRULLAEV' },
  { id: 'UZB05', section: 'UZBEKISTAN', type: 'NORMAL', name: 'UMAR ESHMURODOV' },
  { id: 'UZB06', section: 'UZBEKISTAN', type: 'NORMAL', name: 'HUSNIDDIN ALIQULOV' },
  { id: 'UZB07', section: 'UZBEKISTAN', type: 'NORMAL', name: 'RUSTAM ASHURMATOV' },
  { id: 'UZB08', section: 'UZBEKISTAN', type: 'NORMAL', name: 'KHOJIAKBAR ALIJONOV' },
  { id: 'UZB09', section: 'UZBEKISTAN', type: 'NORMAL', name: 'ABDUKODIR KHUSANOV' },
  { id: 'UZB10', section: 'UZBEKISTAN', type: 'NORMAL', name: 'ODILJON HAMROBEKOV' },
  { id: 'UZB11', section: 'UZBEKISTAN', type: 'NORMAL', name: 'OTABEK SHUKUROV' },
  { id: 'UZB12', section: 'UZBEKISTAN', type: 'NORMAL', name: 'JAMSHID ISKANDEROV' },
  { id: 'UZB13', section: 'UZBEKISTAN', type: 'EQUIPO', name: 'SELECCION NACIONAL DE UZBEKISTAN' },
  { id: 'UZB14', section: 'UZBEKISTAN', type: 'NORMAL', name: 'AZIZBEK TURGUNBOEV' },
  { id: 'UZB15', section: 'UZBEKISTAN', type: 'NORMAL', name: 'KHOJIMAT ERKINOV' },
  { id: 'UZB16', section: 'UZBEKISTAN', type: 'NORMAL', name: 'ELDOR SHOMURODOV' },
  { id: 'UZB17', section: 'UZBEKISTAN', type: 'NORMAL', name: 'OSTON URUNOV' },
  { id: 'UZB18', section: 'UZBEKISTAN', type: 'NORMAL', name: 'JALOLIDDIN MASHARIPOV' },
  { id: 'UZB19', section: 'UZBEKISTAN', type: 'NORMAL', name: 'IGOR SERGEEV' },
  { id: 'UZB20', section: 'UZBEKISTAN', type: 'NORMAL', name: 'ABBOSBEK FAYZULLAEV' }
];

async function patchUzbekistan() {
  console.log('Reparando selección de Uzbekistán...');
  const { error } = await supabase
    .from('stickers')
    .upsert(uzbekistanStickers, { onConflict: 'id' });

  if (error) {
    console.error('Error al reparar:', error.message);
  } else {
    console.log('¡Selección de Uzbekistán completada con éxito (20/20)!');
  }
}

patchUzbekistan();
