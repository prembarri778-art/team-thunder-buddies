-- =============================================
-- YUVATA — Supabase Database Setup
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- 1. User Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Assessments Table
CREATE TABLE public.assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  selected_skills TEXT[] NOT NULL,
  questions JSONB DEFAULT '[]',
  answers JSONB DEFAULT '[]',
  scores JSONB DEFAULT '{}',
  overall_score REAL DEFAULT 0,
  literacy_level TEXT CHECK (literacy_level IN ('novice', 'explorer', 'native', 'champion')),
  is_weekly_challenge BOOLEAN DEFAULT false,
  roadmap JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chat History Table
CREATE TABLE public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for Performance
CREATE INDEX idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX idx_assessments_created_at ON public.assessments(created_at DESC);
CREATE INDEX idx_chat_history_assessment_id ON public.chat_history(assessment_id);
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — Users can only access their own data

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Anyone can view basic profile details for leaderboard"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Assessments
CREATE POLICY "Users can view own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments for roadmap tracking"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view weekly challenge scores for leaderboard"
  ON public.assessments FOR SELECT
  USING (is_weekly_challenge = true);

-- Chat History
CREATE POLICY "Users can view own chat"
  ON public.chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat"
  ON public.chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 8. Squad Mode (Multiplayer Rooms)
-- =============================================
CREATE TABLE public.squad_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_type VARCHAR(50),
  mystery_data JSONB DEFAULT '{}',
  votes JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'solved', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_squad_rooms_code ON public.squad_rooms(room_code);

ALTER TABLE public.squad_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can select/read a room if they have the code (or are just generally looking up a room)
CREATE POLICY "Anyone can view squad rooms"
  ON public.squad_rooms FOR SELECT
  USING (true);

-- Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms"
  ON public.squad_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone can update a room (to append votes or change status)
CREATE POLICY "Anyone can update squad rooms"
  ON public.squad_rooms FOR UPDATE
  USING (true);
