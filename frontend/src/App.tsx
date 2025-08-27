import { useState, useCallback } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArticleViewer } from "@/components/ArticleViewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [effort, setEffort] = useState("medium");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [tone, setTone] = useState("professional");
  const [generatedArticle, setGeneratedArticle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setGeneratedArticle("");
    setError("");
    setIsLoading(true);

    let initial_search_query_count = 0;
    let max_research_loops = 0;
    switch (effort) {
      case "low":
        initial_search_query_count = 1;
        max_research_loops = 1;
        break;
      case "medium":
        initial_search_query_count = 2;
        max_research_loops = 2;
        break;
      case "high":
        initial_search_query_count = 3;
        max_research_loops = 3;
        break;
    }

    try {
      const apiUrl = import.meta.env.DEV
        ? "http://localhost:2024"
        : window.location.origin;

      const response = await fetch(`${apiUrl}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              type: "human",
              content: prompt,
              id: Date.now().toString(),
            }
          ],
          initial_search_query_count,
          max_research_loops,
          reasoning_model: model,
          article_tone: tone,
          word_count: 1000,
          link_count: 6,
          use_inline_links: true,
          use_apa_style: false,
          custom_persona: "",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the article from the response
      // The article should be in the last message from the AI
      if (data.messages && data.messages.length > 0) {
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage.type === "ai" && lastMessage.content) {
          setGeneratedArticle(lastMessage.content);
        } else {
          throw new Error("No article generated in response");
        }
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err) {
      console.error("Error generating article:", err);
      setError(err instanceof Error ? err.message : "Failed to generate article");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, effort, model, tone]);

  const handleReset = useCallback(() => {
    setPrompt("");
    setGeneratedArticle("");
    setError("");
    setIsLoading(false);
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ThemeToggle />
        
        <div className="container max-w-6xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Article Generator</h1>
            <p className="text-muted-foreground">Generate well-researched articles with citations</p>
          </div>

          {!generatedArticle ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Panel */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Article Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Article Topic
                    </label>
                    <Textarea
                      placeholder="Enter your article topic..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[120px]"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Research Effort
                    </label>
                    <Select value={effort} onValueChange={setEffort} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Quick)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high">High (Thorough)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      AI Model
                    </label>
                    <Select value={model} onValueChange={setModel} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Writing Tone
                    </label>
                    <Select value={tone} onValueChange={setTone} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Generating Article..." : "Generate Article"}
                  </Button>
                </div>
              </Card>

              {/* Status Panel */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Status</h2>
                
                {error ? (
                  <div className="text-red-500 text-sm">
                    <p className="font-semibold mb-2">Error:</p>
                    <p>{error}</p>
                  </div>
                ) : isLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      <p className="text-sm">Generating article...</p>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <p>This may take 30-60 seconds depending on:</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Research effort level: {effort}</li>
                        <li>• Number of sources to gather</li>
                        <li>• Model processing time</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <p className="mb-4">Ready to generate an article.</p>
                    <div className="text-xs space-y-1">
                      <p>Current settings:</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Model: {model}</li>
                        <li>• Tone: {tone}</li>
                        <li>• Effort: {effort}</li>
                        <li>• Word count: ~1000</li>
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            /* Article Display */
            <ArticleViewer
              article={generatedArticle}
              tone={tone}
              effort={effort}
              model={model}
              wordCount={1000}
              linkCount={6}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}