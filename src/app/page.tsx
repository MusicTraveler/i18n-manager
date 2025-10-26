"use client";

import { useState, useMemo, ChangeEvent } from "react";
import useSWR from "swr";
import { mutate } from "swr";
import {
  Button,
  Card,
  Collapse,
  Dialog,
  FormGroup,
  InputGroup,
  Intent,
  NonIdealState,
  Section,
  SectionCard,
  TextArea,
} from "@blueprintjs/core";

interface Message {
  id: number;
  key: string;
  locale: string;
  message: string;
}

const fetcher = async (url: string): Promise<Message[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

type NestedKey = {
  category: string;
  subcategory?: string;
  fullKey: string;
  messages: Message[];
};

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({ key: "", locale: "", message: "" });
  const [filterKey, setFilterKey] = useState("");
  const [filterLocale, setFilterLocale] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: messages = [], error, isLoading } = useSWR<Message[], Error>("/api/ui/messages", fetcher);

  // Group messages by category/subcategory
  const nestedMessages = useMemo(() => {
    const grouped = new Map<string, NestedKey>();

    for (const msg of messages) {
      const parts = msg.key.split(".");
      const category = parts[0];
      const subcategory = parts.length > 2 ? parts.slice(1, -1).join(".") : undefined;
      const key = parts[parts.length - 1];

      const fullKey = subcategory ? `${category}.${subcategory}.${key}` : `${category}.${key}`;
      
      if (!grouped.has(fullKey)) {
        grouped.set(fullKey, {
          category,
          subcategory,
          fullKey,
          messages: [],
        });
      }

      grouped.get(fullKey)!.messages.push(msg);
    }

    // Group by category
    const categories = new Map<string, Map<string, NestedKey[]>>();

    for (const nestedKey of grouped.values()) {
      if (!categories.has(nestedKey.category)) {
        categories.set(nestedKey.category, new Map());
      }

      const categoryMap = categories.get(nestedKey.category)!;
      
      if (nestedKey.subcategory) {
        if (!categoryMap.has(nestedKey.subcategory)) {
          categoryMap.set(nestedKey.subcategory, []);
        }
        categoryMap.get(nestedKey.subcategory)!.push(nestedKey);
      } else {
        // Direct category keys (e.g., "category.key")
        categoryMap.set("_root", categoryMap.get("_root") || []);
        categoryMap.get("_root")!.push(nestedKey);
      }
    }

    return categories;
  }, [messages]);

  // Calculate completeness stats
  const allKeys = new Set(messages.map((m) => m.key));
  const allLocales = new Set(messages.map((m) => m.locale));
  const completenessStats = Array.from(allLocales).map((locale) => {
    const localeMessages = messages.filter((m) => m.locale === locale);
    const localeKeys = new Set(localeMessages.map((m) => m.key));
    const missingCount = Array.from(allKeys).filter((key) => !localeKeys.has(key)).length;
    const percentage = allKeys.size > 0 ? Math.round((localeKeys.size / allKeys.size) * 100) : 0;
    
    return {
      locale,
      count: localeKeys.size,
      total: allKeys.size,
      missing: missingCount,
      percentage,
    };
  });

  const filteredMessages = messages.filter(
    (msg) =>
      (!filterKey || msg.key.toLowerCase().includes(filterKey.toLowerCase())) &&
      (!filterLocale || msg.locale.toLowerCase().includes(filterLocale.toLowerCase()))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSave = async () => {
    try {
      if (editingMessage) {
        const response = await fetch("/api/ui/messages", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingMessage.id, ...formData }),
        });
        if (!response.ok) throw new Error("Failed to update message");
      } else {
        const response = await fetch("/api/ui/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || "Failed to create message");
        }
      }
      setIsDialogOpen(false);
      setFormData({ key: "", locale: "", message: "" });
      setEditingMessage(null);
      await mutate("/api/ui/messages");
    } catch (error) {
      console.error("Error saving message:", error);
      const message = error instanceof Error ? error.message : "Failed to save message";
      alert(message);
    }
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setFormData({ key: message.key, locale: message.locale, message: message.message });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const response = await fetch(`/api/ui/messages?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete message");
      await mutate("/api/ui/messages");
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
    }
  };

  return (
    <div className="bp5-dark" style={{ minHeight: "100vh", padding: "20px" }}>
      <Section>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h1 style={{ margin: 0, color: "white" }}>i18n Manager</h1>
            <Button intent={Intent.PRIMARY} icon="add" onClick={() => setIsDialogOpen(true)}>
              Add Message
            </Button>
          </div>
          
          {/* Translation Completeness */}
          {messages.length > 0 && (
            <Card style={{ background: "#2b3d52", padding: "15px", marginBottom: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(completenessStats.length, 6)}, 1fr)`, gap: "10px" }}>
                {completenessStats.map((stat) => (
                  <div
                    key={stat.locale}
                    style={{
                      padding: "10px",
                      background: stat.percentage === 100 ? "#0F9960" : stat.percentage < 50 ? "#DB3737" : "#D9822B",
                      borderRadius: "4px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "white", fontWeight: "bold", marginBottom: "5px" }}>
                      {stat.locale.toUpperCase()}
                    </div>
                    <div style={{ color: "white", fontSize: "14px" }}>
                      {stat.count} / {stat.total} ({stat.percentage}%)
                    </div>
                    {stat.missing > 0 && (
                      <div style={{ color: "white", fontSize: "12px", marginTop: "5px" }}>
                        {stat.missing} missing
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <SectionCard>
          <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
            <InputGroup
              placeholder="Filter by key..."
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              leftIcon="search"
              style={{ flex: 1 }}
            />
            <InputGroup
              placeholder="Filter by locale..."
              value={filterLocale}
              onChange={(e) => setFilterLocale(e.target.value)}
              leftIcon="globe-network"
              style={{ width: "200px" }}
            />
          </div>

          <Card style={{ background: "#2b3d52", padding: "10px" }}>
            {isLoading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "white" }}>Loading...</div>
            ) : error ? (
              <div style={{ padding: "20px", textAlign: "center", color: "red" }}>Error loading messages</div>
            ) : filteredMessages.length === 0 ? (
              <NonIdealState
                icon="translate"
                title="No messages found"
                description={messages.length === 0 ? "Add your first message to get started!" : "Try adjusting your filters"}
              />
            ) : (
              <div>
                {/* Nested View by Category */}
                {Array.from(nestedMessages.entries()).map(([category, subcategories]) => {
                  const isExpanded = expandedCategories.has(category);
                  
                  return (
                    <div key={category} style={{ marginBottom: "10px" }}>
                      <div
                        style={{
                          padding: "10px",
                          background: "#364552",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          borderRadius: "4px",
                        }}
                        onClick={() => toggleCategory(category)}
                      >
                        <span style={{ color: "white", fontWeight: "bold" }}>{isExpanded ? "▼" : "▶"}</span>
                        <span style={{ color: "white", fontWeight: "bold", textTransform: "capitalize" }}>
                          {category} ({Array.from(subcategories.values()).flat().length} keys)
                        </span>
                      </div>

                      <Collapse isOpen={isExpanded}>
                        <div style={{ marginLeft: "20px", marginTop: "10px" }}>
                          {Array.from(subcategories.entries()).map(([subcategory, keys]) => {
                            const filteredKeys = keys.filter((k) => {
                              if (filterKey && !k.fullKey.toLowerCase().includes(filterKey.toLowerCase())) return false;
                              if (filterLocale && !k.messages.some((m) => m.locale.toLowerCase().includes(filterLocale.toLowerCase()))) return false;
                              return true;
                            });

                            if (filteredKeys.length === 0) return null;

                            return (
                              <div key={subcategory} style={{ marginBottom: "15px" }}>
                                {subcategory !== "_root" && (
                                  <div style={{ padding: "8px", background: "#2b3d52", color: "white", fontWeight: "bold", borderRadius: "4px" }}>
                                    {subcategory}
                                  </div>
                                )}
                                <div style={{ overflowX: "auto", marginTop: "8px" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ borderBottom: "1px solid #8f99a3" }}>
                                        <th style={{ padding: "10px", textAlign: "left", color: "white" }}>Key</th>
                                        {Array.from(allLocales).map((locale) => (
                                          <th key={locale} style={{ padding: "10px", textAlign: "left", color: "white", minWidth: "150px" }}>
                                            {locale.toUpperCase()}
                                          </th>
                                        ))}
                                        <th style={{ padding: "10px", textAlign: "left", color: "white", width: "100px" }}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredKeys.map((nestedKey) => {
                                        const localesForThisKey = new Set(messages.filter((m) => m.key === nestedKey.fullKey).map((m) => m.locale));
                                        const missingLocales = Array.from(allLocales).filter((l) => !localesForThisKey.has(l));
                                        
                                        return (
                                          <tr key={nestedKey.fullKey} style={{ borderBottom: "1px solid #405364" }}>
                                            <td style={{ padding: "8px", color: "white", position: "relative" }}>
                                              {nestedKey.fullKey.split(".").pop()}
                                              {missingLocales.length > 0 && (
                                                <span
                                                  style={{
                                                    position: "absolute",
                                                    top: "-2px",
                                                    right: "-2px",
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
                                            </td>
                                            {Array.from(allLocales).map((locale) => {
                                              const msg = nestedKey.messages.find((m) => m.locale === locale);
                                              return (
                                                <td key={locale} style={{ padding: "8px", color: msg ? "white" : "#D9822B", maxWidth: "200px", wordBreak: "break-word" }}>
                                                  {msg ? msg.message : "—"}
                                                </td>
                                              );
                                            })}
                                            <td style={{ padding: "8px" }}>
                                              <div style={{ display: "flex", gap: "5px" }}>
                                                {nestedKey.messages.length > 0 && (
                                                  <Button
                                                    small
                                                    icon="edit"
                                                    onClick={() => handleEdit(nestedKey.messages[0])}
                                                  />
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </SectionCard>
      </Section>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingMessage(null);
          setFormData({ key: "", locale: "", message: "" });
        }}
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
            <Button
              onClick={() => {
                setIsDialogOpen(false);
                setEditingMessage(null);
                setFormData({ key: "", locale: "", message: "" });
              }}
            >
              Cancel
            </Button>
            <Button intent={Intent.PRIMARY} onClick={handleSave}>
              {editingMessage ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
