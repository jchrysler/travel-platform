/**
 * Convert markdown-style text to HTML for display
 */
export function formatMarkdownToHtml(text: string): string {
  if (!text) return '';

  let html = text;

  // Convert headers
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>');

  // Convert bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Convert italic text
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert bullet points
  html = html.replace(/^\* (.*?)$/gm, '<li class="ml-4 mb-1">• $1</li>');
  html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 mb-1">• $1</li>');

  // Wrap consecutive list items in ul
  html = html.replace(/(<li.*?<\/li>\n?)+/g, (match) => {
    return `<ul class="space-y-1 my-2">${match}</ul>`;
  });

  // Convert line breaks to paragraphs
  const paragraphs = html.split('\n\n');
  html = paragraphs
    .map(p => {
      // Don't wrap if it's already an HTML element
      if (p.trim().startsWith('<')) {
        return p;
      }
      // Don't wrap empty lines
      if (p.trim() === '') {
        return '';
      }
      // Wrap in paragraph
      return `<p class="mb-3">${p}</p>`;
    })
    .join('');

  // Convert single line breaks to <br> within paragraphs
  html = html.replace(/\n/g, '<br />');

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