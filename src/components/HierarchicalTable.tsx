import { useMemo, useState, memo } from "react";
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
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
}

const HierarchicalTableComponent = ({
  data,
  allLocales,
  selectedKeys,
  onRowSelect,
  onSelectAll,
  onEdit,
  onAddRow,
  selectAllChecked,
  selectAllIndeterminate,
}: HierarchicalTableProps) => {
  // Set initial expanded state to show all rows expanded by default
  const [expanded, setExpanded] = useState<ExpandedState>(true);
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
        const fullKey = row.original.fullKey;
        
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
            {type === 'key' && fullKey && (
              <Button
                small
                icon="clipboard"
                minimal
                intent="none"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(fullKey);
                }}
                title={`Copy "${fullKey}" to clipboard`}
                style={{ marginLeft: "-16px" }}
              />
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
        if (row.original.type !== 'key') return null;
        const msg = row.original.messagesByLocale?.get(locale);
        
        if (!msg) {
          return (
            <Tag minimal intent="warning" style={{ cursor: 'default' }}>
              —
            </Tag>
          );
        }
        
        return (
          <Tag
          size="large"
            interactive
            minimal
            style={{ 
              cursor: 'pointer', 
              maxWidth: '100%', 
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onClick={() => onEdit(msg)}
            title={`${msg.message}\n\nClick to edit`}
          >
            {msg.message}
          </Tag>
        );
      },
    })),
  ], [allLocales, selectedKeys, onRowSelect, onEdit, onAddRow, selectAllChecked, selectAllIndeterminate, onSelectAll]);

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
                  className={header.id === 'select' ? styles.checkboxHeader : 
                             header.id === 'label' ? styles.frozenKeyHeader : 
                             styles.tableHead}
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
                      styles.localeCell
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Memoize the component for better performance
export const HierarchicalTable = memo(HierarchicalTableComponent);
