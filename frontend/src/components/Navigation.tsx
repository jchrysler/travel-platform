import { Link, useLocation } from "react-router-dom";
import { MapPin, Calendar, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-40">
      <div className="container max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Travel Platform</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-muted/50",
                  location.pathname === "/"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Home
                </div>
              </Link>

              <Link
                to="/trip"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-muted/50",
                  location.pathname === "/trip"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Trip Builder
                </div>
              </Link>

              <Link
                to="/explore"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-muted/50",
                  location.pathname.startsWith("/explore")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  Explore
                </div>
              </Link>

            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
