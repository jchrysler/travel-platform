import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import ArticleGenerator from "@/pages/ArticleGenerator";
import ContentImprover from "@/pages/ContentImprover";
import Navigation from "@/components/Navigation";

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ThemeToggle />
        <Navigation />
        
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<ArticleGenerator />} />
          <Route path="/app/c" element={<ContentImprover />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}