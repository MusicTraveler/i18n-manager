import { useState, useEffect, useMemo } from "react";
import { Dialog, Button, Intent, FormGroup, Tag } from "@blueprintjs/core";
import { Suggest } from "@blueprintjs/select";
import useSWR from "swr";
import { trpc } from "@/lib/client";

interface Language {
  code: string;
  name: string;
}

interface LanguageOption {
  English: string;
  alpha2: string;
}

interface AddLanguageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<LanguageOption[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load language codes");
  return res.json();
};

export function AddLanguageDialog({ isOpen, onClose, onSuccess }: AddLanguageDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);

  // Load language codes from JSON using SWR
  const { data: allLangCodes, error: langCodesError } = useSWR<LanguageOption[]>(
    "/lang-codes.json",
    fetcher
  );

  // Filter to only include entries with alpha2 codes
  const langCodes = useMemo(() => {
    if (!allLangCodes) return [];
    return allLangCodes.filter((item) => item.alpha2 != null && item.alpha2.length === 2);
  }, [allLangCodes]);

  // Fetch existing languages
  useEffect(() => {
    if (isOpen) {
      trpc.getLanguages.query().then(setLanguages);
    }
  }, [isOpen]);

  // Filter function for Suggest
  const filterItems = (query: string, items: LanguageOption[]): LanguageOption[] => {
    const queryLower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.alpha2.toLowerCase().includes(queryLower) ||
        item.English.toLowerCase().includes(queryLower)
    );
  };

  // Render item function for Suggest
  const renderLanguageItem = (item: LanguageOption, options: any) => {
    return (
      // biome-ignore lint/a11y/useSemanticElements: <its fine>
<div
        key={item.alpha2}
        role="button"
        tabIndex={0}
        onClick={options.handleClick}
        onKeyDown={options.handleKeyDown}
        style={{
          padding: "10px 15px",
          cursor: "pointer",
          backgroundColor: options.modifiers?.active ? "#F5F8FA" : "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong>{item.alpha2}</strong>
          <span style={{ marginLeft: "8px", color: "#666" }}>{item.English}</span>
        </div>
      </div>
    );
  };

  const handleItemSelect = (item: LanguageOption) => {
    setCode(item.alpha2);
    setName(item.English);
  };

  const handleSave = async () => {
    if (!code.trim()) {
      setError("Language code is required");
      return;
    }

    if (!name.trim()) {
      setError("Language name is required");
      return;
    }

    // Check if code already exists
    const codeLower = code.trim().toLowerCase();
    const exists = languages.some((lang: Language) => lang.code.toLowerCase() === codeLower);
    if (exists) {
      setError("Language code already exists");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const result = await trpc.createLanguage.mutate({
        code: codeLower,
        name: name.trim(),
      });
      
      if (result.success) {
        setIsSaving(false);
        onClose();
        onSuccess();
        setCode("");
        setName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add language");
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCode("");
    setName("");
    setError("");
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Language"
      style={{ width: "500px" }}
    >
      <div style={{ padding: "20px" }}>
        <FormGroup label="Select Language" labelInfo="(required)" helperText="Start typing to search by code or name">
          <Suggest<LanguageOption>
            items={langCodes}
            inputValueRenderer={(item) => `${item.alpha2} - ${item.English}`}
            itemListPredicate={filterItems}
            itemRenderer={renderLanguageItem}
            onItemSelect={handleItemSelect}
            noResults={<div style={{ padding: "10px 15px" }}>No language found</div>}
            popoverProps={{
              popoverClassName: "bp6-select-popover",
            }}
            inputProps={{
              placeholder: "Search for a language...",
              large: true,
            }}
            selectedItem={langCodes.find((item) => item.alpha2 === code) || null}
          />
          {code && name && (
            <div style={{ fontSize: "12px", color: "#A7B6C2", marginTop: "5px" }}>
              Selected: <strong>{code}</strong> - {name}
            </div>
          )}
        </FormGroup>

        {languages.length > 0 && (
          <FormGroup label="Existing Languages">
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap", 
              gap: "8px", 
              padding: "12px",
              minHeight: "60px",
            }}>
              {languages.length > 0 ? (
                languages.map((lang: Language) => (
                  <Tag key={lang.code} intent={Intent.NONE} large>
                    <strong>{lang.code}</strong>: {lang.name}
                  </Tag>
                ))
              ) : (
                <div style={{ color: "#8A9BA8", fontStyle: "italic" }}>
                  No languages added yet
                </div>
              )}
            </div>
          </FormGroup>
        )}

        {error && (
          <div style={{ color: "red", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <Button onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            intent={Intent.PRIMARY}
            onClick={handleSave}
            loading={isSaving}
            disabled={!code.trim() || !name.trim() || isSaving}
          >
            Add Language
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

