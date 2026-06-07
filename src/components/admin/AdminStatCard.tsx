/**
 * Professional KPI stat card for admin dashboards.
 */

import { type FC, type ReactNode } from 'react';
import { Box, Card, CardBody, HStack, Text, useColorModeValue } from '@/shared/design-system';
import { motion } from 'framer-motion';
import { adminAccentStyles, type AdminAccent } from './adminTokens';

const MotionBox = motion(Box);

interface AdminStatCardProps {
  label: string;
  value: string | number;
  accent: AdminAccent;
  icon: ReactNode;
  index?: number;
  onClick?: () => void;
}

export const AdminStatCard: FC<AdminStatCardProps> = ({
  label,
  value,
  accent,
  icon,
  index = 0,
  onClick,
}) => {
  const styles = adminAccentStyles[accent];
  const cardBg = useColorModeValue('white', 'gray.800');
  const labelColor = useColorModeValue('gray.500', 'gray.400');
  const valueColor = useColorModeValue('gray.900', 'whiteAlpha.900');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const iconBg = useColorModeValue(styles.iconBg, 'whiteAlpha.100');
  const iconColor = useColorModeValue(styles.iconColor, styles.accent);
  const hoverBorder = useColorModeValue('gray.200', 'gray.600');

  return (
    <MotionBox
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      whileHover={onClick ? { y: -2 } : undefined}
    >
      <Card
        bg={cardBg}
        borderWidth="1px"
        borderColor={borderColor}
        borderLeftWidth="3px"
        borderLeftColor={styles.accent}
        boxShadow="sm"
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
        _hover={onClick ? { boxShadow: 'md', borderColor: hoverBorder } : undefined}
        transition="box-shadow 0.2s, border-color 0.2s"
        h="100%"
      >
        <CardBody p={{ base: 4, md: 5 }}>
          <HStack justify="space-between" align="flex-start" spacing={3}>
            <Box flex={1} minW={0}>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                letterSpacing="0.06em"
                textTransform="uppercase"
                color={labelColor}
                mb={1}
              >
                {label}
              </Text>
              <Text
                fontSize={{ base: '2xl', md: '3xl' }}
                fontWeight="700"
                lineHeight="1.1"
                color={valueColor}
                fontFamily="heading"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {value}
              </Text>
            </Box>
            <Box
              flexShrink={0}
              w={{ base: 10, md: 11 }}
              h={{ base: 10, md: 11 }}
              borderRadius="lg"
              bg={iconBg}
              color={iconColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize={{ base: 'lg', md: 'xl' }}
            >
              {icon}
            </Box>
          </HStack>
        </CardBody>
      </Card>
    </MotionBox>
  );
};
