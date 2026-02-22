-- Create sessions table
CREATE TABLE public.tracking_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create page_visits table
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_spent_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create click_events table
CREATE TABLE public.click_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  element_tag TEXT,
  element_id TEXT,
  element_class TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mouse_events table
CREATE TABLE public.mouse_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  positions JSONB NOT NULL DEFAULT '[]'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scroll_events table
CREATE TABLE public.scroll_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  scroll_depth_percent INTEGER NOT NULL,
  scroll_y INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  document_height INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_page_visits_session ON public.page_visits(session_id);
CREATE INDEX idx_page_visits_timestamp ON public.page_visits(timestamp DESC);
CREATE INDEX idx_click_events_session ON public.click_events(session_id);
CREATE INDEX idx_click_events_timestamp ON public.click_events(timestamp DESC);
CREATE INDEX idx_mouse_events_session ON public.mouse_events(session_id);
CREATE INDEX idx_mouse_events_timestamp ON public.mouse_events(timestamp DESC);
CREATE INDEX idx_scroll_events_session ON public.scroll_events(session_id);
CREATE INDEX idx_scroll_events_timestamp ON public.scroll_events(timestamp DESC);
CREATE INDEX idx_tracking_sessions_last_activity ON public.tracking_sessions(last_activity_at DESC);

-- Enable RLS on all tables (but allow public inserts for anonymous tracking)
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scroll_events ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous inserts (for tracking)
CREATE POLICY "Allow anonymous insert on tracking_sessions" ON public.tracking_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert on page_visits" ON public.page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert on click_events" ON public.click_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert on mouse_events" ON public.mouse_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert on scroll_events" ON public.scroll_events FOR INSERT WITH CHECK (true);

-- Create policies to allow anonymous select (for dashboard)
CREATE POLICY "Allow anonymous select on tracking_sessions" ON public.tracking_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous select on page_visits" ON public.page_visits FOR SELECT USING (true);
CREATE POLICY "Allow anonymous select on click_events" ON public.click_events FOR SELECT USING (true);
CREATE POLICY "Allow anonymous select on mouse_events" ON public.mouse_events FOR SELECT USING (true);
CREATE POLICY "Allow anonymous select on scroll_events" ON public.scroll_events FOR SELECT USING (true);

-- Create policy to allow updates on tracking_sessions (for updating last_activity)
CREATE POLICY "Allow anonymous update on tracking_sessions" ON public.tracking_sessions FOR UPDATE USING (true) WITH CHECK (true);