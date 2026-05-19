export const COUNTRY_FLAGS: Record<string, string> = {
  'MEXICO': 'mx',
  'SUDAFRICA': 'za',
  'COREA DEL SUR': 'kr',
  'REPÚBLICA CHECA': 'cz',
  'CANADA': 'ca',
  'BOSNIA HERZEGOVINA': 'ba',
  'QATAR': 'qa',
  'SUIZA': 'ch',
  'BRASIL': 'br',
  'MARRUECOS': 'ma',
  'HAITI': 'ht',
  'ESCOCIA': 'gb-sct',
  'ESTADOS UNIDOS': 'us',
  'PARAGUAY': 'py',
  'AUSTRALIA': 'au',
  'TURQUIA': 'tr',
  'ALEMANIA': 'de',
  'CURAZAO': 'cw',
  'COSTA DE MARFIL': 'ci',
  'ECUADOR': 'ec',
  'HOLANDA': 'nl',
  'JAPON': 'jp',
  'SUECIA': 'se',
  'TUNEZ': 'tn',
  'BELGICA': 'be',
  'EGIPTO': 'eg',
  'IRAN': 'ir',
  'NUEVA ZELANDA': 'nz',
  'ESPAÑA': 'es',
  'CABO VERDE': 'cv',
  'ARABIA SAUDITA': 'sa',
  'URUGUAY': 'uy',
  'FRANCIA': 'fr',
  'SENEGAL': 'sn',
  'IRAQ': 'iq',
  'NORUEGA': 'no',
  'ARGENTINA': 'ar',
  'ALGERIA': 'dz',
  'AUSTRIA': 'at',
  'JORDANIA': 'jo',
  'PORTUGAL': 'pt',
  'REPUBLICA DEMOCRATICA DEL CONGO': 'cd',
  'UZBEKISTAN': 'uz',
  'COLOMBIA': 'co',
  'INGLATERRA': 'gb-eng',
  'CROACIA': 'hr',
  'GHANA': 'gh',
  'PANAMA': 'pa',
};

// Also map 3-letter codes just in case
export const PREFIX_TO_FLAG: Record<string, string> = {
  'PAN': 'pa',
  'MEX': 'mx',
  'CAN': 'ca',
  'USA': 'us',
  'ARG': 'ar',
  'BRA': 'br',
  'ESP': 'es',
  'FRA': 'fr',
  'GER': 'de',
  'ITA': 'it',
  'POR': 'pt',
  'ENG': 'gb-eng',
  'RSA': 'za',
  'KOR': 'kr',
  'CZE': 'cz',
  'BIH': 'ba',
  'QAT': 'qa',
  'SUI': 'ch',
  'MAR': 'ma',
  'HAI': 'ht',
  'SCO': 'gb-sct',
  'PAR': 'py',
  'AUS': 'au',
  'TUR': 'tr',
  'CUW': 'cw',
  'CIV': 'ci',
  'ECU': 'ec',
  'NED': 'nl',
  'JPN': 'jp',
  'SWE': 'se',
  'TUN': 'tn',
  'BEL': 'be',
  'EGY': 'eg',
  'IRN': 'ir',
  'NZL': 'nz',
  'CPV': 'cv',
  'KSA': 'sa',
  'URU': 'uy',
  'SEN': 'sn',
  'IRQ': 'iq',
  'NOR': 'no',
  'ALG': 'dz',
  'AUT': 'at',
  'JOR': 'jo',
  'COD': 'cd',
  'UZB': 'uz',
  'COL': 'co',
  'CRO': 'hr',
  'GHA': 'gh',
};

export function getFlagUrl(sectionName: string, id?: string): string | null {
  // If FWC or CC, return null (use trophy)
  if (id && (id.startsWith('FWC') || id.startsWith('CC') || id === '00')) return null;

  let code = COUNTRY_FLAGS[sectionName.toUpperCase()];
  
  if (!code && id) {
    const prefix = id.substring(0, 3).toUpperCase();
    code = PREFIX_TO_FLAG[prefix];
  }

  if (!code) return null;
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}

export function getFlagEmoji(sectionName: string): string {
  const code = COUNTRY_FLAGS[sectionName.toUpperCase()];
  if (!code) return '🏆';
  
  // Special case for UK countries in emoji
  if (code === 'gb-sct') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if (code === 'gb-eng') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  
  return code
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

// Helper to sort sections, prioritizing Panama (deterministic & locale-independent)
export function sortSectionsWithPanamaFirst(a: string, b: string): number {
  if (a.toUpperCase() === 'PANAMA') return -1;
  if (b.toUpperCase() === 'PANAMA') return 1;
  const normA = a.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const normB = b.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (normA < normB) return -1;
  if (normA > normB) return 1;
  return 0;
}


export function getSectionDisplayName(section: string): string {
  const normalized = section.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized === 'SECCION 1') return '🏟️ Estadios y Sedes';
  if (normalized === 'SECCION 2') return '🏛️ Museo FIFA';
  if (normalized === 'SECCION 3') return '✨ Especiales Coca-Cola';
  if (normalized === 'SECCION 4') return '🌟 Figuritas de Leyenda';
  return section;
}
