'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
import CardItem from './CardItem';
import CardDetail from './CardDetail';
import { EditableText, InlineComposer } from './InlineInput';
import type { BoardData, CardData, ListData } from './types';
import { useBoardSync } from './useBoardSync';

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
  const [composingIn, setComposingIn] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const inFlight = useRef(0);
  const router = useRouter();

  useBoardSync(
    initialData.id,
    useCallback((board: BoardData) => setData(board), []),
    useCallback(() => inFlight.current > 0, []),
  );

  /** Applies an optimistic change and rolls it back if the server rejects it. */
  async function commit(next: BoardData, request: () => Promise<Response>, whatFailed: string) {
    const snapshot = data;
    setData(next);
    setError(null);
    inFlight.current++;
    try {
      const response = await request();
      if (!response.ok) throw new Error(await response.text());
      return response;
    } catch (cause) {
      console.error(whatFailed, cause);
      setData(snapshot);
      setError(whatFailed);
      return null;
    } finally {
      inFlight.current--;
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

  async function handleAddList(title: string) {
    setError(null);
    inFlight.current++;
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
    } finally {
      inFlight.current--;
    }
  }

  async function handleAddCard(listId: string, title: string) {
    setError(null);
    inFlight.current++;
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
    } finally {
      inFlight.current--;
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

  async function handleUpdateCard(cardId: string, values: Partial<CardData>) {
    const lists = data.lists.map((list) => ({
      ...list,
      cards: list.cards.map((c) => (c.id === cardId ? { ...c, ...values } : c)),
    }));
    await commit(
      { ...data, lists },
      patch(`/api/cards/${cardId}`, values),
      'Não foi possível salvar a tarefa.',
    );
  }

  async function handleRenameList(listId: string, title: string) {
    const lists = data.lists.map((l) => (l.id === listId ? { ...l, title } : l));
    await commit(
      { ...data, lists },
      patch(`/api/lists/${listId}`, { title }),
      'Não foi possível renomear a lista.',
    );
  }

  async function handleRenameBoard(title: string) {
    await commit(
      { ...data, title },
      patch(`/api/boards/${data.id}`, { title }),
      'Não foi possível renomear o quadro.',
    );
  }

  async function handleDeleteBoard() {
    if (!window.confirm(`Excluir o quadro "${data.title}"? Todas as listas e tarefas irão junto.`))
      return;

    inFlight.current++;
    try {
      const response = await fetch(`/api/boards/${data.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      router.push('/');
    } catch (cause) {
      console.error(cause);
      setError('Não foi possível excluir o quadro.');
    } finally {
      inFlight.current--;
    }
  }

  // Read from state, not captured at open time, so the sync keeps it current.
  const openCard = openCardId
    ? data.lists.flatMap((l) => l.cards).find((c) => c.id === openCardId)
    : undefined;

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
      {/* Rendered here, not in the page, so a rename by an agent shows up
          through the same sync that refreshes lists and cards. */}
      <div className="px-8 pt-6 pb-2 shrink-0 flex items-center justify-between gap-4 group/board">
        <EditableText
          value={data.title}
          onSave={handleRenameBoard}
          label="quadro"
          className="text-2xl font-semibold text-ink-dark hover:text-bronze transition-colors"
          inputClassName="text-2xl font-semibold text-ink-dark"
        />
        <button
          onClick={handleDeleteBoard}
          title="Excluir quadro"
          className="text-ink-dark/30 hover:text-red-500 opacity-0 group-hover/board:opacity-100 transition-opacity shrink-0"
        >
          <Trash2 size={18} />
        </button>
      </div>

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
                        <div {...provided.dragHandleProps} className="flex-1 cursor-grab active:cursor-grabbing">
                          <EditableText
                            value={list.title}
                            onSave={(title) => handleRenameList(list.id, title)}
                            label="lista"
                            className="font-semibold text-ink-dark hover:text-bronze transition-colors w-full"
                            inputClassName="font-semibold text-ink-dark w-full"
                          />
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
                                onOpen={setOpenCardId}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {composingIn === list.id ? (
                        <InlineComposer
                          className="mt-3"
                          placeholder="Título da tarefa. Enter salva, Esc fecha."
                          onSubmit={(title) => handleAddCard(list.id, title)}
                          onClose={() => setComposingIn(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setComposingIn(list.id)}
                          className="mt-4 flex items-center justify-center gap-2 text-ink-dark/70 hover:text-ink-dark hover:bg-creme/50 py-2 rounded-md transition-colors w-full"
                        >
                          <Plus size={18} />
                          <span className="font-medium text-sm">Adicionar tarefa</span>
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {addingList ? (
                <div className="bg-sage-light w-80 shrink-0 rounded-xl p-4">
                  <InlineComposer
                    placeholder="Nome da lista. Enter salva, Esc fecha."
                    onSubmit={handleAddList}
                    onClose={() => setAddingList(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingList(true)}
                  className="bg-sage-light/50 hover:bg-sage-light text-ink-dark w-80 shrink-0 rounded-xl p-4 flex items-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  <span className="font-semibold">Adicionar lista</span>
                </button>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {openCard && (
        <CardDetail
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onSave={(values) => handleUpdateCard(openCard.id, values)}
          onDelete={() => handleDeleteCard(openCard.id)}
        />
      )}
    </>
  );
}
