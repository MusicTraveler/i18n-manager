import { useState, useEffect } from "react";
import { Button, Intent, Dialog, FormGroup, InputGroup, Checkbox } from "@blueprintjs/core";
import { trpc } from "@/lib/client";
import { mutate } from "swr";

interface AddKeyDialogProps {
  isOpen: boolean;
  parentKey: string;
  allLocales: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddKeyDialog({ isOpen, parentKey, allLocales, onClose, onSuccess }: AddKeyDialogProps) {
  const [keyName, setKeyName] = useState("");
  const [englishValue, setEnglishValue] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setKeyName("");
      setEnglishValue("");
      setAutoTranslate(true);
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Validate required fields
    if (!keyName.trim()) {
      alert("Key name is required");
      return;
    }
    if (!englishValue.trim()) {
      alert("English value is required");
      return;
    }

    setIsSaving(true);

    try {
      // Build the full key path
      const fullKey = parentKey ? `${parentKey}.${keyName}` : keyName;

      // Create the English message first
      await trpc.create.mutate({
        key: fullKey,
        locale: "en",
        message: englishValue,
      });

      // If auto-translate is enabled, translate to other languages
      if (autoTranslate) {
        const nonEnglishLocales = allLocales.filter(locale => locale !== "en");
        
        // Translate to all non-English locales
        const translationPromises = nonEnglishLocales.map(async (locale) => {
          try {
            const result = await trpc.translateText.mutate({
              text: englishValue,
              target: locale,
              source: "en",
            });

            // Get the translated text - handle both array and string responses
            let translatedText: string;
            if (typeof result.translatedText === 'string') {
              translatedText = result.translatedText;
            } else if (Array.isArray(result.translatedText) && result.translatedText.length > 0) {
              translatedText = String(result.translatedText[0]);
            } else {
              throw new Error('Invalid translation response');
            }

            // Create the translated message
            await trpc.create.mutate({
              key: fullKey,
              locale: locale,
              message: translatedText,
            });
          } catch (error) {
            console.error(`Failed to translate to ${locale}:`, error);
            // Continue with other languages even if one fails
          }
        });

        await Promise.all(translationPromises);
      }

      // Refresh the messages list
      await mutate("messages");

      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error creating message:", error);
      const message = error instanceof Error ? error.message : "Failed to create message";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
      setKeyName("");
      setEnglishValue("");
      setAutoTranslate(true);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Key"
      style={{ width: "600px" }}
      canEscapeKeyClose={!isSaving}
      canOutsideClickClose={!isSaving}
    >
      <div style={{ padding: "20px" }}>
        <FormGroup label="Key Name" labelInfo="(required)">
          <InputGroup
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="myKey"
            disabled={isSaving}
          />
          {parentKey && (
            <div style={{ marginTop: "4px", fontSize: "12px", color: "#8A9BA8" }}>
              Full path: <strong>{parentKey}.{keyName}</strong>
            </div>
          )}
        </FormGroup>

        <FormGroup label="English (en) Value" labelInfo="(required)">
          <InputGroup
            value={englishValue}
            onChange={(e) => setEnglishValue(e.target.value)}
            placeholder="Enter the English text"
            disabled={isSaving}
            fill
          />
        </FormGroup>

        <FormGroup>
          <Checkbox
            checked={autoTranslate}
            onChange={(e) => setAutoTranslate(e.currentTarget.checked)}
            label="Auto-translate to other languages"
            disabled={isSaving}
          />
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#8A9BA8", marginLeft: "24px" }}>
            Automatically translate this key to all {allLocales.filter(l => l !== "en").length} non-English languages
          </div>
        </FormGroup>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <Button onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button intent={Intent.PRIMARY} onClick={handleSave} disabled={isSaving} loading={isSaving}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

