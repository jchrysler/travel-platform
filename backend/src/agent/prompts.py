from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


def get_tone_description(tone: str) -> str:
    """Convert tone selection to detailed description for prompts."""
    tone_descriptions = {
        "professional": "professional yet accessible, balancing expertise with readability",
        "casual": "conversational and friendly, using everyday language while maintaining accuracy",
        "academic": "scholarly and analytical, with detailed explanations and formal structure",
        "expert": "technical and sophisticated, assuming advanced knowledge of the subject"
    }
    return tone_descriptions.get(tone, "professional yet accessible")


def get_persona_instructions(custom_persona: str) -> str:
    """Format custom persona instructions for the prompt."""
    if custom_persona.strip():
        return f"Writing Persona: {custom_persona.strip()}\n\n"
    return ""


def get_keyword_instructions(keywords: str) -> str:
    """Format keyword optimization instructions."""
    if not keywords or not keywords.strip():
        return ""
    
    keyword_list = [k.strip() for k in keywords.split(',') if k.strip()]
    if not keyword_list:
        return ""
    
    primary = keyword_list[0]
    secondary = keyword_list[1:] if len(keyword_list) > 1 else []
    
    instructions = [f"PRIMARY KEYWORD TO OPTIMIZE FOR: {primary}"]
    if secondary:
        instructions.append(f"SECONDARY KEYWORDS: {', '.join(secondary)}")
    
    instructions.extend([
        "\nKEYWORD OPTIMIZATION REQUIREMENTS:",
        f"- The title MUST include '{primary}' naturally",
        "- Use the primary keyword in the first paragraph",
        "- Include keywords naturally throughout (1-2% density)",
        "- Use semantic variations and related terms",
        "- Ensure keywords appear in at least 2 subheadings\n"
    ])
    
    return "\n".join(instructions)


def get_citation_instructions(use_inline_links: bool, use_apa_style: bool, link_count: int) -> str:
    """Generate citation instructions based on selected link styles."""
    instructions = []

    if use_inline_links:
        instructions.append(f"\nCITATION FORMAT:")
        instructions.append(f"- Include exactly {link_count} inline hyperlinks in the article")
        instructions.append("- Use proper markdown link format: [descriptive text](URL)")
        instructions.append("- Example: According to [recent research by MIT](https://example.com), electric vehicles...")
        instructions.append("- Link relevant keywords, statistics, brand names, and claims to sources")
        instructions.append("- Distribute links evenly throughout the article")
        instructions.append("- Choose the most authoritative sources from your research")
        instructions.append("- DO NOT just put bare URLs - always use [text](url) format")

    if use_apa_style:
        instructions.append("\n## References")
        instructions.append("- Add a 'References' section at the end")
        instructions.append("- List sources in a clean, numbered format")
        instructions.append("- Format: [1] Source Title - URL")

    if not use_inline_links and not use_apa_style:
        instructions.append("- Do not include any citations or source links")

    return "\n".join(instructions)


# Improved query generation
query_writer_instructions = """Generate targeted search queries to research "{research_topic}" for a {word_count}-word article.

{keyword_instructions}

Create {number_queries} specific queries that will find:
1. Current data and statistics (include year 2024/2025)
2. Expert opinions and authoritative sources
3. Real-world examples and case studies
4. Recent developments and trends
5. Practical applications or solutions

Current date: {current_date}

Format as JSON:
{{
    "rationale": "Brief strategy explanation",
    "query": ["query 1", "query 2", "query 3"]
}}

Topic: {research_topic}"""


# Improved web search instructions
web_searcher_instructions = """Research "{research_topic}" comprehensively for article creation.

Focus on finding:
- Current statistics and data (prioritize 2024-2025)
- Expert quotes and authoritative perspectives  
- Specific examples and case studies
- Practical information readers can use
- Unique insights not commonly known

Current date: {current_date}

Gather diverse, credible information from your searches. Include specific facts, figures, and quotes when available.

Topic: {research_topic}"""


# Simplified reflection
reflection_instructions = """Assess if research on "{research_topic}" is sufficient for a {word_count}-word article.

Check for:
- Enough concrete facts and data
- Diverse perspectives covered
- Current/recent information
- Practical examples included

Output JSON:
{{
    "is_sufficient": true/false,
    "knowledge_gap": "what's missing if insufficient",
    "follow_up_queries": ["additional query if needed"]
}}

Research gathered:
{summaries}"""


