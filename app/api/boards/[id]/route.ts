import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, notFound } from '@/lib/api';
import { deleteBoard, getBoardWithLists, updateBoard } from '@/lib/db/queries';

const patchSchema = z.object({ title: z.string().trim().min(1) }).partial();

export async function GET(request: Request, ctx: RouteContext<'/api/boards/[id]'>) {
  try {
    const { id } = await ctx.params;
    const board = await getBoardWithLists(id);
    return board ? NextResponse.json(board) : notFound('Quadro');
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/boards/[id]'>) {
  try {
    const { id } = await ctx.params;
    const patch = patchSchema.parse(await request.json());
    const board = await updateBoard(id, patch);
    return board ? NextResponse.json(board) : notFound('Quadro');
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/boards/[id]'>) {
  try {
    const { id } = await ctx.params;
    const board = await deleteBoard(id);
    return board ? NextResponse.json({ success: true }) : notFound('Quadro');
  } catch (error) {
    return apiError(error);
  }
}
