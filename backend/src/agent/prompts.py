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


def get_citation_instructions(use_inline_links: bool, use_apa_style: bool, link_count: int) -> str:
    """Generate citation instructions based on selected link styles."""
    instructions = []
    
    if use_inline_links:
        instructions.append(f"- Naturally embed {link_count} hyperlinks throughout the article")
        instructions.append("- Link relevant keywords, statistics, and claims to their sources")
        instructions.append("- Distribute links evenly throughout the article")
        instructions.append("- Choose the most authoritative sources from your research")
    
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
def post_process_article(article_text: str) -> str:
    """Clean up common AI writing patterns to make content more human."""
    
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
    }
    
    result = article_text
    
    # Replace AI patterns
    for pattern, replacement in ai_patterns.items():
        result = result.replace(pattern, replacement)
        # Also handle lowercase versions
        result = result.replace(pattern.lower(), replacement.lower())
    
    # Remove double spaces
    result = " ".join(result.split())
    
    # Fix multiple line breaks (more than 2 consecutive)
    while "\n\n\n" in result:
        result = result.replace("\n\n\n", "\n\n")
    
    return result