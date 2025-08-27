from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


def get_tone_description(tone: str) -> str:
    """Convert tone selection to detailed description for prompts."""
    tone_descriptions = {
        "professional": "professional and authoritative, suitable for business publications",
        "casual": "conversational and approachable, like a knowledgeable friend explaining the topic",
        "academic": "scholarly and formal, with rigorous analysis and academic language",
        "expert": "highly technical and authoritative, like an industry expert addressing peers"
    }
    return tone_descriptions.get(tone, "professional and authoritative")


def get_persona_instructions(custom_persona: str) -> str:
    """Format custom persona instructions for the prompt."""
    if custom_persona.strip():
        return f"PERSONA OVERRIDE: {custom_persona.strip()}\n"
    return ""


def get_citation_instructions(use_inline_links: bool, use_apa_style: bool, link_count: int) -> str:
    """Generate citation instructions based on selected link styles."""
    instructions = []
    
    if use_inline_links:
        instructions.append(f"  * The system will automatically make relevant facts and claims clickable")
        instructions.append("  * DO NOT add manual source citations like '[Source: Name]' - the system handles this automatically")
        instructions.append("  * Write naturally and include specific facts, statistics, and expert opinions")
        instructions.append("  * The citation system will make the relevant text clickable behind the scenes")
    
    if use_apa_style:
        instructions.append("  * Include a 'Sources' section at the end with:")
        instructions.append("    - Numbered list of sources as simple hyperlinks")
        instructions.append("    - Format: 1. [Source Title](URL)")
        instructions.append("    - Keep formatting minimal and clean")
    
    if not use_inline_links and not use_apa_style:
        instructions.append("  * No citations required - focus on creating engaging content")
    
    instructions.append("  * Do not add manual source attributions like '[Source: Website]' or similar - write clean prose")
    instructions.append("  * Maintain journalistic integrity by including specific, factual information")
    
    return "\n".join(instructions)


query_writer_instructions = """Your goal is to generate focused web search queries for article research. These queries are intended for gathering information to create a concise, well-sourced article of {word_count} words.

Instructions:
- Generate queries that will gather focused information for a concise article on the topic
- The first query should be the primary commercial keyword phrase (2-4 words) that represents the main search intent
- Subsequent queries should target different aspects: current events, expert opinions, data/statistics, case studies, trends, and background information
- Don't produce more than {number_queries} queries
- Prioritize queries that will yield authoritative, credible sources suitable for article citations and commercial relevance
- Include queries for recent developments and historical context when relevant
- Query should ensure that the most current information is gathered. The current date is {current_date}

Format: 
- Format your response as a JSON object with ALL three of these exact keys:
   - "rationale": Brief explanation of why these queries will provide comprehensive article material
   - "query": A list of search queries designed for article research

Example:

Topic: The impact of AI on modern healthcare
```json
{{
    "rationale": "To create a focused article on AI in healthcare, we need key perspectives covering current applications, statistical impact, and expert opinions. These queries target authoritative sources suitable for article citations.",
    "query": ["AI healthcare applications 2024 medical diagnosis treatment", "artificial intelligence healthcare statistics outcomes data 2024", "AI medical technology expert opinions healthcare professionals", "healthcare AI implementation case studies hospitals 2024"],
}}
```

Context: {research_topic}"""


web_searcher_instructions = """Conduct targeted Google Searches to gather comprehensive, credible information on "{research_topic}" for article creation.

Instructions:
- Query should ensure that the most current information is gathered. The current date is {current_date}
- Focus on gathering information suitable for a detailed, well-sourced article and optimizing for commercial intent
- Prioritize authoritative sources: news outlets, academic sources, industry reports, expert interviews
- Prioritize sources that include: product reviews, comparison articles, industry reports with market data, vendor websites, case studies with ROI data
- Look for pricing information, feature comparisons, and user testimonials when relevant
- Consolidate key findings while meticulously tracking the source(s) for each specific piece of information
- Look for diverse perspectives, data points, examples, and case studies that would enrich an article, but focus on consumer appeal
- The output should be a comprehensive research summary with detailed information suitable for article writing
- Only include information found in the search results, don't make up any information
- Include specific quotes, statistics, and expert opinions when available

Research Topic:
{research_topic}
"""

