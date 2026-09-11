import type { Board, Card, List } from '@/lib/db/schema';

export type CardData = Card;
export type ListData = List & { cards: CardData[] };
export type BoardData = Board & { lists: ListData[] };
