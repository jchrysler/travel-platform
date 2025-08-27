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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Word Count
                      </label>
                      <Select value={wordCount.toString()} onValueChange={(v) => setWordCount(parseInt(v))} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="750">750 words</SelectItem>
                          <SelectItem value="1000">1000 words</SelectItem>
                          <SelectItem value="1250">1250 words</SelectItem>
                          <SelectItem value="1500">1500 words</SelectItem>
                          <SelectItem value="2000">2000 words</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Links
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

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Link Style
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
                        <li>• Word count: {wordCount}</li>
                        <li>• Links: {linkCount} {useInlineLinks && "(inline)"} {useApaStyle && "(+ references)"}</li>
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
              wordCount={wordCount}
              linkCount={linkCount}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}