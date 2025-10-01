import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Trash2, Edit, Check, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchUnit } from "@/components/SearchUnit";
import { SavedItemsList } from "@/components/SavedItemsList";
import type { SavedItem } from "@/components/SaveableContent";
import { deslugify } from "@/utils/slugify";
import {
  getGuide,
  incrementGuideViews,
  deleteGuide,
  type Guide
} from "@/utils/guideStorage";
import { refineQueryToTitle } from "@/utils/titleRefinement";

interface SearchUnitData {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  isStreaming?: boolean;
  refinedTitle?: string;
}

export default function DestinationGuide() {
  const { destination, guide: guideSlug } = useParams<{ destination: string; guide: string }>();
  const navigate = useNavigate();
  const destinationName = destination ? deslugify(destination) : "";

  const [guide, setGuide] = useState<Guide | null>(null);
  const [searchUnits, setSearchUnits] = useState<SearchUnitData[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (destination && guideSlug) {
      const loadedGuide = getGuide(destination, guideSlug);
      if (loadedGuide) {
        setGuide(loadedGuide);
        setEditedTitle(loadedGuide.title);
        setEditedDescription(loadedGuide.description || "");

        // Convert guide data to search units with refined titles
        const units: SearchUnitData[] = loadedGuide.queries.map((query, index) => ({
          id: `guide-${loadedGuide.id}-${index}`,
          query,
          response: loadedGuide.responses[index] || "",
          timestamp: new Date(loadedGuide.createdAt),
          isStreaming: false,
          refinedTitle: loadedGuide.sectionTitles?.[index] || refineQueryToTitle(query, destinationName)
        }));
        setSearchUnits(units);

        // Track view
        incrementGuideViews(loadedGuide.id);
      } else {
        // Guide not found, redirect to destination page
        navigate(`/explore/${destination}`);
      }
    }
  }, [destination, guideSlug, navigate]);

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

  const handleDeleteGuide = () => {
    if (guide && confirm(`Are you sure you want to delete "${guide.title}"?`)) {
      deleteGuide(guide.id);
      navigate(`/explore/${destination}`);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: guide?.title || "Travel Guide",
          text: guide?.description || `Check out this guide for ${destinationName}`,
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };


  const handleSaveTitle = () => {
    if (guide && editedTitle.trim() && editedTitle !== guide.title) {
      // Update guide in localStorage
      const guides = JSON.parse(localStorage.getItem('travel_guides') || '[]');
      const guideIndex = guides.findIndex((g: Guide) => g.id === guide.id);
      if (guideIndex !== -1) {
        guides[guideIndex].title = editedTitle;
        guides[guideIndex].updatedAt = new Date();
        localStorage.setItem('travel_guides', JSON.stringify(guides));
        setGuide({ ...guide, title: editedTitle, updatedAt: new Date() });
      }
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (guide && editedDescription !== guide.description) {
      // Update guide in localStorage
      const guides = JSON.parse(localStorage.getItem('travel_guides') || '[]');
      const guideIndex = guides.findIndex((g: Guide) => g.id === guide.id);
      if (guideIndex !== -1) {
        guides[guideIndex].description = editedDescription;
        guides[guideIndex].updatedAt = new Date();
        localStorage.setItem('travel_guides', JSON.stringify(guides));
        setGuide({ ...guide, description: editedDescription, updatedAt: new Date() });
      }
    }
    setIsEditingDescription(false);
  };

  if (!guide) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Loading guide...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={`/explore/${destination}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {destinationName}
        </Link>

        {/* Title */}
        <div className="mb-4">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-3xl font-bold h-auto py-2"
                autoFocus
              />
              <Button size="icon" onClick={handleSaveTitle}>
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  setEditedTitle(guide.title);
                  setIsEditingTitle(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="text-4xl font-bold">{guide.title}</h1>
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditingTitle(true)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Subtitle/Description */}
        {guide.subtitle && (
          <p className="text-lg text-muted-foreground mb-4">
            {guide.subtitle}
          </p>
        )}

        {/* Description (legacy) */}
        {isEditingDescription ? (
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Add a description..."
              className="flex-1"
              autoFocus
            />
            <Button size="icon" onClick={handleSaveDescription}>
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setEditedDescription(guide.description || "");
                setIsEditingDescription(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="group mb-4">
            {guide.description ? (
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">{guide.description}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditingDescription(true)}
              >
                + Add description
              </Button>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {guide.views} views
          </span>
          <span>
            Created {new Date(guide.createdAt).toLocaleDateString()}
          </span>
          {guide.updatedAt && new Date(guide.updatedAt).getTime() !== new Date(guide.createdAt).getTime() && (
            <span>
              Updated {new Date(guide.updatedAt).toLocaleDateString()}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
            >
              {isCopied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied!</>
              ) : (
                <><Share2 className="w-4 h-4 mr-2" /> Share</>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteGuide}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-8">
            <h3 className="font-semibold mb-3">Guide Contents</h3>
            <div className="space-y-2">
              {searchUnits.map((unit, index) => (
                <a
                  key={index}
                  href={`#section-${index}`}
                  className="block p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">
                    {index + 1}. {unit.refinedTitle}
                  </div>
                  {unit.refinedTitle !== unit.query && (
                    <div className="text-xs text-muted-foreground mt-1">
                      "{unit.query}"
                    </div>
                  )}
                </a>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {searchUnits.map((unit, index) => (
              <div key={unit.id} id={`section-${index}`}>
                <SearchUnit
                  unit={unit}
                  cityName={destinationName}
                  isFirst={false}
                  isLatest={false}
                  onSaveItem={handleSaveItem}
                  savedItemIds={savedItemIds}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Items Sidebar */}
      <SavedItemsList
        items={savedItems}
        onRemove={handleRemoveItem}
        onClearAll={handleClearAll}
        cityName={destinationName}
      />
    </div>
  );
}
