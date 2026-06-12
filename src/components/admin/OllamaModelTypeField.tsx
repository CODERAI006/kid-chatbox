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
  /** Live model names from Ollama GET /api/tags (filtered for this type). */
  liveModels?: string[];
}

function buildOptions(entry: OllamaModelCatalogEntry, liveModels: string[], currentValue: string) {
  const seen = new Set<string>();
  const options: { id: string; label: string; source: 'preset' | 'live' }[] = [];

  for (const p of entry.presets) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      options.push({ id: p.id, label: p.label, source: 'preset' });
    }
  }
  for (const id of liveModels) {
    if (!seen.has(id)) {
      seen.add(id);
      options.push({ id, label: id, source: 'live' });
    }
  }
  if (currentValue && !seen.has(currentValue)) {
    options.unshift({ id: currentValue, label: `${currentValue} (current)`, source: 'live' });
  }
  return options;
}

export const OllamaModelTypeField: React.FC<OllamaModelTypeFieldProps> = ({
  entry,
  value,
  onChange,
  liveModels = [],
}) => {
  const options = buildOptions(entry, liveModels, value);
  const hasDropdown = options.length > 0;

  return (
    <FormControl>
      <HStack justify="space-between" mb={1}>
        <FormLabel mb={0}>
          {entry.emoji} {entry.label}
        </FormLabel>
        <Badge colorScheme={entry.implemented ? 'green' : 'gray'} fontSize="2xs">
          {entry.implemented ? 'Active' : 'Coming soon'}
        </Badge>
      </HStack>
      {hasDropdown && (
        <Select value={value} onChange={(e) => onChange(e.target.value)} mb={2} size="sm">
          <option value="">— Custom / type below —</option>
          {entry.presets.length > 0 && liveModels.length > 0 && (
            <optgroup label="Recommended presets">
              {options.filter((o) => o.source === 'preset').map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
          )}
          {liveModels.length > 0 && (
            <optgroup label={entry.presets.length > 0 ? 'From Ollama API' : 'Models'}>
              {options.filter((o) => o.source === 'live').map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
          )}
          {entry.presets.length > 0 && liveModels.length === 0 &&
            options.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
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
        {liveModels.length > 0 && (
          <> · {liveModels.length} model{liveModels.length === 1 ? '' : 's'} from Ollama API</>
        )}
        {!entry.implemented && ' — saved for future features.'}
      </FormHelperText>
    </FormControl>
  );
};
