/**
 * Jamaican Naming & Term Variations Configuration
 * 
 * Provides synonyms and common variations for Jamaican product terms
 * to improve search discovery and tolerance for local naming conventions.
 */

/**
 * Synonym groups for Jamaican products
 * Key: canonical term (what to search for)
 * Value: array of variations, local names, and common misspellings
 */
export const JAMAICAN_SYNONYMS: Record<string, string[]> = {
  // Common products
  "rice": ["raice", "ryce", "riece"],
  "flour": ["flawa", "flowa"],
  "salt": ["solt", "sault"],
  "sugar": ["shuga", "shugar", "sugah"],
  "oil": ["oyle", "oile"],
  "milk": ["melk", "milke"],
  "butter": ["butta", "butter", "butah"],
  "cheese": ["cheeze", "cheez", "cheese"],
  "bread": ["bred", "bredd", "breade"],
  "chicken": ["chiken", "chickn", "chikin"],
  "beef": ["beef", "beffe"],
  "fish": ["feesh", "fish", "fishe"],
  "corned beef": ["corn beef", "cornd beef", "cornedbeef", "cornbeef"],
  "sardine": ["sardeen", "sardines", "sardeens"],
  "mackerel": ["makrel", "makarel", "mackrel"],
  "tuna": ["tuna", "tunah"],
  
  // Jamaican brands and products
  "grace": ["graece", "gracce", "gracee"],
  "lasco": ["lasko", "lascko", "lazco"],
  "luscious": ["luscious", "lusciuous", "lushious"],
  "jamaica": ["jamacia", "jamaca", "jamaika"],
  
  // Local product names
  "ackee": ["akkee", "akie", "akki"],
  "callaloo": ["calaloo", "kalaloo", "kalalou", "callalou"],
  "plantain": ["plantin", "plantaine", "plantein"],
  "yam": ["yam", "yams"],
  "banana": ["bananna", "bananas", "bananna"],
  "coconut": ["cokonut", "coconot", "kokonut"],
  "sorrel": ["sorrell", "sorell", "sorel"],
  "ginger beer": ["gingerbeer", "ginga beer", "ginger bier"],
  "jerk": ["jerc", "jerk chicken", "jerke"],
  "patties": ["pattys", "pattees", "patteys"],
  "bun": ["bun bread", "spiced bun", "easter bun"],
  "hard dough bread": ["harddough", "hard dough", "hardough"],
  
  // Beverages
  "tropical rhythms": ["tropical rythms", "tropical rhytms"],
  "ting": ["ting drink", "ting grapefruit"],
  "desnoes and geddes": ["d&g", "d and g", "desnoes geddes"],
  "red stripe": ["redstripe", "red stripe beer"],
  
  // Cooking ingredients
  "all purpose seasoning": ["allpurpose", "all purpose", "allpurpose seasoning"],
  "curry powder": ["curry", "currie", "curri"],
  "black pepper": ["peppa", "pepper", "black peppah"],
  "scotch bonnet": ["scotchbonnet", "scotch bonet", "scot bonnet"],
  "pimento": ["pimenta", "allspice", "all spice"],
};

/**
 * Common Jamaican misspellings and variations
 * Maps common misspellings to their correct forms
 */
export const JAMAICAN_CORRECTIONS: Record<string, string> = {
  // Common misspellings
  "raice": "rice",
  "ryce": "rice",
  "flawa": "flour",
  "solt": "salt",
  "shuga": "sugar",
  "oyle": "oil",
  "melk": "milk",
  "butta": "butter",
  "bred": "bread",
  "chiken": "chicken",
  "feesh": "fish",
  "corn beef": "corned beef",
  "cornedbeef": "corned beef",
  "cornbeef": "corned beef",
  "sardeen": "sardine",
  "makrel": "mackerel",
  "graece": "grace",
  "lasko": "lasco",
  "jamacia": "jamaica",
  "akkee": "ackee",
  "calaloo": "callaloo",
  "plantin": "plantain",
  "bananna": "banana",
  "cokonut": "coconut",
  "sorrell": "sorrel",
  "gingerbeer": "ginger beer",
  "pattys": "patties",
  "peppa": "pepper",
  "scotchbonnet": "scotch bonnet",
};

/**
 * Expand a search query with Jamaican synonyms
 * 
 * @param query - Original search query
 * @returns Array of query variations including synonyms
 */
export function expandQueryWithSynonyms(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const variations = new Set<string>([query]); // Always include original query
  
  // Check each synonym group
  for (const [canonical, synonyms] of Object.entries(JAMAICAN_SYNONYMS)) {
    const canonicalLower = canonical.toLowerCase();
    
    // If query contains canonical term, add all synonyms
    if (normalizedQuery.includes(canonicalLower)) {
      synonyms.forEach(synonym => {
        variations.add(query.replace(new RegExp(canonicalLower, 'gi'), synonym));
      });
    }
    
    // If query contains any synonym, add canonical and other synonyms
    synonyms.forEach(synonym => {
      const synonymLower = synonym.toLowerCase();
      if (normalizedQuery.includes(synonymLower)) {
        variations.add(query.replace(new RegExp(synonymLower, 'gi'), canonical));
        synonyms.forEach(otherSynonym => {
          if (otherSynonym !== synonym) {
            variations.add(query.replace(new RegExp(synonymLower, 'gi'), otherSynonym));
          }
        });
      }
    });
  }
  
  // Apply corrections for common misspellings
  for (const [misspelling, correction] of Object.entries(JAMAICAN_CORRECTIONS)) {
    const misspellingLower = misspelling.toLowerCase();
    if (normalizedQuery.includes(misspellingLower)) {
      variations.add(query.replace(new RegExp(misspellingLower, 'gi'), correction));
    }
  }
  
  return Array.from(variations);
}

/**
 * Normalize Jamaican terms in a query
 * Replaces known variations with canonical forms for better matching
 * 
 * @param query - Search query
 * @returns Normalized query with corrections applied
 */
export function normalizeJamaicanTerms(query: string): string {
  let normalized = query;
  
  // Apply corrections (longest matches first to avoid partial replacements)
  const corrections = Object.entries(JAMAICAN_CORRECTIONS)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [misspelling, correction] of corrections) {
    // Case-insensitive replacement
    const regex = new RegExp(`\\b${misspelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, correction);
  }
  
  return normalized;
}