# Completely redesigned article generation prompt
answer_instructions = """Write a {word_count}-word article about "{research_topic}".

{keyword_instructions}

{persona_instructions}CRITICAL WRITING RULES:
1. Write naturally - vary sentence length, use contractions, be conversational
2. NO AI patterns: no "delve", "moreover", "furthermore", "in conclusion", no em-dashes
3. Start paragraphs differently - not all with the subject
4. Include specific numbers, dates, examples from research
5. Write like a human expert sharing knowledge, not a robot listing facts

ARTICLE STRUCTURE:

# [Compelling Title - Include Main Keyword Naturally]

[Opening paragraph - 40-60 words]
Start with a surprising fact, question, or scenario. Draw readers in immediately. Make them care about this topic.

## [First Major Section]
Lead with your strongest information. Include specific data or expert insight early. Break up text with:
- Bullet points for lists
- Short paragraphs (2-4 sentences)
- Concrete examples

## [Second Major Section]  
Expand with different angle or deeper dive. Add variety:
- Mix short and long sentences
- Include a relevant statistic
- Share a brief example or case study

## [Third Major Section]
Practical applications or forward-looking content:
- What this means for readers
- How to apply this information
- Future trends or implications

## [Additional Sections as Needed]
Continue building your argument with fresh perspectives and supporting evidence.

[Closing paragraph]
End with insight, not summary. Give readers something to think about or act on.

{citation_instructions}

TONE: {tone_voice}

Use research below but write originally. Make it engaging, informative, and valuable.

Research Available:
{summaries}

Remember: Write like you're explaining to a smart friend, not lecturing a classroom. Keep it natural, interesting, and human."""


# Add post-processing function to clean AI artifacts
def post_process_article(article_text: str, link_count: int = 10) -> str:
    """Clean up common AI writing patterns to make content more human.

    Args:
        article_text: The article text to clean up
        link_count: Maximum number of links to keep in the article
    """
    import re

    # List of AI giveaway phrases to remove or replace
    ai_patterns = {
        "Moreover,": "Also,",
        "Furthermore,": "Plus,",
        "Nevertheless,": "Still,",
        "In conclusion,": "",
        "In summary,": "",
        "It's worth noting that": "",
        "It should be noted that": "",
        "delve into": "explore",
        "delving into": "exploring",
        "a myriad of": "many",
        "plethora of": "many",
        "whilst": "while",
        "utilize": "use",
        "commence": "start",
        "nevertheless": "but",
        "however,": "But",
        "On the other hand,": "But",
        "on the other hand,": "but",
        "In contrast,": "",
        "in contrast,": "",
        "Conversely,": "But",
        "conversely,": "but",
        "Additionally,": "Also,",
        "additionally,": "also,",
    }
    
    result = article_text

    # Replace AI patterns
    for pattern, replacement in ai_patterns.items():
        result = result.replace(pattern, replacement)
        # Also handle lowercase versions
        result = result.replace(pattern.lower(), replacement.lower())

    # Fix overly long anchor text in markdown links
    def shorten_link_text(match):
        text = match.group(1)
        url = match.group(2)
        words = text.split()
        # If more than 4 words, keep first 2-3 most important words
        if len(words) > 4:
            # Try to keep important words (capitalized, numbers)
            important_words = [w for w in words if w[0].isupper() or any(c.isdigit() for c in w)]
            if important_words:
                text = ' '.join(important_words[:3])
            else:
                text = ' '.join(words[:3])
        return f"[{text}]({url})"

    result = re.sub(r'\[([^\]]{30,})\]\(([^)]+)\)', shorten_link_text, result)

    # Reduce excessive em-dashes (limit to 2 per article)
    em_dash_count = result.count('—')
    if em_dash_count > 2:
        # Replace extra em-dashes with commas or periods based on context
        replacements_made = 0
        lines = result.split('\n')
        for i, line in enumerate(lines):
            while '—' in line and replacements_made < (em_dash_count - 2):
                # If em-dash is at end of sentence, use period
                if line.find('—') < len(line) - 1 and line[line.find('—')+1:].strip().startswith(tuple('ABCDEFGHIJKLMNOPQRSTUVWXYZ')):
                    line = line.replace('—', '.', 1)
                else:
                    line = line.replace('—', ',', 1)
                replacements_made += 1
            lines[i] = line
            if replacements_made >= (em_dash_count - 2):
                break
        result = '\n'.join(lines)

    # Clean up URL dumps and enforce link count limit
    lines = result.split('\n')
    processed_lines = []
    links_found = []
    references_section = False

    for line in lines:
        # Detect references/links section
        if re.match(r'^(References|Sources|Links|Citations)', line, re.IGNORECASE):
            references_section = True

        # Find all links in the line
        line_links = re.findall(r'\[([^\]]+)\]\((https?://[^)]+)\)', line)
        line_links.extend(re.findall(r'(https?://[^\s]+)', line))

        # If we're in references section and have too many links, limit them
        if references_section and len(links_found) >= link_count:
            # Skip lines that are just URLs or reference entries
            if re.match(r'^\[?\d+\]?\s*https?://', line):
                continue
            if re.match(r'^https?://', line):
                continue

        links_found.extend(line_links)
        processed_lines.append(line)

    result = '\n'.join(processed_lines)

    # Remove consecutive blank lines that may have been created
    while '\n\n\n' in result:
        result = result.replace('\n\n\n', '\n\n')
    
    # Ensure proper spacing around headers
    lines = result.split('\n')
    processed_lines = []
    
    for i, line in enumerate(lines):
        # Add spacing before headers (except the first one)
        if line.startswith('#') and i > 0 and processed_lines and processed_lines[-1].strip():
            processed_lines.append('')  # Add blank line before header
        processed_lines.append(line)
        # Add spacing after headers
        if line.startswith('#'):
            if i < len(lines) - 1 and lines[i + 1].strip() and not lines[i + 1].startswith('#'):
                processed_lines.append('')  # Add blank line after header
    
    result = '\n'.join(processed_lines)
    
    # Fix multiple line breaks (more than 2 consecutive)
    while "\n\n\n" in result:
        result = result.replace("\n\n\n", "\n\n")
    
    # Ensure there's a blank line after the title
    if result.startswith('#'):
        lines = result.split('\n', 2)
        if len(lines) > 1 and lines[1].strip():
            result = lines[0] + '\n\n' + '\n'.join(lines[1:])
    
    return result


