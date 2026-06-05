import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PageMetaProvider } from '../hooks/usePageMeta';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';

export default function App() {
  return (
    <PageMetaProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </PageMetaProvider>
  );
}
