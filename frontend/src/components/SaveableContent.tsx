import { useState, useRef, ReactNode } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    setIsHovered(true);
    if (!saved) {
      setShowSaveButton(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!saved) {
      setTimeout(() => {
        setShowSaveButton(false);
      }, 200);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`saveable-content relative transition-all duration-200 ${
        isHovered ? 'bg-primary/5 rounded-lg border-l-2 border-primary/30' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        padding: isHovered ? '12px 12px 12px 16px' : '0px',
        margin: isHovered ? '-12px -12px -12px -4px' : '0px'
      }}
    >
      {children}

      {showSaveButton && (
        <div className="absolute -right-14 top-1/2 -translate-y-1/2 opacity-0 animate-fade-in z-10">
          <Button
            size="sm"
            variant={saved ? "default" : "secondary"}
            className={`shadow-lg transition-all duration-200 ${
              saved ? 'bg-green-500 hover:bg-green-600' : ''
            }`}
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Saved
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}