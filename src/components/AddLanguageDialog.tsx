import { useState } from "react";
import { Dialog, Button, Intent, FormGroup, InputGroup } from "@blueprintjs/core";
import { trpc } from "@/lib/client";

interface AddLanguageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddLanguageDialog({ isOpen, onClose, onSuccess }: AddLanguageDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!code.trim()) {
      setError("Language code is required");
      return;
    }

    if (!name.trim()) {
      setError("Language name is required");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const result = await trpc.createLanguage.mutate({
        code: code.trim(),
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
        <FormGroup label="Language Code" labelInfo="(required)">
          <InputGroup
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., en, es, fr"
            large
          />
          <div style={{ fontSize: "12px", color: "#A7B6C2", marginTop: "5px" }}>
            ISO 639-1 code (2 letters)
          </div>
        </FormGroup>

        <FormGroup label="Language Name" labelInfo="(required)">
          <InputGroup
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., English, Spanish, French"
            large
          />
        </FormGroup>

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

