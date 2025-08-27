# Article Generator User Guide

## Overview

This is an AI-powered article generation tool that creates well-researched, properly cited articles on any topic. Originally built by Google as a research project, it's been modified to be more configurable and user-friendly. The system uses Google's Gemini AI models with LangGraph for sophisticated research workflows.

## How It Works

### The Research Pipeline

The article generator follows a sophisticated 4-step process:

1. **Query Generation** - Takes your topic and generates 1-3 targeted search queries
2. **Web Research** - Performs parallel web searches using Google Search API to gather sources
3. **Research Evaluation** - AI evaluates if enough quality information was found, may loop back for more research
4. **Article Writing** - Creates the final article with proper formatting and citations

### Processing Modes (Effort Levels)

- **Low Effort**: 1 search query, 1 research loop (fastest, good for simple topics)
- **Medium Effort**: 2 search queries, 2 research loops (balanced approach)  
- **High Effort**: 3 search queries, 3 research loops (most thorough, best for complex topics)

## Configuration Options

### Basic Settings

**Model Selection:**
- **Gemini 2.0 Flash** ⚡ - Fastest, good for simple articles
- **Gemini 2.5 Flash** ⚡ - Balanced speed and quality (default)
- **Gemini 2.5 Pro** 🧠 - Highest quality, more detailed analysis

**Tone Options:**
- **Professional** - Business publication style (default)
- **Casual** - Conversational, like a knowledgeable friend
- **Academic** - Scholarly with formal language and rigorous analysis
- **Expert** - Highly technical, industry expert addressing peers

### Article Length

**Word Count Options:** 200, 500, 750, 1000, 1200, 1500, 2000 words

**How Length Control Works:**
- The system uses prompt engineering to target your specified word count
- Instructions tell the AI: "Write approximately {word_count} words - aim for this target length"
- Results are usually within 10-15% of target length
- Longer articles allow for more detailed exploration of subtopics

### Citation and Link Management

**Link Count:** 0-15 links (common options: 0, 2, 4, 6, 8, 10, 15)

**Citation Styles:**

**Inline Links** (checkbox):
- ✅ **Enabled**: Links embedded naturally within article text using markdown format
- Example: "According to [recent research](https://example.com), renewable energy costs have dropped 85%"
- Links placed immediately after claims they support
- Focuses on key statistics, major claims, and expert opinions

**APA Style** (checkbox):
- ✅ **Enabled**: Adds formal "Sources" section at end of article
- Numbered list with full URLs and relevance descriptions
- Professional academic format

**Citation Combinations:**
- **Both enabled**: Article has inline links + formal sources section
- **Only inline**: Clean article with embedded links
- **Only APA**: Article without inline links but formal bibliography
- **Neither**: Pure content focus, no citations

### Advanced Configuration

**Custom Persona** (optional text field):
This is the most powerful customization option. When provided:

- **Takes precedence** over tone settings (appears as "PERSONA OVERRIDE" in prompts)
- **Works alongside** tone settings (both are applied)
- Use this to specify exact writing style, audience, or special requirements

Example custom personas:
```
You are a technical blogger writing for software developers. 
Focus on practical examples and avoid marketing language. 
Use a conversational tone and include actionable insights.
```

```
You are a financial analyst writing for institutional investors. 
Include specific data points, avoid speculation, and focus on 
quantitative analysis with clear risk assessments.
```

## How Parameters Flow Through the System

### Frontend → Backend Flow

1. **User Input**: You configure settings in the web interface
2. **Parameter Collection**: Frontend gathers all settings (tone, length, links, etc.)
3. **API Call**: Settings sent to backend via LangGraph streaming API
4. **State Management**: Backend stores parameters in `OverallState` object
5. **Research Phase**: Parameters guide search strategy and source evaluation
6. **Writing Phase**: All parameters integrated into final article generation prompt

### Prompt Engineering

The system uses sophisticated prompt engineering rather than post-processing to enforce your specifications:

- **Tone**: Converted to detailed style descriptions ("professional and authoritative, suitable for business publications")
- **Length**: Direct instruction to AI ("Write approximately 1000 words")
- **Citations**: Dynamic instructions based on your link preferences
- **Persona**: Inserted at top of prompt as override instructions

## URL Configuration

You can also configure the tool via URL parameters for bookmarking specific setups:

```
?wordCount=1500&linkCount=8&useInlineLinks=true&useApaStyle=false&persona=You%20are%20a%20tech%20journalist
```

## Tips for Best Results

### Topic Selection
- **Specific topics** work better than very broad ones
- **Current topics** get better source material than historical ones
- **Include context** - instead of "AI", try "AI in healthcare diagnostics"

### Effort Level Guidelines
- **Low**: Simple explanatory articles, well-known topics
- **Medium**: Topics requiring multiple perspectives or recent developments  
- **High**: Complex subjects, controversial topics, cutting-edge research

### Citation Strategy
- **0-2 links**: Opinion pieces, general overviews
- **4-6 links**: Standard informational articles
- **8-15 links**: Research-heavy pieces, fact-intensive topics

### Custom Persona Examples
- **Blog posts**: "Write like a friendly expert sharing insights with peers"
- **White papers**: "Technical authority addressing C-level executives" 
- **Educational content**: "Patient teacher explaining complex concepts to beginners"

## Technical Notes

### Research Quality
- Sources are evaluated for authority and relevance
- System may loop back for additional research if initial sources are insufficient
- Google Search API provides real-time, current information

### Output Quality
- Articles include proper structure (headers, paragraphs, conclusions)
- Citations are contextually relevant and properly placed
- Tone consistency maintained throughout the article

### Limitations
- Length targeting is approximate (±10-15% typical variance)
- Link count is approximate - AI may include slightly more/fewer based on content needs
- Research depth depends on publicly available sources
- Very recent events (last 24-48 hours) may have limited source material

This tool is designed to be a sophisticated research assistant, not just a content generator. The multi-stage research process and configurable output options make it suitable for professional content creation, research projects, and educational materials.