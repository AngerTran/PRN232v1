import { getStoredUser } from './authApi';
import { getVisibleSeries } from './seriesApi';
import type { Series } from '../types/domain';

/** Series editor được phép xem: gán cho editor hiện tại hoặc chưa gán editor. */
export async function getEditorAssignedSeries(): Promise<Series[]> {
  const user = getStoredUser();
  const items = await getVisibleSeries();
  if (!user || user.role !== 'editor') {
    return items;
  }
  return items.filter(series => series.editorId === user.id);
}
