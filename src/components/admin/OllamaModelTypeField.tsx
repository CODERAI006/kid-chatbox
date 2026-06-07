/**
 * Single model-type row for Ollama Cloud admin settings.
 */
import {
  FormControl, FormHelperText, FormLabel, Input, Select, Badge, HStack, Text,
} from '@/shared/design-system';
import type { OllamaModelCatalogEntry } from '@/services/admin';

interface OllamaModelTypeFieldProps {
  entry: OllamaModelCatalogEntry;
  value: string;
  onChange: (value: string) => void;
}

export const OllamaModelTypeField: React.FC<OllamaModelTypeFieldProps> = ({
  entry,
  value,
  onChange,
}) => (
  <FormControl>
    <HStack justify="space-between" mb={1}>
      <FormLabel mb={0}>
        {entry.emoji} {entry.label}
      </FormLabel>
      <Badge colorScheme={entry.implemented ? 'green' : 'gray'} fontSize="2xs">
        {entry.implemented ? 'Active' : 'Coming soon'}
      </Badge>
    </HStack>
    {entry.presets.length > 0 && (
      <Select value={value} onChange={(e) => onChange(e.target.value)} mb={2} size="sm">
        <option value="">— Custom / type below —</option>
        {entry.presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Select>
    )}
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={entry.defaultCloud || 'Model name (optional)'}
      size="sm"
    />
    <FormHelperText>
      <Text as="span" display="block" mb={1}>{entry.description}</Text>
      Env override: <Text as="code" fontSize="2xs">{entry.envVar}</Text>
      {!entry.implemented && ' — saved for future features.'}
    </FormHelperText>
  </FormControl>
);
