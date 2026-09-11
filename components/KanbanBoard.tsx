'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import CardItem from './CardItem';
import { Plus, Trash2 } from 'lucide-react';

// Types definition inline for the component
type Card = { id: string; title: string; description: string; is_checked: boolean; position: number; listId: string; };
type List = { id: string; title: string; position: number; boardId: string; cards: Card[] };
type BoardData = { id: string; title: string; lists: List[] };

export default function KanbanBoard({ initialData }: { initialData: BoardData }) {
  const [data, setData] = useState<BoardData>(initialData);

  // Avoid hydration mismatch for dnd
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'list') {
      // Optimistic update
      const newLists = Array.from(data.lists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);
      
      // Update positions
      const updatedLists = newLists.map((list, index) => ({ ...list, position: index }));
      setData({ ...data, lists: updatedLists });

      // API Call
      try {
        await Promise.all(
          updatedLists.map(list => 
            fetch(`/api/lists/${list.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(list)
            })
          )
        );
      } catch (err) {
        console.error('Failed to save list position', err);
        // In a real robust app, revert the optimistic update here
      }
      return;
    }

    // Card movement
    const sourceList = data.lists.find(l => l.id === source.droppableId);
    const destList = data.lists.find(l => l.id === destination.droppableId);

    if (!sourceList || !destList) return;

    if (sourceList.id === destList.id) {
      // Move within the same list
      const newCards = Array.from(sourceList.cards);
      const [removed] = newCards.splice(source.index, 1);
      newCards.splice(destination.index, 0, removed);

      const updatedCards = newCards.map((c, i) => ({ ...c, position: i }));
      
      const newLists = data.lists.map(list => 
        list.id === sourceList.id ? { ...list, cards: updatedCards } : list
      );
      setData({ ...data, lists: newLists });

      // API Call
      try {
        await Promise.all(
          updatedCards.map(card => 
            fetch(`/api/cards/${card.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(card)
            })
          )
        );
      } catch (err) {
        console.error('Failed to save card positions', err);
      }
    } else {
      // Move between lists
      const sourceCards = Array.from(sourceList.cards);
      const destCards = Array.from(destList.cards);
      const [removed] = sourceCards.splice(source.index, 1);
      
      removed.listId = destList.id; // Update reference
      destCards.splice(destination.index, 0, removed);

      const updatedSourceCards = sourceCards.map((c, i) => ({ ...c, position: i }));
      const updatedDestCards = destCards.map((c, i) => ({ ...c, position: i }));

      const newLists = data.lists.map(list => {
        if (list.id === sourceList.id) return { ...list, cards: updatedSourceCards };
        if (list.id === destList.id) return { ...list, cards: updatedDestCards };
        return list;
      });
      setData({ ...data, lists: newLists });

      // API Call
      try {
        await Promise.all([
          ...updatedSourceCards,
          ...updatedDestCards
        ].map(card => 
          fetch(`/api/cards/${card.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(card)
          })
        ));
      } catch (err) {
        console.error('Failed to save cross-list card positions', err);
      }
    }
  };

  const handleCheckToggle = async (cardId: string, isChecked: boolean) => {
    // Optimistic
    const newLists = data.lists.map(list => ({
      ...list,
      cards: list.cards.map(card => card.id === cardId ? { ...card, is_checked: isChecked } : card)
    }));
    setData({ ...data, lists: newLists });

    // API Call
    try {
       // Need to find full card to patch since our API expects full card currently
       const fullCard = data.lists.flatMap(l => l.cards).find(c => c.id === cardId);
       if (fullCard) {
          const patched = { ...fullCard, is_checked: isChecked };
          await fetch(`/api/cards/${cardId}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(patched)
          });
       }
    } catch (err) {
      console.error('Failed to toggle card', err);
    }
  };

  const handleAddList = async () => {
    const title = window.prompt("Nome da nova lista:");
    if (!title || !title.trim()) return;

    const newListId = crypto.randomUUID();
    const newList: List = {
      id: newListId,
      title: title.trim(),
      position: data.lists.length,
      boardId: data.id,
      cards: []
    };

    setData({ ...data, lists: [...data.lists, newList] });

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newList.title, boardId: data.id, position: newList.position })
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Failed to create list: ${errBody}`);
      }
      
      const savedList = await response.json();
      setData(prev => ({
        ...prev,
        lists: prev.lists.map(l => l.id === newListId ? { ...l, id: savedList.id } : l)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCard = async (listId: string) => {
    const title = window.prompt("Nome da nova tarefa:");
    if (!title || !title.trim()) return;

    const listIndex = data.lists.findIndex(l => l.id === listId);
    if (listIndex === -1) return;

    const list = data.lists[listIndex];
    const newCardId = crypto.randomUUID();

    const newCard: Card = {
      id: newCardId,
      title: title.trim(),
      description: "",
      is_checked: false,
      position: list.cards.length,
      listId: listId
    };

    const newLists = [...data.lists];
    newLists[listIndex] = { ...list, cards: [...list.cards, newCard] };
    setData({ ...data, lists: newLists });

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCard.title, listId: newCard.listId, position: newCard.position })
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Failed to create card: ${errBody}`);
      }
      
      const savedCard = await response.json();
      setData(prev => {
        const newPrevLists = [...prev.lists];
        const idx = newPrevLists.findIndex(l => l.id === listId);
        if (idx !== -1) {
          newPrevLists[idx] = {
            ...newPrevLists[idx],
            cards: newPrevLists[idx].cards.map(c => c.id === newCardId ? { ...c, id: savedCard.id } : c)
          };
        }
        return { ...prev, lists: newPrevLists };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta lista? Todas as tarefas nela serão perdidas.")) return;
    
    // Optimistic Update
    const newLists = data.lists.filter(l => l.id !== listId);
    setData({ ...data, lists: newLists });

    try {
      const response = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Failed to delete list: ${errBody}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    // Optimistic Update
    const newLists = data.lists.map(list => ({
      ...list,
      cards: list.cards.filter(c => c.id !== cardId)
    }));
    setData({ ...data, lists: newLists });

    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Failed to delete card: ${errBody}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isBrowser) return <div className="p-8">Loading board...</div>;

  return (
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
                      <span className="font-medium text-sm">Add a card</span>
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
              <span className="font-semibold">Add another list</span>
            </button>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
