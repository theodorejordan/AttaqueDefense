// Runs the playback (playback.ts) on a timer: the table draws `frame`, and updates arriving meanwhile wait their turn.
import { useEffect, useState } from 'preact/hooks';
import type { RoomView } from '../../shared/protocol.ts';
import { onUpdate } from '../connection.ts';
import { type Frame, framesFor } from './playback.ts';

/** The frame to draw now. `busy` while an attack is shown or frames are waiting: your deck stays disabled meanwhile. */
export function usePlayback(latest: RoomView): { frame: Frame; busy: boolean } {
  const [frame, setFrame] = useState<Frame>({ room: latest, attack: null, ms: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let before = latest;
    const queue: Frame[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const advance = () => {
      timer = null;
      while (queue.length > 0) {
        const next = queue.shift()!;
        setFrame(next);
        if (next.ms > 0) {
          timer = setTimeout(advance, next.ms);
          setBusy(true);
          return;
        }
      }
      setBusy(false);
    };

    const stop = onUpdate((update) => {
      queue.push(...framesFor(before, update));
      before = update.room;
      if (timer === null) advance();
    });
    return () => {
      stop();
      if (timer !== null) clearTimeout(timer);
    };
    // The table is mounted for one game: `latest` is only the starting point.
  }, []);

  return { frame, busy };
}
