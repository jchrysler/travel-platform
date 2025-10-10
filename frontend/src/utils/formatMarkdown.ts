/**
 * Convert markdown-style text to HTML for display
 */
export function formatMarkdownToHtml(text: string): string {
  if (!text) return '';

  let html = text;

  // First, escape any HTML tags to prevent XSS (but not URLs)
  html = html.replace(/<(?![\/]?a(?:>|\s))/g, '&lt;');

  // Convert horizontal rules (---, ***, ___)
  html = html.replace(/^[\-\*\_]{3,}$/gm, '<hr class="my-6 border-t border-border/50" />');

  // Convert headers with better sizing
  html = html.replace(/^#### (.*?)$/gm, '<h4 class="text-base font-semibold mt-4 mb-2">$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');

  // Convert numbered lists with periods (e.g., "1. Item" or "2. Item")
  html = html.replace(/^(\d+)\.\s+(.*)$/gm, (_match, num, content) => {
    return `<div class="flex gap-3 mb-1.5">
      <span class="font-semibold text-base shrink-0">${num}.</span>
      <div class="flex-1">${content}</div>
    </div>`;
  });

  // Convert bold text (but not if it's part of URLs or bullet markers)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Convert italic text (single asterisks, but not bullet points)
  html = html.replace(/(?<![*\n])(\*([^*\n]+)\*)(?!\*)/g, '<em>$2</em>');

  // Convert URLs to clickable links
  html = html.replace(
    /(?:https?:\/\/[^\s<>"]+)/g,
    '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300">$&</a>'
  );

  // Convert email-like patterns to mailto links
  html = html.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300">$1</a>'
  );

  // Handle bullet points with proper indentation - only convert to <ul> if 3+ consecutive bullets
  const lines = html.split('\n');
  let processedLines: string[] = [];

  // First pass: identify bullet runs
  const bulletRuns: Array<{start: number, end: number}> = [];
  let currentRunStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    const isBullet = /^[\*\-\•]\s+/.test(trimmedLine);

    if (isBullet) {
      if (currentRunStart === -1) {
        currentRunStart = i;
      }
    } else if (trimmedLine !== '') {
      if (currentRunStart !== -1) {
        const runLength = i - currentRunStart;
        if (runLength >= 3) {
          bulletRuns.push({start: currentRunStart, end: i - 1});
        }
        currentRunStart = -1;
      }
    }
  }

  // Handle trailing run
  if (currentRunStart !== -1) {
    const runLength = lines.length - currentRunStart;
    if (runLength >= 3) {
      bulletRuns.push({start: currentRunStart, end: lines.length - 1});
    }
  }

  // Second pass: convert to HTML
  let inList = false;
  let listDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const bulletMatch = trimmedLine.match(/^[\*\-\•]\s+(.*)$/);

    // Check if this line is part of a run that should be converted to <ul>
    const inBulletRun = bulletRuns.some(run => i >= run.start && i <= run.end);

    if (bulletMatch && inBulletRun) {
      const content = bulletMatch[1];
      const indent = line.match(/^\s*/)?.[0].length || 0;
      const currentDepth = Math.floor(indent / 2);

      if (!inList || currentDepth > listDepth) {
        processedLines.push('<ul class="list-disc space-y-2 my-1.5 ml-6">');
        inList = true;
        listDepth = currentDepth;
      } else if (currentDepth < listDepth) {
        for (let j = listDepth; j > currentDepth; j--) {
          processedLines.push('</ul>');
        }
        listDepth = currentDepth;
      }

      processedLines.push(`<li class="leading-relaxed">${content}</li>`);
    } else {
      // Close any open lists
      if (inList && trimmedLine !== '') {
        for (let j = listDepth; j >= 0; j--) {
          processedLines.push('</ul>');
        }
        inList = false;
        listDepth = 0;
      }

      // For bullets not in a run, just render as plain text
      if (bulletMatch) {
        processedLines.push(line.replace(/^(\s*)([\*\-\•]\s+)/, '$1'));
      } else {
        processedLines.push(line);
      }
    }
  }

  // Close any remaining open lists
  if (inList) {
    for (let j = listDepth; j >= 0; j--) {
      processedLines.push('</ul>');
    }
  }

  html = processedLines.join('\n');

  // Convert line breaks to paragraphs (but not within lists, headers, or hrs)
  const paragraphs = html.split('\n\n');
  html = paragraphs
    .map(p => {
      const trimmed = p.trim();
      // Don't wrap if it's already an HTML element or empty
      if (trimmed.startsWith('<') || trimmed === '') {
        return trimmed;
      }
      // Add paragraph with proper spacing
      return `<p class="mb-0 leading-relaxed">${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(p => p !== '') // Remove empty paragraphs
    .join('\n');

  return html;
}

/**
 * Parse streaming itinerary data from markdown format
 */
export function parseItineraryFromMarkdown(_text: string): any {
  // This would parse the markdown into structured itinerary data
  // For now, we'll just display the raw formatted text
  return null;
}