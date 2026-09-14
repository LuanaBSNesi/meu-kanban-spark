'use client';

import { useEffect, useRef } from 'react';
import type { BoardData } from './types';

const POLL_MS = 4000;

/**
 * Notices edits made outside this tab — by Claude or Spark through the MCP, or
 * by the same board open elsewhere — and pulls the new state in.
 *
 * It polls a version token instead of the whole board: that request returns a
 * single string, so checking every few seconds stays cheap. The board itself is
 * only refetched when the token actually changes.
 */
export function useBoardSync(
  boardId: string,
  apply: (board: BoardData) => void,
  isBusy: () => boolean,
) {
  const version = useRef<string | null>(null);
  const applyRef = useRef(apply);
  const busyRef = useRef(isBusy);
  applyRef.current = apply;
  busyRef.current = isBusy;

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // A write of our own is in flight; its optimistic state would be clobbered
      // by whatever the server says right now.
      if (busyRef.current() || document.hidden) return;

      try {
        const response = await fetch(`/api/boards/${boardId}/version`, { cache: 'no-store' });
        if (!response.ok) return;

        const { version: latest } = (await response.json()) as { version: string };
        if (cancelled) return;

        // First run only records the baseline, so the board is not refetched
        // just because this tab started polling.
        if (version.current === null) {
          version.current = latest;
          return;
        }
        if (version.current === latest) return;

        const board = await fetch(`/api/boards/${boardId}`, { cache: 'no-store' });
        if (!board.ok || cancelled) return;

        version.current = latest;
        if (!busyRef.current()) applyRef.current(await board.json());
      } catch {
        // A failed poll is not worth surfacing; the next tick tries again.
      }
    }

    const timer = setInterval(check, POLL_MS);
    check();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [boardId]);
}
