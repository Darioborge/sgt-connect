-- Auto-verify profile when all key fields are filled
CREATE OR REPLACE FUNCTION public.auto_verify_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND length(trim(NEW.full_name)) > 0
     AND NEW.username IS NOT NULL AND length(trim(NEW.username)) > 0
     AND NEW.bio IS NOT NULL AND length(trim(NEW.bio)) > 0
     AND NEW.phone IS NOT NULL AND length(trim(NEW.phone)) > 0
     AND NEW.city IS NOT NULL AND length(trim(NEW.city)) > 0
     AND NEW.category IS NOT NULL AND length(trim(NEW.category)) > 0
     AND NEW.price_from_kz IS NOT NULL AND NEW.price_from_kz > 0
     AND NEW.avatar_url IS NOT NULL AND length(trim(NEW.avatar_url)) > 0
  THEN
    NEW.verified := true;
  ELSE
    NEW.verified := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verify_profile ON public.profiles;
CREATE TRIGGER trg_auto_verify_profile
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_verify_profile();

-- Re-evaluate existing rows
UPDATE public.profiles SET updated_at = updated_at;