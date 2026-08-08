/* ==========================================================================
   Country reference for the culinary passport.
   `origin` on a recipe is stored as the ISO 3166-1 alpha-3 code (e.g. 'ITA'),
   which is exactly what @keremmert/react-world-map expects for highlighting.
   alpha-2 is kept only to derive the flag emoji.
   ========================================================================== */

export const COUNTRIES = [
  { c3: 'ITA', c2: 'IT', name: 'Italy' },
  { c3: 'FRA', c2: 'FR', name: 'France' },
  { c3: 'ESP', c2: 'ES', name: 'Spain' },
  { c3: 'PRT', c2: 'PT', name: 'Portugal' },
  { c3: 'GRC', c2: 'GR', name: 'Greece' },
  { c3: 'DEU', c2: 'DE', name: 'Germany' },
  { c3: 'GBR', c2: 'GB', name: 'United Kingdom' },
  { c3: 'IRL', c2: 'IE', name: 'Ireland' },
  { c3: 'NLD', c2: 'NL', name: 'Netherlands' },
  { c3: 'BEL', c2: 'BE', name: 'Belgium' },
  { c3: 'CHE', c2: 'CH', name: 'Switzerland' },
  { c3: 'AUT', c2: 'AT', name: 'Austria' },
  { c3: 'ROU', c2: 'RO', name: 'Romania' },
  { c3: 'BGR', c2: 'BG', name: 'Bulgaria' },
  { c3: 'HUN', c2: 'HU', name: 'Hungary' },
  { c3: 'POL', c2: 'PL', name: 'Poland' },
  { c3: 'CZE', c2: 'CZ', name: 'Czechia' },
  { c3: 'SVK', c2: 'SK', name: 'Slovakia' },
  { c3: 'HRV', c2: 'HR', name: 'Croatia' },
  { c3: 'SRB', c2: 'RS', name: 'Serbia' },
  { c3: 'UKR', c2: 'UA', name: 'Ukraine' },
  { c3: 'RUS', c2: 'RU', name: 'Russia' },
  { c3: 'SWE', c2: 'SE', name: 'Sweden' },
  { c3: 'NOR', c2: 'NO', name: 'Norway' },
  { c3: 'DNK', c2: 'DK', name: 'Denmark' },
  { c3: 'FIN', c2: 'FI', name: 'Finland' },
  { c3: 'TUR', c2: 'TR', name: 'Turkey' },
  { c3: 'GEO', c2: 'GE', name: 'Georgia' },
  { c3: 'ARM', c2: 'AM', name: 'Armenia' },
  { c3: 'ISR', c2: 'IL', name: 'Israel' },
  { c3: 'LBN', c2: 'LB', name: 'Lebanon' },
  { c3: 'SYR', c2: 'SY', name: 'Syria' },
  { c3: 'IRN', c2: 'IR', name: 'Iran' },
  { c3: 'IRQ', c2: 'IQ', name: 'Iraq' },
  { c3: 'SAU', c2: 'SA', name: 'Saudi Arabia' },
  { c3: 'ARE', c2: 'AE', name: 'United Arab Emirates' },
  { c3: 'EGY', c2: 'EG', name: 'Egypt' },
  { c3: 'MAR', c2: 'MA', name: 'Morocco' },
  { c3: 'TUN', c2: 'TN', name: 'Tunisia' },
  { c3: 'DZA', c2: 'DZ', name: 'Algeria' },
  { c3: 'NGA', c2: 'NG', name: 'Nigeria' },
  { c3: 'GHA', c2: 'GH', name: 'Ghana' },
  { c3: 'ETH', c2: 'ET', name: 'Ethiopia' },
  { c3: 'KEN', c2: 'KE', name: 'Kenya' },
  { c3: 'ZAF', c2: 'ZA', name: 'South Africa' },
  { c3: 'IND', c2: 'IN', name: 'India' },
  { c3: 'PAK', c2: 'PK', name: 'Pakistan' },
  { c3: 'BGD', c2: 'BD', name: 'Bangladesh' },
  { c3: 'LKA', c2: 'LK', name: 'Sri Lanka' },
  { c3: 'NPL', c2: 'NP', name: 'Nepal' },
  { c3: 'THA', c2: 'TH', name: 'Thailand' },
  { c3: 'VNM', c2: 'VN', name: 'Vietnam' },
  { c3: 'KHM', c2: 'KH', name: 'Cambodia' },
  { c3: 'LAO', c2: 'LA', name: 'Laos' },
  { c3: 'MMR', c2: 'MM', name: 'Myanmar' },
  { c3: 'MYS', c2: 'MY', name: 'Malaysia' },
  { c3: 'SGP', c2: 'SG', name: 'Singapore' },
  { c3: 'IDN', c2: 'ID', name: 'Indonesia' },
  { c3: 'PHL', c2: 'PH', name: 'Philippines' },
  { c3: 'CHN', c2: 'CN', name: 'China' },
  { c3: 'JPN', c2: 'JP', name: 'Japan' },
  { c3: 'KOR', c2: 'KR', name: 'South Korea' },
  { c3: 'PRK', c2: 'KP', name: 'North Korea' },
  { c3: 'MNG', c2: 'MN', name: 'Mongolia' },
  { c3: 'AUS', c2: 'AU', name: 'Australia' },
  { c3: 'NZL', c2: 'NZ', name: 'New Zealand' },
  { c3: 'USA', c2: 'US', name: 'United States' },
  { c3: 'CAN', c2: 'CA', name: 'Canada' },
  { c3: 'MEX', c2: 'MX', name: 'Mexico' },
  { c3: 'CUB', c2: 'CU', name: 'Cuba' },
  { c3: 'JAM', c2: 'JM', name: 'Jamaica' },
  { c3: 'GTM', c2: 'GT', name: 'Guatemala' },
  { c3: 'BRA', c2: 'BR', name: 'Brazil' },
  { c3: 'ARG', c2: 'AR', name: 'Argentina' },
  { c3: 'CHL', c2: 'CL', name: 'Chile' },
  { c3: 'PER', c2: 'PE', name: 'Peru' },
  { c3: 'COL', c2: 'CO', name: 'Colombia' },
  { c3: 'VEN', c2: 'VE', name: 'Venezuela' },
  { c3: 'BOL', c2: 'BO', name: 'Bolivia' },
  { c3: 'ECU', c2: 'EC', name: 'Ecuador' },
  { c3: 'URY', c2: 'UY', name: 'Uruguay' },
];

/* Derive the flag emoji from the alpha-2 code (regional indicator symbols). */
export function flagOf(c2) {
  if (!c2 || c2.length !== 2) return '🍽️';
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (c2.charCodeAt(0) - 65),
    A + (c2.charCodeAt(1) - 65),
  );
}

const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.c3, c]));

/* Resolve an origin code to a friendly { c3, c2, name, flag } (or a fallback). */
export function countryOf(code) {
  if (!code) return null;
  const hit = BY_CODE[code];
  if (hit) return { ...hit, flag: flagOf(hit.c2) };
  return { c3: code, c2: '', name: code, flag: '🍽️' };
}

export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  ...c,
  flag: flagOf(c.c2),
})).sort((a, b) => a.name.localeCompare(b.name));
