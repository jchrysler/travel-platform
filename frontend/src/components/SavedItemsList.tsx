import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Bookmark, Copy, Download, Share2, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import type { SavedItem } from "./SaveableContent";
import { useNavigate } from "react-router-dom";
import { slugify } from "@/utils/slugify";

interface SavedItemsListProps {
  items: SavedItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  cityName?: string;
  destinationSlug?: string;
}

export function SavedItemsList({
  items,
  onRemove,
  onClearAll,
  cityName,
  destinationSlug
}: SavedItemsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const navigate = useNavigate();
  const hasItems = items.length > 0;

  const handleCopyAll = () => {
    const content = items
      .map(item => {
        const header = item.queryContext ? `From: ${item.queryContext}\n\n` : '';
        const cleanContent = item.content
          .replace(/\*\*/g, '')
          .replace(/\* {2}/g, '• ')
          .replace(/^\* /gm, '• ')
          .trim();
        return `${header}${cleanContent}\n`;
      })
      .join('\n---\n\n');

    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const content = items
      .map(item => {
        const header = item.queryContext ? `From: ${item.queryContext}\n\n` : '';
        const cleanContent = item.content
          .replace(/\*\*/g, '')
          .replace(/\* {2}/g, '• ')
          .replace(/^\* /gm, '• ')
          .trim();
        return `${header}${cleanContent}\n`;
      })
      .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cityName || 'travel'}-recommendations-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed right-0 top-20 h-[calc(100vh-5rem)] z-40 transition-all duration-300 ${
      isExpanded ? 'w-96' : 'w-14'
    }`}>
      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="icon"
        className={`absolute left-0 top-4 z-50 shadow-lg ${
          hasItems ? 'bg-primary text-primary-foreground' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4" />
            {hasItems && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </>
        )}
      </Button>

      {/* Panel Content */}
      {isExpanded && (
        <Card className="ml-14 h-full w-[calc(100%-3.5rem)] shadow-2xl border-l flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Saved Items</h3>
              </div>
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {hasItems && (
              <>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyAll}
                    className="flex-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                    className="flex-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onClearAll}
                  >
                    Clear
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowCreatePage(true)}
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  Create Shareable Page
                </Button>
              </>
            )}
          </div>

          {/* Create Page Form */}
          {showCreatePage && (
            <div className="p-4 border-b bg-muted/30">
              <div className="space-y-3">
                <Input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Page title..."
                  className="text-sm"
                />
                <Input
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  placeholder="Brief description (optional)..."
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!pageTitle.trim()) return;

                      // Generate unique ID for this saved list
                      const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      const destination = destinationSlug || slugify(cityName || 'travel');

                      // Save to localStorage
                      const savedList = {
                        id: listId,
                        title: pageTitle,
                        description: pageDescription,
                        destination: cityName || 'Travel',
                        items: items,
                        createdAt: new Date(),
                        updatedAt: new Date()
                      };

                      const existingLists = JSON.parse(localStorage.getItem('saved_lists') || '[]');
                      existingLists.push(savedList);
                      localStorage.setItem('saved_lists', JSON.stringify(existingLists));

                      // Generate URL and navigate
                      const url = `/travel/explore/${destination}/saved/${listId}`;
                      const fullUrl = `${window.location.origin}${url}`;

                      // Copy to clipboard
                      navigator.clipboard.writeText(fullUrl);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 3000);

                      // Navigate to the new page
                      navigate(url);
                    }}
                    disabled={!pageTitle.trim()}
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    Create Shareable Page
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreatePage(false);
                      setPageTitle("");
                      setPageDescription("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {isCopied && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    ✓ Link copied to clipboard!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items List */}
          <ScrollArea className="flex-1 p-4">
            {hasItems ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3 relative group hover:shadow-md transition-shadow"
                  >
                    {item.queryContext && (
                      <div className="text-xs text-muted-foreground mb-2 font-medium">
                        From: {item.queryContext}
                      </div>
                    )}
                    <div className="text-sm pr-6 whitespace-pre-line">
                      {(() => {
                        // Clean up markdown formatting
                        let cleanContent = item.content
                          .replace(/\*\*/g, '')
                          .replace(/\* {2}/g, '• ')
                          .replace(/^\* /gm, '• ')
                          .trim();

                        if (cleanContent.length > 200) {
                          cleanContent = cleanContent.substring(0, 200) + '...';
                        }

                        return cleanContent;
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>

                    {/* Remove Button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      onClick={() => onRemove(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No saved items yet
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Hover over content and click Save to build your list
                </p>
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}