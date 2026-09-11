import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, notFound } from '@/lib/api';
import { deleteCard, updateCard } from '@/lib/db/queries';

const patchSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string(),
    isChecked: z.boolean(),
    position: z.number(),
    listId: z.uuid(),
    dueAt: z.coerce.date().nullable(),
    driveFileId: z.string().nullable(),
  })
  .partial();

export async function PATCH(request: Request, ctx: RouteContext<'/api/cards/[id]'>) {
  try {
    const { id } = await ctx.params;
    const patch = patchSchema.parse(await request.json());
    const card = await updateCard(id, patch);
    return card ? NextResponse.json(card) : notFound('Card');
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/cards/[id]'>) {
  try {
    const { id } = await ctx.params;
    const card = await deleteCard(id);
    return card ? NextResponse.json({ success: true }) : notFound('Card');
  } catch (error) {
    return apiError(error);
  }
}
