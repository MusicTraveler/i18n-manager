import { useState, ChangeEvent } from "react";
import { Button, Intent, Dialog, FormGroup, InputGroup, TextArea } from "@blueprintjs/core";
import type { Message } from "@/lib/client";
import { trpc } from "@/lib/client";
import { mutate } from "swr";

interface MessageDialogProps {
  isOpen: boolean;
  editingMessage: Message | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MessageDialog({ isOpen, editingMessage, onClose, onSuccess }: MessageDialogProps) {
  const [formData, setFormData] = useState({ 
    key: "", 
    locale: "", 
    message: "" 
  });

  // Reset form when dialog opens/closes or editingMessage changes
  if (editingMessage && isOpen && formData.key !== editingMessage.key) {
    setFormData({ 
      key: editingMessage.key, 
      locale: editingMessage.locale, 
      message: editingMessage.message 
    });
  }

  const handleSave = async () => {
    try {
      if (editingMessage) {
        await trpc.update.mutate({
          id: editingMessage.id,
          key: formData.key,
          locale: formData.locale,
          message: formData.message,
        });
      } else {
        await trpc.create.mutate(formData);
      }
      onClose();
      setFormData({ key: "", locale: "", message: "" });
      await mutate("messages");
      onSuccess();
    } catch (error) {
      console.error("Error saving message:", error);
      const message = error instanceof Error ? error.message : "Failed to save message";
      alert(message);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({ key: "", locale: "", message: "" });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={editingMessage ? "Edit Message" : "Add Message"}
      style={{ width: "600px" }}
    >
      <div style={{ padding: "20px" }}>
        <FormGroup label="Key" labelInfo="(required)">
          <InputGroup
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder="message.key or category.key"
            disabled={!!editingMessage}
          />
        </FormGroup>

        <FormGroup label="Locale" labelInfo="(required)">
          <InputGroup
            value={formData.locale}
            onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
            placeholder="en"
            disabled={!!editingMessage}
          />
        </FormGroup>

        <FormGroup label="Message" labelInfo="(required)">
          <TextArea
            value={formData.message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
            placeholder="The actual message text"
            rows={4}
            fill
          />
        </FormGroup>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button intent={Intent.PRIMARY} onClick={handleSave}>
            {editingMessage ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

