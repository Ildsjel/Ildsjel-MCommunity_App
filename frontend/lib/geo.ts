// City coordinate lookup table (lat, lon) — covers major European + global metal cities
export const CITY_COORDS: Record<string, [number, number]> = {
  // Germany
  'berlin':      [52.5200, 13.4050],
  'hamburg':     [53.5511,  9.9937],
  'munich':      [48.1351, 11.5820],
  'münchen':     [48.1351, 11.5820],
  'cologne':     [50.9333,  6.9500],
  'köln':        [50.9333,  6.9500],
  'frankfurt':   [50.1109,  8.6821],
  'stuttgart':   [48.7758,  9.1829],
  'düsseldorf':  [51.2217,  6.7762],
  'dusseldorf':  [51.2217,  6.7762],
  'dortmund':    [51.5136,  7.4653],
  'essen':       [51.4556,  7.0116],
  'leipzig':     [51.3397, 12.3731],
  'bremen':      [53.0793,  8.8017],
  'dresden':     [51.0504, 13.7373],
  'hannover':    [52.3759,  9.7320],
  'nuremberg':   [49.4521, 11.0767],
  'nürnberg':    [49.4521, 11.0767],
  'mannheim':    [49.4875,  8.4660],
  'wacken':      [54.0783,  9.3740],
  // Austria
  'vienna':      [48.2082, 16.3738],
  'wien':        [48.2082, 16.3738],
  'graz':        [47.0707, 15.4395],
  'linz':        [48.3069, 14.2858],
  'salzburg':    [47.8095, 13.0550],
  'innsbruck':   [47.2692, 11.4041],
  // Switzerland
  'zurich':      [47.3769,  8.5417],
  'zürich':      [47.3769,  8.5417],
  'bern':        [46.9481,  7.4474],
  'basel':       [47.5596,  7.5886],
  'geneva':      [46.2044,  6.1432],
  // Scandinavia
  'oslo':        [59.9139, 10.7522],
  'stockholm':   [59.3293, 18.0686],
  'copenhagen':  [55.6761, 12.5683],
  'gothenburg':  [57.7089, 11.9746],
  'göteborg':    [57.7089, 11.9746],
  'helsinki':    [60.1699, 24.9384],
  'bergen':      [60.3913,  5.3221],
  'trondheim':   [63.4305, 10.3951],
  // UK & Ireland
  'london':      [51.5074, -0.1278],
  'manchester':  [53.4808, -2.2426],
  'birmingham':  [52.4862, -1.8904],
  'edinburgh':   [55.9533, -3.1883],
  'glasgow':     [55.8642, -4.2518],
  'dublin':      [53.3498, -6.2603],
  // Netherlands & Belgium
  'amsterdam':   [52.3676,  4.9041],
  'rotterdam':   [51.9244,  4.4777],
  'brussels':    [50.8503,  4.3517],
  'brussel':     [50.8503,  4.3517],
  'antwerp':     [51.2194,  4.4025],
  // France
  'paris':       [48.8566,  2.3522],
  'lyon':        [45.7640,  4.8357],
  'marseille':   [43.2965,  5.3698],
  'bordeaux':    [44.8378, -0.5792],
  'toulouse':    [43.6047,  1.4442],
  // Poland
  'warsaw':      [52.2297, 21.0122],
  'wroclaw':     [51.1079, 17.0385],
  'wrocław':     [51.1079, 17.0385],
  'krakow':      [50.0647, 19.9450],
  'kraków':      [50.0647, 19.9450],
  'gdansk':      [54.3520, 18.6466],
  'gdańsk':      [54.3520, 18.6466],
  'poznan':      [52.4064, 16.9252],
  // Czech Republic
  'prague':      [50.0755, 14.4378],
  'praha':       [50.0755, 14.4378],
  'brno':        [49.1951, 16.6068],
  // Italy
  'rome':        [41.9028, 12.4964],
  'milan':       [45.4642,  9.1900],
  'milano':      [45.4642,  9.1900],
  'florence':    [43.7696, 11.2558],
  'bologna':     [44.4949, 11.3426],
  'turin':       [45.0703,  7.6869],
  // Spain
  'madrid':      [40.4168, -3.7038],
  'barcelona':   [41.3851,  2.1734],
  'bilbao':      [43.2630, -2.9340],
  // USA
  'new york':    [40.7128, -74.0060],
  'los angeles': [34.0522,-118.2437],
  'chicago':     [41.8781, -87.6298],
  'portland':    [45.5231,-122.6765],
  'seattle':     [47.6062,-122.3321],
  'san francisco':[37.7749,-122.4194],
  'atlanta':     [33.7490, -84.3880],
  'denver':      [39.7392,-104.9903],
  'boston':      [42.3601, -71.0589],
  // Canada
  'toronto':     [43.6532, -79.3832],
  'montreal':    [45.5017, -73.5673],
  'vancouver':   [49.2827,-123.1207],
  // Other
  'tokyo':       [35.6762, 139.6503],
  'sydney':      [-33.8688, 151.2093],
  'melbourne':   [-37.8136, 144.9631],
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function distanceBetweenCities(city1: string, city2: string): number | null {
  const c1 = CITY_COORDS[city1.toLowerCase().trim()]
  const c2 = CITY_COORDS[city2.toLowerCase().trim()]
  if (!c1 || !c2) return null
  return Math.round(haversineKm(c1[0], c1[1], c2[0], c2[1]))
}

export function formatDistance(km: number): string {
  if (km < 1) return '< 1 km'
  return `${km} km`
}
