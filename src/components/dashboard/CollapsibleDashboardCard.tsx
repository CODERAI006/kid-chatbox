/**
 * Collapsible dashboard panel — collapsed by default, tap header to reveal content.
 */

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Collapse,
  Badge,
  useColorModeValue,
} from '@/shared/design-system';
import { FiChevronDown } from 'react-icons/fi';

interface CollapsibleDashboardCardProps {
  title: string;
  icon: ReactNode;
  summary: string;
  count?: number;
  children: ReactNode;
  headerAction?: ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleDashboardCard: React.FC<CollapsibleDashboardCardProps> = ({
  title,
  icon,
  summary,
  count,
  children,
  headerAction,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('blue.50', 'whiteAlpha.50');

  return (
    <Card borderWidth="1px" borderColor={rowBorder} boxShadow="sm" w="100%">
      <CardBody p={{ base: 3, md: 4 }}>
        <HStack
          as="button"
          type="button"
          w="100%"
          justify="space-between"
          align="center"
          spacing={3}
          onClick={() => setOpen((v) => !v)}
          borderRadius="md"
          p={1}
          mx={-1}
          transition="background 0.15s"
          _hover={{ bg: hoverBg }}
          aria-expanded={open}
        >
          <HStack spacing={2} flex={1} minW={0} align="flex-start">
            <Box mt={0.5} aria-hidden>{icon}</Box>
            <VStack align="start" spacing={0.5} flex={1} minW={0}>
              <HStack spacing={2} flexWrap="wrap">
                <Heading size={{ base: 'xs', sm: 'sm' }} color={titleColor} textAlign="left">
                  {title}
                </Heading>
                {count !== undefined && count > 0 && (
                  <Badge colorScheme="blue" fontSize="2xs" borderRadius="full">
                    {count}
                  </Badge>
                )}
              </HStack>
              {!open && (
                <Text fontSize="xs" color={subtitleColor} noOfLines={2} textAlign="left">
                  {summary}
                </Text>
              )}
            </VStack>
          </HStack>

          <HStack spacing={2} flexShrink={0} onClick={(e) => e.stopPropagation()}>
            {headerAction}
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', color: 'var(--chakra-colors-blue-500)' }}
              aria-hidden
            >
              <FiChevronDown size={18} />
            </motion.div>
          </HStack>
        </HStack>

        <Collapse in={open} animateOpacity>
          <Box pt={3}>{children}</Box>
        </Collapse>
      </CardBody>
    </Card>
  );
};
