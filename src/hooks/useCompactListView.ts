import { useBreakpointValue } from '@/shared/design-system';

/** Mobile + tablet layouts (below `lg`) use infinite scroll instead of pagination. */
export function useCompactListView(): boolean {
  return useBreakpointValue({ base: true, lg: false }) ?? true;
}
