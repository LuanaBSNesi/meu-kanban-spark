'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { CardData } from './types';

/** Value for <input type="date">, in the viewer's own timezone. */
function toDateInput(value: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function CardDetail({
  card,
  onClose,
  onSave,
  onDelete,
}: {
  card: CardData;
  onClose: () => void;
  onSave: (patch: Partial<CardData>) => void | Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueAt, setDueAt] = useState(toDateInput(card.dueAt));
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    dialog.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() {
    const patch: Partial<CardData> = {};
    if (title.trim() && title.trim() !== card.title) patch.title = title.trim();
    if (description !== card.description) patch.description = description;

    const current = toDateInput(card.dueAt);
    if (dueAt !== current) {
      patch.dueAt = dueAt ? new Date(`${dueAt}T12:00:00`) : null;
    }

    if (Object.keys(patch).length > 0) void onSave(patch);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-dark/40 p-4 pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) save();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da tarefa"
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl bg-creme p-6 shadow-xl outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Título da tarefa"
            className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-ink-dark outline-none hover:border-sage focus:border-bronze focus:bg-white"
          />
          <button onClick={save} title="Fechar" className="text-ink-dark/40 hover:text-ink-dark">
            <X size={20} />
          </button>
        </div>

        <label className="mb-1 block text-xs uppercase tracking-wide text-ink-dark/60">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Anotações, contexto, links…"
          className="mb-4 w-full resize-none rounded-md border border-sage bg-white p-3 text-sm text-ink-dark outline-none focus:border-bronze"
        />

        <label className="mb-1 block text-xs uppercase tracking-wide text-ink-dark/60">
          Prazo
        </label>
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="mb-6 rounded-md border border-sage bg-white px-3 py-2 text-sm text-ink-dark outline-none focus:border-bronze"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex items-center gap-2 text-sm text-ink-dark/60 hover:text-red-500"
          >
            <Trash2 size={16} />
            Excluir tarefa
          </button>
          <button
            onClick={save}
            className="rounded-md bg-ink-dark px-4 py-2 text-sm text-creme hover:bg-bronze"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
