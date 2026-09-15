'use client';

import { Draggable } from '@hello-pangea/dnd';
import { CalendarDays, Maximize2, X } from 'lucide-react';
import type { CardData } from './types';

interface CardItemProps {
  card: CardData;
  index: number;
  onCheckToggle: (cardId: string, isChecked: boolean) => void;
  onDelete: (cardId: string) => void;
  onOpen: (cardId: string) => void;
}

function formatDue(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function CardItem({ card, index, onCheckToggle, onDelete, onOpen }: CardItemProps) {
  const due = card.dueAt ? formatDue(card.dueAt) : null;
  const overdue = card.dueAt ? new Date(card.dueAt).getTime() < Date.now() : false;
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg p-4 shadow-sm border border-transparent group/card
            hover:border-sage transition-colors cursor-grab active:cursor-grabbing relative
            ${snapshot.isDragging ? 'shadow-md rotate-2 scale-105 border-sage z-50' : 'mb-3'}`}
          style={provided.draggableProps.style}
        >
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen(card.id);
              }}
              className="text-ink-dark/30 hover:text-bronze"
              title="Abrir detalhes"
            >
              <Maximize2 size={15} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="text-ink-dark/30 hover:text-red-500"
              title="Excluir tarefa"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-start gap-3 pr-4">
            <input
              type="checkbox"
              checked={card.isChecked}
              onChange={(e) => onCheckToggle(card.id, e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-sage text-bronze focus:ring-bronze cursor-pointer accent-bronze shrink-0"
            />
            <div className="flex-1">
              <h4
                className={`text-ink-dark font-medium ${card.isChecked ? 'line-through opacity-50' : ''}`}
              >
                {card.title}
              </h4>
              {card.description && (
                <p className="text-sm text-ink-dark/70 mt-2 line-clamp-3">{card.description}</p>
              )}
              {due && (
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                    overdue && !card.isChecked
                      ? 'bg-red-100 text-red-700'
                      : 'bg-sage-light/50 text-ink-dark/70'
                  }`}
                >
                  <CalendarDays size={12} />
                  {due}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
