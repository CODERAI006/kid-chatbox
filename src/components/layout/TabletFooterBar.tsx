/**
 * Compact footer fixed above the mobile bottom nav — tablet widths (md–lg).
 */
import { Box } from '@/shared/design-system';
import { useVisualViewportBottom } from '@/hooks/useVisualViewportBottom';
import { Footer } from './Footer';
import { COMPACT_FOOTER_HEIGHT, MOBILE_BOTTOM_NAV_HEIGHT } from './layoutHeights';

export function TabletFooterBar() {
  const visualViewportBottom = useVisualViewportBottom();

  return (
    <Box
      position="fixed"
      bottom={`calc(${MOBILE_BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px) + ${visualViewportBottom}px)`}
      left={0}
      right={0}
      w="100%"
      zIndex={1390}
      h={COMPACT_FOOTER_HEIGHT}
      display={{ base: 'none', md: 'block', lg: 'none' }}
    >
      <Footer variant="compact" />
    </Box>
  );
}
