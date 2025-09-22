import { useState, useRef, ReactNode, useEffect } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "./ui/button";

interface SaveableContentProps {
  children: ReactNode;
  content: string;
  queryContext?: string;
  onSave: (item: SavedItem) => void;
  isSaved?: boolean;
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
  isSaved = false
}: SaveableContentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
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

    // Hide button after save with a delay
    setTimeout(() => {
      setShowSaveButton(false);
    }, 1500);
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
      if (!saved) {
        setShowSaveButton(true);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      if (!saved) {
        setTimeout(() => {
          setShowSaveButton(false);
        }, 200);
      }
    }
  };

  const handleTap = () => {
    if (isMobile && !saved) {
      setShowSaveButton(true);
      setTimeout(() => {
        if (!saved) {
          setShowSaveButton(false);
        }
      }, 3000);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`saveable-content relative transition-all duration-200 rounded-lg ${
        isHovered ? 'bg-primary/5' : ''
      } ${
        isMobile ? 'cursor-pointer' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
      style={{
        padding: isHovered || showSaveButton ? '12px' : '0px',
        margin: isHovered || showSaveButton ? '-12px' : '0px'
      }}
    >
      {children}

      {showSaveButton && (
        <div className={`absolute ${
          isMobile ? 'right-2 top-2' : '-right-14 top-1/2 -translate-y-1/2'
        } opacity-0 animate-fade-in z-10`}>
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
        </div>
      )}
    </div>
  );
}