'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TableProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  onRowSelect?: (row: TData) => void;
  onMultiSelect?: (rows: TData[]) => void;
  selectable?: boolean;
  virtualScroll?: boolean;
  rowHeight?: number;
}

export function DataTable<TData, TValue>({
  data,
  columns,
  onRowSelect,
  onMultiSelect,
  selectable = false,
  virtualScroll = false,
  rowHeight = 56,
}: TableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pageSize, setPageSize] = useState(50);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: virtualScroll ? 100 : pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  React.useEffect(() => {
    if (onMultiSelect && selectedRows.length > 0) {
      onMultiSelect(selectedRows.map((row) => row.original));
    }
  }, [selectedRows, onMultiSelect]);

  const rows = table.getRowModel().rows;
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!virtualScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      table.nextPage();
    }
  };

  return (
    <div className="w-full">
      {selectable && table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-800">
            {table.getFilteredSelectedRowModel().rows.length} row(s) selected
          </span>
          <button
            onClick={() => table.resetRowSelection()}
            className="text-sm text-amber-600 hover:text-amber-800 font-medium"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <div
          ref={tableContainerRef}
          onScroll={handleScroll}
          className={virtualScroll ? 'overflow-y-auto max-h-[600px]' : ''}
        >
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {selectable && (
                    <th className="w-12 p-4 text-left">
                      <input
                        type="checkbox"
                        checked={table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                    </th>
                  )}
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-4 text-left text-xs font-bold uppercase tracking-wider text-stone-600"
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
            <tbody className="divide-y divide-stone-200">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="p-8 text-center text-stone-500"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-stone-50 transition-colors"
                    onClick={() => {
                      if (onRowSelect) onRowSelect(row.original);
                    }}
                    style={virtualScroll ? { height: rowHeight } : undefined}
                  >
                    {selectable && (
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 text-sm text-stone-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!virtualScroll && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-stone-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-stone-600">
              Rows per page:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                table.setPageSize(Number(e.target.value));
              }}
              className="border border-stone-300 rounded-md px-2 py-1 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-stone-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
