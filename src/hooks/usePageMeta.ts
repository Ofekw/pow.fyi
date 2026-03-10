import { useEffect } from 'react';

const DEFAULT_TITLE = 'Pow.fyi — Ski Resort Snow Forecasts';

function setMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(property: string) {
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.remove();
}

interface PageMeta {
  title: string;
  description: string;
  url: string;
  image?: string | null;
}

export function usePageMeta({ title, description, url, image }: PageMeta) {
  useEffect(() => {
    document.title = title;
    setMeta('og:type', 'website');
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:url', url);

    return () => {
      document.title = DEFAULT_TITLE;
      removeMeta('og:type');
      removeMeta('og:title');
      removeMeta('og:description');
      removeMeta('og:url');
    };
  }, [title, description, url]);

  useEffect(() => {
    if (image) {
      setMeta('og:image', image);
    } else {
      removeMeta('og:image');
    }
    return () => {
      removeMeta('og:image');
    };
  }, [image]);
}
