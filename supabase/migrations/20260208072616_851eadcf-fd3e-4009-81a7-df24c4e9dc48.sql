-- Add user_id column to all tracking tables
ALTER TABLE public.tracking_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.page_visits ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.click_events ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.mouse_events ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.scroll_events ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create profiles table for user info (name)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Admin can view all profiles (for dashboard)
CREATE POLICY "Allow anonymous select on profiles for admin dashboard" 
ON public.profiles FOR SELECT 
USING (true);

-- Create indexes for user_id on tracking tables
CREATE INDEX idx_tracking_sessions_user_id ON public.tracking_sessions(user_id);
CREATE INDEX idx_page_visits_user_id ON public.page_visits(user_id);
CREATE INDEX idx_click_events_user_id ON public.click_events(user_id);
CREATE INDEX idx_mouse_events_user_id ON public.mouse_events(user_id);
CREATE INDEX idx_scroll_events_user_id ON public.scroll_events(user_id);

-- Update RLS policies to require user_id for inserts
DROP POLICY IF EXISTS "Allow anonymous insert on tracking_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Allow anonymous insert on page_visits" ON public.page_visits;
DROP POLICY IF EXISTS "Allow anonymous insert on click_events" ON public.click_events;
DROP POLICY IF EXISTS "Allow anonymous insert on mouse_events" ON public.mouse_events;
DROP POLICY IF EXISTS "Allow anonymous insert on scroll_events" ON public.scroll_events;

-- New policies requiring authenticated users
CREATE POLICY "Authenticated users can insert tracking sessions" 
ON public.tracking_sessions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert page visits" 
ON public.page_visits FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert click events" 
ON public.click_events FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert mouse events" 
ON public.mouse_events FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert scroll events" 
ON public.scroll_events FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Create trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();