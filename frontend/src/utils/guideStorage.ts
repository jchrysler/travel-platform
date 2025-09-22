import { slugify, generateUniqueSlug } from './slugify';

export interface Guide {
  id: string;
  destination: string;
  destinationSlug: string;
  slug: string;
  title: string;
  description?: string;
  queries: string[];
  responses: string[];
  sectionTitles?: string[]; // AI-refined titles for each section
  createdAt: Date;
  updatedAt: Date;
  views: number;
}

export interface DestinationData {
  name: string;
  slug: string;
  lastVisited: Date;
  guides: string[]; // Guide IDs
}

const GUIDES_STORAGE_KEY = 'travel_guides';
const DESTINATIONS_STORAGE_KEY = 'travel_destinations';
const RECENT_DESTINATIONS_KEY = 'recent_destinations';

/**
 * Get all guides from localStorage
 */
export function getAllGuides(): Guide[] {
  try {
    const stored = localStorage.getItem(GUIDES_STORAGE_KEY);
    if (!stored) return [];

    const guides = JSON.parse(stored);
    // Convert date strings back to Date objects
    return guides.map((g: any) => ({
      ...g,
      createdAt: new Date(g.createdAt),
      updatedAt: new Date(g.updatedAt)
    }));
  } catch {
    return [];
  }
}

/**
 * Get a specific guide by destination and slug
 */
export function getGuide(destinationSlug: string, guideSlug: string): Guide | null {
  const guides = getAllGuides();
  return guides.find(g =>
    g.destinationSlug === destinationSlug && g.slug === guideSlug
  ) || null;
}

/**
 * Get guides for a specific destination
 */
export function getDestinationGuides(destinationSlug: string): Guide[] {
  const guides = getAllGuides();
  return guides.filter(g => g.destinationSlug === destinationSlug);
}

/**
 * Save a new guide
 */
export function saveGuide(
  destination: string,
  title: string,
  queries: string[],
  responses: string[],
  description?: string,
  sectionTitles?: string[]
): Guide {
  const guides = getAllGuides();
  const destinationSlug = slugify(destination);
  const baseSlug = slugify(title);

  // Get existing slugs for this destination
  const existingSlugs = guides
    .filter(g => g.destinationSlug === destinationSlug)
    .map(g => g.slug);

  const slug = generateUniqueSlug(baseSlug, existingSlugs);

  const newGuide: Guide = {
    id: `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    destination,
    destinationSlug,
    slug,
    title,
    description,
    queries,
    responses,
    sectionTitles,
    createdAt: new Date(),
    updatedAt: new Date(),
    views: 0
  };

  guides.push(newGuide);
  localStorage.setItem(GUIDES_STORAGE_KEY, JSON.stringify(guides));

  // Update destination data
  updateDestinationData(destination, destinationSlug, newGuide.id);

  return newGuide;
}

/**
 * Update guide view count
 */
export function incrementGuideViews(guideId: string): void {
  const guides = getAllGuides();
  const guideIndex = guides.findIndex(g => g.id === guideId);

  if (guideIndex !== -1) {
    guides[guideIndex].views++;
    guides[guideIndex].updatedAt = new Date();
    localStorage.setItem(GUIDES_STORAGE_KEY, JSON.stringify(guides));
  }
}

/**
 * Delete a guide
 */
export function deleteGuide(guideId: string): boolean {
  const guides = getAllGuides();
  const filteredGuides = guides.filter(g => g.id !== guideId);

  if (filteredGuides.length !== guides.length) {
    localStorage.setItem(GUIDES_STORAGE_KEY, JSON.stringify(filteredGuides));
    return true;
  }

  return false;
}

/**
 * Get all destinations
 */
export function getAllDestinations(): DestinationData[] {
  try {
    const stored = localStorage.getItem(DESTINATIONS_STORAGE_KEY);
    if (!stored) return [];

    const destinations = JSON.parse(stored);
    return destinations.map((d: any) => ({
      ...d,
      lastVisited: new Date(d.lastVisited)
    }));
  } catch {
    return [];
  }
}

/**
 * Update destination data
 */
function updateDestinationData(name: string, slug: string, guideId?: string): void {
  const destinations = getAllDestinations();
  let destination = destinations.find(d => d.slug === slug);

  if (!destination) {
    destination = {
      name,
      slug,
      lastVisited: new Date(),
      guides: guideId ? [guideId] : []
    };
    destinations.push(destination);
  } else {
    destination.lastVisited = new Date();
    if (guideId && !destination.guides.includes(guideId)) {
      destination.guides.push(guideId);
    }
  }

  localStorage.setItem(DESTINATIONS_STORAGE_KEY, JSON.stringify(destinations));
}

/**
 * Get recent destinations
 */
export function getRecentDestinations(limit = 5): DestinationData[] {
  const destinations = getAllDestinations();
  return destinations
    .sort((a, b) => b.lastVisited.getTime() - a.lastVisited.getTime())
    .slice(0, limit);
}

/**
 * Track destination visit
 */
export function trackDestinationVisit(name: string, slug: string): void {
  updateDestinationData(name, slug);

  // Update recent destinations list
  try {
    const stored = localStorage.getItem(RECENT_DESTINATIONS_KEY);
    const recent = stored ? JSON.parse(stored) : [];

    // Remove if already exists
    const filtered = recent.filter((d: any) => d.slug !== slug);

    // Add to beginning
    filtered.unshift({ name, slug, timestamp: Date.now() });

    // Keep only last 10
    const trimmed = filtered.slice(0, 10);

    localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore errors
  }
}

/**
 * Get popular guides across all destinations
 */
export function getPopularGuides(limit = 10): Guide[] {
  const guides = getAllGuides();
  return guides
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Search guides by query
 */
export function searchGuides(query: string): Guide[] {
  const guides = getAllGuides();
  const searchTerm = query.toLowerCase();

  return guides.filter(g =>
    g.title.toLowerCase().includes(searchTerm) ||
    g.destination.toLowerCase().includes(searchTerm) ||
    g.description?.toLowerCase().includes(searchTerm) ||
    g.queries.some(q => q.toLowerCase().includes(searchTerm))
  );
}