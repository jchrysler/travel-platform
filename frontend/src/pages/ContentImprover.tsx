import { useState, useCallback } from "react";
import { ArticleViewer } from "@/components/ArticleViewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RefreshCw, FileEdit, AlertCircle, CheckCircle } from "lucide-react";

export default function ContentImprover() {
  const [originalContent, setOriginalContent] = useState("");
  const [issues, setIssues] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("professional");
  const [wordCount, setWordCount] = useState(1000);
  const [linkCount, setLinkCount] = useState(5);
  const [improvedContent, setImprovedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<{
    issues_found: string[];
    improvements_made: string[];
    compliance_status: string;
  } | null>(null);

  const handleImprove = useCallback(async () => {
    if (!originalContent.trim()) return;
    
    setImprovedContent("");
    setAnalysis(null);
    setError("");
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.DEV
        ? "http://localhost:2024"
        : window.location.origin;

      const response = await fetch(`${apiUrl}/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_content: originalContent,
          issues_to_address: issues,
          target_keywords: keywords,
          article_tone: tone,
          word_count: wordCount,
          link_count: linkCount,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.improved_content) {
        setImprovedContent(data.improved_content);
        setAnalysis(data.analysis || null);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err) {
      console.error("Error improving content:", err);
      setError(err instanceof Error ? err.message : "Failed to improve content");
    } finally {
      setIsLoading(false);
    }
  }, [originalContent, issues, keywords, tone, wordCount, linkCount]);

  const handleRegenerate = useCallback(() => {
    if (originalContent.trim()) {
      handleImprove();
    }
  }, [handleImprove, originalContent]);

  const handleReset = useCallback(() => {
    setOriginalContent("");
    setIssues("");
    setKeywords("");
    setImprovedContent("");
    setAnalysis(null);
    setError("");
    setIsLoading(false);
  }, []);

  const currentWordCount = originalContent.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2">
          <FileEdit className="h-8 w-8" />
          Content Improver
        </h1>
        <p className="text-muted-foreground">
          Enhance existing content for compliance, add sources, and improve claims substantiation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <h2 className="text-xl font-semibold mb-4">Content Analysis</h2>
            
            <div className="space-y-4">
              {/* Original Content Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Paste Your Content
                  {currentWordCount > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({currentWordCount} words)
                    </span>
                  )}
                </label>
                <Textarea
                  placeholder="Paste the content you want to improve..."
                  value={originalContent}
                  onChange={(e) => setOriginalContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isLoading}
                />
              </div>

              {/* Issues/Comments Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Issues to Address
                </label>
                <Textarea
                  placeholder="E.g., Ad rejected: claims not substantiated, needs more evidence for benefits, compliance issues..."
                  value={issues}
                  onChange={(e) => setIssues(e.target.value)}
                  className="min-h-[100px]"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe compliance issues, missing evidence, or improvements needed
                </p>
              </div>

              {/* Keywords Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Keywords (SEO)
                </label>
                <Input
                  placeholder="E.g., product benefits, compliance, evidence-based"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              {/* Configuration Grid */}
              <div className="grid grid-cols-2 gap-3">
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

                {/* Target Word Count */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Target Length
                  </label>
                  <Select value={wordCount.toString()} onValueChange={(v) => setWordCount(parseInt(v))} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500</SelectItem>
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
                    Evidence Links
                  </label>
                  <Select value={linkCount.toString()} onValueChange={(v) => setLinkCount(parseInt(v))} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 sources</SelectItem>
                      <SelectItem value="5">5 sources</SelectItem>
                      <SelectItem value="8">8 sources</SelectItem>
                      <SelectItem value="10">10 sources</SelectItem>
                      <SelectItem value="15">15 sources</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {!improvedContent ? (
                  <Button 
                    onClick={handleImprove}
                    disabled={!originalContent.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Analyzing & Improving..." : "Analyze & Improve"}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={handleRegenerate}
                      disabled={!originalContent.trim() || isLoading}
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
                    <span>Analyzing content and researching improvements...</span>
                  </div>
                  <p className="text-xs">This may take 30-60 seconds</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Content Display */}
        <div className="lg:col-span-2">
          {improvedContent ? (
            <div className="space-y-4">
              {/* Analysis Results */}
              {analysis && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Content Analysis
                  </h3>
                  
                  <div className="space-y-4">
                    {analysis.issues_found && analysis.issues_found.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-orange-600 dark:text-orange-400">
                          Issues Found:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {analysis.issues_found.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.improvements_made && analysis.improvements_made.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-green-600 dark:text-green-400">
                          Improvements Made:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {analysis.improvements_made.map((improvement, i) => (
                            <li key={i}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.compliance_status && (
                      <div className="flex items-center gap-2 pt-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium">
                          Compliance Status: {analysis.compliance_status}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Improved Content */}
              <ArticleViewer
                article={improvedContent}
                tone={tone}
                effort="high"
                model="gemini-2.5-flash"
                wordCount={wordCount}
                linkCount={linkCount}
                onReset={handleReset}
              />
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <FileEdit className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-semibold mb-2">Ready to Improve</h3>
              <p className="text-sm max-w-md mx-auto">
                Paste your existing content, describe any compliance issues or improvements needed, 
                then click Analyze & Improve to enhance it with proper sources and evidence.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}