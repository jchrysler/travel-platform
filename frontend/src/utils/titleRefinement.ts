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
 * @deprecated Use generateSmartGuideTitle instead for better results
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

/**
 * Generate SEO-friendly guide title with subtitle based on queries AND content
 */
export async function generateSmartGuideTitle(
  cityName: string,
  queries: string[],
  responses: string[]
): Promise<{ title: string; subtitle: string }> {
  // Analyze content for key themes
  const contentAnalysis = analyzeContent(queries, responses);

  // Generate SEO-friendly title
  const title = generateSEOTitle(cityName, contentAnalysis);
  const subtitle = generateSubtitle(contentAnalysis, queries.length);

  return { title, subtitle };
}

interface ContentAnalysis {
  primaryTheme: string;
  secondaryThemes: string[];
  specificPlaces: string[];
  priceRange: 'budget' | 'mid' | 'luxury' | 'mixed';
  audienceType: 'solo' | 'couples' | 'families' | 'business' | 'general';
  timeframe: 'weekend' | 'week' | 'day' | 'general';
  uniqueAspects: string[];
}

function analyzeContent(queries: string[], responses: string[]): ContentAnalysis {
  const combinedText = [...queries, ...responses].join(' ').toLowerCase();

  // Count theme occurrences
  const themes: Record<string, number> = {
    food: (combinedText.match(/restaurant|food|eat|dining|cuisine|meal|breakfast|lunch|dinner|cafe|coffee|bar|drink|sushi|ramen|pizza|street food|local food/gi) || []).length,
    culture: (combinedText.match(/museum|temple|shrine|art|history|tradition|cultural|heritage|architecture|monument/gi) || []).length,
    shopping: (combinedText.match(/shop|market|mall|buy|souvenir|fashion|boutique|store/gi) || []).length,
    nature: (combinedText.match(/park|garden|mountain|beach|nature|outdoor|hiking|walk/gi) || []).length,
    entertainment: (combinedText.match(/nightlife|club|bar|show|entertainment|music|concert|theater|cinema/gi) || []).length,
    accommodation: (combinedText.match(/hotel|hostel|stay|accommodation|airbnb|resort|lodge/gi) || []).length,
    transport: (combinedText.match(/transport|train|bus|taxi|uber|airport|station|metro|subway/gi) || []).length,
    adventure: (combinedText.match(/adventure|extreme|sport|diving|climbing|surfing|skiing/gi) || []).length,
  };

  // Sort themes by frequency
  const sortedThemes = Object.entries(themes)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([theme]) => theme);

  // Extract specific places mentioned
  const placePatterns = [
    /shibuya|harajuku|shinjuku|ginza|asakusa|roppongi/gi,
    /times square|central park|brooklyn|manhattan|soho|broadway/gi,
    /eiffel tower|louvre|notre dame|champs[- ]elysees|montmartre/gi,
  ];

  const specificPlaces: string[] = [];
  placePatterns.forEach(pattern => {
    const matches = combinedText.match(pattern);
    if (matches) {
      specificPlaces.push(...matches.map(m =>
        m.split(/[- ]/).map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      ));
    }
  });

  // Determine price range
  const budgetWords = (combinedText.match(/budget|cheap|affordable|free|inexpensive|economical/gi) || []).length;
  const luxuryWords = (combinedText.match(/luxury|expensive|premium|exclusive|high-end|finest/gi) || []).length;

  let priceRange: 'budget' | 'mid' | 'luxury' | 'mixed' = 'mixed';
  if (budgetWords > luxuryWords * 2) priceRange = 'budget';
  else if (luxuryWords > budgetWords * 2) priceRange = 'luxury';
  else if (budgetWords === 0 && luxuryWords === 0) priceRange = 'mid';

  // Determine audience type
  const audienceIndicators = {
    families: (combinedText.match(/family|kid|child|family-friendly|playground|zoo/gi) || []).length,
    couples: (combinedText.match(/romantic|couple|date|intimate|sunset|view/gi) || []).length,
    solo: (combinedText.match(/solo|alone|backpack|hostel/gi) || []).length,
    business: (combinedText.match(/business|meeting|conference|wifi|coworking/gi) || []).length,
  };

  const primaryAudience = Object.entries(audienceIndicators)
    .sort(([, a], [, b]) => b - a)[0];

  let audienceType: 'solo' | 'couples' | 'families' | 'business' | 'general' =
    primaryAudience && primaryAudience[1] > 2 ? primaryAudience[0] as any : 'general';

  // Determine timeframe
  let timeframe: 'weekend' | 'week' | 'day' | 'general' = 'general';
  if (combinedText.includes('weekend')) timeframe = 'weekend';
  else if (combinedText.includes('week') || queries.length > 7) timeframe = 'week';
  else if (combinedText.includes('day trip') || queries.length <= 3) timeframe = 'day';

  // Find unique aspects
  const uniqueAspects: string[] = [];
  if (combinedText.includes('hidden gem')) uniqueAspects.push('Hidden Gems');
  if (combinedText.includes('local')) uniqueAspects.push('Local Favorites');
  if (combinedText.includes('instagram') || combinedText.includes('photo')) uniqueAspects.push('Photo Spots');
  if (combinedText.includes('off the beaten')) uniqueAspects.push('Off-the-Beaten-Path');

  return {
    primaryTheme: sortedThemes[0] || 'general',
    secondaryThemes: sortedThemes.slice(1, 3),
    specificPlaces: [...new Set(specificPlaces)].slice(0, 3),
    priceRange,
    audienceType,
    timeframe,
    uniqueAspects
  };
}

