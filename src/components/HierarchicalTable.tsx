import { useMemo, useState, memo, useCallback } from "react";
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, type ColumnDef, type Row, type ExpandedState } from "@tanstack/react-table";
import type { Message } from "@/lib/client";
import { Button, Tag, Checkbox } from "@blueprintjs/core";
import styles from "./HierarchicalTable.module.css";

type TableRow = {
  id: string;
  type: 'category' | 'subcategory' | 'key';
  label: string;
  fullKey?: string;
  messagesByLocale?: Map<string, Message>;
  missingLocales?: string[];
  children?: TableRow[];
  rowCount?: number;
};

interface HierarchicalTableProps {
  data: TableRow[];
  allLocales: string[];
  selectedKeys: Set<string>;
  onRowSelect: (fullKey: string, isSelected: boolean) => void;
  onSelectAll: () => void;
  onEdit: (message: Message) => void;
  onAddRow?: (parentKey: string) => void;
  onDelete?: (fullKey: string) => void;
  onUpdateMessage?: (key: string, locale: string, value: string) => Promise<boolean>;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  parentKey?: string;
}

const HierarchicalTableComponent = ({
  data,
  allLocales,
  selectedKeys,
  onRowSelect,
  onSelectAll,
  onEdit,
  onAddRow,
  onDelete,
  onUpdateMessage,
  selectAllChecked,
  selectAllIndeterminate,
  parentKey,
}: HierarchicalTableProps) => {
  // Set initial expanded state to show all rows expanded by default
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  // Track which cell is being edited (format: "key-locale")
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleStartEdit = useCallback((key: string, locale: string, currentValue: string) => {
    setEditingCell(`${key}-${locale}`);
    setEditValue(currentValue);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleSaveEdit = useCallback(async (key: string, locale: string) => {
    if (!onUpdateMessage) return;
    
    const success = await onUpdateMessage(key, locale, editValue);
    if (success) {
      setEditingCell(null);
      setEditValue("");
    }
  }, [onUpdateMessage, editValue]);

  const columns = useMemo<ColumnDef<TableRow>[]>(() => [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={selectAllChecked}
          indeterminate={selectAllIndeterminate}
          onChange={onSelectAll}
        />
      ),
      cell: ({ row }) => {
        if (row.original.type === 'key') {
          return (
            <Checkbox
              checked={selectedKeys.has(row.original.id)}
              onChange={(e) => onRowSelect(row.original.id, e.currentTarget.checked)}
            />
          );
        }
        return null;
      },
    },
    {
      accessorKey: 'label',
      header: 'Key',
      cell: ({ row, getValue }) => {
        const type = row.original.type;
        const canExpand = row.getCanExpand();
        
        return (
          <div 
            className={styles.keyCell}
            style={{ paddingLeft: `${row.depth * 20}px` }}
          >
            {canExpand && (
              <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                className={styles.expandButton}
                aria-label={`${row.getIsExpanded() ? 'Collapse' : 'Expand'} ${getValue()}`}
              >
                {row.getIsExpanded() ? '▼' : '▶'}
              </button>
            )}
            <span className={styles[`${type}Label`]}>{getValue() as string}</span>
            {type === 'category' && onAddRow && (
              <Button
                small
                icon="add"
                minimal
                intent="none"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRow(getValue() as string);
                }}
                title="Add key to this category"
              />
            )}
            {type === 'subcategory' && onAddRow && (
              <Button
                small
                icon="add"
                minimal
                onClick={(e) => {
                  e.stopPropagation();
                  const parentKey = `${getValue() as string}`;
                  onAddRow(parentKey);
                }}
                title="Add key to this subsection"
              />
            )}
          </div>
        );
      },
    },
    ...allLocales.map((locale) => ({
      id: locale,
      header: locale.toUpperCase(),
      cell: ({ row }: { row: Row<TableRow> }) => {
        if (row.original.type !== 'key' || !row.original.fullKey) return null;
        const msg = row.original.messagesByLocale?.get(locale);
        const cellKey = `${row.original.fullKey}-${locale}`;
        const isEditing = editingCell === cellKey;
        
        // If missing, show empty tag or allow creating
        if (!msg) {
          if (isEditing) {
            return (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(row.original.fullKey!, locale);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                />
                <Button
                  small
                  icon="tick"
                  minimal
                  intent="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveEdit(row.original.fullKey!, locale);
                  }}
                />
                <Button
                  small
                  icon="cross"
                  minimal
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                />
              </div>
            );
          }
          return (
            <Tag 
              minimal 
              intent="warning" 
              interactive
              onClick={() => {
                if (onUpdateMessage) {
                  setEditingCell(cellKey);
                  setEditValue("");
                }
              }}
              style={{ cursor: onUpdateMessage ? 'pointer' : 'default' }}
              title={onUpdateMessage ? "Click to add value" : "No value"}
            >
              — Add value
            </Tag>
          );
        }
        
        // If editing this cell, show input
        if (isEditing) {
          return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit(row.original.fullKey!, locale);
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
              />
              <Button
                small
                icon="tick"
                minimal
                intent="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit(row.original.fullKey!, locale);
                }}
              />
              <Button
                small
                icon="cross"
                minimal
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
              />
            </div>
          );
        }
        
        // Show editable tag
        return (
          <Tag
            size="large"
            interactive
            minimal
            onClick={() => {
              if (onUpdateMessage) {
                handleStartEdit(row.original.fullKey!, locale, msg.message);
              }
            }}
            style={{ 
              cursor: onUpdateMessage ? 'pointer' : 'default', 
              maxWidth: '100%', 
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={onUpdateMessage ? "Click to edit" : msg.message}
          >
            {msg.message}
          </Tag>
        );
      },
    })),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.type !== 'key' || !row.original.fullKey) return null;
        
        return (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
            <Button
              small
              icon="clipboard"
              minimal
              intent="none"
              onClick={(e) => {
                e.stopPropagation();
                if (row.original.fullKey) {
                  navigator.clipboard.writeText(row.original.fullKey);
                }
              }}
              title={`Copy "${row.original.fullKey}" to clipboard`}
            />
            {onDelete && (
              <Button
                small
                icon="trash"
                minimal
                intent="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.original.fullKey) {
                    if (confirm(`Are you sure you want to delete "${row.original.fullKey}"?`)) {
                      onDelete(row.original.fullKey);
                    }
                  }
                }}
                title="Delete this key"
              />
            )}
          </div>
        );
      },
    },
  ], [allLocales, selectedKeys, onRowSelect, onAddRow, onDelete, onUpdateMessage, selectAllChecked, selectAllIndeterminate, onSelectAll, editingCell, editValue, handleStartEdit, handleCancelEdit, handleSaveEdit]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
  });

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className={styles.tableHeaderRow}>
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id} 
                  className={
                    header.id === 'select' ? styles.checkboxHeader : 
                    header.id === 'label' ? styles.frozenKeyHeader : 
                    header.id === 'actions' ? styles.actionsHeader :
                    styles.tableHead
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => {
            return (
              <tr key={row.id} className={styles.tableRow}>
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id} 
                    className={
                      cell.id.includes('select') ? styles.checkboxCell :
                      cell.id.includes('label') ? styles.frozenKeyCell :
                      cell.id.includes('actions') ? styles.actionsCell :
                      styles.localeCell
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {onAddRow && (
            <tr style={{ background: "transparent", height: "1px" }}>
              <td colSpan={allLocales.length + 3} style={{ padding: "4px", border: "none", background: "transparent" }}>
                <div style={{ display: "flex", justifyContent: "flex-start", padding: "4px 8px" }}>
                  <Button
                    icon="add"
                    minimal
                    intent="primary"
                    onClick={() => onAddRow(parentKey || "")}
                    style={{ 
                      color: "#48AFF0",
                      fontWeight: 500
                    }}
                  >
                    Add key
                  </Button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Memoize the component for better performance
export const HierarchicalTable = memo(HierarchicalTableComponent);
