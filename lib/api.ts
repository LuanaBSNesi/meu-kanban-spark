import { NextResponse } from 'next/server';
import { z } from 'zod';

export function apiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Dados invalidos', issues: z.treeifyError(error) },
      { status: 400 },
    );
  }
  console.error(error);
  const message = error instanceof Error ? error.message : 'Erro inesperado';
  return NextResponse.json({ error: message }, { status: 500 });
}

export function notFound(what: string) {
  return NextResponse.json({ error: `${what} nao encontrado` }, { status: 404 });
}
