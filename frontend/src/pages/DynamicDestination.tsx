import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, MapPin, BookOpen, Save, PanelRightOpen, X, Share2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchUnit } from "@/components/SearchUnit";
import { SavedItemsList } from "@/components/SavedItemsList";
import type { SavedItem } from "@/components/SaveableContent";
import { deslugify, slugify } from "@/utils/slugify";
import { cn } from "@/lib/utils";
import {
  trackDestinationVisit,
  getDestinationGuides,
  saveGuide,
  type Guide
} from "@/utils/guideStorage";
import { refineQueryToTitle, generateSmartGuideTitle } from "@/utils/titleRefinement";
import { getDestinationHeroContent } from "@/lib/destinationContent";

interface SearchUnitData {
  id: string;
  query: string;
  response: string;
  searchResults?: PlaceResult[];
  timestamp: Date;
  isStreaming?: boolean;
  parentId?: string;
  children?: SearchUnitData[];
}

interface PlaceResult {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  isOpen?: boolean;
  hours?: string;
  distance?: string;
  description?: string;
}

interface HeroImageRecord {
  destination: string;
  destinationSlug: string;
  prompt: string;
  promptVersion: string;
  width: number;
  height: number;
  imageWebp: string;
  imageJpeg?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  updatedAt: string;
}

function normalizeHeroImageResponse(payload: any): HeroImageRecord {
  const value = payload ?? {};
  const coerceOptional = (input: unknown): string | null => {
    if (typeof input === "string") {
      const trimmed = input.trim();
      return trimmed.length ? trimmed : null;
    }
    return null;
  };

  return {
    destination: String(value.destination ?? value.destination_name ?? "").trim(),
    destinationSlug: String(value.destinationSlug ?? value.destination_slug ?? "").trim(),
    prompt: String(value.prompt ?? "").trim(),
    promptVersion: String(value.promptVersion ?? value.prompt_version ?? "").trim(),
    width: Number(value.width ?? 0),
    height: Number(value.height ?? 0),
    imageWebp: typeof value.imageWebp === "string"
      ? value.imageWebp
      : typeof value.image_webp === "string"
        ? value.image_webp
        : "",
    imageJpeg: typeof value.imageJpeg === "string"
      ? value.imageJpeg
      : typeof value.image_jpeg === "string"
        ? value.image_jpeg
        : null,
    headline: coerceOptional(value.headline),
    subheadline: coerceOptional(value.subheadline),
    ctaLabel: coerceOptional(value.ctaLabel ?? value.cta_label),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : String(value.updated_at ?? ""),
  };
}

