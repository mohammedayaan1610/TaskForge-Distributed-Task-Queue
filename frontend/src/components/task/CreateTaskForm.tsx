import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Loader2, Music, UploadCloud } from 'lucide-react';
import { createTask } from '../../api/tasks';
import { cn } from '../../utils/formatters';

interface CreateTaskFormProps {
  onSuccess?: (taskId: string) => void;
}

const FORMATS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];

/**
 * Professional task creation form with real-time validation and animated feedback.
 */
export function CreateTaskForm({ onSuccess }: CreateTaskFormProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>('mp3');
  const [priority, setPriority] = useState<number>(5);

  const { mutate, isPending } = useMutation({
    mutationFn: createTask,
    onSuccess: (data) => {
      toast.success('Task Created!', {
        description: `Task ${data.task_id.slice(0, 8)}… queued successfully.`,
        duration: 4000,
      });
      // Refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      // Reset form
      setFile(null);
      setTargetFormat('mp3');
      setPriority(5);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.(data.task_id);
    },
    onError: () => {
      toast.error('Task Creation Failed', {
        description: 'Could not create task. Check if the backend is running.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.warning('File Required', { description: 'Please select an audio file to convert.' });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_format', targetFormat);
    formData.append('priority', priority.toString());
    formData.append('deadline_hours', '24');
    
    mutate(formData);
  };

  const priorityColor =
    priority >= 8 ? '#ef4444' : priority >= 5 ? '#f59e0b' : '#6366f1';
  const priorityLabel = priority >= 8 ? 'HIGH' : priority >= 5 ? 'MEDIUM' : 'LOW';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#1e1e30] bg-[#0f0f18] p-6"
    >
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#6366f1]/10 flex items-center justify-center">
          <Music className="w-4 h-4 text-[#6366f1]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#f1f5f9]">Convert Audio</h2>
          <p className="text-xs text-[#64748b]">Upload a file to convert</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File Upload */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-2">
            Upload Audio
          </label>
          <div 
            className="w-full border-2 border-dashed border-[#1e1e30] rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#6366f1]/50 hover:bg-[#6366f1]/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <UploadCloud className="w-6 h-6 text-[#64748b] mb-2" />
            <p className="text-sm text-[#f1f5f9] mb-1">
              {file ? file.name : "Click to upload file"}
            </p>
            <p className="text-[10px] text-[#64748b]">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "WAV, MP3, FLAC, AAC, OGG, M4A"}
            </p>
          </div>
        </div>

        {/* Target Format */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-2">
            Target Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setTargetFormat(fmt)}
                className={cn(
                  'py-2 rounded-lg border text-xs font-medium transition-all uppercase',
                  targetFormat === fmt
                    ? 'border-[#6366f1]/50 bg-[#6366f1]/8 text-[#818cf8]'
                    : 'border-[#1e1e30] bg-[#14141f] text-[#64748b] hover:border-[#2a2a42] hover:text-[#94a3b8]'
                )}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="priority" className="text-xs font-medium text-[#94a3b8]">
              Priority
            </label>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: priorityColor, backgroundColor: `${priorityColor}15` }}
              >
                {priorityLabel}
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: priorityColor }}>
                {priority}
              </span>
            </div>
          </div>
          <input
            id="priority"
            type="range"
            min={1}
            max={10}
            step={1}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: priorityColor }}
          />
          <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isPending}
          whileHover={!isPending ? { scale: 1.01 } : {}}
          whileTap={!isPending ? { scale: 0.99 } : {}}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
            isPending
              ? 'bg-[#6366f1]/50 text-white/60 cursor-not-allowed'
              : 'bg-[#6366f1] hover:bg-[#818cf8] text-white shadow-lg shadow-[#6366f1]/20'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Task...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Submit
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
