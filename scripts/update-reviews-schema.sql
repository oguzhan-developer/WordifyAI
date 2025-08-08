-- Update reviews table to distinguish between word and list reviews
-- Add review_type column to existing reviews table

-- Add review_type column if it doesn't exist
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'word' CHECK (review_type IN ('word', 'list', 'session'));

-- Update existing reviews to be word reviews (default)
UPDATE reviews SET review_type = 'word' WHERE review_type IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_type_date ON reviews(review_type, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_type ON reviews(user_id, review_type, reviewed_at DESC);

-- Update daily_activities table to track different review types
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS list_reviews_count INTEGER DEFAULT 0;
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS list_reviews_correct INTEGER DEFAULT 0;

-- Function to update daily activities with proper review type tracking
CREATE OR REPLACE FUNCTION update_daily_activity_with_review_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily activities based on review type
  IF NEW.review_type = 'word' THEN
    INSERT INTO daily_activities (user_id, date, words_reviewed, reviews_correct, reviews_total)
    VALUES (
      NEW.user_id, 
      CURRENT_DATE, 
      1, 
      CASE WHEN NEW.correct THEN 1 ELSE 0 END,
      1
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      words_reviewed = daily_activities.words_reviewed + 1,
      reviews_correct = daily_activities.reviews_correct + CASE WHEN NEW.correct THEN 1 ELSE 0 END,
      reviews_total = daily_activities.reviews_total + 1,
      updated_at = timezone('utc'::text, now());
  ELSIF NEW.review_type = 'list' THEN
    INSERT INTO daily_activities (user_id, date, list_reviews_count, list_reviews_correct)
    VALUES (
      NEW.user_id, 
      CURRENT_DATE, 
      1, 
      CASE WHEN NEW.correct THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      list_reviews_count = daily_activities.list_reviews_count + 1,
      list_reviews_correct = daily_activities.list_reviews_correct + CASE WHEN NEW.correct THEN 1 ELSE 0 END,
      updated_at = timezone('utc'::text, now());
  END IF;
  
  -- Update goal progress for daily reviews (words only)
  IF NEW.review_type = 'word' THEN
    INSERT INTO goal_progress (user_id, goal_id, date, current_value, target_value, is_completed)
    SELECT 
      NEW.user_id,
      g.id,
      CURRENT_DATE,
      1,
      g.target_value,
      (1 >= g.target_value)
    FROM goals g 
    WHERE g.user_id = NEW.user_id 
      AND g.goal_type = 'daily_reviews' 
      AND g.is_active = true
    ON CONFLICT (user_id, goal_id, date)
    DO UPDATE SET
      current_value = goal_progress.current_value + 1,
      is_completed = (goal_progress.current_value + 1 >= goal_progress.target_value),
      completed_at = CASE 
        WHEN (goal_progress.current_value + 1 >= goal_progress.target_value) AND goal_progress.completed_at IS NULL 
        THEN timezone('utc'::text, now())
        ELSE goal_progress.completed_at
      END,
      updated_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_update_daily_activity_and_goals ON reviews;
CREATE TRIGGER trigger_update_daily_activity_with_review_type
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_activity_with_review_type();

-- Create function to log list review
CREATE OR REPLACE FUNCTION log_list_review(
  p_user_id UUID,
  p_list_id UUID,
  p_correct BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO reviews (user_id, word_id, correct, review_type, reviewed_at)
  VALUES (p_user_id, p_list_id, p_correct, 'list', timezone('utc'::text, now()));
END;
$$ LANGUAGE plpgsql;

-- Create function to log word review (existing behavior)
CREATE OR REPLACE FUNCTION log_word_review(
  p_user_id UUID,
  p_word_id UUID,
  p_correct BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO reviews (user_id, word_id, correct, review_type, reviewed_at)
  VALUES (p_user_id, p_word_id, p_correct, 'word', timezone('utc'::text, now()));
END;
$$ LANGUAGE plpgsql;
