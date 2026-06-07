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
  useColorModeValue,
} from '@/shared/design-system';
import { parseAiRichContent, type RichBlock } from '@/utils/aiRichContentParser';

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
        <Text fontSize={fontSize} lineHeight="tall" color="gray.800">
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
              <Text fontSize={fontSize} lineHeight="tall" color="gray.800" flex={1}>
                {renderInline(item, `li-${i}`)}
              </Text>
            </HStack>
          ))}
        </VStack>
      );
    case 'code':
      return (
        <Box
          as="pre"
          fontSize="xs"
          p={3}
          bg={codeBg}
          color="green.200"
          borderRadius="md"
          overflowX="auto"
          whiteSpace="pre-wrap"
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
          <Text fontSize={fontSize} lineHeight="tall" color="gray.800">
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

  if (!blocks.length && !actions.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        No response yet.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      {blocks.map((block, i) => (
        <BlockView key={`${block.type}-${i}`} block={block} compact={compact} />
      ))}

      {actions.length > 0 && onAction && (
        <Box p={3} bg={actionBg} borderRadius="md" borderWidth="1px" borderColor="purple.100">
          <Text fontSize="xs" fontWeight="bold" color="purple.700" mb={2}>
            Continue learning
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {actions.slice(0, 4).map((action) => (
              <Button
                key={action.label}
                size="sm"
                colorScheme="purple"
                variant="outline"
                bg="white"
                onClick={() => onAction(action.prompt)}
              >
                {action.label}
              </Button>
            ))}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}
