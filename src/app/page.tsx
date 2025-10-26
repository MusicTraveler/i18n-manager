"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { NonIdealState, Section, SectionCard, Button, Intent } from "@blueprintjs/core";
import { trpc } from "@/lib/client";
import type { Message } from "@/lib/client";
import { MessageCompletenessStats } from "@/components/MessageCompletenessStats";
import { FiltersSection } from "@/components/FiltersSection";
import { CategorySection } from "@/components/CategorySection";
import { MessageDialog } from "@/components/MessageDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ImportMessagesDialog } from "@/components/ImportMessagesDialog";
import { AddLanguageDialog } from "@/components/AddLanguageDialog";

const fetcher = async (): Promise<Message[]> => {
  const data = await trpc.list.query({});
  return data;
};

type KeyRow = {
  fullKey: string;
  category: string;
  subcategory?: string;
  keyName: string;
  messagesByLocale: Map<string, Message>;
  missingLocales: string[];
};

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddLanguageDialogOpen, setIsAddLanguageDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [filterKey, setFilterKey] = useState("");
  const [filterLocale, setFilterLocale] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const { data: messages = [], error, isLoading } = useSWR<Message[], Error>("messages", fetcher);

  // Get all unique locales
  const allLocales = useMemo(() => {
    const locales = new Set(messages.map((m) => m.locale));
    return Array.from(locales).sort();
  }, [messages]);

  // Filter locales based on selected languages
  const displayedLocales = useMemo(() => {
    if (selectedLanguages.length === 0) return allLocales;
    return allLocales.filter(locale => selectedLanguages.includes(locale));
  }, [allLocales, selectedLanguages]);

  // Transform messages into table rows with locales as columns
  const tableRows = useMemo(() => {
    const keyMap = new Map<string, KeyRow>();

    for (const msg of messages) {
      if (!keyMap.has(msg.key)) {
        const parts = msg.key.split(".");
        const category = parts[0];
        const subcategory = parts.length > 2 ? parts.slice(1, -1).join(".") : undefined;
        const keyName = parts[parts.length - 1];

        keyMap.set(msg.key, {
          fullKey: msg.key,
          category,
          subcategory,
          keyName,
          messagesByLocale: new Map(),
          missingLocales: [],
        });
      }

      keyMap.get(msg.key)!.messagesByLocale.set(msg.locale, msg);
    }

    // Calculate missing locales for each key (based on displayed locales)
    for (const row of keyMap.values()) {
      row.missingLocales = displayedLocales.filter((l) => !row.messagesByLocale.has(l));
    }

    return Array.from(keyMap.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.subcategory !== b.subcategory) {
        if (!a.subcategory) return -1;
        if (!b.subcategory) return 1;
        return a.subcategory.localeCompare(b.subcategory);
      }
      return a.keyName.localeCompare(b.keyName);
    });
  }, [messages, allLocales]);

  // Filter rows based on filterKey and filterLocale
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      if (filterKey && !row.fullKey.toLowerCase().includes(filterKey.toLowerCase())) return false;
      if (filterLocale) {
        const hasMatchingLocale = Array.from(row.messagesByLocale.values()).some(
          (m) => m.locale.toLowerCase().includes(filterLocale.toLowerCase())
        );
        if (!hasMatchingLocale) return false;
      }
      return true;
    });
  }, [tableRows, filterKey, filterLocale]);

  // Group filtered rows by category
  const filteredGroupedRows = useMemo(() => {
    const categories = new Map<string, Map<string, KeyRow[]>>();

    for (const row of filteredRows) {
      if (!categories.has(row.category)) {
        categories.set(row.category, new Map());
      }

      const categoryMap = categories.get(row.category)!;
      
      const subcat = row.subcategory || "_root";
      if (!categoryMap.has(subcat)) {
        categoryMap.set(subcat, []);
      }
      
      categoryMap.get(subcat)!.push(row);
    }

    return categories;
  }, [filteredRows]);

  // Update selected languages when allLocales changes (on initial load)
  useEffect(() => {
    if (allLocales.length > 0 && selectedLanguages.length === 0) {
      setSelectedLanguages(allLocales);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLocales]);

  // Calculate completeness stats
  const allKeysSet = useMemo(() => new Set(messages.map((m) => m.key)), [messages]);
  const completenessStats = useMemo(() => {
    return allLocales.map((locale) => {
      const localeMessages = messages.filter((m) => m.locale === locale);
      const localeKeys = new Set(localeMessages.map((m) => m.key));
      const missingCount = Array.from(allKeysSet).filter((key) => !localeKeys.has(key)).length;
      const percentage = allKeysSet.size > 0 ? Math.round((localeKeys.size / allKeysSet.size) * 100) : 0;
      
      return {
        locale,
        count: localeKeys.size,
        total: allKeysSet.size,
        missing: missingCount,
        percentage,
      };
    });
  }, [messages, allLocales, allKeysSet]);

  const handleEdit = useCallback((message: Message) => {
    setEditingMessage(message);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (fullKey: string) => {
    try {
      await trpc.deleteByKey.mutate({ key: fullKey });
      await mutate("messages");
    } catch (error) {
      console.error("Error deleting messages:", error);
      alert("Failed to delete message key");
    }
  }, []);

  return (
    <div className="bp6-dark" style={{ minHeight: "100vh", padding: "20px" }}>
      <Section id="i18n-manager-section" suppressHydrationWarning>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h1 style={{ margin: 0, color: "white" }}>i18n Manager</h1>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button intent="none" icon="globe-network" onClick={() => setIsAddLanguageDialogOpen(true)}>
                Add Language
              </Button>
              <Button intent="none" icon="import" onClick={() => setIsImportDialogOpen(true)}>
                Import
              </Button>
              <Button intent={Intent.PRIMARY} icon="add" onClick={() => setIsDialogOpen(true)}>
                Add Message
              </Button>
            </div>
          </div>

          {allLocales.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <LanguageSelector
                languages={allLocales}
                selectedLanguages={selectedLanguages}
                onLanguagesChange={setSelectedLanguages}
              />
            </div>
          )}
          
          <MessageCompletenessStats messages={messages} stats={completenessStats} />
        </div>

        <SectionCard>
          <FiltersSection
            filterKey={filterKey}
            filterLocale={filterLocale}
            onFilterKeyChange={setFilterKey}
            onFilterLocaleChange={setFilterLocale}
          />

          <div style={{ background: "#2b3d52", padding: "20px", borderRadius: "4px" }}>
            {isLoading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "white" }}>Loading...</div>
            ) : error ? (
              <div style={{ padding: "20px", textAlign: "center", color: "red" }}>Error loading messages</div>
            ) : filteredRows.length === 0 ? (
              <NonIdealState
                icon="translate"
                title="No messages found"
                description={messages.length === 0 ? "Add your first message to get started!" : "Try adjusting your filters"}
              />
            ) : (
              <div>
                {Array.from(filteredGroupedRows.entries()).map(([category, subcategories]) => (
                  <CategorySection
                    key={category}
                    category={category}
                    subcategories={subcategories}
                    allLocales={displayedLocales}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </Section>

      <MessageDialog
        isOpen={isDialogOpen}
        editingMessage={editingMessage}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingMessage(null);
        }}
        onSuccess={() => {}}
      />

      <ImportMessagesDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          console.log("Import successful");
        }}
      />

      <AddLanguageDialog
        isOpen={isAddLanguageDialogOpen}
        onClose={() => setIsAddLanguageDialogOpen(false)}
        onSuccess={() => {
          console.log("Language added successfully");
        }}
      />
    </div>
  );
}
