import { useState, useRef, useEffect } from "react";
import { Dialog, Button, Intent, FileInput, Callout, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import { trpc } from "@/lib/client";
import { mutate } from "swr";

const LocaleSelect = Select.ofType<string>();

interface ImportMessagesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Language {
  code: string;
  name: string;
}

interface ImportedMessage {
  key: string;
  locale: string;
  message: string;
}

export function ImportMessagesDialog({ isOpen, onClose, onSuccess }: ImportMessagesDialogProps) {
  const [fileContent, setFileContent] = useState<string>("");
  const [selectedLocale, setSelectedLocale] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available languages from the database
  useEffect(() => {
    if (isOpen) {
      setIsLoadingLanguages(true);
      trpc.getLanguages.query().then((data) => {
        setLanguages(data);
        setIsLoadingLanguages(false);
      }).catch((err) => {
        console.error("Failed to fetch languages:", err);
        setIsLoadingLanguages(false);
      });
    }
  }, [isOpen]);

  // Create a list of locale codes
  const availableLocales = languages.map((l) => l.code).sort();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileContent("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setFileContent(content);
        setError("");
      } catch (err) {
        setError("Failed to read file");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileContent) {
      setError("Please select a file first");
      return;
    }

    if (!selectedLocale || selectedLocale === "") {
      setError("Please select a locale");
      return;
    }

    setError("");
    setIsImporting(true);

    try {
      const data = JSON.parse(fileContent);
      
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new Error("Invalid format: Expected a nested object structure");
      }

      // Helper function to flatten nested objects
      const flattenObject = (obj: any, prefix = ""): ImportedMessage[] => {
        const result: ImportedMessage[] = [];
        
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            // Nested object - recurse
            result.push(...flattenObject(value, newKey));
          } else {
            // Leaf value
            result.push({ key: newKey, locale: selectedLocale, message: String(value) });
          }
        }
        
        return result;
      };

      // Flatten the nested structure
      const messages = flattenObject(data);

      if (messages.length === 0) {
        throw new Error("No valid messages found in the file");
      }

      // Import each message
      let successCount = 0;
      let errorCount = 0;

      for (const msg of messages) {
        try {
          await trpc.create.mutate({
            key: msg.key,
            locale: msg.locale,
            message: msg.message,
          });
          successCount++;
        } catch (err) {
          console.error("Error importing message:", msg, err);
          errorCount++;
        }
      }

      // Refresh the data
      await mutate("messages");

      setIsImporting(false);
      
      if (errorCount > 0) {
        alert(`Imported ${successCount} messages successfully. ${errorCount} messages failed to import.`);
      } else {
        alert(`Successfully imported ${successCount} messages!`);
      }
      
      onClose();
      onSuccess();
      
      // Reset state
      setFileContent("");
      setError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON file");
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFileContent("");
    setSelectedLocale("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderLocale = (locale: string) => (
    <MenuItem
      key={locale}
      text={locale.toUpperCase()}
      onClick={() => setSelectedLocale(locale)}
    />
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Messages"
      style={{ width: "600px" }}
    >
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "20px" }}>
          <Callout intent="primary" icon="info-sign">
            <div style={{ marginBottom: "10px" }}>
              <strong>Supported JSON format:</strong> Nested object with categories
              <pre style={{ fontSize: "11px", marginTop: "5px", padding: "8px", background: "#2b3d52" }}>
{`{
  "common": { "loading": "Loading...", "error": "Error" },
  "navigation": { "home": "Home", "about": "About" },
  "forms": { "email": "Email", "password": "Password" }
}`}
              </pre>
              <div style={{ fontSize: "12px", marginTop: "8px", color: "#A7B6C2" }}>
                This format will be converted to keys like: <code>common.loading</code>, <code>navigation.home</code>, etc.
              </div>
            </div>
          </Callout>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <FileInput
            inputProps={{ ref: fileInputRef, accept: ".json" }}
            text={fileContent ? "File selected" : "Choose file..."}
            onInputChange={handleFileChange}
            buttonText="Browse"
            large
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "8px", fontSize: "14px", color: "white", fontWeight: "bold" }}>
            Select Locale
          </div>
          <LocaleSelect
            items={availableLocales}
            itemRenderer={renderLocale}
            onItemSelect={setSelectedLocale}
            filterable={false}
            placeholder="Choose a locale..."
            popoverProps={{ matchTargetWidth: true }}
            disabled={isLoadingLanguages || availableLocales.length === 0}
          >
            <Button
              icon="globe-network"
              rightIcon="caret-down"
              text={isLoadingLanguages ? "Loading locales..." : selectedLocale ? selectedLocale.toUpperCase() : "Select Locale"}
              intent="primary"
              large
              style={{ width: "100%" }}
              loading={isLoadingLanguages}
            />
          </LocaleSelect>
          <div style={{ fontSize: "12px", color: "#A7B6C2", marginTop: "8px" }}>
            This locale will be applied to all imported messages
          </div>
        </div>

        {error && (
          <Callout intent="danger" icon="error" style={{ marginBottom: "20px" }}>
            {error}
          </Callout>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            intent={Intent.PRIMARY}
            onClick={handleImport}
            loading={isImporting}
            disabled={!fileContent || !selectedLocale || isImporting}
          >
            Import Messages
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

