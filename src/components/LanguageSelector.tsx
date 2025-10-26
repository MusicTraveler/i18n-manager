import { Select, ItemRendererProps } from "@blueprintjs/select";
import { Button, MenuItem } from "@blueprintjs/core";

interface LanguageSelectorProps {
  languages: string[];
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
}

const LanguageSelect = Select.ofType<string>();

export function LanguageSelector({ languages, selectedLanguages, onLanguagesChange }: LanguageSelectorProps) {
  const isLanguageSelected = (language: string) => {
    return selectedLanguages.includes(language);
  };

  const handleLanguageSelect = (language: string) => {
    if (isLanguageSelected(language)) {
      onLanguagesChange(selectedLanguages.filter((l) => l !== language));
    } else {
      onLanguagesChange([...selectedLanguages, language]);
    }
  };

  const renderLanguage = (language: string, { modifiers, handleClick }: ItemRendererProps) => {
    const isSelected = isLanguageSelected(language);
    return (
      <MenuItem
        key={language}
        text={language.toUpperCase()}
        icon={isSelected ? "tick" : "blank"}
        onClick={handleClick}
        active={modifiers.active}
        selected={isSelected}
      />
    );
  };

  return (
    <LanguageSelect
      items={languages}
      itemRenderer={renderLanguage}
      onItemSelect={handleLanguageSelect}
      resetOnSelect={false}
      placeholder="Select languages to display..."
      popoverProps={{ 
        matchTargetWidth: true,
        usePortal: false
      }}
      filterable={false}
    >
      <Button
        icon="globe-network"
        rightIcon="caret-down"
        text={
          selectedLanguages.length > 0
            ? `${selectedLanguages.length} language${selectedLanguages.length !== 1 ? "s" : ""} selected`
            : "Select Languages"
        }
        intent="primary"
      />
    </LanguageSelect>
  );
}

