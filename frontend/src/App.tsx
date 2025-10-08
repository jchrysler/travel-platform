import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import TravelHub from "@/pages/TravelHub";
import TripBuilder from "@/pages/TripBuilder";
import DestinationExplorer from "@/pages/DestinationExplorer";
import DynamicDestination from "@/pages/DynamicDestination";
import DestinationGuide from "@/pages/DestinationGuide";
import SavedItemsPage from "@/pages/SavedItemsPage";
import HeroSeeder from "@/pages/HeroSeeder";
import Navigation from "@/components/Navigation";

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ThemeToggle />
        <Navigation />

        <Routes>
          <Route path="/" element={<TravelHub />} />
          <Route path="/trip" element={<TripBuilder />} />
          <Route path="/explore" element={<DestinationExplorer />} />
          <Route path="/explore/:destination" element={<DynamicDestination />} />
          <Route path="/explore/:destination/draft/:id" element={<DynamicDestination />} />
          <Route path="/explore/:destination/:guide" element={<DestinationGuide />} />
          <Route path="/explore/:destination/saved/:listId" element={<SavedItemsPage />} />
          <Route path="/hero-seeder" element={<HeroSeeder />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}
