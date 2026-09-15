'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Composer that stays open after saving, so several cards can be added in a
 * row without reaching for the button again. Enter saves, Escape closes.
 */
export function InlineComposer({
  placeholder,
  onSubmit,
  onClose,
  className = '',
}: {
  placeholder: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
  className?: string;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) return onClose();
    setValue('');
    await onSubmit(trimmed);
    ref.current?.focus();
  }

  return (
    <div className={className}>
      <textarea
        ref={ref}
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void save();
          }
          if (e.key === 'Escape') onClose();
        }}
        onBlur={() => {
          if (!value.trim()) onClose();
        }}
        className="w-full resize-none rounded-md border border-sage bg-white p-2 text-sm text-ink-dark outline-none focus:border-bronze"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void save()}
          className="rounded-md bg-ink-dark px-3 py-1 text-sm text-creme hover:bg-bronze"
        >
          Adicionar
        </button>
        <button onClick={onClose} className="text-sm text-ink-dark/60 hover:text-ink-dark">
          cancelar
        </button>
      </div>
    </div>
  );
}

/** Click-to-edit label. Enter or blur saves, Escape reverts. */
export function EditableText({
  value,
  onSave,
  className = '',
  inputClassName = '',
  label,
}: {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  className?: string;
  inputClassName?: string;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  function finish() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) void onSave(trimmed);
    else setDraft(value);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title={`Renomear ${label}`}
        className={`text-left ${className}`}
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={ref}
      value={draft}
      aria-label={`Renomear ${label}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={`rounded-md border border-bronze bg-white px-2 py-1 outline-none ${inputClassName}`}
    />
  );
}