# Content Improvement Prompts

content_analysis_prompt = """You are a content compliance and quality analyst. Analyze the following content and identify:

Original Content:
{original_content}

Issues Reported:
{issues_to_address}

Target Keywords (if any):
{target_keywords}

Please analyze and identify:
1. Unsubstantiated claims that need evidence
2. Compliance issues or problematic statements
3. Missing information or gaps in the content
4. Areas that need stronger evidence or citations
5. Keyword optimization opportunities

Return a detailed analysis with specific issues that need to be addressed."""

content_improvement_prompt = """You are an expert content improver specializing in compliance and evidence-based writing.

Original Content:
{original_content}

Content Analysis:
{content_analysis}

Research Results:
{research_results}

Target Keywords: {target_keywords}
Tone: {tone_description}
Target Word Count: {word_count}
Target Link Count: {link_count}

Your task:
1. Rewrite the content to address all identified issues
2. Add proper citations and evidence for all claims
3. Ensure compliance-friendly language
4. Naturally incorporate target keywords (if provided)
5. Maintain the specified tone
6. Include {link_count} relevant source links
7. Target approximately {word_count} words

Format the improved content with:
- Clear structure and headings
- Inline citations using markdown format: [descriptive text](URL)
- Example: According to [a Harvard study](https://example.com), meditation improves focus
- Natural keyword integration
- Evidence-based statements
- Compliance-friendly language
- ALWAYS use [text](url) format for links, never bare URLs

{citation_instructions}

Return the fully improved article with all sources properly cited."""

compliance_check_prompt = """You are a compliance officer reviewing content for substantiation and accuracy.

Review this improved content:
{improved_content}

Original Issues:
{issues_to_address}

Verify that:
1. All claims are properly substantiated with evidence
2. No misleading or exaggerated statements remain
3. Compliance issues have been resolved
4. Sources are credible and properly cited
5. Content meets advertising/compliance standards

Return a compliance assessment indicating whether the content is now compliant and any remaining concerns."""