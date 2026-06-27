import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Download,
  Trash2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { TableRowSkeleton } from '../shared/LoadingSkeleton';
import { EmptyState } from '../shared/EmptyState';
import type { Task, TaskStatus } from '../../types';
import { formatRelativeTime, truncate, cn } from '../../utils/formatters';
import { exportTasksToCSV } from '../../utils/csvExport';
import { format } from 'date-fns';

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
  onTaskClick: (task: Task) => void;
  onClearAll?: () => void;
  onRefresh?: () => void;
}

type SortField = 'created_at' | 'priority' | 'status' | 'task_type';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS: Array<TaskStatus | 'ALL'> = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
const PAGE_SIZE = 10;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-0.5 rounded text-[#64748b] hover:text-[#94a3b8] transition-colors"
      title="Copy Task ID"
      aria-label="Copy task ID"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="w-3 h-3 text-emerald-400" />
          </motion.div>
        ) : (
          <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Copy className="w-3 h-3" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

/**
 * Full-featured task data table with sorting, search, filtering, and pagination.
 */
export function TaskTable({ tasks, isLoading, onTaskClick, onClearAll, onRefresh }: TaskTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (statusFilter !== 'ALL') result = result.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.task_type.toLowerCase().includes(q) ||
          (t.result ?? '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortField === 'priority') { av = a.priority; bv = b.priority; }
      else if (sortField === 'status') { av = a.status; bv = b.status; }
      else if (sortField === 'task_type') { av = a.task_type; bv = b.task_type; }
      else { av = a.created_at ?? ''; bv = b.created_at ?? ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [tasks, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-[#6366f1]" />
    ) : (
      <ChevronDown className="w-3 h-3 text-[#6366f1]" />
    );
  };

  const ThButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 group hover:text-[#f1f5f9] transition-colors"
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  return (
    <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f18] overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex items-center gap-3 p-4 border-b border-[#1e1e30] flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-[#14141f] border border-[#1e1e30] rounded-lg text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:border-[#6366f1]/50 transition-colors"
            aria-label="Search tasks"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
            showFilters
              ? 'border-[#6366f1]/40 bg-[#6366f1]/10 text-[#818cf8]'
              : 'border-[#1e1e30] text-[#64748b] hover:text-[#94a3b8] hover:border-[#2a2a42]'
          )}
          aria-label="Toggle filters"
        >
          <Filter className="w-3 h-3" />
          Filter
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => exportTasksToCSV(filtered)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1e1e30] text-xs text-[#64748b] hover:text-[#94a3b8] hover:border-[#2a2a42] transition-all"
            title="Export to CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1e1e30] text-xs text-[#64748b] hover:text-[#94a3b8] hover:border-[#2a2a42] transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {onClearAll && tasks.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10 transition-all"
              title="Clear all tracked tasks"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Pills */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[#1e1e30]"
          >
            <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
              <span className="text-xs text-[#64748b] font-medium mr-1">Status:</span>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    statusFilter === s
                      ? 'bg-[#6366f1] text-white'
                      : 'bg-[#14141f] text-[#64748b] hover:text-[#94a3b8] border border-[#1e1e30]'
                  )}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e30]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b]">Original File</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b]">Target Format</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b]">
                <ThButton field="priority" label="Priority" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b]">
                <ThButton field="status" label="Status" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b]">
                <ThButton field="created_at" label="Created" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b]">Completed Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748b] text-right">Download</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && tasks.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No tasks found"
                    description={
                      search || statusFilter !== 'ALL'
                        ? 'Try adjusting your search or filter.'
                        : 'Create your first task using the form.'
                    }
                    icon={search ? 'search' : 'inbox'}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((task) => (
                <motion.tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-[#1e1e30]/50 hover:bg-[#14141f] cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[#f1f5f9] truncate block max-w-32" title={task.original_filename || 'Unknown'}>
                      {task.original_filename || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[#94a3b8] uppercase bg-[#1a1a2e] px-2 py-0.5 rounded border border-[#2a2a42]">
                      {task.target_format || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden"
                        title={`Priority ${task.priority}`}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${task.priority * 10}%`,
                            background:
                              task.priority >= 8 ? '#ef4444' : task.priority >= 5 ? '#f59e0b' : '#6366f1',
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#94a3b8] tabular-nums">{task.priority}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} pulse />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#64748b]">
                      {task.created_at
                        ? format(new Date(task.created_at), 'MMM d, HH:mm')
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#64748b]">
                      {task.status === 'COMPLETED' && task.updated_at
                        ? format(new Date(task.updated_at), 'MMM d, HH:mm')
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {task.status === 'COMPLETED' ? (
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/download/${task.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg bg-[#6366f1]/10 text-[#818cf8] hover:bg-[#6366f1]/20 transition-all border border-[#6366f1]/20"
                        title="Download converted file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#64748b]">Wait</span>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e1e30]">
          <span className="text-xs text-[#64748b]">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded text-xs text-[#64748b] hover:text-[#94a3b8] disabled:opacity-30 hover:bg-[#1a1a2e] transition-all"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`ellipsis-${p}`} className="text-xs text-[#64748b] px-1">…</span>
                  )}
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-6 h-6 rounded text-xs transition-all',
                      page === p
                        ? 'bg-[#6366f1] text-white'
                        : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1a1a2e]'
                    )}
                  >
                    {p}
                  </button>
                </>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs text-[#64748b] hover:text-[#94a3b8] disabled:opacity-30 hover:bg-[#1a1a2e] transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
