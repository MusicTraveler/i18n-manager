import { Button } from "@blueprintjs/core";
import type { Message } from "@/lib/client";
import type { KeyboardEvent } from "react";
import styles from "./MessageKeyRow.module.css";

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
    <tr className={styles.tableRow}>
      {/* Frozen Key Column */}
      <td className={styles.frozenKeyCell}>
        <div className={styles.keyCellContent}>
          <code className={styles.keyName}>{keyName}</code>
          {missingLocales.length > 0 && (
            <span
              className={styles.missingBadge}
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
            className={styles.localeCell}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Using div with role for editable message content */}
            <div 
              role={msg ? "button" : undefined}
              tabIndex={msg ? 0 : undefined}
              className={isMissing ? styles.localeContentDisabled : styles.localeContent}
              onDoubleClick={() => {
                if (msg) {
                  onEdit(msg);
                }
              }}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (msg && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onEdit(msg);
                }
              }}
              title={msg ? "Double-click to edit" : undefined}
            >
              {isMissing ? "—" : msg.message}
            </div>
          </td>
        );
      })}

      {/* Frozen Actions Column */}
      <td className={styles.frozenActionsCell}>
        <div className={styles.actionsContainer}>
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

