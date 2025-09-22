import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import ArticleGenerator from "@/pages/ArticleGenerator";
import ContentImprover from "@/pages/ContentImprover";
import BulkGenerator from "@/pages/BulkGenerator";
import TravelHub from "@/pages/TravelHub";
import TripBuilder from "@/pages/TripBuilder";
import DestinationExplorer from "@/pages/DestinationExplorer";
import DynamicDestination from "@/pages/DynamicDestination";
import DestinationGuide from "@/pages/DestinationGuide";
import SavedItemsPage from "@/pages/SavedItemsPage";
import Navigation from "@/components/Navigation";

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ThemeToggle />
        <Navigation />

        <Routes>
          <Route path="/" element={<ArticleGenerator />} />
          <Route path="/c" element={<ContentImprover />} />
          <Route path="/bulk" element={<BulkGenerator />} />
          <Route path="/travel" element={<TravelHub />} />
          <Route path="/travel/trip" element={<TripBuilder />} />
          <Route path="/travel/explore" element={<DestinationExplorer />} />
          <Route path="/travel/explore/:destination" element={<DynamicDestination />} />
          <Route path="/travel/explore/:destination/:guide" element={<DestinationGuide />} />
          <Route path="/travel/explore/:destination/saved/:listId" element={<SavedItemsPage />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}