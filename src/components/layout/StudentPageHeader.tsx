/**
 * Shared student page header — matches Quiz Hub / AI Quiz Mode sizing.
 */
import { Box, HStack, Heading, Text } from '@/shared/design-system';
import type { ReactNode } from 'react';

interface StudentPageHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  /** Chakra color token for heading, e.g. blue, orange, purple */
  accent?: string;
  actions?: ReactNode;
}

export function StudentPageHeader({
  icon,
  title,
  subtitle,
  accent = 'blue',
  actions,
}: StudentPageHeaderProps) {
  return (
    <Box
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      px={{ base: 3, md: 6 }}
      py={{ base: 3, md: 4 }}
    >
      <HStack
        spacing={{ base: 2, md: 3 }}
        align="flex-start"
        justify="space-between"
        flexWrap="wrap"
        rowGap={2}
        w="100%"
      >
        <HStack spacing={{ base: 2, md: 3 }} flex={1} minW={0}>
          <Text fontSize={{ base: 'xl', md: '2xl' }} flexShrink={0} aria-hidden>
            {icon}
          </Text>
          <Box minW={0}>
            <Heading size={{ base: 'sm', md: 'md' }} color={`${accent}.700`}>
              {title}
            </Heading>
            {subtitle && (
              <Text
                fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
                color="gray.500"
                noOfLines={2}
              >
                {subtitle}
              </Text>
            )}
          </Box>
        </HStack>
        {actions ? (
          <HStack spacing={2} flexShrink={0} flexWrap="wrap">
            {actions}
          </HStack>
        ) : null}
      </HStack>
    </Box>
  );
}

interface StudentPageLayoutProps extends StudentPageHeaderProps {
  children: ReactNode;
  maxW?: string;
}

/** Full-page shell: header + padded content area (mobile bottom-nav safe). */
export function StudentPageLayout({
  children,
  maxW = '1400px',
  ...headerProps
}: StudentPageLayoutProps) {
  return (
    <Box minH="100vh" bg="gray.50">
      <StudentPageHeader {...headerProps} />
      <Box
        px={{ base: 2, md: 6 }}
        py={{ base: 3, md: 4 }}
        pb={{ base: 20, md: 4 }}
        maxW={maxW}
        mx="auto"
        w="100%"
      >
        {children}
      </Box>
    </Box>
  );
}
