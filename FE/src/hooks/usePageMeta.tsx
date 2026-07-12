import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface PageMeta {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
}

interface PageMetaContextValue {
  meta: PageMeta;
  setMeta: (meta: PageMeta) => void;
}

const PageMetaContext = createContext<PageMetaContextValue>({
  meta: { title: 'InkFlow' },
  setMeta: () => {},
});

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({ title: 'InkFlow' });
  return (
    <PageMetaContext.Provider value={{ meta, setMeta }}>
      {children}
    </PageMetaContext.Provider>
  );
}

export function usePageMeta(nextMeta?: PageMeta) {
  const { meta, setMeta } = useContext(PageMetaContext);
  const nextTitle = nextMeta?.title;
  const nextBreadcrumb = nextMeta?.breadcrumb;

  useEffect(() => {
    if (nextTitle === undefined) return;
    setMeta({ title: nextTitle, breadcrumb: nextBreadcrumb });
  }, [nextTitle, nextBreadcrumb, setMeta]);

  return {
    title: meta.title,
    breadcrumb: meta.breadcrumb,
    setPageMeta: setMeta,
  };
}
