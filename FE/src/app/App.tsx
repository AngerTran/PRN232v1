import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PageMetaProvider } from '../hooks/usePageMeta';

export default function App() {
  return (
    <PageMetaProvider>
      <RouterProvider router={router} />
    </PageMetaProvider>
  );
}
