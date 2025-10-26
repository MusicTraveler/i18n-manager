import { Button } from "@blueprintjs/core";
import type { Message } from "@/lib/client";

interface MessageKeyRowProps {
  fullKey: string;
  category: string;
  subcategory?: string;
  keyName: string;
  messagesByLocale: Map<string, Message>;
  missingLocales: string[];
  allLocales: string[];
  onEdit: (message: Message) => void;
  onDelete: (fullKey: string) => void;
}

export function MessageKeyRow({ 
  fullKey, 
  keyName, 
  messagesByLocale, 
  missingLocales, 
  allLocales, 
  onEdit,
  onDelete
}: MessageKeyRowProps) {
  const firstMessage = messagesByLocale.size > 0 
    ? Array.from(messagesByLocale.values())[0] 
    : null;

  return (
    <tr style={{ borderBottom: "1px solid #405364" }}>
      {/* Key Column */}
      <td style={{ padding: "12px", verticalAlign: "top" }}>
        <div style={{ position: "relative" }}>
          <code style={{ color: "white", fontSize: "13px", fontFamily: "monospace" }}>{keyName}</code>
          {missingLocales.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#D9822B",
                color: "white",
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
              title={`Missing in: ${missingLocales.join(", ")}`}
            >
              {missingLocales.length}
            </span>
          )}
        </div>
      </td>

      {/* Locale Columns */}
      {allLocales.map((locale) => {
        const msg = messagesByLocale.get(locale);
        const isMissing = !msg;
        
        return (
          <td
            key={locale}
            style={{
              padding: "12px",
              verticalAlign: "top",
              width: "250px",
            }}
          >
            <div style={{ color: isMissing ? "#D9822B" : "white", wordBreak: "break-word" }}>
              {isMissing ? "—" : msg.message}
            </div>
          </td>
        );
      })}

      {/* Actions Column */}
      <td style={{ padding: "12px", verticalAlign: "top" }}>
        <div style={{ display: "flex", gap: "5px" }}>
          {firstMessage && (
            <>
              <Button
                small
                icon="edit"
                onClick={() => onEdit(firstMessage)}
                minimal
              />
              <Button
                small
                icon="trash"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete all translations for "${fullKey}"?`)) {
                    onDelete(fullKey);
                  }
                }}
                minimal
                intent="danger"
              />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

