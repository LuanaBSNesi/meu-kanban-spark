import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, notFound } from '@/lib/api';
import { deleteList, updateList } from '@/lib/db/queries';

const patchSchema = z
  .object({ title: z.string().trim().min(1), position: z.number() })
  .partial();

export async function PATCH(request: Request, ctx: RouteContext<'/api/lists/[id]'>) {
  try {
    const { id } = await ctx.params;
    const patch = patchSchema.parse(await request.json());
    const list = await updateList(id, patch);
    return list ? NextResponse.json(list) : notFound('Lista');
  } catch (error) {
    return apiError(error);
  }
}

/** The cards go with it through the FK constraint, not through application code. */
export async function DELETE(request: Request, ctx: RouteContext<'/api/lists/[id]'>) {
  try {
    const { id } = await ctx.params;
    const list = await deleteList(id);
    return list ? NextResponse.json({ success: true }) : notFound('Lista');
  } catch (error) {
    return apiError(error);
  }
}
