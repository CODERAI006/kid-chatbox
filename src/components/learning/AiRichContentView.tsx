/**
 * Rich formatted AI tutor content — colors, lists, callouts, action buttons.
 */
import { Fragment, type ReactNode } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Divider,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from '@/shared/design-system';
import { isActionSectionHeading, parseAiRichContent, type RichBlock } from '@/utils/aiRichContentParser';
import { chatMessageContainerProps, chatResponsiveTextSx } from './chatResponsiveStyles';

interface Props {
  content: string;
  onAction?: (prompt: string) => void;
  compact?: boolean;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${idx++}`}>{text.slice(last, match.index)}</Fragment>);
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <Text as="span" key={`${keyPrefix}-b-${idx++}`} fontWeight="bold" color="blue.700">
          {token.slice(2, -2)}
        </Text>
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <Text as="span" key={`${keyPrefix}-i-${idx++}`} fontStyle="italic" color="gray.700">
          {token.slice(1, -1)}
        </Text>
      );
    } else {
      nodes.push(
        <Text
          as="code"
          key={`${keyPrefix}-c-${idx++}`}
          px={1}
          py={0.5}
          borderRadius="sm"
          bg="purple.50"
          color="purple.800"
          fontSize="0.85em"
        >
          {token.slice(1, -1)}
        </Text>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t-${idx}`}>{text.slice(last)}</Fragment>);
  }

  return nodes.length ? nodes : [text];
}

function BlockView({ block, compact }: { block: RichBlock; compact?: boolean }) {
  const tipBg = useColorModeValue('green.50', 'green.900');
  const noteBg = useColorModeValue('blue.50', 'blue.900');
  const importantBg = useColorModeValue('orange.50', 'orange.900');
  const codeBg = useColorModeValue('gray.800', 'gray.900');
  const tableHeaderBg = useColorModeValue('blue.50', 'blue.900');
  const tableRowAltBg = useColorModeValue('gray.50', 'gray.700');
  const fontSize = compact ? 'sm' : 'sm';

  switch (block.type) {
    case 'heading':
      return (
        <Text
          fontSize={block.level === 1 ? 'md' : block.level === 2 ? 'sm' : 'xs'}
          fontWeight="bold"
          color={block.level === 1 ? 'blue.700' : 'gray.700'}
          mt={block.level === 1 ? 1 : 0.5}
        >
          {renderInline(block.text, `h-${block.level}`)}
        </Text>
      );
    case 'paragraph':
      return (
        <Text fontSize={fontSize} lineHeight="tall" color="gray.800" sx={chatResponsiveTextSx}>
          {renderInline(block.text, 'p')}
        </Text>
      );
    case 'list':
      return (
        <VStack align="stretch" spacing={1} pl={2}>
          {block.items.map((item, i) => (
            <HStack key={i} align="start" spacing={2}>
              <Text fontSize={fontSize} color="blue.500" fontWeight="bold" flexShrink={0}>
                {block.ordered ? `${i + 1}.` : '•'}
              </Text>
              <Text fontSize={fontSize} lineHeight="tall" color="gray.800" flex={1} minW={0} sx={chatResponsiveTextSx}>
                {renderInline(item, `li-${i}`)}
              </Text>
            </HStack>
          ))}
        </VStack>
      );
    case 'table': {
      const colCount = block.headers.length;
      const padRow = (cells: string[]) => {
        const row = [...cells];
        while (row.length < colCount) row.push('');
        return row.slice(0, colCount);
      };
      return (
        <Box maxW="100%" overflowX="auto" borderWidth="1px" borderColor="blue.100" borderRadius="md">
          <Table size="sm" variant="simple" sx={{ tableLayout: { base: 'auto', md: 'fixed' }, width: '100%' }}>
            <Thead bg={tableHeaderBg}>
              <Tr>
                {block.headers.map((h, idx) => (
                  <Th
                    key={idx}
                    fontSize="xs"
                    color="blue.800"
                    whiteSpace={{ base: 'normal', md: 'nowrap' }}
                    sx={chatResponsiveTextSx}
                  >
                    {renderInline(h, `th-${idx}`)}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {block.rows.map((cells, ri) => (
                <Tr key={ri} bg={ri % 2 === 1 ? tableRowAltBg : undefined}>
                  {padRow(cells).map((cell, ci) => (
                    <Td
                      key={ci}
                      fontSize="xs"
                      color="gray.800"
                      verticalAlign="top"
                      whiteSpace="normal"
                      sx={chatResponsiveTextSx}
                    >
                      {renderInline(cell, `td-${ri}-${ci}`)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      );
    }
    case 'code':
      return (
        <Box
          as="pre"
          fontSize="xs"
          p={3}
          bg={codeBg}
          color="green.200"
          borderRadius="md"
          maxW="100%"
          overflowX="auto"
          whiteSpace="pre-wrap"
          sx={chatResponsiveTextSx}
        >
          {block.text}
        </Box>
      );
    case 'callout': {
      const palette =
        block.variant === 'tip'
          ? { bg: tipBg, border: 'green.200', badge: 'green', label: 'Tip' }
          : block.variant === 'important'
            ? { bg: importantBg, border: 'orange.200', badge: 'orange', label: 'Important' }
            : { bg: noteBg, border: 'blue.200', badge: 'blue', label: 'Note' };
      return (
        <Box p={3} bg={palette.bg} borderWidth="1px" borderColor={palette.border} borderRadius="md">
          <Badge mb={2} colorScheme={palette.badge} fontSize="xs">
            {palette.label}
          </Badge>
          <Text fontSize={fontSize} lineHeight="tall" color="gray.800" sx={chatResponsiveTextSx}>
            {renderInline(block.text, `callout-${block.variant}`)}
          </Text>
        </Box>
      );
    }
    case 'divider':
      return <Divider borderColor="gray.200" />;
    default:
      return null;
  }
}

export function AiRichContentView({ content, onAction, compact }: Props) {
  const { blocks, actions } = parseAiRichContent(content);
  const actionBg = useColorModeValue('purple.50', 'purple.900');
  const showActions = actions.length > 0 && !!onAction;
  const displayBlocks = showActions
    ? blocks.filter((b) => !(b.type === 'heading' && isActionSectionHeading(b.text)))
    : blocks;

  if (!displayBlocks.length && !actions.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        No response yet.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={3} {...chatMessageContainerProps}>
      {displayBlocks.map((block, i) => (
        <BlockView key={`${block.type}-${i}`} block={block} compact={compact} />
      ))}

      {showActions && (
        <Box p={3} bg={actionBg} borderRadius="md" borderWidth="1px" borderColor="purple.100">
          <Text fontSize="xs" fontWeight="bold" color="purple.700" mb={2}>
            Continue learning
          </Text>
          <VStack align="stretch" spacing={2}>
            {actions.slice(0, 4).map((action, i) => (
              <Button
                key={`${i}-${action.prompt.slice(0, 40)}`}
                size="sm"
                colorScheme="purple"
                variant="outline"
                bg="white"
                w="100%"
                h="auto"
                minH="44px"
                py={2.5}
                px={3}
                whiteSpace="normal"
                textAlign="left"
                justifyContent="flex-start"
                fontWeight="normal"
                lineHeight="tall"
                onClick={() => onAction!(action.prompt)}
              >
                {action.prompt}
              </Button>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
