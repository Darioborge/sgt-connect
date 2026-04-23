-- Add FKs to profiles so PostgREST can resolve embedded selects
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.statuses
  ADD CONSTRAINT statuses_user_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;