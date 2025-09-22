/**
 * AI-powered title refinement for search queries
 * Transforms casual search queries into polished section titles
 */

/**
 * Refine a search query into a polished section title
 * Uses pattern matching and transformation rules
 */
export function refineQueryToTitle(query: string, cityName?: string): string {
  // Normalize the query
  let refined = query.toLowerCase().trim();
  
  // Common transformations
  const transformations: [RegExp, string][] = [
    // Food related
    [/^(best|top|good)\s+(.*?)\s+(restaurant|food|eat|dining)/i, 'Best $2 Restaurants'],
    [/^cheap\s+(food|eats?|restaurant)/i, 'Budget-Friendly Dining Options'],
    [/^(.*?)\s+near\s+(.*)/i, '$1 Near $2'],
    [/^pizza/i, 'Pizza Recommendations'],
    [/^sushi/i, 'Sushi & Japanese Cuisine'],
    [/^street food/i, 'Street Food & Local Markets'],
    [/^vegetarian|vegan/i, 'Vegetarian & Vegan Options'],
    [/^breakfast|brunch/i, 'Breakfast & Brunch Spots'],
    [/^coffee|cafe/i, 'Coffee Shops & Cafes'],
    
    // Accommodation
    [/^(hotel|stay|accommodation)/i, 'Where to Stay'],
    [/^budget\s+(hotel|stay|accommodation)/i, 'Budget Accommodations'],
    [/^luxury\s+(hotel|stay)/i, 'Luxury Hotels & Resorts'],
    [/^hostel/i, 'Hostels & Budget Stays'],
    [/^airbnb/i, 'Vacation Rentals & Airbnb'],
    
    // Activities
    [/^things?\s+to\s+do/i, 'Top Things to Do'],
    [/^what\s+to\s+do/i, 'Activities & Attractions'],
    [/^nightlife|clubs?|bars?/i, 'Nightlife & Entertainment'],
    [/^museum/i, 'Museums & Galleries'],
    [/^temple|shrine/i, 'Temples & Religious Sites'],
    [/^shopping/i, 'Shopping Districts & Markets'],
    [/^day\s+trip/i, 'Day Trip Destinations'],
    [/^family|kids?/i, 'Family-Friendly Activities'],
    [/^rainy\s+day/i, 'Indoor Activities for Rainy Days'],
    
    // Transportation
    [/^how\s+to\s+get/i, 'Transportation Guide'],
    [/^airport/i, 'Airport Transportation'],
    [/^public\s+transport/i, 'Public Transportation Guide'],
    
    // General
    [/^tips?\s/i, 'Travel Tips & Advice'],
    [/^budget/i, 'Budget Travel Guide'],
    [/^hidden\s+gems?/i, 'Hidden Gems & Local Favorites'],
    [/^local/i, 'Local Recommendations'],
    [/^must\s+(see|visit)/i, 'Must-Visit Attractions'],
  ];
  
  // Apply transformations
  for (const [pattern, replacement] of transformations) {
    if (pattern.test(refined)) {
      refined = refined.replace(pattern, replacement);
      break;
    }
  }
  
  // If no transformation matched, clean up the query
  if (refined === query.toLowerCase().trim()) {
    // Capitalize first letter of each word
    refined = refined
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Add context if very short
    if (refined.split(' ').length <= 2 && cityName) {
      refined = `${refined} in ${cityName}`;
    }
  } else {
    // Capitalize the transformed title properly
    refined = refined
      .split(' ')
      .map(word => {
        // Don't capitalize small words unless they're first
        const smallWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return smallWords.includes(word.toLowerCase()) ? word : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
    
    // Always capitalize first word
    if (refined.length > 0) {
      refined = refined.charAt(0).toUpperCase() + refined.slice(1);
    }
  }
  
  return refined;
}

/**
 * Generate a guide title suggestion based on searches
 */
export function generateGuideTitle(cityName: string, queries: string[]): string {
  if (queries.length === 0) return `${cityName} Guide`;
  
  // Analyze queries for common themes
  const themes = {
    food: 0,
    accommodation: 0,
    activities: 0,
    nightlife: 0,
    shopping: 0,
    culture: 0,
    budget: 0,
    luxury: 0,
    family: 0,
  };
  
  const foodWords = /food|restaurant|eat|dining|pizza|sushi|cafe|coffee|breakfast|lunch|dinner|street food/i;
  const accommodationWords = /hotel|stay|accommodation|hostel|airbnb|resort/i;
  const activityWords = /things to do|activities|visit|see|explore|tour/i;
  const nightlifeWords = /nightlife|bar|club|party|drink|evening|night/i;
  const shoppingWords = /shop|buy|market|mall|store/i;
  const cultureWords = /museum|temple|shrine|art|culture|history|heritage/i;
  const budgetWords = /cheap|budget|affordable|free|save money/i;
  const luxuryWords = /luxury|premium|best|top|exclusive/i;
  const familyWords = /family|kid|child|family-friendly/i;
  
  queries.forEach(query => {
    const q = query.toLowerCase();
    if (foodWords.test(q)) themes.food++;
    if (accommodationWords.test(q)) themes.accommodation++;
    if (activityWords.test(q)) themes.activities++;
    if (nightlifeWords.test(q)) themes.nightlife++;
    if (shoppingWords.test(q)) themes.shopping++;
    if (cultureWords.test(q)) themes.culture++;
    if (budgetWords.test(q)) themes.budget++;
    if (luxuryWords.test(q)) themes.luxury++;
    if (familyWords.test(q)) themes.family++;
  });
  
  // Find dominant theme
  const dominantTheme = Object.entries(themes)
    .sort(([, a], [, b]) => b - a)[0];
  
  // Generate title based on dominant theme
  const [theme, count] = dominantTheme;
  
  if (count === 0) {
    return `Complete ${cityName} Guide`;
  }
  
  switch (theme) {
    case 'food':
      return `${cityName} Food & Dining Guide`;
    case 'accommodation':
      return `Where to Stay in ${cityName}`;
    case 'activities':
      return `Things to Do in ${cityName}`;
    case 'nightlife':
      return `${cityName} Nightlife Guide`;
    case 'shopping':
      return `${cityName} Shopping Guide`;
    case 'culture':
      return `${cityName} Culture & Heritage Guide`;
    case 'budget':
      return `${cityName} on a Budget`;
    case 'luxury':
      return `Luxury ${cityName} Guide`;
    case 'family':
      return `Family Guide to ${cityName}`;
    default:
      return `Complete ${cityName} Guide`;
  }
}