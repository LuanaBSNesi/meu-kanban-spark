import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { createBoard, listBoards } from '@/lib/db/queries';

const createSchema = z.object({ title: z.string().trim().min(1) });

export async function GET() {
  try {
    return NextResponse.json(await listBoards());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { title } = createSchema.parse(await request.json());
    return NextResponse.json(await createBoard(title), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
