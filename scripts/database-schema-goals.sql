-- Goals and Streaks Database Schema for WordifyAI
-- This creates comprehensive goal tracking and streak management tables

-- Goals table: Daily/weekly goals configuration
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('daily_words', 'daily_reviews', 'daily_time', 'weekly_words', 'weekly_reviews')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, goal_type)
);

-- Goal progress: Daily tracking of progress toward goals
CREATE TABLE IF NOT EXISTS goal_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, goal_id, date)
);

-- Streaks table: Weekly streak tracking
CREATE TABLE IF NOT EXISTS streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type VARCHAR(20) NOT NULL CHECK (streak_type IN ('daily_goal', 'learning_days', 'perfect_days')),
  current_count INTEGER DEFAULT 0,
  longest_count INTEGER DEFAULT 0,
  last_update_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, streak_type)
);

-- Daily activities: Detailed tracking of user learning activities
CREATE TABLE IF NOT EXISTS daily_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  words_learned INTEGER DEFAULT 0,
  words_reviewed INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  reviews_correct INTEGER DEFAULT 0,
  reviews_total INTEGER DEFAULT 0,
  perfect_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, date)
);

-- Achievement records: Track when users hit milestones
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_value INTEGER,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_notified BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, achievement_type, achievement_value)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_date ON goal_progress(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date ON daily_activities(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_user_type ON streaks(user_id, streak_type);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, earned_at DESC);

-- RLS (Row Level Security) Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Goal progress policies
CREATE POLICY "Users can view own goal progress" ON goal_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goal progress" ON goal_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goal progress" ON goal_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal progress" ON goal_progress FOR DELETE USING (auth.uid() = user_id);

-- Streaks policies
CREATE POLICY "Users can view own streaks" ON streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own streaks" ON streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own streaks" ON streaks FOR DELETE USING (auth.uid() = user_id);

-- Daily activities policies
CREATE POLICY "Users can view own daily activities" ON daily_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own daily activities" ON daily_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily activities" ON daily_activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily activities" ON daily_activities FOR DELETE USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own achievements" ON achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON achievements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own achievements" ON achievements FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic goal and streak tracking
CREATE OR REPLACE FUNCTION update_daily_activity_and_goals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily activities
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
  
  -- Update goal progress for daily reviews
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update activities and goals when reviews are added
CREATE TRIGGER trigger_update_daily_activity_and_goals
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_activity_and_goals();

-- Function to update streaks
CREATE OR REPLACE FUNCTION update_streaks()
RETURNS TRIGGER AS $$
DECLARE
  consecutive_days INTEGER;
BEGIN
  -- Update daily goal streak when any daily goal is completed
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    -- Check consecutive days with completed daily goals
    WITH consecutive_days_cte AS (
      SELECT COUNT(*) as days
      FROM goal_progress gp
      JOIN goals g ON gp.goal_id = g.id
      WHERE gp.user_id = NEW.user_id
        AND g.goal_type LIKE 'daily_%'
        AND gp.is_completed = true
        AND gp.date >= CURRENT_DATE - INTERVAL '30 days'
        AND gp.date <= CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM goal_progress gp2
          JOIN goals g2 ON gp2.goal_id = g2.id
          WHERE gp2.user_id = NEW.user_id
            AND g2.goal_type LIKE 'daily_%'
            AND gp2.date = gp.date - 1
            AND gp2.is_completed = false
        )
      ORDER BY gp.date DESC
    )
    SELECT days INTO consecutive_days FROM consecutive_days_cte;
    
    -- Update or create streak record
    INSERT INTO streaks (user_id, streak_type, current_count, longest_count, last_update_date)
    VALUES (NEW.user_id, 'daily_goal', COALESCE(consecutive_days, 1), COALESCE(consecutive_days, 1), CURRENT_DATE)
    ON CONFLICT (user_id, streak_type)
    DO UPDATE SET
      current_count = COALESCE(consecutive_days, 1),
      longest_count = GREATEST(streaks.longest_count, COALESCE(consecutive_days, 1)),
      last_update_date = CURRENT_DATE,
      updated_at = timezone('utc'::text, now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update streaks when goals are completed
CREATE TRIGGER trigger_update_streaks
  AFTER UPDATE ON goal_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_streaks();

-- Insert default goals for new users
CREATE OR REPLACE FUNCTION create_default_goals_for_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO goals (user_id, goal_type, target_value) VALUES
    (user_id, 'daily_words', 5),
    (user_id, 'daily_reviews', 10),
    (user_id, 'daily_time', 15)
  ON CONFLICT (user_id, goal_type) DO NOTHING;
  
  INSERT INTO streaks (user_id, streak_type, current_count, longest_count) VALUES
    (user_id, 'daily_goal', 0, 0),
    (user_id, 'learning_days', 0, 0),
    (user_id, 'perfect_days', 0, 0)
  ON CONFLICT (user_id, streak_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
