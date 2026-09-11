'use client';

import { useState } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
import CardItem from './CardItem';
import type { BoardData, CardData, ListData } from './types';

const POSITION_GAP = 1024;

/**
 * Midpoint between the neighbours at the drop index, so a drag writes one row
 * instead of renumbering every sibling.
 */
function positionAt(siblings: CardData[], index: number) {
  const prev = siblings[index - 1];
  const next = siblings[index];
  if (prev && next) return (prev.position + next.position) / 2;
  if (next) return next.position - POSITION_GAP;
  if (prev) return prev.position + POSITION_GAP;
  return POSITION_GAP;
}

function listPositionAt(siblings: ListData[], index: number) {
  const prev = siblings[index - 1];
  const next = siblings[index];
  if (prev && next) return (prev.position + next.position) / 2;
  if (next) return next.position - POSITION_GAP;
  if (prev) return prev.position + POSITION_GAP;
  return POSITION_GAP;
}

export default function KanbanBoard({ initialData }: { initialData: BoardData }) {
  const [data, setData] = useState<BoardData>(initialData);
  const [error, setError] = useState<string | null>(null);

  /** Applies an optimistic change and rolls it back if the server rejects it. */
  async function commit(next: BoardData, request: () => Promise<Response>, whatFailed: string) {
    const snapshot = data;
    setData(next);
    setError(null);
    try {
      const response = await request();
      if (!response.ok) throw new Error(await response.text());
      return response;
    } catch (cause) {
      console.error(whatFailed, cause);
      setData(snapshot);
      setError(whatFailed);
      return null;
    }
  }

  const patch = (url: string, body: unknown) => () =>
    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'list') {
      const remaining = data.lists.filter((l) => l.id !== draggableId);
      const moved = data.lists.find((l) => l.id === draggableId);
      if (!moved) return;

      const position = listPositionAt(remaining, destination.index);
      const reordered = [...remaining];
      reordered.splice(destination.index, 0, { ...moved, position });

      await commit(
        { ...data, lists: reordered },
        patch(`/api/lists/${draggableId}`, { position }),
        'Não foi possível mover a lista.',
      );
      return;
    }

    const sourceList = data.lists.find((l) => l.id === source.droppableId);
    const destList = data.lists.find((l) => l.id === destination.droppableId);
    if (!sourceList || !destList) return;

    const moved = sourceList.cards.find((c) => c.id === draggableId);
    if (!moved) return;

    const destWithoutMoved =
      sourceList.id === destList.id
        ? destList.cards.filter((c) => c.id !== draggableId)
        : destList.cards;
    const position = positionAt(destWithoutMoved, destination.index);
    const updated = { ...moved, listId: destList.id, position };

    const nextCards = [...destWithoutMoved];
    nextCards.splice(destination.index, 0, updated);

    const lists = data.lists.map((list) => {
      if (list.id === destList.id) return { ...list, cards: nextCards };
      if (list.id === sourceList.id)
        return { ...list, cards: list.cards.filter((c) => c.id !== draggableId) };
      return list;
    });

    await commit(
      { ...data, lists },
      patch(`/api/cards/${draggableId}`, { listId: destList.id, position }),
      'Não foi possível mover o card.',
    );
  }

  async function handleCheckToggle(cardId: string, isChecked: boolean) {
    const lists = data.lists.map((list) => ({
      ...list,
      cards: list.cards.map((c) => (c.id === cardId ? { ...c, isChecked } : c)),
    }));
    await commit(
      { ...data, lists },
      patch(`/api/cards/${cardId}`, { isChecked }),
      'Não foi possível salvar o card.',
    );
  }

  async function handleAddList() {
    const title = window.prompt('Nome da nova lista:')?.trim();
    if (!title) return;

    setError(null);
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: data.id, title }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved: ListData = { ...(await response.json()), cards: [] };
      setData((prev) => ({ ...prev, lists: [...prev.lists, saved] }));
    } catch (cause) {
      console.error(cause);
      setError('Não foi possível criar a lista.');
    }
  }

  async function handleAddCard(listId: string) {
    const title = window.prompt('Nome da nova tarefa:')?.trim();
    if (!title) return;

    setError(null);
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, title }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved: CardData = await response.json();
      setData((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, cards: [...l.cards, saved] } : l,
        ),
      }));
    } catch (cause) {
      console.error(cause);
      setError('Não foi possível criar a tarefa.');
    }
  }

  async function handleDeleteList(listId: string) {
    if (!window.confirm('Excluir esta lista? Todas as tarefas nela serão perdidas.')) return;
    await commit(
      { ...data, lists: data.lists.filter((l) => l.id !== listId) },
      () => fetch(`/api/lists/${listId}`, { method: 'DELETE' }),
      'Não foi possível excluir a lista.',
    );
  }

  async function handleDeleteCard(cardId: string) {
    const lists = data.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((c) => c.id !== cardId),
    }));
    await commit(
      { ...data, lists },
      () => fetch(`/api/cards/${cardId}`, { method: 'DELETE' }),
      'Não foi possível excluir a tarefa.',
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mx-8 mt-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 flex items-center justify-between gap-4"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline shrink-0">
            fechar
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="list" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex gap-6 items-start h-full p-8 overflow-x-auto"
            >
              {data.lists.map((list, index) => (
                <Draggable key={list.id} draggableId={list.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-sage-light w-80 shrink-0 rounded-xl p-4 flex flex-col max-h-full
                        ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-105 z-40' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-4 px-2 py-1 group/list">
                        <div
                          {...provided.dragHandleProps}
                          className="font-semibold text-ink-dark cursor-grab active:cursor-grabbing flex-1"
                        >
                          {list.title}
                        </div>
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          className="text-ink-dark/30 hover:text-red-500 opacity-0 group-hover/list:opacity-100 transition-opacity"
                          title="Excluir lista"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <Droppable droppableId={list.id} type="card">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto min-h-[50px] p-1 rounded-md transition-colors
                              ${snapshot.isDraggingOver ? 'bg-sage/20' : ''}`}
                          >
                            {list.cards.map((card, index) => (
                              <CardItem
                                key={card.id}
                                card={card}
                                index={index}
                                onCheckToggle={handleCheckToggle}
                                onDelete={handleDeleteCard}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      <button
                        onClick={() => handleAddCard(list.id)}
                        className="mt-4 flex items-center justify-center gap-2 text-ink-dark/70 hover:text-ink-dark hover:bg-creme/50 py-2 rounded-md transition-colors w-full"
                      >
                        <Plus size={18} />
                        <span className="font-medium text-sm">Adicionar tarefa</span>
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              <button
                onClick={handleAddList}
                className="bg-sage-light/50 hover:bg-sage-light text-ink-dark w-80 shrink-0 rounded-xl p-4 flex items-center gap-2 transition-colors"
              >
                <Plus size={20} />
                <span className="font-semibold">Adicionar lista</span>
              </button>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
}
