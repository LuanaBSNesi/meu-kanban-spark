import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { createList } from '@/lib/db/queries';

const createSchema = z.object({
  boardId: z.uuid(),
  title: z.string().trim().min(1),
  position: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const { boardId, title, position } = createSchema.parse(await request.json());
    return NextResponse.json(await createList(boardId, title, position), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
