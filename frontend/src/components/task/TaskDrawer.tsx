import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '../shared/StatusBadge';
import type { Task } from '../../types';
import { formatDateTime, formatRelativeTime, cn } from '../../utils/formatters';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group">
      <p className="text-xs text-[#64748b] mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-[#14141f] rounded-lg px-3 py-2 border border-[#1e1e30]">
        <span className="text-xs font-mono text-[#94a3b8] flex-1 break-all">{value}</span>
        <button
          onClick={handleCopy}
          className="text-[#64748b] hover:text-[#94a3b8] transition-colors flex-shrink-0"
          title="Copy"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <Copy className="w-3.5 h-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  isFirst = false,
}: {
  label: string;
  time: string | null;
  isFirst?: boolean;
}) {
  if (!time) return null;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5',
            isFirst ? 'bg-[#6366f1]' : 'bg-[#1e1e30] border border-[#2a2a42]'
          )}
        />
        {!isFirst && <div className="w-px flex-1 bg-[#1e1e30] mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-xs font-medium text-[#94a3b8]">{label}</p>
        <p className="text-xs text-[#64748b] mt-0.5">{formatDateTime(time)}</p>
        <p className="text-xs text-[#64748b]/60 mt-0.5">{formatRelativeTime(time)}</p>
      </div>
    </div>
  );
}

/**
 * Side drawer showing all task properties with timeline visualization.
 */
export function TaskDrawer({ task, onClose }: TaskDrawerProps) {
  const priorityColor =
    !task ? '#6366f1' : task.priority >= 8 ? '#ef4444' : task.priority >= 5 ? '#f59e0b' : '#6366f1';

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0f0f18] border-l border-[#1e1e30] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0f0f18]/95 backdrop-blur-sm border-b border-[#1e1e30] px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-sm font-semibold text-[#f1f5f9]">Task Details</h2>
                <p className="text-xs text-[#64748b] mt-0.5 font-mono">{task.id.slice(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={task.status} pulse />
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#1a1a2e] transition-all"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Priority indicator */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: `${priorityColor}08`,
                  borderColor: `${priorityColor}20`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#64748b]">Priority Level</span>
                  <span className="text-xs font-bold" style={{ color: priorityColor }}>
                    {task.priority >= 8 ? 'HIGH' : task.priority >= 5 ? 'MEDIUM' : 'LOW'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${task.priority * 10}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: priorityColor }}
                    />
                  </div>
                  <span className="text-2xl font-bold" style={{ color: priorityColor }}>
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* IDs & Metadata */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Identification
                </h3>
                <CopyField value={task.id} label="Task ID" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Task Type</p>
                    <div className="bg-[#14141f] rounded-lg px-3 py-2 border border-[#1e1e30]">
                      <span className="text-xs font-medium text-[#94a3b8] capitalize">{task.task_type}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Deadline</p>
                    <div className="flex items-center gap-1.5 bg-[#14141f] rounded-lg px-3 py-2 border border-[#1e1e30]">
                      <Clock className="w-3 h-3 text-[#64748b]" />
                      <span className="text-xs text-[#94a3b8]">{task.deadline_hours}h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payload */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Payload</h3>
                <div className="bg-[#14141f] rounded-lg p-3 border border-[#1e1e30]">
                  <pre className="text-xs text-[#94a3b8] whitespace-pre-wrap break-all font-mono leading-relaxed">
                    {task.payload || '(empty)'}
                  </pre>
                </div>
              </div>

              {/* Result & Metrics */}
              {(task.status === 'COMPLETED' || task.status === 'FAILED') && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Result Details</h3>
                  <div
                    className={cn(
                      'rounded-lg p-3 border',
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    )}
                  >
                    {task.status === 'COMPLETED' && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[#64748b] mb-0.5">Duration</p>
                          <p className="text-emerald-300 font-medium">
                            {task.conversion_duration ? `${task.conversion_duration}s` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#64748b] mb-0.5">Size</p>
                          <p className="text-emerald-300 font-medium">
                            {task.output_size_bytes ? `${(task.output_size_bytes / 1024 / 1024).toFixed(2)} MB` : '—'}
                          </p>
                        </div>
                        {task.target_format && (
                          <div className="col-span-2">
                            <p className="text-[#64748b] mb-0.5">Format</p>
                            <p className="text-emerald-300 font-medium uppercase">{task.target_format}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {task.status === 'FAILED' && (
                      <div>
                        <p className="text-[#64748b] text-xs mb-1">Error Reason</p>
                        <pre className="text-xs whitespace-pre-wrap break-all font-mono leading-relaxed text-red-300 max-h-48 overflow-y-auto">
                          {task.error_message || task.result || 'Unknown error occurred'}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Retry info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Execution
                </h3>
                <div className="flex items-center gap-2 bg-[#14141f] rounded-lg px-3 py-2 border border-[#1e1e30]">
                  <RefreshCw className="w-3.5 h-3.5 text-[#64748b]" />
                  <span className="text-xs text-[#64748b]">Retry count:</span>
                  <span
                    className={cn(
                      'text-xs font-bold ml-auto',
                      task.retry_count === 0 ? 'text-emerald-400' : task.retry_count >= 3 ? 'text-red-400' : 'text-yellow-400'
                    )}
                  >
                    {task.retry_count} / 5
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3" />
                  Timeline
                </h3>
                <div className="pl-1">
                  <TimelineItem label="Task Updated" time={task.updated_at} isFirst />
                  <TimelineItem label="Task Created" time={task.created_at} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
