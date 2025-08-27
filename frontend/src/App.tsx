import { useState, useCallback } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArticleViewer } from "@/components/ArticleViewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RefreshCw, Sparkles } from "lucide-react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [keywords, setKeywords] = useState("");
  const [effort, setEffort] = useState("medium");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [tone, setTone] = useState("professional");
  const [wordCount, setWordCount] = useState(1000);
  const [linkCount, setLinkCount] = useState(5);
  const [useInlineLinks, setUseInlineLinks] = useState(true);
  const [useApaStyle, setUseApaStyle] = useState(false);
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
          word_count: wordCount,
          link_count: linkCount,
          use_inline_links: useInlineLinks,
          use_apa_style: useApaStyle,
          target_keywords: keywords,
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
  }, [prompt, keywords, effort, model, tone, wordCount, linkCount, useInlineLinks, useApaStyle]);

  const handleRegenerate = useCallback(() => {
    if (prompt.trim()) {
      handleGenerate();
    }
  }, [handleGenerate, prompt]);

  const handleReset = useCallback(() => {
    setPrompt("");
    setKeywords("");
    setGeneratedArticle("");
    setError("");
    setIsLoading(false);
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ThemeToggle />
        
        <div className="container max-w-7xl mx-auto p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Article Generator
            </h1>
            <p className="text-muted-foreground">Generate well-researched articles with citations</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Panel - Always Visible */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Settings</h2>
                
                <div className="space-y-4">
                  {/* Topic Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Article Topic
                    </label>
                    <Textarea
                      placeholder="E.g., Best lease deals for Hyundai Ioniq in August 2025"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px]"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Keywords Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Target Keywords (SEO)
                    </label>
                    <Input
                      placeholder="E.g., hyundai ioniq lease, electric car deals, EV lease 2025"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      disabled={isLoading}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated keywords to optimize for
                    </p>
                  </div>

                  {/* Configuration Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Research Effort */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Research
                      </label>
                      <Select value={effort} onValueChange={setEffort} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        AI Model
                      </label>
                      <Select value={model} onValueChange={setModel} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-2.5-flash-lite">Flash Lite</SelectItem>
                          <SelectItem value="gemini-2.5-flash">Flash</SelectItem>
                          <SelectItem value="gemini-2.5-pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Writing Tone */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tone
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

                    {/* Word Count */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Length
                      </label>
                      <Select value={wordCount.toString()} onValueChange={(v) => setWordCount(parseInt(v))} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="750">750</SelectItem>
                          <SelectItem value="1000">1000</SelectItem>
                          <SelectItem value="1250">1250</SelectItem>
                          <SelectItem value="1500">1500</SelectItem>
                          <SelectItem value="2000">2000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Link Count */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">
                        Links
                      </label>
                      <Select value={linkCount.toString()} onValueChange={(v) => setLinkCount(parseInt(v))} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No links</SelectItem>
                          <SelectItem value="3">3 links</SelectItem>
                          <SelectItem value="5">5 links</SelectItem>
                          <SelectItem value="8">8 links</SelectItem>
                          <SelectItem value="10">10 links</SelectItem>
                          <SelectItem value="12">12 links</SelectItem>
                          <SelectItem value="15">15 links</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Link Style */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Citation Style
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useInlineLinks}
                          onChange={(e) => setUseInlineLinks(e.target.checked)}
                          disabled={isLoading}
                          className="mr-2"
                        />
                        <span className="text-sm">Inline Links</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useApaStyle}
                          onChange={(e) => setUseApaStyle(e.target.checked)}
                          disabled={isLoading}
                          className="mr-2"
                        />
                        <span className="text-sm">APA References</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    {!generatedArticle ? (
                      <Button 
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isLoading}
                        className="w-full"
                      >
                        {isLoading ? "Generating..." : "Generate Article"}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={handleRegenerate}
                          disabled={!prompt.trim() || isLoading}
                          className="w-full"
                          variant="default"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {isLoading ? "Regenerating..." : "Regenerate"}
                        </Button>
                        <Button 
                          onClick={handleReset}
                          variant="outline"
                          className="w-full"
                        >
                          Clear & Start Over
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950 rounded">
                      <p className="font-semibold mb-1">Error:</p>
                      <p>{error}</p>
                    </div>
                  )}

                  {/* Status when loading */}
                  {isLoading && (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span>Researching and writing...</span>
                      </div>
                      <p className="text-xs">This may take 30-60 seconds</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Article Display */}
            <div className="lg:col-span-2">
              {generatedArticle ? (
                <ArticleViewer
                  article={generatedArticle}
                  tone={tone}
                  effort={effort}
                  model={model}
                  wordCount={wordCount}
                  linkCount={linkCount}
                  onReset={handleReset}
                />
              ) : (
                <Card className="p-12 text-center text-muted-foreground">
                  <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-xl font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-sm max-w-md mx-auto">
                    Enter your topic and keywords, adjust settings, then click Generate Article to create 
                    professional, SEO-optimized content.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}