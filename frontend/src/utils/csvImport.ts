export interface CsvColumnDefinition {
  key: string;
  labelKey: string;
  required: boolean;
}

export const CSV_COLUMN_DEFINITIONS: Record<string, CsvColumnDefinition[]> = {
  shooters: [
    { key: 'first_name', labelKey: 'shooters.firstName', required: true },
    { key: 'last_name', labelKey: 'shooters.lastName', required: true },
    { key: 'category', labelKey: 'shooters.category', required: true },
    { key: 'tag', labelKey: 'shooters.tag', required: false },
    { key: 'division', labelKey: 'shooters.division', required: true },
    { key: 'power_factor', labelKey: 'shooters.powerFactor', required: true },
    { key: 'region', labelKey: 'shooters.region', required: true },
    { key: 'email', labelKey: 'shooters.email', required: false },
  ],
  registrations: [
    { key: 'shooter_first_name', labelKey: 'registration.addTitle', required: true },
    { key: 'shooter_last_name', labelKey: 'shooters.lastName', required: true },
    { key: 'squad', labelKey: 'registration.squad', required: false },
    { key: 'division', labelKey: 'registration.divisionOverride', required: false },
    { key: 'category', labelKey: 'shooters.category', required: false },
    { key: 'power_factor', labelKey: 'registration.powerFactorOverride', required: false },
  ],
  scores: [
    { key: 'shooter_first_name', labelKey: 'shooters.firstName', required: true },
    { key: 'shooter_last_name', labelKey: 'shooters.lastName', required: true },
    { key: 'stage_number', labelKey: 'stages.number', required: true },
    { key: 'time', labelKey: 'scoring.time', required: true },
    { key: 'alpha', labelKey: 'csvImport.columnAlpha', required: false },
    { key: 'charlie', labelKey: 'csvImport.columnCharlie', required: false },
    { key: 'delta', labelKey: 'csvImport.columnDelta', required: false },
    { key: 'miss', labelKey: 'scoring.misses', required: false },
    { key: 'no_shoot_hits', labelKey: 'scoring.noShootTargets', required: false },
    { key: 'steel_hits', labelKey: 'scoring.steelTargets', required: false },
    { key: 'procedural', labelKey: 'scoring.procedurals', required: false },
    { key: 'ftsa', labelKey: 'FTSA', required: false },
  ],
};

const COLUMN_ALIASES: Record<string, string[]> = {
  first_name: ['firstname', 'fname', 'first', 'name'],
  last_name: ['lastname', 'lname', 'last', 'surname'],
  shooter_first_name: ['shooter_firstname', 'shooterfname', 'shooter_first', 'firstname', 'fname'],
  shooter_last_name: ['shooter_lastname', 'shooterlname', 'shooter_last', 'lastname', 'lname'],
  stage_number: ['stage', 'stage_num', 'stagenumber', 'stage_no'],
  power_factor: ['pf', 'powerfactor'],
  no_shoot_hits: ['ns_hits', 'noshoot_hits', 'no_shoot', 'ns'],
  steel_hits: ['steel', 'steels'],
  category: ['cat', 'catégorie'],
  division: ['div', 'class'],
  region: ['country', 'country_code', 'region_code'],
};

export function detectCsvDelimiter(text: string): string {
  const lines = text.split('\n').slice(0, 5).filter((line) => line.trim());
  let semicolons = 0;
  let commas = 0;
  for (const line of lines) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
  }
  return semicolons > commas ? ';' : ',';
}

export function buildCsvColumnMapping(
  headers: string[],
  columns: CsvColumnDefinition[],
): Record<string, string> {
  const normalizedHeaders = headers.map((header) => header.toLowerCase().replace(/[\s_-]+/g, '_'));
  const mapping: Record<string, string> = {};

  columns.forEach((column) => {
    const index = normalizedHeaders.indexOf(column.key);
    if (index >= 0) {
      mapping[column.key] = headers[index];
      return;
    }
    const aliases = COLUMN_ALIASES[column.key] || [];
    const aliasIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (aliasIndex >= 0) mapping[column.key] = headers[aliasIndex];
  });

  return mapping;
}

export function parseCsvHeaders(text: string): string[] {
  const firstLine = text.split('\n')[0] || '';
  const delimiter = detectCsvDelimiter(firstLine);
  return firstLine.split(delimiter).map((header) => header.trim().replace(/^"|"$/g, ''));
}

export const CSV_SAMPLES: Record<string, string> = {
  shooters: 'first_name;last_name;category;tag;division;power_factor;region;email\nJohn;Doe;regular;;standard;minor;USA;john@example.com',
  registrations: 'shooter_first_name;shooter_last_name;squad;division;category;power_factor\nJohn;Doe;1;standard;regular;minor',
  scores: 'shooter_first_name;shooter_last_name;stage_number;time;alpha;charlie;delta;miss;no_shoot_hits;steel_hits;procedural;ftsa\nJohn;Doe;1;12.45;4;2;0;0;0;2;0;0',
};

export function downloadCsvSample(type: string) {
  const csv = CSV_SAMPLES[type] || '';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sample_${type}_import.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
