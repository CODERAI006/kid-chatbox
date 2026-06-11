import {
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  Badge,
} from '@/shared/design-system';

interface ActionTileProps {
  emoji: string;
  title: string;
  hint: string;
  disabled: boolean;
  limitLabel: string;
  onClick: () => void;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  emoji,
  title,
  hint,
  disabled,
  limitLabel,
  onClick,
}) => (
  <Card
    cursor={disabled ? 'not-allowed' : 'pointer'}
    _hover={disabled ? {} : { transform: { base: 'none', md: 'scale(1.02)' }, shadow: 'lg' }}
    onClick={onClick}
    height={{ base: 'auto', sm: '160px', md: '180px', lg: '200px' }}
    minH={{ base: '100px', sm: '160px', md: '180px', lg: '200px' }}
    opacity={disabled ? 0.6 : 1}
    position="relative"
    width="100%"
  >
    {disabled && (
      <Badge
        position="absolute"
        top={{ base: 0.5, sm: 1, md: 2 }}
        right={{ base: 0.5, sm: 1, md: 2 }}
        colorScheme="red"
        fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
        zIndex={1}
      >
        {limitLabel}
      </Badge>
    )}
    <CardBody display="flex" alignItems="center" justifyContent="center" p={{ base: 2, sm: 3, md: 4, lg: 5 }}>
      <VStack spacing={{ base: 1, sm: 2, md: 3, lg: 4 }}>
        <Text fontSize={{ base: 'xl', sm: '2xl', md: '3xl', lg: '4xl' }}>{emoji}</Text>
        <Heading size={{ base: '2xs', sm: 'xs', md: 'sm', lg: 'md' }} textAlign="center" noOfLines={2}>
          {title}
        </Heading>
        <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="gray.600" textAlign="center" px={{ base: 1, sm: 2, md: 0 }} noOfLines={2}>
          {hint}
        </Text>
      </VStack>
    </CardBody>
  </Card>
);