reflection_instructions = """You are an expert article editor analyzing research summaries about "{research_topic}" to determine if we have sufficient material for a concise, well-sourced article of 750-1200 words.

Instructions:
- Evaluate if the research provides enough key information for a focused article with 3-4 strong sources
- Consider whether we have: diverse perspectives, supporting data/statistics, expert opinions, real-world examples, current trends, and historical context
- If information is insufficient for a quality article, identify specific gaps and generate targeted follow-up queries
- Focus on areas that would strengthen the article: case studies, expert insights, recent developments, or missing viewpoints
- Prioritize follow-up queries that will yield authoritative, quotable sources

Requirements:
- Ensure the follow-up query is self-contained and includes necessary context for web search.

Output Format:
- Format your response as a JSON object with these exact keys:
   - "is_sufficient": true or false
   - "knowledge_gap": Describe what information is missing or needs clarification
   - "follow_up_queries": Write a specific question to address this gap

Example:
```json
{{
    "is_sufficient": true, // or false
    "knowledge_gap": "The summary lacks information about performance metrics and benchmarks", // "" if is_sufficient is true
    "follow_up_queries": ["What are typical performance benchmarks and metrics used to evaluate [specific technology]?"] // [] if is_sufficient is true
}}
```

Reflect carefully on the Summaries to identify knowledge gaps and produce a follow-up query. Then, produce your output following this JSON format:

Summaries:
{summaries}
"""

answer_instructions = """You are an expert content writer creating a high-quality article on "{research_topic}" based on focused research.

{persona_instructions}

Instructions:
- Write a well-structured, engaging article suitable for publication on a professional blog or magazine
- This is an effort to SEO for commercially important and relevant terms, so whenever possible, optimize copy for words that are commercial in nature
- Use a {tone_voice} tone throughout the article
- Structure the article with proper Markdown formatting:
  * Start with an engaging H1 title that includes the primary commercial keyword and captures the essence of the topic
  * Use H2 headers for main sections (adjust based on article length)
  * Use H3 headers for subsections where appropriate
  * Include bullet points or numbered lists to break up dense text
  * Use bold text very sparingly - only for the most critical terms or section highlights
  * Use italics occasionally for emphasis when it feels natural

- Content Requirements:
  * Write approximately {word_count} words - aim for this target length
  * Include an engaging introduction of between 37 and 55 words that hooks the reader, establishes why this topic matters, and naturally incorporates the primary keyword
  * Provide detailed explanations with supporting evidence from your research
  * Include specific examples, case studies, or real-world applications when available
  * Incorporate expert quotes and insights when found in the research
  * Include relevant statistics and data points to support claims
  * Naturally integrate commercial keywords throughout the content without keyword stuffing (aim for 1-2% keyword density)
  * Include semantic keywords and related terms that support the main commercial intent
  * End with a thoughtful conclusion that synthesizes key insights and implications

- Citation Requirements:
{citation_instructions}

- Writing Style:
  * Write in a {tone_voice} manner appropriate for web publication that is accessible to a broad audience
  * Use active voice when possible to create more engaging content
  * Vary sentence length and structure for improved readability
  * Include smooth transitions between sections and ideas
  * Make complex topics understandable without oversimplifying
  * Avoid em-dashes, they are a dead giveaway that AI has produced the writing
  * Avoid excessive use of contrasts (e.g. this isn't X, it's Y) as a rhetorical device. It's cloying
  * Minimize bold formatting - write naturally without over-emphasizing keywords through formatting
  * Focus on clear, readable prose rather than heavy formatting
  * Never add manual source citations like '[Source: Name]' - write clean, natural text

Current date: {current_date}
Article Topic: {research_topic}

Research Summaries:
{summaries}"""
