import { useState, ReactNode, useEffect, useRef } from "react";
import { Plus, Check, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface SaveableContentProps {
  children: ReactNode;
  content: string;
  queryContext?: string;
  onSave: (item: SavedItem) => void;
  onElaborate?: () => void;
  onMoreLike?: () => void;
  isSaved?: boolean;
  showThread?: boolean;
  itemId?: string;
}

export interface SavedItem {
  id: string;
  content: string;
  queryContext?: string;
  timestamp: Date;
  note?: string;
}

export function SaveableContent({
  children,
  content,
  queryContext,
  onSave,
  onElaborate,
  onMoreLike,
  isSaved = false,
  showThread = false,
  itemId
}: SaveableContentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hasShownInitialRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  useEffect(() => {
    if (!hasShownInitialRef.current && !saved) {
      hasShownInitialRef.current = true;
      if (!isMobile) {
        setShowButtons(true);
        const timeout = setTimeout(() => {
          setShowButtons(false);
        }, 2200);
        return () => clearTimeout(timeout);
      }
    }
    return;
  }, [isMobile, saved]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newItemId = itemId || Date.now().toString();
    const newItem: SavedItem = {
      id: newItemId,
      content,
      queryContext,
      timestamp: new Date(),
    };
    onSave(newItem);
    setSaved(true);

    // Don't hide buttons if thread features are enabled
    if (!onElaborate && !onMoreLike) {
      setTimeout(() => {
        setShowButtons(false);
      }, 1500);
    }
  };

  const handleElaborate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onElaborate) {
      onElaborate();
    }
  };

  const handleMoreLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoreLike) {
      onMoreLike();
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
      setShowButtons(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      if (!saved && !showThread) {
        setTimeout(() => {
          setShowButtons(false);
        }, 200);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowButtons(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    setIsFocused(false);
    if (!saved && !showThread) {
      setShowButtons(false);
    }
  };

  const handleTap = () => {
    if (isMobile) {
      setShowButtons(true);
      setTimeout(() => {
        if (!saved && !showThread) {
          setShowButtons(false);
        }
      }, 3000);
    }
  };


  const isHighlighted = isHovered || showButtons || saved || isFocused;
  const containerClasses = [
    "saveable-content",
    "relative",
    "rounded-2xl",
    "px-3",
    "sm:px-4",
    "py-3",
    "pr-12",
    "transition-all",
    "duration-200",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-primary/30",
    isMobile ? "cursor-pointer" : "cursor-default",
    isHighlighted ? "bg-primary/5 shadow-lg ring-1 ring-primary/40" : "bg-card shadow-sm hover:shadow-md"
  ].join(" ");

  return (
    <div
      tabIndex={0}
      className={containerClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="relative z-10">
        {children}
      </div>

      {showButtons && (
        <div
          className={`absolute ${
            isMobile
              ? 'right-2 top-2 flex items-center gap-2'
              : 'right-1 top-1/2 -translate-y-1/2 flex flex-col items-end gap-2'
          } z-20`}
        >
          <Button
            size="icon"
            variant="ghost"
            className={`h-9 w-9 rounded-full border border-border/60 bg-background/95 shadow-md transition-colors duration-300 ${
              saved ? 'text-emerald-600 hover:text-emerald-700' : 'text-primary hover:text-primary-foreground hover:bg-primary'
            }`}
            onClick={handleSave}
            disabled={saved}
            aria-label={saved ? "Saved section" : "Save this section"}
          >
            {saved ? (
              <Check className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>

          {onElaborate && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full border border-border/60 bg-background/95 shadow-sm transition-colors duration-200 text-muted-foreground hover:text-primary"
              onClick={handleElaborate}
              aria-label="Elaborate on this"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}

          {onMoreLike && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full border border-border/60 bg-background/95 shadow-sm transition-colors duration-200 text-muted-foreground hover:text-primary"
              onClick={handleMoreLike}
              aria-label="More like this"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
