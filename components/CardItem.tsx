'use client';

import { Card as CardType } from '@/lib/google-sheets';
import { Draggable } from '@hello-pangea/dnd';
import { X } from 'lucide-react';

interface CardItemProps {
  card: CardType;
  index: number;
  onCheckToggle: (cardId: string, isChecked: boolean) => void;
  onDelete: (cardId: string) => void;
}

export default function CardItem({ card, index, onCheckToggle, onDelete }: CardItemProps) {
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
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            className="absolute top-2 right-2 text-ink-dark/30 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
            title="Excluir tarefa"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-3 pr-4">
            <input
              type="checkbox"
              checked={card.is_checked}
              onChange={(e) => onCheckToggle(card.id, e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-sage text-bronze focus:ring-bronze cursor-pointer accent-bronze shrink-0"
            />
            <div className="flex-1">
              <h4 className={`text-ink-dark font-medium ${card.is_checked ? 'line-through opacity-50' : ''}`}>
                {card.title}
              </h4>
              {card.description && (
                <p className="text-sm text-ink-dark/70 mt-2 line-clamp-3">
                  {card.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
