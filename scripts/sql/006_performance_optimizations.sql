-- WordifyAI Performance Optimizations
-- Created by Autonomous R&D Agent - Database Performance Enhancement
-- Run this after the existing schema migrations

-- =====================================================
-- ADVANCED INDEXING STRATEGY
-- =====================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_words_user_list_learned 
ON public.words(user_id, list_id, learned) 
WHERE learned = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_words_user_created_learned 
ON public.words(user_id, created_at DESC, learned) 
INCLUDE (text, note);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_words_last_reviewed 
ON public.words(user_id, last_reviewed_at ASC NULLS FIRST) 
WHERE learned = false;

-- Optimize review queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_date_performance 
ON public.reviews(user_id, reviewed_at DESC) 
INCLUDE (word_id, correct);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_word_recent 
ON public.reviews(word_id, reviewed_at DESC) 
WHERE reviewed_at >= (CURRENT_DATE - INTERVAL '30 days');

-- Optimize meaning and example lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meanings_word_selected 
ON public.meanings(word_id, is_selected, position) 
WHERE is_selected = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examples_word_position 
ON public.examples(word_id, position);

-- Goals and progress optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goal_progress_user_date_type 
ON public.goal_progress(user_id, date DESC, goal_id) 
WHERE is_completed = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_user_active_type 
ON public.goals(user_id, goal_type, is_active) 
WHERE is_active = true;

-- Activity tracking optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_activities_user_date 
ON public.daily_activities(user_id, date DESC) 
INCLUDE (words_learned, reviews_total, perfect_day);

-- Achievement optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievements_user_earned 
ON public.achievements(user_id, earned_at DESC) 
INCLUDE (achievement_type, achievement_value);

-- =====================================================
-- MATERIALIZED VIEWS FOR COMPLEX AGGREGATIONS
-- =====================================================

-- User statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats_mv AS
SELECT 
    w.user_id,
    COUNT(*) as total_words,
    COUNT(*) FILTER (WHERE w.learned = true) as learned_words,
    COALESCE(AVG(w.correct::float / NULLIF(w.correct + w.wrong, 0)) * 100, 0) as accuracy,
    MAX(w.last_reviewed_at) as last_activity,
    COUNT(DISTINCT w.list_id) as total_lists,
    COALESCE(SUM(w.correct + w.wrong), 0) as total_reviews
FROM public.words w
GROUP BY w.user_id;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_mv_user_id 
ON user_stats_mv(user_id);

-- Daily progress materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_progress_mv AS
SELECT 
    da.user_id,
    da.date,
    da.words_learned,
    da.reviews_total,
    da.reviews_correct,
    CASE WHEN da.reviews_total > 0 
         THEN (da.reviews_correct::float / da.reviews_total * 100)
         ELSE 0 
    END as daily_accuracy,
    da.time_spent_minutes,
    da.perfect_day,
    ROW_NUMBER() OVER (PARTITION BY da.user_id ORDER BY da.date DESC) as day_rank
FROM public.daily_activities da
WHERE da.date >= (CURRENT_DATE - INTERVAL '90 days');

-- Create unique index for daily progress
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_progress_mv_user_date 
ON daily_progress_mv(user_id, date);

-- =====================================================
-- STORED PROCEDURES FOR COMPLEX OPERATIONS
-- =====================================================

-- Get user statistics with caching
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_words INTEGER,
    learned_words INTEGER,
    accuracy NUMERIC,
    total_reviews INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.total_words,
        us.learned_words,
        ROUND(us.accuracy, 2) as accuracy,
        us.total_reviews,
        COALESCE(s.current_count, 0) as current_streak,
        COALESCE(s.longest_count, 0) as longest_streak
    FROM user_stats_mv us
    LEFT JOIN public.streaks s ON s.user_id = us.user_id 
        AND s.streak_type = 'daily_goal' 
        AND s.is_active = true
    WHERE us.user_id = p_user_id;
END;
$$;

