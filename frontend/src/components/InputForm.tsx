import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SquarePen, Brain, Send, StopCircle, Zap, Cpu, Type, Hash, Link, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Updated InputFormProps
interface InputFormProps {
  onSubmit: (inputValue: string, effort: string, model: string, tone?: string, configOverrides?: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  hasHistory: boolean;
  urlConfig?: {
    wordCount: number;
    linkCount: number;
    useInlineLinks: boolean;
    useApaStyle: boolean;
    customPersona: string;
  };
}

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  hasHistory,
  urlConfig,
}) => {
  const [internalInputValue, setInternalInputValue] = useState("");
  const [effort, setEffort] = useState("low"); // Default to low
  const [model, setModel] = useState("gemini-2.5-flash");
  const [tone, setTone] = useState("professional");
  
  // Configuration state
  const [wordCount, setWordCount] = useState(urlConfig?.wordCount || 1000);
  const [linkCount, setLinkCount] = useState(urlConfig?.linkCount || 6);
  const [useInlineLinks, setUseInlineLinks] = useState(urlConfig?.useInlineLinks ?? true);
  const [useApaStyle, setUseApaStyle] = useState(urlConfig?.useApaStyle ?? false);
  const [customPersona, setCustomPersona] = useState(() => {
    // Try to load from localStorage first, then fallback to urlConfig
    const saved = localStorage.getItem('customPersona');
    return saved || urlConfig?.customPersona || "";
  });
  
  // Ensure effort is set to low on mount
  useEffect(() => {
    setEffort("low");
  }, []);

  // Save custom persona to localStorage whenever it changes
  useEffect(() => {
    if (customPersona) {
      localStorage.setItem('customPersona', customPersona);
    } else {
      localStorage.removeItem('customPersona');
    }
  }, [customPersona]);

  const handleInternalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!internalInputValue.trim()) return;
    
    const configOverrides = {
      wordCount,
      linkCount,
      useInlineLinks,
      useApaStyle,
      customPersona
    };
    
    onSubmit(internalInputValue, effort, model, tone, configOverrides);
    setInternalInputValue("");
  };

  const handleInternalKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInternalSubmit();
    }
  };

  const isSubmitDisabled = !internalInputValue.trim() || isLoading;

  return (
    <form
      onSubmit={handleInternalSubmit}
      className={`flex flex-col gap-2 p-3 `}
    >
      <div
        className={`flex flex-row items-center justify-between text-foreground rounded-3xl rounded-bl-sm ${
          hasHistory ? "rounded-br-sm" : ""
        } break-words min-h-7 bg-muted px-4 pt-3 `}
      >
        <Textarea
          value={internalInputValue}
          onChange={(e) => setInternalInputValue(e.target.value)}
          onKeyDown={handleInternalKeyDown}
          placeholder={`Write a ${wordCount} word article about renewable energy trends`}
          className={`w-full text-foreground placeholder-muted-foreground resize-none border-0 focus:outline-none focus:ring-0 outline-none focus-visible:ring-0 shadow-none bg-transparent
                        md:text-base  min-h-[56px] max-h-[200px]`}
          rows={1}
        />
        <div className="-mt-3">
          {isLoading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2 cursor-pointer rounded-full transition-all duration-200"
              onClick={onCancel}
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              className={`${
                isSubmitDisabled
                  ? "text-neutral-500"
                  : "text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
              } p-2 cursor-pointer rounded-full transition-all duration-200 text-base`}
              disabled={isSubmitDisabled}
            >
              Generate Article
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* First Configuration Row */}
      <div className="flex flex-row gap-2 flex-wrap justify-center sm:justify-start">
        <div className="flex flex-row gap-2 bg-muted border-border text-muted-foreground focus:ring-ring rounded-xl rounded-t-sm pl-2">
          <div className="flex flex-row items-center text-sm">
            <Brain className="h-4 w-4 mr-2" />
            Effort
          </div>
          <Select value={effort} onValueChange={setEffort} defaultValue="low">
            <SelectTrigger className="w-[120px] bg-transparent border-none cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground cursor-pointer">
              <SelectItem
                value="low"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                Low
              </SelectItem>
              <SelectItem
                value="medium"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                Medium
              </SelectItem>
              <SelectItem
                value="high"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                High
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-row gap-2 bg-muted border-border text-muted-foreground focus:ring-ring rounded-xl rounded-t-sm pl-2">
          <div className="flex flex-row items-center text-sm ml-2">
            <Cpu className="h-4 w-4 mr-2" />
            Model
          </div>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[150px] bg-transparent border-none cursor-pointer">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground cursor-pointer">
              <SelectItem
                value="gemini-2.5-flash-lite"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-400" /> 2.5 Flash Lite
                </div>
              </SelectItem>
              <SelectItem
                value="gemini-2.5-flash"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-orange-400" /> 2.5 Flash
                </div>
              </SelectItem>
              <SelectItem
                value="gemini-2.5-pro"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                <div className="flex items-center">
                  <Cpu className="h-4 w-4 mr-2 text-purple-400" /> 2.5 Pro
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-row gap-2 bg-muted border-border text-muted-foreground focus:ring-ring rounded-xl rounded-t-sm pl-2">
          <div className="flex flex-row items-center text-sm ml-2">
            <Type className="h-4 w-4 mr-2" />
            Tone
          </div>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-[140px] bg-transparent border-none cursor-pointer">
              <SelectValue placeholder="Tone" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground cursor-pointer">
              <SelectItem
                value="professional"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                Professional
              </SelectItem>
              <SelectItem
                value="casual"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                Casual
              </SelectItem>
              <SelectItem
                value="academic"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                Academic
              </SelectItem>
              <SelectItem
                value="expert"
                className="hover:bg-accent focus:bg-accent cursor-pointer"
              >
                Expert
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Second Configuration Row */}
      <div className="flex flex-row gap-2 flex-wrap justify-center sm:justify-start">
        <div className="flex flex-row gap-2 bg-muted border-border text-muted-foreground focus:ring-ring rounded-xl pl-2">
          <div className="flex flex-row items-center text-sm">
            <Hash className="h-4 w-4 mr-2" />
            Words
          </div>
          <Select value={wordCount.toString()} onValueChange={(v) => setWordCount(parseInt(v))}>
            <SelectTrigger className="w-[100px] bg-transparent border-none cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground cursor-pointer">
              <SelectItem value="200" className="hover:bg-accent focus:bg-accent cursor-pointer">200</SelectItem>
              <SelectItem value="500" className="hover:bg-accent focus:bg-accent cursor-pointer">500</SelectItem>
              <SelectItem value="750" className="hover:bg-accent focus:bg-accent cursor-pointer">750</SelectItem>
              <SelectItem value="1000" className="hover:bg-accent focus:bg-accent cursor-pointer">1000</SelectItem>
              <SelectItem value="1200" className="hover:bg-accent focus:bg-accent cursor-pointer">1200</SelectItem>
              <SelectItem value="1500" className="hover:bg-accent focus:bg-accent cursor-pointer">1500</SelectItem>
              <SelectItem value="2000" className="hover:bg-accent focus:bg-accent cursor-pointer">2000</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-row gap-2 bg-muted border-border text-muted-foreground focus:ring-ring rounded-xl pl-2">
          <div className="flex flex-row items-center text-sm">
            <Link className="h-4 w-4 mr-2" />
            Links
          </div>
          <Select value={linkCount.toString()} onValueChange={(v) => setLinkCount(parseInt(v))}>
            <SelectTrigger className="w-[80px] bg-transparent border-none cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground cursor-pointer">
              <SelectItem value="0" className="hover:bg-accent focus:bg-accent cursor-pointer">0</SelectItem>
              <SelectItem value="2" className="hover:bg-accent focus:bg-accent cursor-pointer">2</SelectItem>
              <SelectItem value="4" className="hover:bg-accent focus:bg-accent cursor-pointer">4</SelectItem>
              <SelectItem value="6" className="hover:bg-accent focus:bg-accent cursor-pointer">6</SelectItem>
              <SelectItem value="8" className="hover:bg-accent focus:bg-accent cursor-pointer">8</SelectItem>
              <SelectItem value="10" className="hover:bg-accent focus:bg-accent cursor-pointer">10</SelectItem>
              <SelectItem value="15" className="hover:bg-accent focus:bg-accent cursor-pointer">15</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Link Style Checkboxes */}
        <div className="flex flex-row gap-3 bg-muted border-border text-muted-foreground focus:ring-ring rounded-xl px-3 py-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useInlineLinks}
              onChange={(e) => setUseInlineLinks(e.target.checked)}
              className="mr-2 text-primary bg-background border-border rounded focus:ring-ring"
            />
            <span className="text-sm">Inline Links</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useApaStyle}
              onChange={(e) => setUseApaStyle(e.target.checked)}
              className="mr-2 text-primary bg-background border-border rounded focus:ring-ring"
            />
            <span className="text-sm">APA Style</span>
          </label>
        </div>
      </div>
      
      {/* Custom Persona Section */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center text-sm text-foreground font-medium">
          <FileText className="h-4 w-4 mr-2" />
          Custom Persona (optional)
        </div>
        <Textarea
          value={customPersona}
          onChange={(e) => setCustomPersona(e.target.value)}
          placeholder="You are a technical blogger writing for developers. Focus on practical examples and avoid marketing language. Use a conversational tone and include actionable insights..."
          className="bg-muted border-border text-foreground placeholder-muted-foreground resize-none min-h-[80px] max-h-[150px] text-sm"
          rows={3}
        />
      </div>
      
      {hasHistory && (
        <div className="flex justify-center">
          <Button
            className="bg-muted border-border text-muted-foreground hover:bg-accent cursor-pointer rounded-xl rounded-t-sm pl-2"
            variant="default"
            onClick={() => window.location.reload()}
          >
            <SquarePen size={16} />
            New Article
          </Button>
        </div>
      )}
    </form>
  );
};
