import { Link, useLocation } from "react-router-dom";
import { Sparkles, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-40">
      <div className="container max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Content Suite</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Link
                to="/app"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-muted/50",
                  location.pathname === "/app" 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Article Generator
                </div>
              </Link>
              
              <Link
                to="/app/c"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-muted/50",
                  location.pathname === "/app/c"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Content Improver
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}