-- Get words for learning session with smart selection
CREATE OR REPLACE FUNCTION get_learning_words(
    p_user_id UUID,
    p_list_id UUID DEFAULT NULL,
    p_mode TEXT DEFAULT 'mixed',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    text TEXT,
    meanings JSONB,
    examples JSONB,
    stats JSONB,
    priority_score NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH word_priorities AS (
        SELECT 
            w.id,
            w.text,
            jsonb_agg(DISTINCT jsonb_build_object(
                'meaning', m.meaning,
                'is_selected', m.is_selected,
                'position', m.position
            ) ORDER BY m.position) as meanings,
            jsonb_agg(DISTINCT jsonb_build_object(
                'text', e.text,
                'position', e.position
            ) ORDER BY e.position) as examples,
            jsonb_build_object(
                'correct', w.correct,
                'wrong', w.wrong,
                'learned', w.learned,
                'lastReviewedAt', w.last_reviewed_at
            ) as stats,
            CASE 
                WHEN p_mode = 'new' THEN 
                    CASE WHEN w.learned = false AND w.last_reviewed_at IS NULL THEN 10.0 ELSE 0.0 END
                WHEN p_mode = 'review' THEN
                    CASE WHEN w.last_reviewed_at IS NOT NULL THEN 
                        10.0 - EXTRACT(DAYS FROM (NOW() - w.last_reviewed_at))::numeric / 7.0
                    ELSE 0.0 END
                ELSE -- mixed mode
                    CASE 
                        WHEN w.learned = false AND w.last_reviewed_at IS NULL THEN 8.0
                        WHEN w.learned = false THEN 
                            5.0 + (5.0 * (w.wrong::numeric / NULLIF(w.correct + w.wrong, 0)))
                        ELSE 
                            3.0 - EXTRACT(DAYS FROM (NOW() - COALESCE(w.last_reviewed_at, w.created_at)))::numeric / 30.0
                    END
            END as priority_score
        FROM public.words w
        LEFT JOIN public.meanings m ON m.word_id = w.id
        LEFT JOIN public.examples e ON e.word_id = w.id
        WHERE w.user_id = p_user_id
            AND (p_list_id IS NULL OR w.list_id = p_list_id)
        GROUP BY w.id, w.text, w.correct, w.wrong, w.learned, w.last_reviewed_at, w.created_at
    )
    SELECT 
        wp.id,
        wp.text,
        wp.meanings,
        wp.examples,
        wp.stats,
        wp.priority_score
    FROM word_priorities wp
    WHERE wp.priority_score > 0
    ORDER BY wp.priority_score DESC, RANDOM()
    LIMIT p_limit;
END;
$$;

-- Batch update word statistics
CREATE OR REPLACE FUNCTION batch_update_word_stats(
    p_user_id UUID,
    p_updates JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    update_count INTEGER := 0;
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT jsonb_array_elements(p_updates)
    LOOP
        UPDATE public.words 
        SET 
            correct = COALESCE((update_record->>'correct')::INTEGER, correct),
            wrong = COALESCE((update_record->>'wrong')::INTEGER, wrong),
            learned = COALESCE((update_record->>'learned')::BOOLEAN, learned),
            last_reviewed_at = COALESCE(
                (update_record->>'lastReviewedAt')::TIMESTAMPTZ, 
                last_reviewed_at
            )
        WHERE id = (update_record->>'wordId')::UUID 
            AND user_id = p_user_id;
        
        GET DIAGNOSTICS update_count = update_count + ROW_COUNT;
    END LOOP;
    
    RETURN update_count;
END;
$$;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CACHE INVALIDATION
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh materialized views concurrently to avoid blocking
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_mv;
    RETURN NULL;
END;
$$;

-- Trigger to refresh stats when words change
CREATE TRIGGER trigger_refresh_user_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.words
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_user_stats();

-- Function to refresh daily progress
CREATE OR REPLACE FUNCTION refresh_daily_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_progress_mv;
    RETURN NULL;
END;
$$;

-- Trigger for daily activities
CREATE TRIGGER trigger_refresh_daily_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.daily_activities
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_daily_progress();

-- =====================================================
-- PARTITIONING FOR LARGE TABLES
-- =====================================================

-- Partition reviews table by month for better performance
-- First, create the partitioned table
CREATE TABLE IF NOT EXISTS public.reviews_partitioned (
    LIKE public.reviews INCLUDING ALL
) PARTITION BY RANGE (reviewed_at);

-- Create monthly partitions for the current year and next year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR month_offset IN 0..23 LOOP -- 2 years of partitions
        start_date := date_trunc('month', CURRENT_DATE) + (month_offset || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'reviews_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF public.reviews_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Create indexes on each partition
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I (user_id, reviewed_at DESC)',
            'idx_' || partition_name || '_user_date', partition_name
        );
    END LOOP;
END $$;

-- =====================================================
-- QUERY OPTIMIZATION HINTS
-- =====================================================

-- Add query hints for complex queries (PostgreSQL specific)
CREATE OR REPLACE FUNCTION optimize_query_plan()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Increase work_mem for complex queries
    SET work_mem = '256MB';
    
    -- Optimize for specific query patterns
    SET enable_seqscan = off; -- Prefer index scans for small result sets
    SET random_page_cost = 1.1; -- Assume SSD storage
    SET effective_cache_size = '4GB'; -- Adjust based on available memory
END;
$$;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Procedure to maintain database performance
CREATE OR REPLACE FUNCTION maintain_database()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Analyze tables to update statistics
    ANALYZE public.words;
    ANALYZE public.reviews;
    ANALYZE public.meanings;
    ANALYZE public.examples;
    ANALYZE public.daily_activities;
    ANALYZE public.goals;
    ANALYZE public.goal_progress;
    ANALYZE public.achievements;
    ANALYZE public.streaks;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_progress_mv;
    
    -- Clean up old review data (older than 2 years)
    DELETE FROM public.reviews 
    WHERE reviewed_at < (CURRENT_DATE - INTERVAL '2 years');
    
    -- Vacuum tables to reclaim space
    VACUUM ANALYZE public.words;
    VACUUM ANALYZE public.reviews;
    
    RAISE NOTICE 'Database maintenance completed at %', NOW();
END;
$$;

-- Schedule maintenance (requires pg_cron extension)
-- SELECT cron.schedule('maintain-wordify-db', '0 2 * * 0', 'SELECT maintain_database();');

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- View to monitor query performance
CREATE OR REPLACE VIEW query_performance AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_time DESC
LIMIT 20;

-- View to monitor table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_words_user_list_learned IS 'Optimizes queries for learned words by user and list';
COMMENT ON INDEX idx_words_user_created_learned IS 'Optimizes recent words queries with learning status';
COMMENT ON INDEX idx_words_last_reviewed IS 'Optimizes spaced repetition queries for due words';
COMMENT ON INDEX idx_reviews_user_date_performance IS 'Optimizes user review history queries';
COMMENT ON INDEX idx_reviews_word_recent IS 'Optimizes recent review lookups per word';

COMMENT ON MATERIALIZED VIEW user_stats_mv IS 'Cached user statistics for dashboard performance';
COMMENT ON MATERIALIZED VIEW daily_progress_mv IS 'Cached daily progress data for analytics';

COMMENT ON FUNCTION get_user_stats IS 'Returns comprehensive user statistics with caching';
COMMENT ON FUNCTION get_learning_words IS 'Smart word selection for learning sessions using priority scoring';
COMMENT ON FUNCTION batch_update_word_stats IS 'Efficiently updates multiple word statistics in one transaction';

-- Grant appropriate permissions
GRANT SELECT ON user_stats_mv TO authenticated;
GRANT SELECT ON daily_progress_mv TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_learning_words TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_word_stats TO authenticated;

-- Final optimization notice
DO $$
BEGIN
    RAISE NOTICE 'WordifyAI Performance Optimizations Applied Successfully!';
    RAISE NOTICE 'Run ANALYZE on all tables and consider scheduling regular maintenance.';
    RAISE NOTICE 'Monitor query performance using the query_performance view.';
END $$;