function generateSEOTitle(cityName: string, analysis: ContentAnalysis): string {
  const { primaryTheme, priceRange, audienceType, timeframe, specificPlaces } = analysis;

  // Build title components
  let title = '';

  // Add timeframe if specific
  if (timeframe === 'weekend') {
    title = `${cityName} Weekend Guide`;
  } else if (timeframe === 'day') {
    title = `${cityName} Day Trip Guide`;
  } else if (timeframe === 'week') {
    title = `7-Day ${cityName} Itinerary`;
  } else {
    title = `${cityName} Travel Guide`;
  }

  // Add year for SEO
  const year = new Date().getFullYear();
  title += ` ${year}`;

  // Add theme modifier
  if (primaryTheme === 'food') {
    title = `${cityName} Food Guide ${year}`;
  } else if (primaryTheme === 'culture') {
    title = `${cityName} Culture & Heritage Guide ${year}`;
  } else if (primaryTheme === 'shopping') {
    title = `${cityName} Shopping Guide ${year}`;
  } else if (primaryTheme === 'adventure') {
    title = `${cityName} Adventure Guide ${year}`;
  }

  // Add audience modifier for SEO
  if (audienceType === 'families') {
    title = `${cityName} Family Travel Guide ${year}`;
  } else if (audienceType === 'couples') {
    title = `${cityName} Couples Guide ${year}`;
  } else if (priceRange === 'budget') {
    title = `${cityName} Budget Travel Guide ${year}`;
  } else if (priceRange === 'luxury') {
    title = `Luxury ${cityName} Guide ${year}`;
  }

  // Add specific area if mentioned frequently
  if (specificPlaces.length > 0 && !title.includes(specificPlaces[0])) {
    title = `${specificPlaces[0]} & ${cityName} Guide ${year}`;
  }

  return title;
}

function generateSubtitle(analysis: ContentAnalysis, queryCount: number): string {
  const { primaryTheme, secondaryThemes, priceRange, uniqueAspects, specificPlaces } = analysis;

  let subtitle = '';

  // Start with query count
  subtitle = `${queryCount} Essential `;

  // Add primary theme
  if (primaryTheme === 'food') {
    subtitle += 'Dining Experiences';
  } else if (primaryTheme === 'culture') {
    subtitle += 'Cultural Attractions';
  } else if (primaryTheme === 'shopping') {
    subtitle += 'Shopping Destinations';
  } else if (primaryTheme === 'accommodation') {
    subtitle += 'Places to Stay';
  } else if (primaryTheme === 'entertainment') {
    subtitle += 'Entertainment Venues';
  } else if (primaryTheme === 'nature') {
    subtitle += 'Outdoor Adventures';
  } else {
    subtitle += 'Travel Recommendations';
  }

  // Add secondary themes
  if (secondaryThemes.length > 0) {
    const themeDescriptions = secondaryThemes.map(theme => {
      switch (theme) {
        case 'food': return 'Local Cuisine';
        case 'culture': return 'Cultural Sites';
        case 'shopping': return 'Shopping';
        case 'nature': return 'Nature';
        case 'entertainment': return 'Nightlife';
        case 'accommodation': return 'Hotels';
        default: return null;
      }
    }).filter(Boolean);

    if (themeDescriptions.length > 0) {
      subtitle += ` including ${themeDescriptions.join(' & ')}`;
    }
  }

  // Add unique aspects
  if (uniqueAspects.length > 0) {
    subtitle += ` • ${uniqueAspects[0]}`;
  }

  // Add price indicator
  if (priceRange === 'budget') {
    subtitle += ' • Budget-Friendly';
  } else if (priceRange === 'luxury') {
    subtitle += ' • Premium Experiences';
  }

  // Add specific places if any
  if (specificPlaces.length > 1) {
    subtitle += ` • Covering ${specificPlaces.slice(0, 2).join(' & ')}`;
  }

  return subtitle;
}