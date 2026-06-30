/**
 * Renders structured visual JSON (flowcharts, mind maps, infographics, etc.).
 */
import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, SimpleGrid, Badge, Table, Thead, Tbody, Tr, Th, Td,
} from '@/shared/design-system';
import type { StudyVisualSpec } from '@/types/studyInteractive';

interface Props {
  visual: StudyVisualSpec;
  animate?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'blue.500',
  green: 'green.500',
  purple: 'purple.500',
  orange: 'orange.500',
  red: 'red.500',
  teal: 'teal.500',
  yellow: 'yellow.500',
  pink: 'pink.500',
};

function nodeColor(color?: string): string {
  if (!color) return 'blue.500';
  return COLOR_MAP[color] || color;
}

const NodeBox: React.FC<{
  label: string;
  icon?: string;
  color?: string;
  highlight?: boolean;
  size?: 'sm' | 'md';
}> = ({ label, icon, color, highlight, size = 'md' }) => (
  <Box
    px={size === 'sm' ? 3 : 4}
    py={size === 'sm' ? 2 : 3}
    borderRadius="xl"
    bg={highlight ? `${color || 'blue'}.100` : 'white'}
    borderWidth={2}
    borderColor={nodeColor(color)}
    boxShadow={highlight ? 'lg' : 'sm'}
    textAlign="center"
    transition="all 0.3s"
    minW={size === 'sm' ? '80px' : '100px'}
  >
    {icon && <Text fontSize={size === 'sm' ? 'xl' : '2xl'} mb={1}>{icon}</Text>}
    <Text fontSize={size === 'sm' ? 'xs' : 'sm'} fontWeight="semibold" color="gray.800" lineHeight="short">
      {label}
    </Text>
  </Box>
);

function TreeLayout({ visual, activeIds }: { visual: StudyVisualSpec; activeIds: Set<string> }) {
  const nodes = visual.nodes ?? [];
  const root = nodes[0];
  const children = nodes.slice(1);
  const childGroups = visual.connections?.length
    ? visual.connections.filter((c) => c.from === root?.id).map((c) => nodes.find((n) => n.id === c.to)).filter(Boolean)
    : children;

  return (
    <VStack spacing={3}>
      {root && (
        <NodeBox
          label={root.label}
          icon={root.icon}
          color={root.color}
          highlight={activeIds.has(root.id) || root.highlight}
        />
      )}
      {childGroups.length > 0 && (
        <>
          <Text color="gray.400" fontSize="lg">│</Text>
          <HStack spacing={4} flexWrap="wrap" justify="center">
            {childGroups.map((node) => node && (
              <VStack key={node.id} spacing={2}>
                <NodeBox
                  label={node.label}
                  icon={node.icon}
                  color={node.color}
                  highlight={activeIds.has(node.id) || node.highlight}
                  size="sm"
                />
              </VStack>
            ))}
          </HStack>
        </>
      )}
    </VStack>
  );
}

function FlowLayout({ visual, activeIds }: { visual: StudyVisualSpec; activeIds: Set<string> }) {
  const nodes = visual.nodes ?? [];
  return (
    <VStack spacing={2} align="stretch">
      {nodes.map((node, i) => (
        <VStack key={node.id} spacing={1}>
          <NodeBox
            label={node.label}
            icon={node.icon}
            color={node.color}
            highlight={activeIds.has(node.id) || node.highlight}
            size="sm"
          />
          {i < nodes.length - 1 && (
            <Text color="gray.400" fontSize="sm" textAlign="center">↓</Text>
          )}
        </VStack>
      ))}
    </VStack>
  );
}

function IconGrid({ visual }: { visual: StudyVisualSpec }) {
  const items = visual.nodes ?? visual.icons?.map((icon, i) => ({
    id: `g${i}`, label: visual.labels?.[i] ?? '', icon,
  })) ?? [];

  return (
    <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
      {items.map((item) => (
        <Box key={item.id} p={3} bg="white" borderRadius="lg" textAlign="center" borderWidth={1} borderColor="gray.200">
          {item.icon && <Text fontSize="2xl">{item.icon}</Text>}
          {item.label && <Text fontSize="xs" mt={1} color="gray.700">{item.label}</Text>}
        </Box>
      ))}
    </SimpleGrid>
  );
}

function ComparisonVisual({ visual }: { visual: StudyVisualSpec }) {
  const nodes = visual.nodes ?? [];
  const left = nodes.slice(0, Math.ceil(nodes.length / 2));
  const right = nodes.slice(Math.ceil(nodes.length / 2));

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      <Box p={3} bg="blue.50" borderRadius="lg">
        <VStack spacing={2}>{left.map((n) => <NodeBox key={n.id} label={n.label} icon={n.icon} color="blue" size="sm" />)}</VStack>
      </Box>
      <Box p={3} bg="orange.50" borderRadius="lg">
        <VStack spacing={2}>{right.map((n) => <NodeBox key={n.id} label={n.label} icon={n.icon} color="orange" size="sm" />)}</VStack>
      </Box>
    </SimpleGrid>
  );
}

function TableVisual({ visual }: { visual: StudyVisualSpec }) {
  if (!visual.headers?.length) return null;
  return (
    <Box overflowX="auto" borderRadius="lg" borderWidth={1} borderColor="gray.200">
      <Table size="sm">
        <Thead bg="gray.50">
          <Tr>{visual.headers.map((h) => <Th key={h}>{h}</Th>)}</Tr>
        </Thead>
        <Tbody>
          {(visual.rows ?? []).map((row, i) => (
            <Tr key={i}>{row.map((cell, j) => <Td key={j}>{cell}</Td>)}</Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export const StudyVisualDiagram: React.FC<Props> = ({ visual, animate = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const activeIds = new Set<string>();

  if (animate && visual.animation?.length) {
    visual.animation.slice(0, activeStep + 1).forEach((a) => {
      a.targetIds.forEach((id) => activeIds.add(id));
    });
  } else {
    visual.nodes?.filter((n) => n.highlight).forEach((n) => activeIds.add(n.id));
  }

  useEffect(() => {
    if (!animate || !visual.animation?.length) return undefined;
    const timer = setInterval(() => {
      setActiveStep((s) => (s >= visual.animation!.length - 1 ? 0 : s + 1));
    }, 2000);
    return () => clearInterval(timer);
  }, [animate, visual.animation]);

  const layoutTypes = ['tree', 'infographic', 'mindmap'];
  const flowTypes = ['flowchart', 'process', 'cycle', 'decision-tree', 'timeline', 'diagram'];

  return (
    <Box p={{ base: 3, md: 4 }} bg="gray.50" borderRadius="xl" borderWidth={1} borderColor="gray.200">
      {visual.title && (
        <Text fontWeight="bold" textAlign="center" mb={3} color="gray.700">{visual.title}</Text>
      )}
      {visual.type === 'table' && <TableVisual visual={visual} />}
      {visual.type === 'comparison' && <ComparisonVisual visual={visual} />}
      {visual.type === 'icon-grid' && <IconGrid visual={visual} />}
      {layoutTypes.includes(visual.type) && <TreeLayout visual={visual} activeIds={activeIds} />}
      {flowTypes.includes(visual.type) && <FlowLayout visual={visual} activeIds={activeIds} />}
      {animate && visual.animation?.[activeStep]?.label && (
        <Badge mt={3} colorScheme="purple" display="block" textAlign="center" py={1}>
          {visual.animation[activeStep].label}
        </Badge>
      )}
    </Box>
  );
};
