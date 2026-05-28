import { createContext, useContext, useState, type ReactNode } from 'react';

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

export function usePageMeta() {
  const { meta, setMeta } = useContext(PageMetaContext);
  return {
    title: meta.title,
    breadcrumb: meta.breadcrumb,
    setPageMeta: setMeta,
  };
}
