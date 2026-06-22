import { motion } from 'framer-motion';
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
  delay?: number;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  emoji,
  title,
  hint,
  disabled,
  limitLabel,
  onClick,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={disabled ? {} : { y: -4, transition: { duration: 0.15 } }}
    whileTap={disabled ? {} : { scale: 0.98 }}
    style={{ height: '100%' }}
  >
    <Card
      cursor={disabled ? 'not-allowed' : 'pointer'}
      onClick={disabled ? undefined : onClick}
      height={{ base: 'auto', sm: '150px', md: '160px' }}
      minH={{ base: '100px', sm: '150px' }}
      opacity={disabled ? 0.6 : 1}
      position="relative"
      width="100%"
      borderWidth="2px"
      borderColor={disabled ? 'gray.200' : 'blue.100'}
      _hover={disabled ? {} : { shadow: 'lg', borderColor: 'blue.300' }}
      transition="box-shadow 0.2s, border-color 0.2s"
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
  </motion.div>
);
