"use client";

import { useState, useMemo, useCallback, ChangeEvent } from "react";
import useSWR from "swr";
import { mutate } from "swr";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Button,
  Card,
  Collapse,
  Dialog,
  FormGroup,
  InputGroup,
  Intent,
  NonIdealState,
  TextArea,
} from "@blueprintjs/core";
import { trpc } from "@/lib/client";
import type { Message } from "@/lib/client";

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

type NestedKey = {
  category: string;
  subcategory?: string;
  fullKey: string;
  messages: Message[];
};

// TanStack Table component for subcategory tables
function SubcategoryTable({ rows, columns }: { rows: KeyRow[]; columns: ColumnDef<KeyRow>[] }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ overflowX: "auto", marginTop: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={{ borderBottom: "1px solid #8f99a3" }}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    padding: "10px",
                    textAlign: "left",
                    color: "white",
                    minWidth: typeof header.column.columnDef.size === "number" ? `${header.column.columnDef.size}px` : "auto",
                  }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: "1px solid #405364" }}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{
                    padding: "8px",
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({ key: "", locale: "", message: "" });
  const [filterKey, setFilterKey] = useState("");
  const [filterLocale, setFilterLocale] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: messages = [], error, isLoading } = useSWR<Message[], Error>("messages", fetcher);

  // Get all unique locales
  const allLocales = useMemo(() => {
    const locales = new Set(messages.map((m) => m.locale));
    return Array.from(locales).sort();
  }, [messages]);

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

    // Calculate missing locales for each key
    for (const row of keyMap.values()) {
      row.missingLocales = allLocales.filter((l) => !row.messagesByLocale.has(l));
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
        await trpc.update.mutate({
          id: editingMessage.id,
          key: formData.key,
          locale: formData.locale,
          message: formData.message,
        });
      } else {
        await trpc.create.mutate(formData);
      }
      setIsDialogOpen(false);
      setFormData({ key: "", locale: "", message: "" });
      setEditingMessage(null);
      await mutate("messages");
    } catch (error) {
      console.error("Error saving message:", error);
      const message = error instanceof Error ? error.message : "Failed to save message";
      alert(message);
    }
  };

  const handleEdit = useCallback((message: Message) => {
    setEditingMessage(message);
    setFormData({ key: message.key, locale: message.locale, message: message.message });
    setIsDialogOpen(true);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await trpc.delete.mutate({ id });
      await mutate("messages");
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
    }
  };

  // Create TanStack Table columns
  const columns: ColumnDef<KeyRow>[] = useMemo(() => {
    const localeColumns: ColumnDef<KeyRow>[] = allLocales.map((locale) => ({
      id: locale,
      header: locale.toUpperCase(),
      cell: ({ row }) => {
        const msg = row.original.messagesByLocale.get(locale);
        return (
          <div style={{ color: msg ? "white" : "#D9822B", maxWidth: "200px", wordBreak: "break-word" }}>
            {msg ? msg.message : "—"}
          </div>
        );
      },
      size: 150,
      minSize: 150,
      maxSize: 300,
    }));

    return [
      {
        id: "key",
        header: "Key",
        cell: ({ row }) => (
          <div style={{ position: "relative" }}>
            <span style={{ color: "white" }}>{row.original.keyName}</span>
            {row.original.missingLocales.length > 0 && (
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
                title={`Missing in: ${row.original.missingLocales.join(", ")}`}
              >
                {row.original.missingLocales.length}
              </span>
            )}
          </div>
        ),
        size: 200,
        enableResizing: true,
      },
      ...localeColumns,
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => {
          const firstMessage = row.original.messagesByLocale.size > 0 
            ? Array.from(row.original.messagesByLocale.values())[0] 
            : null;
          
          return (
            <div style={{ display: "flex", gap: "5px" }}>
              {firstMessage && (
                <Button
                  small
                  icon="edit"
                  onClick={() => handleEdit(firstMessage)}
                />
              )}
            </div>
          );
        },
        size: 100,
        enableResizing: false,
      },
    ];
  }, [allLocales, handleEdit]);

  return (
    <div className="bp6-dark" style={{ minHeight: "100vh", padding: "20px" }}>
      <div id="i18n-manager-section">
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

        <div>
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
            ) : filteredRows.length === 0 ? (
              <NonIdealState
                icon="translate"
                title="No messages found"
                description={messages.length === 0 ? "Add your first message to get started!" : "Try adjusting your filters"}
              />
            ) : (
              <div>
                {/* Nested View by Category */}
                {Array.from(filteredGroupedRows.entries()).map(([category, subcategories]) => {
                  const isExpanded = expandedCategories.has(category);
                  const totalKeys = Array.from(subcategories.values()).flat().length;
                  
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
                          {category} ({totalKeys} keys)
                        </span>
                      </div>

                      <Collapse isOpen={isExpanded}>
                        <div style={{ marginLeft: "20px", marginTop: "10px" }}>
                          {Array.from(subcategories.entries()).map(([subcategory, rows]) => {
                            if (rows.length === 0) return null;

                            return (
                              <div key={subcategory} style={{ marginBottom: "15px" }}>
                                {subcategory !== "_root" && (
                                  <div style={{ padding: "8px", background: "#2b3d52", color: "white", fontWeight: "bold", borderRadius: "4px" }}>
                                    {subcategory}
                                  </div>
                                )}
                                <SubcategoryTable rows={rows} columns={columns} />
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
        </div>
      </div>

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
