import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Copy, 
  Download, 
  Check, 
  FileText, 
  Clock, 
  Link2,
  Hash,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ArticleViewerProps {
  article: string;
  tone: string;
  effort: string;
  model: string;
  wordCount?: number;
  linkCount?: number;
  onReset: () => void;
}

// Enhanced markdown components for article display
const articleComponents = {
  h1: ({ children, ...props }: any) => (
    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-gray-100 leading-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-2xl md:text-3xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-xl md:text-2xl font-medium mt-6 mb-3 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }: any) => (
    <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </p>
  ),
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 underline decoration-1 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-lg leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote 
      className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400"
      {...props}
    >
      {children}
    </blockquote>
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  hr: ({ ...props }: any) => (
    <hr className="my-8 border-gray-200 dark:border-gray-700" {...props} />
  ),
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto font-mono text-sm" {...props}>
        {children}
      </code>
    );
  },
};

export const ArticleViewer: React.FC<ArticleViewerProps> = ({
  article,
  tone,
  effort,
  model,
  wordCount: _wordCount = 1000,
  linkCount: _linkCount = 6,
  onReset
}) => {
  const [copied, setCopied] = useState(false);
  const [actualWordCount, setActualWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [actualLinkCount, setActualLinkCount] = useState(0);

  useEffect(() => {
    // Calculate actual word count
    const words = article.trim().split(/\s+/).length;
    setActualWordCount(words);
    
    // Calculate reading time (average 200 words per minute)
    setReadingTime(Math.ceil(words / 200));
    
    // Count actual links
    const linkMatches = article.match(/\[.*?\]\(.*?\)/g) || [];
    setActualLinkCount(linkMatches.length);
  }, [article]);

  const copyAsMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(article);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAsHTML = async () => {
    try {
      // Convert markdown to HTML (basic conversion)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = article
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
      
      await navigator.clipboard.writeText(tempDiv.innerHTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy as HTML:', err);
    }
  };

  const downloadArticle = () => {
    const blob = new Blob([article], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'article.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Article Metadata Bar */}
      <Card className="mb-6 p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {tone}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime} min read
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {actualWordCount} words
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {actualLinkCount} links
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyAsMarkdown}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy MD
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyAsHTML}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Copy HTML
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadArticle}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              size="sm"
              onClick={onReset}
              className="ml-2"
            >
              New Article
            </Button>
          </div>
        </div>
      </Card>

      {/* Article Content */}
      <Card className="p-8 md:p-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown components={articleComponents}>
            {article}
          </ReactMarkdown>
        </article>
      </Card>

      {/* Article Footer */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Generated with {model} • {effort} effort level • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};