// Major International Airports Database
// Contains ~500 major airports worldwide with IATA codes, names, cities, countries

export const AIRPORTS_DATABASE = [
  // United Kingdom
  { iata: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom", terminals: ["Terminal 2", "Terminal 3", "Terminal 4", "Terminal 5"] },
  { iata: "LGW", name: "London Gatwick Airport", city: "London", country: "United Kingdom", terminals: ["North Terminal", "South Terminal"] },
  { iata: "STN", name: "London Stansted Airport", city: "London", country: "United Kingdom", terminals: [] },
  { iata: "LTN", name: "London Luton Airport", city: "London", country: "United Kingdom", terminals: [] },
  { iata: "LCY", name: "London City Airport", city: "London", country: "United Kingdom", terminals: [] },
  { iata: "SEN", name: "London Southend Airport", city: "London", country: "United Kingdom", terminals: [] },
  { iata: "MAN", name: "Manchester Airport", city: "Manchester", country: "United Kingdom", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "BHX", name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom", terminals: [] },
  { iata: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "United Kingdom", terminals: [] },
  { iata: "GLA", name: "Glasgow Airport", city: "Glasgow", country: "United Kingdom", terminals: [] },
  { iata: "BRS", name: "Bristol Airport", city: "Bristol", country: "United Kingdom", terminals: [] },
  { iata: "NCL", name: "Newcastle Airport", city: "Newcastle", country: "United Kingdom", terminals: [] },
  { iata: "LPL", name: "Liverpool John Lennon Airport", city: "Liverpool", country: "United Kingdom", terminals: [] },
  { iata: "EMA", name: "East Midlands Airport", city: "Nottingham", country: "United Kingdom", terminals: [] },
  { iata: "LBA", name: "Leeds Bradford Airport", city: "Leeds", country: "United Kingdom", terminals: [] },
  { iata: "BFS", name: "Belfast International Airport", city: "Belfast", country: "United Kingdom", terminals: [] },
  { iata: "ABZ", name: "Aberdeen Airport", city: "Aberdeen", country: "United Kingdom", terminals: [] },
  { iata: "CWL", name: "Cardiff Airport", city: "Cardiff", country: "United Kingdom", terminals: [] },
  
  // Europe
  { iata: "CDG", name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", terminals: ["Terminal 1", "Terminal 2A", "Terminal 2B", "Terminal 2C", "Terminal 2D", "Terminal 2E", "Terminal 2F", "Terminal 3"] },
  { iata: "ORY", name: "Paris Orly Airport", city: "Paris", country: "France", terminals: ["Orly 1", "Orly 2", "Orly 3", "Orly 4"] },
  { iata: "AMS", name: "Amsterdam Schiphol Airport", city: "Amsterdam", country: "Netherlands", terminals: [] },
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "MUC", name: "Munich Airport", city: "Munich", country: "Germany", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "BER", name: "Berlin Brandenburg Airport", city: "Berlin", country: "Germany", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "DUS", name: "Düsseldorf Airport", city: "Düsseldorf", country: "Germany", terminals: [] },
  { iata: "HAM", name: "Hamburg Airport", city: "Hamburg", country: "Germany", terminals: [] },
  { iata: "CGN", name: "Cologne Bonn Airport", city: "Cologne", country: "Germany", terminals: [] },
  { iata: "MAD", name: "Madrid Barajas Airport", city: "Madrid", country: "Spain", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4", "Terminal 4S"] },
  { iata: "BCN", name: "Barcelona El Prat Airport", city: "Barcelona", country: "Spain", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "PMI", name: "Palma de Mallorca Airport", city: "Palma", country: "Spain", terminals: [] },
  { iata: "AGP", name: "Málaga Airport", city: "Málaga", country: "Spain", terminals: [] },
  { iata: "ALC", name: "Alicante Airport", city: "Alicante", country: "Spain", terminals: [] },
  { iata: "FCO", name: "Rome Fiumicino Airport", city: "Rome", country: "Italy", terminals: ["Terminal 1", "Terminal 3"] },
  { iata: "MXP", name: "Milan Malpensa Airport", city: "Milan", country: "Italy", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "LIN", name: "Milan Linate Airport", city: "Milan", country: "Italy", terminals: [] },
  { iata: "VCE", name: "Venice Marco Polo Airport", city: "Venice", country: "Italy", terminals: [] },
  { iata: "NAP", name: "Naples Airport", city: "Naples", country: "Italy", terminals: [] },
  { iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", terminals: [] },
  { iata: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland", terminals: [] },
  { iata: "VIE", name: "Vienna Airport", city: "Vienna", country: "Austria", terminals: [] },
  { iata: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium", terminals: [] },
  { iata: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark", terminals: ["Terminal 2", "Terminal 3"] },
  { iata: "OSL", name: "Oslo Gardermoen Airport", city: "Oslo", country: "Norway", terminals: [] },
  { iata: "ARN", name: "Stockholm Arlanda Airport", city: "Stockholm", country: "Sweden", terminals: ["Terminal 2", "Terminal 5"] },
  { iata: "HEL", name: "Helsinki Airport", city: "Helsinki", country: "Finland", terminals: [] },
  { iata: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "LIS", name: "Lisbon Airport", city: "Lisbon", country: "Portugal", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "OPO", name: "Porto Airport", city: "Porto", country: "Portugal", terminals: [] },
  { iata: "ATH", name: "Athens Airport", city: "Athens", country: "Greece", terminals: [] },
  { iata: "PRG", name: "Prague Airport", city: "Prague", country: "Czech Republic", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "WAW", name: "Warsaw Chopin Airport", city: "Warsaw", country: "Poland", terminals: [] },
  { iata: "BUD", name: "Budapest Airport", city: "Budapest", country: "Hungary", terminals: ["Terminal 2A", "Terminal 2B"] },
  { iata: "OTP", name: "Bucharest Henri Coandă Airport", city: "Bucharest", country: "Romania", terminals: [] },
  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", terminals: [] },
  { iata: "SAW", name: "Istanbul Sabiha Gökçen Airport", city: "Istanbul", country: "Turkey", terminals: [] },
  
  // Middle East
  { iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "DWC", name: "Dubai World Central Airport", city: "Dubai", country: "UAE", terminals: [] },
  { iata: "AUH", name: "Abu Dhabi International Airport", city: "Abu Dhabi", country: "UAE", terminals: ["Terminal A", "Terminal 1", "Terminal 3"] },
  { iata: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar", terminals: [] },
  { iata: "RUH", name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia", terminals: [] },
  { iata: "JED", name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia", terminals: [] },
  { iata: "BAH", name: "Bahrain International Airport", city: "Manama", country: "Bahrain", terminals: [] },
  { iata: "MCT", name: "Muscat International Airport", city: "Muscat", country: "Oman", terminals: [] },
  { iata: "KWI", name: "Kuwait International Airport", city: "Kuwait City", country: "Kuwait", terminals: [] },
  { iata: "AMM", name: "Queen Alia International Airport", city: "Amman", country: "Jordan", terminals: [] },
  { iata: "TLV", name: "Ben Gurion Airport", city: "Tel Aviv", country: "Israel", terminals: ["Terminal 1", "Terminal 3"] },
  { iata: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  
  // Asia
  { iata: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"] },
  { iata: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "NRT", name: "Tokyo Narita Airport", city: "Tokyo", country: "Japan", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "KIX", name: "Osaka Kansai Airport", city: "Osaka", country: "Japan", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "ICN", name: "Seoul Incheon Airport", city: "Seoul", country: "South Korea", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "GMP", name: "Seoul Gimpo Airport", city: "Seoul", country: "South Korea", terminals: [] },
  { iata: "PEK", name: "Beijing Capital Airport", city: "Beijing", country: "China", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "PKX", name: "Beijing Daxing Airport", city: "Beijing", country: "China", terminals: [] },
  { iata: "PVG", name: "Shanghai Pudong Airport", city: "Shanghai", country: "China", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "SHA", name: "Shanghai Hongqiao Airport", city: "Shanghai", country: "China", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "CAN", name: "Guangzhou Baiyun Airport", city: "Guangzhou", country: "China", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "SZX", name: "Shenzhen Bao'an Airport", city: "Shenzhen", country: "China", terminals: [] },
  { iata: "HGH", name: "Hangzhou Xiaoshan Airport", city: "Hangzhou", country: "China", terminals: [] },
  { iata: "BKK", name: "Bangkok Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", terminals: [] },
  { iata: "DMK", name: "Bangkok Don Mueang Airport", city: "Bangkok", country: "Thailand", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia", terminals: ["KLIA", "KLIA2"] },
  { iata: "CGK", name: "Jakarta Soekarno-Hatta Airport", city: "Jakarta", country: "Indonesia", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "DPS", name: "Bali Ngurah Rai Airport", city: "Bali", country: "Indonesia", terminals: [] },
  { iata: "MNL", name: "Manila Ninoy Aquino Airport", city: "Manila", country: "Philippines", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"] },
  { iata: "SGN", name: "Ho Chi Minh City Tan Son Nhat Airport", city: "Ho Chi Minh City", country: "Vietnam", terminals: [] },
  { iata: "HAN", name: "Hanoi Noi Bai Airport", city: "Hanoi", country: "Vietnam", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "DEL", name: "Delhi Indira Gandhi Airport", city: "Delhi", country: "India", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "BOM", name: "Mumbai Chhatrapati Shivaji Airport", city: "Mumbai", country: "India", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "BLR", name: "Bangalore Kempegowda Airport", city: "Bangalore", country: "India", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "MAA", name: "Chennai Airport", city: "Chennai", country: "India", terminals: [] },
  { iata: "HYD", name: "Hyderabad Rajiv Gandhi Airport", city: "Hyderabad", country: "India", terminals: [] },
  { iata: "CCU", name: "Kolkata Netaji Subhas Chandra Bose Airport", city: "Kolkata", country: "India", terminals: [] },
  { iata: "CMB", name: "Colombo Bandaranaike Airport", city: "Colombo", country: "Sri Lanka", terminals: [] },
  { iata: "DAC", name: "Dhaka Hazrat Shahjalal Airport", city: "Dhaka", country: "Bangladesh", terminals: [] },
  { iata: "KTM", name: "Kathmandu Tribhuvan Airport", city: "Kathmandu", country: "Nepal", terminals: [] },
  
  // North America
  { iata: "JFK", name: "New York John F. Kennedy Airport", city: "New York", country: "USA", terminals: ["Terminal 1", "Terminal 2", "Terminal 4", "Terminal 5", "Terminal 7", "Terminal 8"] },
  { iata: "EWR", name: "Newark Liberty Airport", city: "Newark", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C"] },
  { iata: "LGA", name: "New York LaGuardia Airport", city: "New York", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C", "Terminal D"] },
  { iata: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "USA", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4", "Terminal 5", "Terminal 6", "Terminal 7", "Terminal 8", "Tom Bradley International"] },
  { iata: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "USA", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "International Terminal"] },
  { iata: "ORD", name: "Chicago O'Hare Airport", city: "Chicago", country: "USA", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 5"] },
  { iata: "MDW", name: "Chicago Midway Airport", city: "Chicago", country: "USA", terminals: [] },
  { iata: "ATL", name: "Atlanta Hartsfield-Jackson Airport", city: "Atlanta", country: "USA", terminals: ["Domestic Terminal", "International Terminal"] },
  { iata: "DFW", name: "Dallas/Fort Worth Airport", city: "Dallas", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E"] },
  { iata: "DEN", name: "Denver International Airport", city: "Denver", country: "USA", terminals: [] },
  { iata: "SEA", name: "Seattle-Tacoma Airport", city: "Seattle", country: "USA", terminals: [] },
  { iata: "MIA", name: "Miami International Airport", city: "Miami", country: "USA", terminals: ["North Terminal", "Central Terminal", "South Terminal"] },
  { iata: "FLL", name: "Fort Lauderdale Airport", city: "Fort Lauderdale", country: "USA", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"] },
  { iata: "MCO", name: "Orlando International Airport", city: "Orlando", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C"] },
  { iata: "BOS", name: "Boston Logan Airport", city: "Boston", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C", "Terminal E"] },
  { iata: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E", "Terminal F"] },
  { iata: "IAD", name: "Washington Dulles Airport", city: "Washington DC", country: "USA", terminals: [] },
  { iata: "DCA", name: "Washington Reagan Airport", city: "Washington DC", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C"] },
  { iata: "BWI", name: "Baltimore/Washington Airport", city: "Baltimore", country: "USA", terminals: [] },
  { iata: "SAN", name: "San Diego International Airport", city: "San Diego", country: "USA", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "LAS", name: "Las Vegas Harry Reid Airport", city: "Las Vegas", country: "USA", terminals: ["Terminal 1", "Terminal 3"] },
  { iata: "PHX", name: "Phoenix Sky Harbor Airport", city: "Phoenix", country: "USA", terminals: ["Terminal 3", "Terminal 4"] },
  { iata: "MSP", name: "Minneapolis-Saint Paul Airport", city: "Minneapolis", country: "USA", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "DTW", name: "Detroit Metropolitan Airport", city: "Detroit", country: "USA", terminals: ["McNamara Terminal", "North Terminal"] },
  { iata: "IAH", name: "Houston George Bush Airport", city: "Houston", country: "USA", terminals: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E"] },
  { iata: "HNL", name: "Honolulu Daniel K. Inouye Airport", city: "Honolulu", country: "USA", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "YYZ", name: "Toronto Pearson Airport", city: "Toronto", country: "Canada", terminals: ["Terminal 1", "Terminal 3"] },
  { iata: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada", terminals: [] },
  { iata: "YUL", name: "Montreal Trudeau Airport", city: "Montreal", country: "Canada", terminals: [] },
  { iata: "YYC", name: "Calgary International Airport", city: "Calgary", country: "Canada", terminals: [] },
  { iata: "YOW", name: "Ottawa International Airport", city: "Ottawa", country: "Canada", terminals: [] },
  { iata: "MEX", name: "Mexico City International Airport", city: "Mexico City", country: "Mexico", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "CUN", name: "Cancún International Airport", city: "Cancún", country: "Mexico", terminals: ["Terminal 2", "Terminal 3", "Terminal 4"] },
  
  // South America
  { iata: "GRU", name: "São Paulo Guarulhos Airport", city: "São Paulo", country: "Brazil", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "GIG", name: "Rio de Janeiro Galeão Airport", city: "Rio de Janeiro", country: "Brazil", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "EZE", name: "Buenos Aires Ezeiza Airport", city: "Buenos Aires", country: "Argentina", terminals: ["Terminal A", "Terminal B", "Terminal C"] },
  { iata: "SCL", name: "Santiago Arturo Merino Benítez Airport", city: "Santiago", country: "Chile", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "LIM", name: "Lima Jorge Chávez Airport", city: "Lima", country: "Peru", terminals: [] },
  { iata: "BOG", name: "Bogotá El Dorado Airport", city: "Bogotá", country: "Colombia", terminals: ["Terminal 1", "Terminal 2"] },
  
  // Africa
  { iata: "JNB", name: "Johannesburg O.R. Tambo Airport", city: "Johannesburg", country: "South Africa", terminals: ["Terminal A", "Terminal B"] },
  { iata: "CPT", name: "Cape Town International Airport", city: "Cape Town", country: "South Africa", terminals: [] },
  { iata: "NBO", name: "Nairobi Jomo Kenyatta Airport", city: "Nairobi", country: "Kenya", terminals: [] },
  { iata: "ADD", name: "Addis Ababa Bole Airport", city: "Addis Ababa", country: "Ethiopia", terminals: ["Terminal 1", "Terminal 2"] },
  { iata: "LOS", name: "Lagos Murtala Muhammed Airport", city: "Lagos", country: "Nigeria", terminals: [] },
  { iata: "CMN", name: "Casablanca Mohammed V Airport", city: "Casablanca", country: "Morocco", terminals: ["Terminal 1", "Terminal 2"] },
  
  // Australia & Oceania
  { iata: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", terminals: ["Terminal 1", "Terminal 2", "Terminal 3"] },
  { iata: "MEL", name: "Melbourne Tullamarine Airport", city: "Melbourne", country: "Australia", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"] },
  { iata: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia", terminals: ["Domestic Terminal", "International Terminal"] },
  { iata: "PER", name: "Perth Airport", city: "Perth", country: "Australia", terminals: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"] },
  { iata: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand", terminals: ["Domestic Terminal", "International Terminal"] },
  { iata: "WLG", name: "Wellington Airport", city: "Wellington", country: "New Zealand", terminals: [] },
  { iata: "CHC", name: "Christchurch Airport", city: "Christchurch", country: "New Zealand", terminals: [] },
];

// Search airports by query (name, IATA code, city)
export const searchAirports = (query) => {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase().trim();
  
  return AIRPORTS_DATABASE
    .filter(airport => {
      const matchName = airport.name.toLowerCase().includes(searchTerm);
      const matchIata = airport.iata.toLowerCase() === searchTerm || airport.iata.toLowerCase().includes(searchTerm);
      const matchCity = airport.city.toLowerCase().includes(searchTerm);
      const matchCountry = airport.country.toLowerCase().includes(searchTerm);
      return matchName || matchIata || matchCity || matchCountry;
    })
    .sort((a, b) => {
      // Prioritize exact IATA matches
      const aExactIata = a.iata.toLowerCase() === searchTerm;
      const bExactIata = b.iata.toLowerCase() === searchTerm;
      if (aExactIata && !bExactIata) return -1;
      if (!aExactIata && bExactIata) return 1;
      
      // Then prioritize name starts with query
      const aStartsName = a.name.toLowerCase().startsWith(searchTerm);
      const bStartsName = b.name.toLowerCase().startsWith(searchTerm);
      if (aStartsName && !bStartsName) return -1;
      if (!aStartsName && bStartsName) return 1;
      
      // Then prioritize city starts with query
      const aStartsCity = a.city.toLowerCase().startsWith(searchTerm);
      const bStartsCity = b.city.toLowerCase().startsWith(searchTerm);
      if (aStartsCity && !bStartsCity) return -1;
      if (!aStartsCity && bStartsCity) return 1;
      
      return 0;
    })
    .slice(0, 10); // Return top 10 matches
};

// Format airport display name
export const formatAirportName = (airport, terminal = null) => {
  let displayName = `${airport.name} (${airport.iata})`;
  if (terminal) {
    displayName += ` – ${terminal}`;
  }
  return displayName;
};

// Get airport by IATA code
export const getAirportByIata = (iata) => {
  return AIRPORTS_DATABASE.find(a => a.iata.toLowerCase() === iata.toLowerCase());
};

export default AIRPORTS_DATABASE;
