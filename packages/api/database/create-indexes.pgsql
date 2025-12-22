-- Performance indexes for Strapi 5 play14-api
-- Run this script manually against your PostgreSQL database
-- These indexes will NOT be managed by Strapi and will persist

-- =====================================================
-- SLUG INDEXES (most common lookup pattern)
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_slug
  ON public.articles(slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_slug
  ON public.events(slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_slug
  ON public.players(slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_slug
  ON public.games(slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_slug
  ON public.venues(slug);

-- =====================================================
-- PUBLISHED_AT INDEXES (filtering published content)
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_published_at
  ON public.articles(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_published_at
  ON public.events(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_published_at
  ON public.players(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_published_at
  ON public.games(published_at) WHERE published_at IS NOT NULL;

-- =====================================================
-- COMPOSITE INDEXES (slug + published_at for common queries)
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_slug_published
  ON public.articles(slug, published_at) WHERE published_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_slug_published
  ON public.events(slug, published_at) WHERE published_at IS NOT NULL;

-- =====================================================
-- STRAPI INTERNAL TABLES (API token lookups are frequent)
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_tokens_access_key
  ON public.strapi_api_tokens(access_key);

-- =====================================================
-- LINK/JOIN TABLES (relation lookups)
-- =====================================================
-- Articles relations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_author_lnk_article
  ON public.articles_author_lnk(article_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_author_lnk_player
  ON public.articles_author_lnk(player_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_tags_lnk_article
  ON public.articles_tags_lnk(article_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_tags_lnk_tag
  ON public.articles_tags_lnk(tag_id);

-- Files/Media relations (used for all media lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_related_mph_related
  ON public.files_related_mph(related_id, related_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_related_mph_file
  ON public.files_related_mph(file_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_related_mph_field
  ON public.files_related_mph(field);

-- Events relations (attended, hosted, mentored)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_attended_lnk_event
  ON public.events_attended_lnk(event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_attended_lnk_player
  ON public.events_attended_lnk(player_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_hosted_lnk_event
  ON public.events_hosted_lnk(event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_hosted_lnk_player
  ON public.events_hosted_lnk(player_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_mentored_lnk_event
  ON public.events_mentored_lnk(event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_mentored_lnk_player
  ON public.events_mentored_lnk(player_id);

-- =====================================================
-- VERIFY INDEXES CREATED
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
