export type GroupCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export const GROUPS: Record<GroupCode, string[]> = {
  'A': ['MEX', 'RSA', 'KOR', 'CZE'],
  'B': ['CAN', 'BIH', 'QAT', 'SUI'],
  'C': ['BRA', 'MAR', 'HAI', 'SCO'],
  'D': ['USA', 'PAR', 'AUS', 'TUR'],
  'E': ['GER', 'CUW', 'CIV', 'ECU'],
  'F': ['NED', 'JPN', 'SWE', 'TUN'],
  'G': ['BEL', 'EGY', 'IRN', 'NZL'],
  'H': ['ESP', 'CPV', 'KSA', 'URU'],
  'I': ['FRA', 'SEN', 'IRQ', 'NOR'],
  'J': ['ARG', 'ALG', 'AUT', 'JOR'],
  'K': ['POR', 'COD', 'UZB', 'COL'],
  'L': ['ENG', 'CRO', 'GHA', 'PAN'],
};

export const PREFIX_TO_GROUP: Record<string, GroupCode> = {};

Object.entries(GROUPS).forEach(([group, prefixes]) => {
  prefixes.forEach(prefix => {
    PREFIX_TO_GROUP[prefix] = group as GroupCode;
  });
});

export function getGroupForSticker(stickerId: string): GroupCode | null {
  // Handle special cases
  if (stickerId.startsWith('FWC') || stickerId.startsWith('CC') || stickerId === '00') return null;
  
  let prefix = stickerId.substring(0, 3).toUpperCase();
  // Normalizar variaciones de prefijos de la base de datos a los códigos oficiales
  if (prefix === 'JAP') prefix = 'JPN';
  
  return PREFIX_TO_GROUP[prefix] || null;
}

export function getTeamsInGroup(group: GroupCode): string[] {
  return GROUPS[group];
}
