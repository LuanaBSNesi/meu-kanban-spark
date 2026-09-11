import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { createCard } from '@/lib/db/queries';

const createSchema = z.object({
  listId: z.uuid(),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  position: z.number().optional(),
  dueAt: z.coerce.date().nullish(),
});

export async function POST(request: Request) {
  try {
    const { listId, ...values } = createSchema.parse(await request.json());
    return NextResponse.json(await createCard(listId, values), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
