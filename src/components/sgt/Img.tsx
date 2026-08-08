import { useEffect, useState } from "react";
import { resolveStorageUrl } from "@/lib/storage-url";

export function useStorageUrl(url: string | null | undefined) {
  const [resolved, setResolved] = useState<string | null>(url ?? null);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setResolved(null);
      return;
    }
    setResolved(url);
    resolveStorageUrl(url).then((u) => {
      if (!cancelled) setResolved(u);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolved;
}

type ImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
};

/** <img> que resolve automaticamente URLs de storage privado para URLs assinados. */
export function Img({ src, ...rest }: ImgProps) {
  const resolved = useStorageUrl(src);
  if (!resolved) return null;
  return <img src={resolved} {...rest} />;
}
