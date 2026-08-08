import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** Parses a Supabase storage URL (public or sign) into { bucket, path }. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/**
 * Buckets são privados, por isso URLs públicos não abrem.
 * Esta função converte-os em URLs assinados (válidos 1h) com cache.
 */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url)!;
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;
  if (pending.has(url)) return pending.get(url)!;

  const p = (async () => {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600);
    const signed = error || !data?.signedUrl ? url : data.signedUrl;
    cache.set(url, signed);
    pending.delete(url);
    // expira do cache antes do URL assinado expirar
    setTimeout(() => cache.delete(url), 50 * 60 * 1000);
    return signed;
  })();

  pending.set(url, p);
  return p;
}
