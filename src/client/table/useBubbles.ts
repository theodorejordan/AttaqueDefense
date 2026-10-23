// Speech bubbles next to names (docs/DECISIONS.md > UI > Step 4e): a seated player's new message shows for 3 s,
// and a newer message from the same player replaces it. Messages already there when the table opens are not shown.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerId } from '../../engine/state.ts';
import type { ChatMessage } from '../../shared/protocol.ts';

const BUBBLE_MS = 3_000;

export function useBubbles(chat: ChatMessage[]): ReadonlyMap<PlayerId, ChatMessage> {
  const [bubbles, setBubbles] = useState<ReadonlyMap<PlayerId, ChatMessage>>(new Map());
  const seen = useRef(chat.at(-1)?.id ?? 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const fresh = chat.filter((m) => m.id > seen.current && m.from !== null);
    seen.current = chat.at(-1)?.id ?? seen.current;
    if (fresh.length === 0) return;
    setBubbles((shown) => new Map([...shown, ...fresh.map((m) => [m.from!, m] as const)]));
    for (const message of fresh) {
      const timer = setTimeout(() => {
        setBubbles((shown) => {
          // A newer message from the same player has its own timer.
          if (shown.get(message.from!)?.id !== message.id) return shown;
          const next = new Map(shown);
          next.delete(message.from!);
          return next;
        });
      }, BUBBLE_MS);
      timers.current.push(timer);
    }
  }, [chat]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return bubbles;
}
