-- Smart Posts table
CREATE TABLE public.smart_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_image_url TEXT,
  generated_image_url TEXT,
  title TEXT,
  caption_short TEXT,
  caption_medium TEXT,
  caption_long TEXT,
  copy_direct TEXT,
  copy_emotional TEXT,
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  mode TEXT NOT NULL DEFAULT 'viral',
  format TEXT NOT NULL DEFAULT 'square',
  audience TEXT,
  emotion TEXT,
  service_type TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Smart posts viewable by everyone"
  ON public.smart_posts FOR SELECT USING (true);

CREATE POLICY "Users insert own smart posts"
  ON public.smart_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own smart posts"
  ON public.smart_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own smart posts"
  ON public.smart_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER smart_posts_updated_at
  BEFORE UPDATE ON public.smart_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_smart_posts_user ON public.smart_posts(user_id, created_at DESC);

-- Events table
CREATE TABLE public.smart_post_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.smart_posts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','click','convert')),
  visitor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_post_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.smart_post_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner views events"
  ON public.smart_post_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.smart_posts sp WHERE sp.id = post_id AND sp.user_id = auth.uid()));

CREATE INDEX idx_smart_post_events_post ON public.smart_post_events(post_id, event_type);

-- Storage bucket for smart posts
INSERT INTO storage.buckets (id, name, public) VALUES ('smart-posts', 'smart-posts', true);

CREATE POLICY "Smart posts images public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'smart-posts');

CREATE POLICY "Auth users upload smart posts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'smart-posts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners update smart posts files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'smart-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete smart posts files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'smart-posts' AND auth.uid()::text = (storage.foldername(name))[1]);