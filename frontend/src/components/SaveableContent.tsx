import { useState, useRef, ReactNode, useEffect } from "react";
import { Plus, Check, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";

interface SaveableContentProps {
  children: ReactNode;
  content: string;
  queryContext?: string;
  onSave: (item: SavedItem) => void;
  onAskMore?: () => void;
  isSaved?: boolean;
  showThread?: boolean;
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
  onAskMore,
  isSaved = false,
  showThread = false
}: SaveableContentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newItem: SavedItem = {
      id: Date.now().toString(),
      content,
      queryContext,
      timestamp: new Date(),
    };
    onSave(newItem);
    setSaved(true);

    // Don't hide buttons if thread feature is enabled
    if (!onAskMore) {
      setTimeout(() => {
        setShowButtons(false);
      }, 1500);
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

  const handleAskMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAskMore) {
      onAskMore();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`saveable-content relative rounded-xl border border-transparent transition-colors duration-200 ${
        isHovered ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-transparent'
      } ${isMobile ? 'cursor-pointer' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
      style={{ padding: isMobile ? '12px' : '16px 72px 16px 20px' }}
    >
      {children}

      {showButtons && (
        <div
          className={`absolute ${
            isMobile ? 'right-2 top-2 flex gap-2' : 'right-4 top-1/2 -translate-y-1/2 space-y-2'
          } opacity-0 animate-fade-in z-10`}
        >
          <Button
            size={isMobile ? "icon" : "sm"}
            variant={saved ? "default" : "secondary"}
            className={`shadow-lg transition-all duration-200 ${
              saved ? 'bg-green-500 hover:bg-green-600' : ''
            }`}
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? (
              isMobile ? (
                <Check className="w-4 h-4" />
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Saved
                </>
              )
            ) : (
              isMobile ? (
                <Plus className="w-4 h-4" />
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1" />
                  Save
                </>
              )
            )}
          </Button>

          {onAskMore && (
            <Button
              size={isMobile ? "icon" : "sm"}
              variant={showThread ? "default" : "outline"}
              className="shadow-lg transition-all duration-200"
              onClick={handleAskMore}
            >
              {isMobile ? (
                <MessageCircle className="w-4 h-4" />
              ) : (
                <>
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Ask More
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
