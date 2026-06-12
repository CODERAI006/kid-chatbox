/**
 * Guru AI mascot avatar — shared across chat FAB and mobile nav.
 */
import { Box, Image } from '@/shared/design-system';
import { APP_CONSTANTS, GURU_AVATAR_SRC } from '@/constants/app';

type GuruAvatarSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<GuruAvatarSize, number> = {
  sm: 28,
  md: 44,
  lg: 56,
};

export interface GuruAvatarProps {
  size?: GuruAvatarSize;
  ring?: boolean;
}

export function GuruAvatar({ size = 'md', ring = false }: GuruAvatarProps) {
  const px = SIZE_PX[size];

  return (
    <Box
      w={`${px}px`}
      h={`${px}px`}
      flexShrink={0}
      borderRadius="full"
      overflow="hidden"
      bg="white"
      borderWidth={ring ? '2px' : '0'}
      borderColor="whiteAlpha.900"
      boxShadow={ring ? 'md' : 'none'}
    >
      <Image
        src={GURU_AVATAR_SRC}
        alt={`${APP_CONSTANTS.BRAND_NAME} mascot`}
        w="100%"
        h="100%"
        objectFit="cover"
        loading="lazy"
      />
    </Box>
  );
}
