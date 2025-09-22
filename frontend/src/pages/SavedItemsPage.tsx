import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Download, Check, Globe, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";
import { deslugify } from "@/utils/slugify";

interface SavedListData {
  id: string;
  title: string;
  description?: string;
  destination: string;
  items: SavedItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface SavedItem {
  id: string;
  content: string;
  queryContext: string;
  timestamp: Date;
}

export default function SavedItemsPage() {
  const { destination, listId } = useParams<{ destination: string; listId: string }>();
  const navigate = useNavigate();
  const destinationName = destination ? deslugify(destination) : "";
  
  const [savedList, setSavedList] = useState<SavedListData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  useEffect(() => {
    if (listId) {
      // Load saved list from localStorage
      const lists = JSON.parse(localStorage.getItem('saved_lists') || '[]');
      const list = lists.find((l: SavedListData) => l.id === listId);
      
      if (list) {
        setSavedList({
          ...list,
          createdAt: new Date(list.createdAt),
          updatedAt: new Date(list.updatedAt),
          items: list.items.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        });
        setEditedTitle(list.title);
        setEditedDescription(list.description || "");
      } else {
        // List not found, redirect
        navigate(`/travel/explore/${destination}`);
      }
    }
  }, [listId, destination, navigate]);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: savedList?.title || "Travel Recommendations",
          text: savedList?.description || `Check out these recommendations for ${destinationName}`,
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

  const handleDownload = () => {
    if (!savedList) return;
    
    const content = savedList.items.map((item, index) => 
      `## ${index + 1}. ${item.queryContext}\n\n${item.content}\n\n---\n`
    ).join('\n');
    
    const fullContent = `# ${savedList.title}\n\n${savedList.description || ''}\n\n${content}`;
    
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${savedList.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTitle = () => {
    if (savedList && editedTitle.trim() && editedTitle !== savedList.title) {
      const lists = JSON.parse(localStorage.getItem('saved_lists') || '[]');
      const listIndex = lists.findIndex((l: SavedListData) => l.id === savedList.id);
      
      if (listIndex !== -1) {
        lists[listIndex].title = editedTitle;
        lists[listIndex].updatedAt = new Date();
        localStorage.setItem('saved_lists', JSON.stringify(lists));
        setSavedList({ ...savedList, title: editedTitle, updatedAt: new Date() });
      }
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (savedList) {
      const lists = JSON.parse(localStorage.getItem('saved_lists') || '[]');
      const listIndex = lists.findIndex((l: SavedListData) => l.id === savedList.id);
      
      if (listIndex !== -1) {
        lists[listIndex].description = editedDescription;
        lists[listIndex].updatedAt = new Date();
        localStorage.setItem('saved_lists', JSON.stringify(lists));
        setSavedList({ ...savedList, description: editedDescription, updatedAt: new Date() });
      }
    }
    setIsEditingDescription(false);
  };

  if (!savedList) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading saved recommendations...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={`/travel/explore/${destination}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {destinationName}
        </Link>

        {/* Title */}
        {isEditingTitle ? (
          <div className="flex items-center gap-2 mb-4">
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
                setEditedTitle(savedList.title);
                setIsEditingTitle(false);
              }}
            >
              ×
            </Button>
          </div>
        ) : (
          <h1 
            className="text-4xl font-bold mb-4 cursor-pointer hover:text-primary/80 transition-colors"
            onClick={() => setIsEditingTitle(true)}
          >
            {savedList.title}
          </h1>
        )}

        {/* Description */}
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
                setEditedDescription(savedList.description || "");
                setIsEditingDescription(false);
              }}
            >
              ×
            </Button>
          </div>
        ) : (
          <div className="mb-4">
            {savedList.description ? (
              <p 
                className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsEditingDescription(true)}
              >
                {savedList.description}
              </p>
            ) : (
              <button
                onClick={() => setIsEditingDescription(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                + Add description
              </button>
            )}
          </div>
        )}

        {/* Metadata and Actions */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {destinationName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(savedList.createdAt).toLocaleDateString()}
          </span>
          <span>{savedList.items.length} recommendations</span>
          
          <div className="flex gap-2 ml-auto">
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
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {savedList.items.map((item, index) => (
          <Card key={item.id} className="p-6">
            <div className="mb-3 pb-3 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{item.queryContext}</h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className="text-2xl font-bold text-muted-foreground/30">
                  #{index + 1}
                </span>
              </div>
            </div>
            
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(item.content) }}
            />
          </Card>
        ))}
      </div>

      {/* Footer */}
      <Card className="mt-8 p-6 bg-muted/50 text-center">
        <Globe className="w-8 h-8 mx-auto mb-3 text-primary" />
        <p className="text-sm text-muted-foreground">
          This collection was created using AI-powered travel recommendations.
          Share this link with friends to help them explore {destinationName}!
        </p>
      </Card>
    </div>
  );
}