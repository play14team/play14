---
name: enrich-linkedin
description: Enrich player profiles from LinkedIn data. Use this when asked to "enrich profiles", "update from LinkedIn", "sync LinkedIn data", or "fetch LinkedIn info for players".
---

# LinkedIn Profile Enrichment

You are helping enrich play14 player profiles with data from LinkedIn.

## Workflow

1. **List Players with LinkedIn** - Use `list_players_with_linkedin` tool to find players who have LinkedIn URLs
2. **For Each Player** (or specific ones requested):
   a. Use `scrape_linkedin_profile` tool to fetch their LinkedIn data
   b. **Compare Photos** - If both current avatar and LinkedIn photo exist, describe both and recommend which is better (consider professionalism, quality, friendliness)
   c. **Enhance Bio** - Take LinkedIn summary and rewrite it for the play14 community (friendly, focused on agile games and facilitation)
   d. **Validate Data** - Check if the LinkedIn data seems to match the player (name similarity, etc.)
   e. **Present Changes** - Show the user what would change and ask for confirmation
   f. Use `update_player` tool to save approved changes

## Field Mappings

- `company` ← LinkedIn current company
- `tagline` ← LinkedIn headline
- `bio` ← LinkedIn summary (convert to simple HTML paragraphs, enhance for community context)
- `website` ← LinkedIn personal website (if available)
- `avatar` ← LinkedIn profile photo (if better quality)

## Bio Conversion Rules

When converting LinkedIn bio to HTML:
1. Split paragraphs by double newlines
2. Wrap each paragraph in `<p>` tags
3. NO styling, NO markdown, just simple `<p>` tags
4. Make it friendly and approachable for the play14 community
5. Remove corporate jargon

Example:
```
Input: "Senior Agile Coach at TechCorp.\n\nHelping teams deliver value."
Output: <p>Senior Agile Coach helping teams deliver value through playful learning.</p>
```

## Important Notes

- Always ask for confirmation before updating
- Show photo comparison with your recommendation
- If scraping fails, report the error and continue with next player
- Respect rate limits - process one player at a time
