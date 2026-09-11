import { NextResponse } from 'next/server';
import { apiError, notFound } from '@/lib/api';
import { getBoardVersion } from '@/lib/db/queries';

/** Cheap change-detection endpoint the board polls to notice edits made by Spark or Claude. */
export async function GET(request: Request, ctx: RouteContext<'/api/boards/[id]/version'>) {
  try {
    const { id } = await ctx.params;
    const version = await getBoardVersion(id);
    return version ? NextResponse.json({ version }) : notFound('Quadro');
  } catch (error) {
    return apiError(error);
  }
}