export default function DynamicDestination() {
  const { destination, mode, id } = useParams<{ destination: string; mode?: string; id?: string }>();
  const navigate = useNavigate();
  const destinationName = destination ? deslugify(destination) : "";
  const destinationSlug = destination || slugify(destinationName || "destination");

  const [customQuery, setCustomQuery] = useState("");
  const [searchUnits, setSearchUnits] = useState<SearchUnitData[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);
  const [existingGuides, setExistingGuides] = useState<Guide[]>([]);
  const [showSaveGuide, setShowSaveGuide] = useState(false);
  const [guideTitle, setGuideTitle] = useState("");
  const [guideDescription, setGuideDescription] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [refinedTitles, setRefinedTitles] = useState<Map<string, string>>(new Map());
  const [smartTitle, setSmartTitle] = useState<{ title: string; subtitle: string } | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [serverSuggestions, setServerSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [heroImage, setHeroImage] = useState<HeroImageRecord | null>(null);
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [hasUserSearched, setHasUserSearched] = useState(false);
  const [ghostPromptIndex, setGhostPromptIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const heroContent = getDestinationHeroContent(destination ?? "");
  const readableDestination = destinationName || "this destination";
  const fallbackPrimaryQueries = [
    `Best restaurants in ${readableDestination}`,
    `Top hotels to stay in ${readableDestination}`,
    `How to spend 3 days in ${readableDestination}`,
    `Family-friendly activities in ${readableDestination}`,
    `Hidden gems around ${readableDestination}`,
    `Romantic evening ideas in ${readableDestination}`,
  ];

  // Fetch or generate hero image
  useEffect(() => {
    const controller = new AbortController();

    async function fetchOrGenerateHero() {
      if (!destinationSlug) return;

      try {
        // Try to fetch existing hero image
        const response = await fetch(`/api/hero-images/${destinationSlug}`, {
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setHeroImage(normalizeHeroImageResponse(data));
        } else if (response.status === 404) {
          // No hero exists, generate one in the background
          setIsGeneratingHero(true);
          const generateResponse = await fetch('/api/hero-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination: destinationName }),
            signal: controller.signal,
          });

          if (generateResponse.ok) {
            const generatedData = await generateResponse.json();
            setHeroImage(normalizeHeroImageResponse(generatedData));
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn('Hero image fetch/generation failed', error);
        }
      } finally {
        setIsGeneratingHero(false);
      }
    }

    fetchOrGenerateHero();
    return () => controller.abort();
  }, [destinationSlug, destinationName]);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchSuggestions() {
      setSuggestionsLoading(true);
      try {
        const response = await fetch(`/api/travel/suggestions/${destinationSlug}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load suggestions (${response.status})`);
        }
        const data = await response.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const cleaned = data.suggestions
            .map((s: string) => s.replace(/^```json/i, "").replace(/```$/i, "").trim())
            .map((s: string) => s.replace(/^"/, '').replace(/"$/, '').replace(/,$/, '').trim())
            .map((s: string) => s.replace(/^\[/, '').replace(/\]$/, '').trim())
            .map((s: string) => s.replace(/^[-•\s]+/, '').trim())
            .filter((s: string) => s.length > 0);
          setServerSuggestions(cleaned.length ? cleaned : null);
        } else {
          setServerSuggestions(null);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.warn("Suggestion load failed", err);
        }
        setServerSuggestions(null);
      } finally {
        setSuggestionsLoading(false);
      }
    }
    fetchSuggestions();
    return () => controller.abort();
  }, [destinationSlug]);

  const primaryQueries = (serverSuggestions && serverSuggestions.length > 0)
    ? serverSuggestions
    : heroContent.primaryQueries?.length
      ? heroContent.primaryQueries
      : fallbackPrimaryQueries;
  const bucketQueries = heroContent.searchBuckets?.flatMap((bucket) => bucket.queries) ?? [];
  const combinedPopularQueries = Array.from(new Set([...primaryQueries, ...bucketQueries]));

  const heroSuggestionChips = primaryQueries.slice(0, 3);

  const rotatingPrompts = useMemo(() => {
    const uniquePrompts = Array.from(new Set([
      ...heroSuggestionChips,
      ...primaryQueries.slice(0, 6),
      ...fallbackPrimaryQueries
    ])).filter(Boolean);
    return uniquePrompts.length ? uniquePrompts : [
      `Top highlights in ${readableDestination}`,
      `Plan a perfect 3-day stay in ${readableDestination}`
    ];
  }, [heroSuggestionChips, primaryQueries, fallbackPrimaryQueries, readableDestination]);

  const primaryDemoQuery = rotatingPrompts[0] || `Perfect day in ${readableDestination}`;

  const heroHeadline = heroImage?.headline?.trim()
    || (destinationName ? `Experience ${destinationName} like a local` : heroContent.title);

  const heroSubheadline = heroImage?.subheadline?.trim()
    || (destinationName
      ? `Plan smarter with real-time intel, trusted locals, and curated experiences across ${destinationName}.`
      : heroContent.subtitle);

  // Google Ads limit: 2 blocks with 3 ads each
  const adBlock1 = [
    {
      tag: "Ad",
      vendor: "Booking.com",
      title: `Hotels in ${destinationName} - Up to 50% Off`,
      body: "Book now and save on hotels. Free cancellation on most rooms. Price guarantee. 24/7 customer service.",
      cta: "View hotels",
      url: "#",
    },
    {
      tag: "Ad",
      vendor: "GetYourGuide",
      title: `${destinationName} Tours & Activities - Book Online`,
      body: "Skip-the-line tickets • Expert guides • Small groups • Free cancellation. Best price guaranteed for all attractions.",
      cta: "Book now",
      url: "#",
    },
    {
      tag: "Ad",
      vendor: "Viator",
      title: `Top-Rated ${destinationName} Experiences`,
      body: "Join thousands of travelers. Best prices guaranteed. Free cancellation up to 24 hours before. Mobile tickets accepted.",
      cta: "Explore tours",
      url: "#",
    },
  ];

  const adBlock2 = [
    {
      tag: "Ad",
      vendor: "Airbnb",
      title: `Unique Stays in ${destinationName}`,
      body: "Find entire homes, apartments, and unique properties. Flexible cancellation. Local host support. Book with confidence.",
      cta: "Browse stays",
      url: "#",
    },
    {
      tag: "Ad",
      vendor: "Expedia",
      title: `${destinationName} Vacation Packages - Save More`,
      body: "Bundle flights + hotels and save up to $583. Rewards program • Price match guarantee • 24/7 customer support.",
      cta: "View packages",
      url: "#",
    },
    {
      tag: "Ad",
      vendor: "TripAdvisor",
      title: `${destinationName} - Read Reviews & Compare Prices`,
      body: "Millions of traveler reviews. Compare prices from 200+ sites. Best deal guarantee. Plan your perfect trip today.",
      cta: "Compare now",
      url: "#",
    },
  ];

  const followUpSuggestions = searchUnits.slice(0, 3).map((unit) => ({
    id: unit.id,
    query: unit.query,
    label: refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName),
  }));

  const shouldShowFloatingSearch = hasUserSearched || searchUnits.length > 0 || isSearching;

  useEffect(() => {
    if (destination) {
      // Track visit
      trackDestinationVisit(destinationName, destinationSlug);

      // Load existing guides
      const guides = getDestinationGuides(destinationSlug);
      setExistingGuides(guides);

      // If we have a draft ID in the URL, load it from localStorage or backend
      if (mode === 'draft' && id) {
        setDraftId(id);

        const loadDraft = async () => {
          try {
            // Try localStorage first (fast)
            const storedDraft = localStorage.getItem(`draft_${id}`);
            if (storedDraft) {
              const parsed = JSON.parse(storedDraft);
              if (Array.isArray(parsed)) {
                // Restore timestamps as Date objects
                const restoredUnits = parsed.map(unit => ({
                  ...unit,
                  timestamp: new Date(unit.timestamp)
                }));
                setSearchUnits(restoredUnits);
                if (restoredUnits.length > 0) {
                  const restoredTitles = new Map<string, string>();
                  restoredUnits.forEach((unit) => {
                    restoredTitles.set(unit.id, refineQueryToTitle(unit.query, destinationName));
                  });
                  setRefinedTitles(restoredTitles);
                  setHasUserSearched(true);
                }
                return; // Successfully loaded from localStorage
              }
            }

            // If not in localStorage, try backend API (shareable permalink)
            const response = await fetch(`/api/travel/drafts/${id}`);
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data.searchUnits)) {
                // Restore timestamps as Date objects
                const restoredUnits = data.searchUnits.map((unit: any) => ({
                  ...unit,
                  timestamp: new Date(unit.timestamp)
                }));
                setSearchUnits(restoredUnits);

                // Restore refined titles from backend
                if (data.refinedTitles && typeof data.refinedTitles === 'object') {
                  const restoredTitles = new Map<string, string>(Object.entries(data.refinedTitles));
                  setRefinedTitles(restoredTitles);
                } else if (restoredUnits.length > 0) {
                  const restoredTitles = new Map<string, string>();
                  restoredUnits.forEach((unit: any) => {
                    restoredTitles.set(unit.id, refineQueryToTitle(unit.query, destinationName));
                  });
                  setRefinedTitles(restoredTitles);
                }

                setHasUserSearched(true);

                // Save to localStorage for faster future access
                localStorage.setItem(`draft_${id}`, JSON.stringify(restoredUnits));
              }
            }
          } catch (error) {
            console.warn('Failed to load draft', error);
          }
        };

        void loadDraft();
      }
    }
  }, [destination, destinationName, destinationSlug, mode, id]);

  // Persist searchUnits to both localStorage and backend whenever they change (if we have a draftId)
  useEffect(() => {
    if (draftId && searchUnits.length > 0) {
      try {
        // Save to localStorage for fast local access
        localStorage.setItem(`draft_${draftId}`, JSON.stringify(searchUnits));

        // Also save to backend for cross-device/browser persistence
        const saveDraftToBackend = async () => {
          try {
            const titlesObject = Object.fromEntries(refinedTitles.entries());
            await fetch('/api/travel/drafts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                draftId: draftId,
                destinationName: destinationName,
                destinationSlug: destinationSlug,
                searchUnits: searchUnits,
                refinedTitles: titlesObject,
              }),
            });
          } catch (error) {
            console.warn('Failed to save draft to backend', error);
          }
        };
        void saveDraftToBackend();
      } catch (error) {
        console.warn('Failed to save draft to localStorage', error);
      }
    }
  }, [searchUnits, draftId, refinedTitles, destinationName, destinationSlug]);

  const scrollToResults = useCallback(() => {
    if (!resultsRef.current) return;
    const targetRect = resultsRef.current.getBoundingClientRect();
    const targetY = targetRect.top + window.scrollY - 16;
    window.scrollTo({
      top: Math.max(targetY, 0),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (searchUnits.length > 0) {
      setHasUserSearched(true);
    }
  }, [searchUnits.length]);

  useEffect(() => {
    // Only scroll when the first search result appears
    if (searchUnits.length === 1 && hasUserSearched) {
      // Wait for DOM to update before scrolling
      setTimeout(() => {
        scrollToResults();
      }, 300);
    }
  }, [searchUnits.length, hasUserSearched, scrollToResults]);

  // Detect when user scrolls past hero section
  useEffect(() => {
    const handleScroll = () => {
      if (resultsRef.current) {
        const rect = resultsRef.current.getBoundingClientRect();
        setIsScrolledPastHero(rect.top < 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasUserSearched]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (rotatingPrompts.length < 2) return;
    const interval = setInterval(() => {
      setGhostPromptIndex((prev) => (prev + 1) % rotatingPrompts.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [rotatingPrompts]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const activeTag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTypingInInput = activeTag === "input" || activeTag === "textarea";

      if (!isTypingInInput && event.key === '/' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!shareLink) return;
    const timeout = setTimeout(() => setShareLink(null), 6000);
    return () => clearTimeout(timeout);
  }, [shareLink]);

  const completedSearchUnits = useMemo(
    () => searchUnits.filter(unit => !unit.isStreaming && (unit.response?.trim().length ?? 0) > 0),
    [searchUnits]
  );

  const handleCustomSearch = async () => {
    if (!customQuery.trim() || !destination) return;
    await performSearch(customQuery);
    setCustomQuery("");
  };

  const handleSuggestedSearch = async (query: string) => {
    if (!query.trim()) return;
    setCustomQuery("");
    await performSearch(query);
  };

  const performSearch = async (query: string, parentId?: string) => {
    if (!destination) return;

    // If this is the first search and we don't have a draft ID, create one and navigate
    if (searchUnits.length === 0 && !draftId) {
      const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDraftId(newDraftId);
      navigate(`/explore/${destinationSlug}/draft/${newDraftId}`, { replace: true });
    }

    setIsSearching(true);
    const unitId = Date.now().toString();
    setCurrentStreamingId(unitId);
    setHasUserSearched(true);

    // Generate refined title for this query
    const refinedTitle = refineQueryToTitle(query, destinationName);
    setRefinedTitles(prev => new Map(prev).set(unitId, refinedTitle));

    // Add new streaming unit immediately
    const newUnit: SearchUnitData = {
      id: unitId,
      query,
      response: "",
      timestamp: new Date(),
      isStreaming: true,
      parentId: parentId,
      children: []
    };

    // Helper function to recursively add child to parent
    const addChildToParent = (units: SearchUnitData[], targetParentId: string, child: SearchUnitData): SearchUnitData[] => {
      return units.map(unit => {
        if (unit.id === targetParentId) {
          return {
            ...unit,
            children: [child, ...(unit.children || [])]
          };
        }
        if (unit.children && unit.children.length > 0) {
          return {
            ...unit,
            children: addChildToParent(unit.children, targetParentId, child)
          };
        }
        return unit;
      });
    };

    // Add unit to appropriate location
    if (parentId) {
      // Add as nested child under parent
      setSearchUnits(prev => addChildToParent(prev, parentId, newUnit));
    } else {
      // Add to top level
      setSearchUnits(prev => [newUnit, ...prev]);
    }

    // Scroll to results area to show ads prominently
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToResults();
      });
    });

    try {
      const response = await fetch("/api/travel/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: destinationName,
          query: query,
        }),
      });

      if (!response.ok) throw new Error("Search failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Helper to update unit recursively
              const updateUnitRecursively = (units: SearchUnitData[]): SearchUnitData[] => {
                return units.map(unit => {
                  if (unit.id === unitId) {
                    return { ...unit, response: fullResponse, isStreaming: false };
                  }
                  if (unit.children && unit.children.length > 0) {
                    return { ...unit, children: updateUnitRecursively(unit.children) };
                  }
                  return unit;
                });
              };

              setSearchUnits(prev => updateUnitRecursively(prev));
              setCurrentStreamingId(null);
              setIsSearching(false);
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;

                  // Helper to update unit recursively
                  const updateUnitRecursively = (units: SearchUnitData[]): SearchUnitData[] => {
                    return units.map(unit => {
                      if (unit.id === unitId) {
                        return { ...unit, response: fullResponse };
                      }
                      if (unit.children && unit.children.length > 0) {
                        return { ...unit, children: updateUnitRecursively(unit.children) };
                      }
                      return unit;
                    });
                  };

                  setSearchUnits(prev => updateUnitRecursively(prev));
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setIsSearching(false);
    }
  };

  // Handlers for saved items
  const handleSaveItem = (item: SavedItem) => {
    setSavedItems(prev => [item, ...prev]);
    setSavedItemIds(prev => new Set([...prev, item.id]));
  };

  const handleRemoveItem = (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
    setSavedItemIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleClearAll = () => {
    setSavedItems([]);
    setSavedItemIds(new Set());
  };

  const handleDeleteSearch = (id: string) => {
    setSearchUnits(prev => prev.filter(unit => unit.id !== id));
  };

  const handleElaborate = async (snippet: string): Promise<string> => {
    const trimmed = snippet.trim().replace(/\s+/g, ' ');
    const elaborateQuery = `Share more depth on this for travelers: ${trimmed}. Focus on specifics, stand-out details, and what to expect when visiting.`;

    const response = await fetch("/api/travel/explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: destinationName,
        query: elaborateQuery,
      }),
    });

    if (!response.ok) {
      console.error("Inline elaborate failed", await response.text());
      throw new Error("Unable to load additional details");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    if (!reader) {
      return "";
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") {
          break;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            fullResponse += parsed.content;
          }
        } catch (err) {
          console.error("Inline elaborate parse error", err);
        }
      }
    }

    return fullResponse.trim();
  };

  const handleMoreLike = async (content: string, _originalQuery: string, parentUnitId?: string) => {
    // Extract key terms from the content for similarity search
    const snippet = content.slice(0, 80).trim();
    const moreLikeQuery = `Find similar recommendations to: ${snippet}${snippet.length < content.length ? '...' : ''}`;
    await performSearch(moreLikeQuery, parentUnitId);
  };

  const submitGuideToBackend = async (
    title: string,
    description: string,
    sections: Array<{ title: string; body: string; query: string; rawResponse: string }>,
  ) => {
    try {
      const response = await fetch("/api/travel/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destinationName,
          destinationSlug,
          title,
          description,
          sections,
          totalSearches: searchUnits.length,
          metadata: {
            refinedTitles: Array.from(refinedTitles.entries()),
          },
        }),
      });

      if (!response.ok) {
        console.warn("Guide ingestion failed", await response.text());
        return;
      }

      const result = await response.json();
      console.info("Guide ingestion", result.status, result.state);
    } catch (err) {
      console.warn("Unable to store guide", err);
    }
  };

  const handleSaveGuide = async () => {
    const finalTitle = guideTitle.trim() || smartTitle?.title || `${destinationName} Guide`;
    const finalDescription = guideDescription.trim() || smartTitle?.subtitle || '';
    if (searchUnits.length < 3) {
      window.alert("Add at least three research sections before saving a guide.");
      return;
    }

    const queries = searchUnits.map(unit => unit.query);
    const responses = searchUnits.map(unit => unit.response);
    const sectionTitles = searchUnits.map(unit =>
      refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName)
    );

    const backendSections = searchUnits.map((unit, index) => ({
      title: sectionTitles[index],
      body: (unit.response || '').trim(),
      query: unit.query,
      rawResponse: unit.response || '',
    })).filter(section => section.body.length > 0);

    const guide = saveGuide(
      destinationName,
      finalTitle,
      queries,
      responses,
      finalDescription,
      sectionTitles
    );

    // Fire-and-forget backend persistence (best effort)
    void submitGuideToBackend(finalTitle, finalDescription, backendSections);

    // Clear draft from both localStorage and backend
    if (draftId) {
      try {
        localStorage.removeItem(`draft_${draftId}`);
      } catch (error) {
        console.warn('Failed to clear draft from localStorage', error);
      }

      // Delete draft from backend
      try {
        void fetch(`/api/travel/drafts/${draftId}`, { method: 'DELETE' });
      } catch (error) {
        console.warn('Failed to delete draft from backend', error);
      }
    }

    // Navigate to the new guide
      navigate(`/explore/${destinationSlug}/${guide.slug}`);
  };

  const handleShareSession = async () => {
    if (completedSearchUnits.length === 0) {
      window.alert("Run a search and wait for results to finish before sharing.");
      return;
    }

    const firstUnit = completedSearchUnits[0];
    const primaryTitle = refinedTitles.get(firstUnit.id) || refineQueryToTitle(firstUnit.query, destinationName);
    const timestamp = new Date();
    const formattedTimestamp = timestamp.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    const shareTitle = primaryTitle
      ? `${primaryTitle} · ${destinationName}`
      : `${destinationName} highlights · ${formattedTimestamp}`;
    const description = `Captured ${formattedTimestamp}`;

    const queries = completedSearchUnits.map(unit => unit.query);
    const responses = completedSearchUnits.map(unit => unit.response || "");
    const sectionTitles = completedSearchUnits.map(unit =>
      refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName)
    );

    const guide = saveGuide(
      destinationName,
      shareTitle,
      queries,
      responses,
      description,
      sectionTitles
    );

    const backendSections = completedSearchUnits.map((unit, index) => ({
      title: sectionTitles[index],
      body: (unit.response || '').trim(),
      query: unit.query,
      rawResponse: unit.response || '',
    })).filter(section => section.body.length > 0);

    void submitGuideToBackend(shareTitle, description, backendSections);

    const sharePayload = {
      destinationName,
      destinationSlug,
      title: shareTitle,
      description,
      queries,
      responses,
      sectionTitles,
    };

    const encoded = encodeURIComponent(JSON.stringify(sharePayload));

    const url = `${window.location.origin}/explore/${destinationSlug}/${guide.slug}?shared=1&data=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.warn("Unable to copy share link", err);
    }
    setShareLink(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage?.imageWebp || heroContent.imageUrl}
            alt={heroImage ? `Hero image for ${heroImage.destination}` : heroContent.imageAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          {isGeneratingHero && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                Generating hero image...
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10">
          <div
            className={cn(
              "container mx-auto flex max-w-6xl flex-col justify-end gap-8 px-3 sm:px-4 transition-all duration-500",
              hasUserSearched
                ? "min-h-[320px] py-16 md:min-h-[420px] md:py-20"
                : "min-h-[520px] py-24"
            )}
          >
            <div className="mx-auto w-full max-w-3xl flex flex-col gap-6 text-white">
              <Link
                to="/explore"
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Explore more destinations
              </Link>

              <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
                <MapPin className="h-4 w-4" />
                {destinationName}
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {heroHeadline}
              </h1>
              <p className="text-base font-medium text-white/90 sm:text-lg md:text-xl">
                {heroSubheadline}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCustomSearch();
                }}
                className="mt-6 flex flex-col gap-3 md:flex-row"
              >
                <div className="relative flex-1">
                  <Input
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    ref={searchInputRef}
                    placeholder={hasUserSearched ? `Search more in ${readableDestination}` : `e.g. ${rotatingPrompts[ghostPromptIndex]}`}
                    disabled={isSearching}
                    className="h-[64px] w-full rounded-2xl border-2 border-white/35 bg-white/15 px-6 text-lg sm:text-xl md:text-2xl text-white placeholder:text-white/70 shadow-xl backdrop-blur-md focus-visible:border-white focus-visible:ring-white/80"
                  />
                  {!hasUserSearched && (
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.5em] text-white/60">
                      /
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSearching || !customQuery.trim()}
                  className="h-[64px] rounded-2xl px-8 text-lg font-semibold shadow-2xl bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary/70"
                >
                  <Search className="mr-2 h-6 w-6" />
                  Search
                </Button>
              </form>

              {!hasUserSearched && (
                <div className="space-y-4">
                  <p className="text-sm text-white/85">
                    Ask anything from “romantic rooftop bars” to “kid-friendly rainy day plans” and get structured answers in seconds.
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      size="lg"
                      variant="secondary"
                      onClick={() => handleSuggestedSearch(primaryDemoQuery)}
                      className="w-full rounded-2xl border border-white/25 bg-white/15 text-base font-semibold text-white shadow-lg transition hover:bg-white/25 sm:w-auto"
                      disabled={isSearching}
                    >
                      Preview: {primaryDemoQuery}
                    </Button>
                    <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Powered by AI · Verify key details
                    </span>
                  </div>

                  <div className="min-h-[32px]">
                    {suggestionsLoading ? (
                      <span className="text-sm text-white/70">Loading smart suggestions…</span>
                    ) : heroSuggestionChips.length > 0 ? (
                      <div className="flex flex-col gap-2 text-sm text-white/75 sm:flex-row sm:flex-wrap sm:items-center">
                        <span className="text-xs uppercase tracking-wide text-white/50">
                          Trending searches
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {heroSuggestionChips.map((query) => (
                          <Button
                            key={query}
                            type="button"
                            variant="ghost"
                            onClick={() => handleSuggestedSearch(query)}
                            disabled={isSearching}
                            className="rounded-full border border-white/30 bg-white/10 px-4 text-white hover:bg-white/20"
                          >
                            {query}
                          </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {(searchUnits.length > 0 || isSearching) && (
      <section className="relative z-10 pb-24">
        <div className="container mx-auto max-w-4xl px-0 sm:px-4 pt-6">
          {/* Sidebar Toggle */}
          {!isSidebarOpen && searchUnits.length > 0 && (
            <div className="mb-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="gap-2"
              >
                <PanelRightOpen className="h-4 w-4" />
                Show filters & suggestions
              </Button>
            </div>
          )}

          {/* Results anchor for scrolling */}
          <div ref={resultsRef} />

          {/* Main Content Area */}
          <div className="space-y-3">
            {/* Ad Block 1 - 3 ads (only show when there are search results) */}
            {searchUnits.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                {adBlock1.map((ad, idx) => (
                  <a
                    key={`ad1-${idx}`}
                    href={ad.url}
                    className="block rounded-md border border-border bg-muted/30 p-4 transition hover:bg-muted/50"
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{ad.tag}</span>
                      <span>·</span>
                      <span>{ad.vendor}</span>
                    </div>
                    <h3 className="text-lg font-medium text-primary hover:underline">
                      {ad.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                      {ad.body}
                    </p>
                  </a>
                ))}
              </div>
            )}

            {/* Search Results 0-2 */}
            {searchUnits.slice(0, 3).map((unit, index) => (
              <SearchUnit
                key={unit.id}
                unit={unit}
                cityName={destinationName}
                isFirst={index === searchUnits.length - 1}
                isLatest={index === 0 && unit.id === currentStreamingId}
                onSaveItem={handleSaveItem}
                savedItemIds={savedItemIds}
                onDelete={handleDeleteSearch}
                showDelete={searchUnits.length > 0}
                onElaborate={handleElaborate}
                onMoreLike={handleMoreLike}
              />
            ))}

            {/* Ad Block 2 - 3 ads (only show if there are 3+ results) */}
            {searchUnits.length >= 3 && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                {adBlock2.map((ad, idx) => (
                  <a
                    key={`ad2-${idx}`}
                    href={ad.url}
                    className="block rounded-md border border-border bg-muted/30 p-4 transition hover:bg-muted/50"
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{ad.tag}</span>
                      <span>·</span>
                      <span>{ad.vendor}</span>
                    </div>
                    <h3 className="text-lg font-medium text-primary hover:underline">
                      {ad.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                      {ad.body}
                    </p>
                  </a>
                ))}
              </div>
            )}

            {/* Remaining Search Results (3+) */}
            {searchUnits.slice(3).map((unit, index) => (
              <SearchUnit
                key={unit.id}
                unit={unit}
                cityName={destinationName}
                isFirst={index + 3 === searchUnits.length - 1}
                isLatest={index + 3 === 0 && unit.id === currentStreamingId}
                onSaveItem={handleSaveItem}
                savedItemIds={savedItemIds}
                onDelete={handleDeleteSearch}
                showDelete={searchUnits.length > 0}
                onElaborate={handleElaborate}
                onMoreLike={handleMoreLike}
              />
            ))}

          </div>
        </div>
      </section>
      )}

      {/* Collapsible Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsSidebarOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
              <h2 className="text-lg font-semibold">Filters & Suggestions</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6 p-6">
              {existingGuides.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Hand-crafted guides
                  </h3>
                  <div className="space-y-2">
                    {existingGuides.map((guide) => (
                      <Link
                        key={guide.id}
                        to={`/explore/${destinationSlug}/${guide.slug}`}
                        className="block rounded-lg border bg-card p-3 transition hover:border-primary"
                      >
                        <div className="font-medium">{guide.title}</div>
                        {(guide.subtitle || guide.description) && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {guide.subtitle || guide.description}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {guide.views} views • {guide.queries.length} topics
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold">Popular sparks</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap a theme to load localized answers instantly.
                </p>
                <div className="mt-4 space-y-4">
                  {suggestionsLoading ? (
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                      Generating fresh ideas…
                    </div>
                  ) : (
                    (heroContent.searchBuckets?.length
                      ? heroContent.searchBuckets
                      : [{ label: "Ideas", queries: combinedPopularQueries.slice(0, 6) }]
                    ).map((bucket) => (
                      <div
                        key={bucket.label}
                        className="rounded-xl border border-border/60 bg-muted/40 p-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {bucket.label}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {bucket.queries.map((query) => (
                            <button
                              key={query}
                              onClick={() => {
                                handleSuggestedSearch(query);
                                setIsSidebarOpen(false);
                              }}
                              disabled={isSearching}
                              className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
                            >
                              {query}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Items Sidebar */}
      <SavedItemsList
        items={savedItems}
        onRemove={handleRemoveItem}
        onClearAll={handleClearAll}
        cityName={destinationName}
        destinationSlug={destinationSlug}
      />

      {/* Share Toast */}
      {shareLink && (
        <div className="fixed bottom-28 right-6 z-50 max-w-sm rounded-xl border border-border/60 bg-background/95 p-4 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Share2 className="h-4 w-4" />
            Link ready to share
          </div>
          <div className="mt-2 line-clamp-2 break-words text-xs text-muted-foreground">
            {shareLink}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(shareLink, "_blank")}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(shareLink).catch(() => null);
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copy again
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShareLink(null)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Actions */}
      {(completedSearchUnits.length > 0 || savedItems.length > 0) && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            className="shadow-lg"
            onClick={handleShareSession}
            disabled={completedSearchUnits.length === 0}
          >
            <Share2 className="mr-2 h-5 w-5" />
            Share Page {completedSearchUnits.length > 0 && `(${completedSearchUnits.length})`}
          </Button>
          {savedItems.length > 0 && (
            <Button
              size="lg"
              className="shadow-lg"
              onClick={() => setShowSaveGuide(true)}
            >
              <Save className="mr-2 h-5 w-5" />
              Save Guide ({savedItems.length})
            </Button>
          )}
        </div>
      )}

      {/* Save Guide Modal */}
      {showSaveGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl overflow-hidden border border-border/60 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/60 bg-muted/50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Save & share</p>
                <h2 className="mt-2 text-2xl font-semibold">Preserve your {destinationName} blueprint</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Name it, add a note, and we will keep every section intact for future edits or sharing with travel friends.
                </p>
              </div>
              <Badge variant="outline">Beta</Badge>
            </div>

            {/* Generate smart title in background */}
            {!smartTitle && !isGeneratingTitle && (() => {
              setIsGeneratingTitle(true);
              generateSmartGuideTitle(
                destinationName,
                searchUnits.map((u) => u.query),
                searchUnits.map((u) => u.response)
              ).then((result) => {
                setSmartTitle(result);
                if (!guideTitle) {
                  setGuideTitle(result.title);
                  setGuideDescription(result.subtitle);
                }
                setIsGeneratingTitle(false);
              });
              return null;
            })()}

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Guide Title</label>
                  <Input
                    value={guideTitle}
                    onChange={(e) => setGuideTitle(e.target.value)}
                    placeholder={smartTitle?.title || `My ${destinationName} guide`}
                    className="h-12 text-lg"
                    autoFocus
                  />
                  {smartTitle && !guideTitle && (
                    <p className="text-xs text-muted-foreground">Suggested: {smartTitle.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Companion Notes</label>
                  <Textarea
                    value={guideDescription}
                    onChange={(e) => setGuideDescription(e.target.value)}
                    placeholder={smartTitle?.subtitle || "Add a quick summary, travel dates, or the vibe you’re targeting."}
                    className="min-h-[120px] resize-none"
                  />
                  {smartTitle && !guideDescription && (
                    <p className="text-xs text-muted-foreground">Suggested: {smartTitle.subtitle}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Included sections</label>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-dashed border-border/70 bg-muted/40 p-3">
                    {searchUnits.map((unit, index) => {
                      const refinedTitle = refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName);
                      return (
                        <div key={unit.id} className="rounded-lg bg-background/60 p-3 shadow-sm">
                          <div className="text-sm font-semibold">{index + 1}. {refinedTitle}</div>
                          <div className="mt-1 text-xs text-muted-foreground">Query: {unit.query}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={handleSaveGuide}
                    disabled={searchUnits.length === 0}
                    className="h-12 flex-1 text-base"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save guide
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSaveGuide(false);
                      setGuideTitle("");
                      setGuideDescription("");
                    }}
                    variant="outline"
                    className="h-12 flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot</p>
                  <p className="mt-2 text-3xl font-semibold">{searchUnits.length}</p>
                  <p className="text-sm text-muted-foreground">sections captured</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-background/70 p-3 shadow-sm">
                    <p className="font-medium">Sharing-ready</p>
                    <p className="text-muted-foreground">Export the saved guide to share with friends or collaborators.</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-3 shadow-sm">
                    <p className="font-medium">Keep evolving</p>
                    <p className="text-muted-foreground">Add more questions later—your guide updates automatically.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/60 p-3 text-xs text-muted-foreground">
                  💡 Tip: Save different versions for each traveler or date range you’re considering.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Compact Floating Search */}
      {shouldShowFloatingSearch && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-6 z-40 px-4 md:bottom-8"
          style={{ bottom: "max(env(safe-area-inset-bottom, 1.5rem), 1.5rem)" }}
        >
          <div
            className={cn(
              "pointer-events-auto mx-auto max-w-2xl transition-all duration-300",
              isScrolledPastHero ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground/80">
              <span>Plan smarter</span>
              <span>Ask follow-up questions</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCustomSearch();
              }}
              className="flex items-center gap-3 rounded-full border-2 border-primary/40 bg-background/95 px-5 py-3 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Search className="h-5 w-5" />
              </div>
              <Input
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={`Ask more about ${readableDestination}…`}
                disabled={isSearching}
                className="h-10 flex-1 border-none bg-transparent px-0 text-base font-medium focus-visible:border-none focus-visible:ring-0 focus-visible:outline-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSearching || !customQuery.trim()}
                className="h-11 w-11 rounded-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <span className="text-sm font-semibold">Go</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop: Sticky Top Search */}
      {shouldShowFloatingSearch && (
        <div
          className={cn(
            "sticky top-0 z-40 hidden border-b border-border/60 bg-background/90 backdrop-blur-sm transition-all duration-300 md:block",
              isScrolledPastHero ? "shadow-sm" : ""
            )}
          >
            <div className="container mx-auto max-w-5xl px-4 py-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Ask a follow-up to keep refining your {destinationName} plan</span>
                  </div>
                  {followUpSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {followUpSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSuggestedSearch(item.query)}
                          className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCustomSearch();
                  }}
                  className="flex items-center gap-3 rounded-full border border-border/60 bg-background px-5 py-2 shadow-sm"
                >
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder={`Ask anything about ${readableDestination}…`}
                    disabled={isSearching}
                    className="h-11 flex-1 border-none bg-transparent px-0 text-base focus-visible:border-none focus-visible:ring-0 focus-visible:outline-none"
                  />
                  <Button
                    type="submit"
                    disabled={isSearching || !customQuery.trim()}
                    className="h-11 rounded-full px-6 text-base font-medium"
                  >
                    Ask
                  </Button>
                </form>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
