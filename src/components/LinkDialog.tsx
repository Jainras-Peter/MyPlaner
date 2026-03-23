import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface LinkDialogProps {
  open: boolean;
  title?: string;
  initialValue?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}

export default function LinkDialog({
  open,
  title = 'Add resource link',
  initialValue = '',
  onCancel,
  onSubmit
}: LinkDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.form
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = value.trim();
              if (!trimmed) return;
              onSubmit(trimmed);
            }}
          >
            <h3 className="text-xl font-display font-bold">{title}</h3>
            <p className="mt-2 text-sm text-text-muted">Paste a useful study resource URL. It will be saved as a clickable link.</p>
            <input
              autoFocus
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://example.com/article"
              className="mt-4 w-full input-field"
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-border px-4 py-3 font-medium transition-colors hover:bg-bg"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-primary px-4 py-3 font-bold text-white transition-colors hover:bg-primary/90">
                Add Link
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
