import { InputGroup } from "@blueprintjs/core";

interface FiltersSectionProps {
  filterKey: string;
  filterLocale: string;
  onFilterKeyChange: (value: string) => void;
  onFilterLocaleChange: (value: string) => void;
}

export function FiltersSection({ filterKey, filterLocale, onFilterKeyChange, onFilterLocaleChange }: FiltersSectionProps) {
  return (
    <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
      <InputGroup
        placeholder="Filter by key..."
        value={filterKey}
        onChange={(e) => onFilterKeyChange(e.target.value)}
        leftIcon="search"
        style={{ flex: 1 }}
      />
      <InputGroup
        placeholder="Filter by locale..."
        value={filterLocale}
        onChange={(e) => onFilterLocaleChange(e.target.value)}
        leftIcon="globe-network"
        style={{ width: "200px" }}
      />
    </div>
  );
}

