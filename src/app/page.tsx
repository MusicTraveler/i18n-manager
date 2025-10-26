"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { NonIdealState, Section, SectionCard, Button, Intent, Navbar, Alignment } from "@blueprintjs/core";
import { trpc } from "@/lib/client";
import type { Message } from "@/lib/client";
import { MessageCompletenessStats } from "@/components/MessageCompletenessStats";
import { FiltersSection } from "@/components/FiltersSection";
import { HierarchicalTable } from "@/components/HierarchicalTable";
import { MessageDialog } from "@/components/MessageDialog";
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

type TableRow = {
  id: string;
  type: 'category' | 'subcategory' | 'key';
  label: string;
  fullKey?: string;
  messagesByLocale?: Map<string, Message>;
  missingLocales?: string[];
  children?: TableRow[];
};

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddLanguageDialogOpen, setIsAddLanguageDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [parentKey, setParentKey] = useState<string>("");
  const [filterKey, setFilterKey] = useState("");
  const [filterLocale, setFilterLocale] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: messages = [], error, isLoading } = useSWR<Message[], Error>("messages", fetcher);

  // Get all unique locales
  const allLocales = useMemo(() => {
    const locales = new Set(messages.map((m) => m.locale));
    return Array.from(locales).sort();
  }, [messages]);

  // Transform messages into hierarchical structure for TanStack Table
  const tableData = useMemo(() => {
    if (!messages.length) return [];

    // Step 1: Build key map and prefix tree
    const keyMap = new Map<string, KeyRow>();
    const prefixTree = new Map<string, Set<string>>(); // prefix -> set of full keys
    
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

        // Build prefix tree for efficient lookups
        // Add root prefix
        if (!prefixTree.has('')) {
          prefixTree.set('', new Set());
        }
        prefixTree.get('')!.add(msg.key);
        
        // Add all parent prefixes
        const pathParts = msg.key.split('.');
        for (let i = 1; i < pathParts.length; i++) {
          const prefix = pathParts.slice(0, i).join('.');
          if (!prefixTree.has(prefix)) {
            prefixTree.set(prefix, new Set());
          }
          prefixTree.get(prefix)!.add(msg.key);
        }
      }
      keyMap.get(msg.key)!.messagesByLocale.set(msg.locale, msg);
    }

    // Calculate missing locales for each key
    for (const row of keyMap.values()) {
      row.missingLocales = allLocales.filter((l) => !row.messagesByLocale.has(l));
    }

    // Step 2: Build hierarchical structure efficiently
    const buildHierarchy = (prefix: string): TableRow[] => {
      const keysWithPrefix = prefixTree.get(prefix);
      if (!keysWithPrefix) return [];

      // Get direct children (next segment only)
      const directChildren = new Map<string, { keys: string[], hasChildren: boolean }>();
      
      for (const fullKey of keysWithPrefix) {
        const suffix = prefix ? fullKey.substring(prefix.length + 1) : fullKey;
        if (!suffix) continue;
        
        const parts = suffix.split('.');
        const nextSegment = parts[0];
        const isLeaf = parts.length === 1;
        
        if (!directChildren.has(nextSegment)) {
          directChildren.set(nextSegment, { keys: [], hasChildren: false });
        }
        
        if (isLeaf) {
          directChildren.get(nextSegment)!.keys.push(fullKey);
        } else {
          directChildren.get(nextSegment)!.hasChildren = true;
        }
      }

      const result: TableRow[] = [];
      
      for (const [segment, { keys, hasChildren }] of Array.from(directChildren.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        const fullPath = prefix ? `${prefix}.${segment}` : segment;
        
        if (hasChildren) {
          // Has nested children
          const children = buildHierarchy(fullPath);
          result.push({
            id: fullPath,
            type: prefix ? 'subcategory' : 'category',
            label: segment,
            children,
          });
        } else {
          // Only leaf keys
          for (const key of keys) {
            const row = keyMap.get(key);
            if (row) {
              result.push({
                id: key,
                type: 'key',
                label: row.keyName,
                fullKey: key,
                messagesByLocale: row.messagesByLocale,
                missingLocales: row.missingLocales,
              });
            }
          }
        }
      }
      
      return result;
    };

    const result = buildHierarchy('');
    
    console.log('Table data:', result);
    console.log('Messages count:', messages.length);
    
    return result;
  }, [messages, allLocales]);

  // Filter table data based on filterKey and filterLocale
  const filteredTableData = useMemo(() => {
    const filterNode = (node: TableRow): TableRow | null => {
      let shouldInclude = true;
      
      // Check filterKey
      if (filterKey && node.fullKey && !node.fullKey.toLowerCase().includes(filterKey.toLowerCase())) {
        shouldInclude = false;
      }
      
      // Check filterLocale
      if (filterLocale && node.messagesByLocale) {
        const hasMatchingLocale = Array.from(node.messagesByLocale.values()).some(
          (m) => m.locale.toLowerCase().includes(filterLocale.toLowerCase())
        );
        if (!hasMatchingLocale) {
          shouldInclude = false;
        }
      }
      
      // Recursively filter children
      const filteredChildren = node.children 
        ? node.children.map(child => filterNode(child)).filter((child): child is TableRow => child !== null)
        : undefined;
      
      // Include node if it matches filters or has matching children
      if (shouldInclude || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      
      return null;
    };
    
    return tableData.map(node => filterNode(node)).filter((node): node is TableRow => node !== null);
  }, [tableData, filterKey, filterLocale]);


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
    setParentKey("");
    setIsDialogOpen(true);
  }, []);

  const handleAddRow = useCallback((parentKey: string) => {
    setEditingMessage(null);
    setParentKey(parentKey);
    setIsDialogOpen(true);
  }, []);

  const handleRowSelect = useCallback((fullKey: string, isSelected: boolean) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(fullKey);
      } else {
        newSet.delete(fullKey);
      }
      return newSet;
    });
  }, []);

  // Get all leaf keys (actual message keys) from filtered table data
  const getAllLeafKeys = useCallback((nodes: TableRow[]): string[] => {
    const keys: string[] = [];
    for (const node of nodes) {
      if (node.type === 'key' && node.fullKey) {
        keys.push(node.fullKey);
      }
      if (node.children) {
        keys.push(...getAllLeafKeys(node.children));
      }
    }
    return keys;
  }, []);

  const handleSelectAll = useCallback(() => {
    const allLeafKeys = getAllLeafKeys(filteredTableData);
    if (selectedKeys.size === allLeafKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allLeafKeys));
    }
  }, [selectedKeys, filteredTableData, getAllLeafKeys]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedKeys.size} key(s)?`)) {
      try {
        const deletePromises = Array.from(selectedKeys).map((key) => 
          trpc.deleteByKey.mutate({ key })
        );
        await Promise.all(deletePromises);
        setSelectedKeys(new Set());
        await mutate("messages");
      } catch (error) {
        console.error("Error deleting messages:", error);
        alert("Failed to delete selected messages");
      }
    }
  }, [selectedKeys]);


  return (
    <div className="bp6-dark" style={{ minHeight: "100vh" }}>
      <Navbar fixedToTop>
        <Navbar.Group align={Alignment.LEFT}>
          <Navbar.Heading>i18n Manager</Navbar.Heading>
          <Navbar.Divider />
        </Navbar.Group>
        <Navbar.Group align={Alignment.RIGHT}>
          <Button intent="none" icon="globe-network" onClick={() => setIsAddLanguageDialogOpen(true)}>
            Add Language
          </Button>
          <Button intent="none" icon="import" onClick={() => setIsImportDialogOpen(true)}>
            Import
          </Button>
          <Button intent={Intent.PRIMARY} icon="add" onClick={() => setIsDialogOpen(true)}>
            Add Message
          </Button>
        </Navbar.Group>
      </Navbar>

      <Section id="i18n-manager-section" suppressHydrationWarning style={{ paddingTop: "70px", padding: "70px 20px 20px 20px" }}>
        <div style={{ marginBottom: "20px" }}>
          <MessageCompletenessStats messages={messages} stats={completenessStats} />
        </div>

        <SectionCard>
          <FiltersSection
            filterKey={filterKey}
            filterLocale={filterLocale}
            onFilterKeyChange={setFilterKey}
            onFilterLocaleChange={setFilterLocale}
            selectedKeysCount={selectedKeys.size}
            onDeleteSelected={handleDeleteSelected}
          />

          <div style={{ background: "#2b3d52", padding: "20px", borderRadius: "4px" }}>
            {isLoading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "white" }}>Loading...</div>
            ) : error ? (
              <div style={{ padding: "20px", textAlign: "center", color: "red" }}>Error loading messages</div>
            ) : filteredTableData.length === 0 ? (
              <NonIdealState
                icon="translate"
                title="No messages found"
                description={messages.length === 0 ? "Add your first message to get started!" : "Try adjusting your filters"}
              />
            ) : (
              <div>
                <HierarchicalTable
                  data={filteredTableData}
                  allLocales={allLocales}
                  selectedKeys={selectedKeys}
                  selectAllChecked={selectedKeys.size === getAllLeafKeys(filteredTableData).length && getAllLeafKeys(filteredTableData).length > 0}
                  selectAllIndeterminate={selectedKeys.size > 0 && selectedKeys.size < getAllLeafKeys(filteredTableData).length}
                  onEdit={handleEdit}
                  onAddRow={handleAddRow}
                  onRowSelect={handleRowSelect}
                  onSelectAll={handleSelectAll}
                />
              </div>
            )}
          </div>
        </SectionCard>
      </Section>

      <MessageDialog
        isOpen={isDialogOpen}
        editingMessage={editingMessage}
        parentKey={parentKey}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingMessage(null);
          setParentKey("");
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
