/**
 * Convert markdown-style text to HTML for display
 */
export function formatMarkdownToHtml(text: string): string {
  if (!text) return '';

  let html = text;

  // First, escape any existing HTML to prevent XSS
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Convert headers (must be at start of line)
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>');

  // Convert bold text (but not if it's already part of a bullet point marker)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Convert italic text (single asterisks, but not bullet points)
  html = html.replace(/(?<!\*)(\*([^*\n]+)\*)(?!\*)/g, '<em>$2</em>');

  // Handle bullet points more carefully - remove the marker and wrap in proper list items
  // First, identify consecutive bullet points
  const lines = html.split('\n');
  let inList = false;
  let processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBullet = /^[\*\-\•]\s+/.test(line.trim());

    if (isBullet) {
      // Remove the bullet marker and any leading spaces
      const content = line.trim().replace(/^[\*\-\•]\s+/, '');

      if (!inList) {
        processedLines.push('<ul class="list-disc list-inside space-y-1 my-2 ml-4">');
        inList = true;
      }
      processedLines.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }

  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }

  html = processedLines.join('\n');

  // Convert line breaks to paragraphs (but not within lists or headers)
  const paragraphs = html.split('\n\n');
  html = paragraphs
    .map(p => {
      const trimmed = p.trim();
      // Don't wrap if it's already an HTML element or empty
      if (trimmed.startsWith('<') || trimmed === '') {
        return trimmed;
      }
      // Don't wrap single line breaks that are within a paragraph
      return `<p class="mb-3">${trimmed.replace(/\n/g, '<br />')}</p>`;
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