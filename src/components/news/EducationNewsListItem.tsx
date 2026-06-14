import { Box, HStack, Text, VStack, Image } from '@/shared/design-system';
import { FaChevronRight } from 'react-icons/fa';
import type { EducationArticle, EducationCategory } from '@/types/educationNews';

interface Props {
  article: EducationArticle;
  category?: EducationCategory;
  variant?: 'row' | 'hero';
  onRead?: (article: EducationArticle) => void;
}

const GRADIENT: Record<string, string> = {
  blue: 'linear(to-br, blue.400, blue.500, cyan.500)',
  amber: 'linear(to-br, orange.400, orange.500, amber.500)',
  emerald: 'linear(to-br, green.400, teal.500, emerald.500)',
  rose: 'linear(to-br, pink.400, rose.500, pink.600)',
  purple: 'linear(to-br, purple.400, purple.500, indigo.500)',
  cyan: 'linear(to-br, cyan.400, cyan.500, blue.500)',
  orange: 'linear(to-br, orange.400, orange.500, red.400)',
  teal: 'linear(to-br, teal.400, green.500, cyan.500)',
  indigo: 'linear(to-br, indigo.400, purple.500, blue.500)',
};

function timeAgo(dateString: string): string {
  const diff = (Date.now() - new Date(dateString).getTime()) / 3600000;
  if (diff < 1) return 'Just now';
  if (diff < 24) return `${Math.floor(diff)}h ago`;
  if (diff < 168) return `${Math.floor(diff / 24)}d ago`;
  return new Date(dateString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function EducationNewsListItem({
  article,
  category,
  variant = 'row',
  onRead,
}: Props) {
  const summary = article.kidSummary || article.summary || article.description;
  const grad = GRADIENT[category?.color || 'blue'] || GRADIENT.blue;
  const isHero = variant === 'hero';

  return (
    <Box
      as="button"
      type="button"
      w="100%"
      textAlign="left"
      bg="white"
      borderRadius={{ base: 'xl', md: '2xl' }}
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      overflow="hidden"
      cursor={onRead ? 'pointer' : 'default'}
      transition="all 0.15s"
      _hover={onRead ? { boxShadow: 'md', borderColor: 'blue.200' } : undefined}
      onClick={() => onRead?.(article)}
      aria-label={`Read: ${article.title}`}
    >
      {isHero ? (
        <VStack align="stretch" spacing={0}>
          <Box position="relative" h={{ base: '140px', md: '168px' }} bgGradient={grad}>
            {article.urlToImage && (
              <Image
                src={article.urlToImage}
                alt=""
                position="absolute"
                inset={0}
                w="100%"
                h="100%"
                objectFit="cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <Box
              position="absolute"
              inset={0}
              bgGradient="linear(to-t, blackAlpha.800, blackAlpha.300, transparent)"
            />
            <Box position="absolute" bottom={0} left={0} right={0} p={{ base: 4, md: 5 }}>
              {category && (
                <Text fontSize="2xs" fontWeight="bold" color="whiteAlpha.900" mb={2}>
                  {category.icon} {category.label}
                </Text>
              )}
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="extrabold" color="white" lineHeight="snug" noOfLines={3}>
                {article.title}
              </Text>
            </Box>
          </Box>
          <Box p={{ base: 3, md: 4 }}>
            <MetaLine article={article} />
            <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.600" lineHeight="tall" mt={1.5} noOfLines={2}>
              {summary}
            </Text>
          </Box>
        </VStack>
      ) : (
        <HStack align="stretch" spacing={{ base: 3, md: 4 }} p={{ base: 3, md: 4 }} w="100%">
          <Box
            position="relative"
            flexShrink={0}
            w={{ base: '88px', sm: '104px' }}
            h={{ base: '88px', sm: '104px' }}
            borderRadius="xl"
            overflow="hidden"
            bgGradient={grad}
          >
            {article.urlToImage ? (
              <Image
                src={article.urlToImage}
                alt=""
                position="absolute"
                inset={0}
                w="100%"
                h="100%"
                objectFit="cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <Text
                position="absolute"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="2xl"
                aria-hidden
              >
                {category?.icon || '📰'}
              </Text>
            )}
          </Box>
          <VStack align="stretch" flex={1} minW={0} spacing={1} py={0.5}>
            <MetaLine article={article} small />
            <Text
              fontWeight="bold"
              fontSize={{ base: 'sm', md: 'md' }}
              color="gray.900"
              lineHeight="snug"
              noOfLines={2}
            >
              {article.title}
            </Text>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" lineHeight="tall" noOfLines={1}>
              {summary}
            </Text>
          </VStack>
          <Box alignSelf="center" color="gray.300" flexShrink={0} aria-hidden>
            <FaChevronRight size={14} />
          </Box>
        </HStack>
      )}
    </Box>
  );
}

function MetaLine({ article, small }: { article: EducationArticle; small?: boolean }) {
  return (
    <Text fontSize={small ? '2xs' : 'xs'} color="gray.400" fontWeight="medium" noOfLines={1}>
      {article.source.name}
      {' · '}
      {timeAgo(article.publishedAt)}
    </Text>
  );
}
