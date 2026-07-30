export type DegreeLevel = 'ug' | 'pg' | 'phd';

export const DEGREE_LEVELS: Array<{ value: DegreeLevel; label: string }> = [
  { value: 'ug', label: 'UG' },
  { value: 'pg', label: 'PG' },
  { value: 'phd', label: 'PhD' },
];

export const ADMISSION_PROGRAMS = [
  'Business & Management',
  'Computer Science & IT',
  'Engineering',
  'Medicine & Health Sciences',
  'Law',
  'Design',
  'Data Science & AI',
  'Hospitality & Tourism',
  'Finance & Accounting',
  'Psychology',
];

export const COUNTRY_COLLEGES: Record<string, string[]> = {
  India: [
    'Delhi University',
    'Mumbai University',
    'Christ University',
    'Manipal Academy of Higher Education',
    'Ashoka University',
  ],
  USA: [
    'Arizona State University',
    'Northeastern University',
    'Purdue University',
    'University of California',
    'University of Illinois',
  ],
  Canada: [
    'University of Toronto',
    'University of British Columbia',
    'McGill University',
    'University of Waterloo',
    'York University',
  ],
  UK: [
    'University of Manchester',
    'University of Warwick',
    'University of Leeds',
    'King\'s College London',
    'University of Bristol',
  ],
  Australia: [
    'University of Melbourne',
    'Monash University',
    'University of Sydney',
    'RMIT University',
    'Deakin University',
  ],
  Germany: [
    'Technical University of Munich',
    'RWTH Aachen University',
    'University of Stuttgart',
    'University of Mannheim',
    'Heidelberg University',
  ],
  Singapore: [
    'National University of Singapore',
    'Nanyang Technological University',
    'Singapore Management University',
    'SIM Global Education',
  ],
  Japan: [
    'University of Tokyo',
    'Kyoto University',
    'Osaka University',
    'Tohoku University',
    'Waseda University',
    'Keio University',
    'Tokyo International University',
    'Ritsumeikan Asia Pacific University',
  ],
};

export const ADMISSION_COUNTRIES = Object.keys(COUNTRY_COLLEGES);

export function getCollegesForCountries(countries: string[]) {
  return Array.from(new Set(countries.flatMap((country) => COUNTRY_COLLEGES[country] || [])));
}
