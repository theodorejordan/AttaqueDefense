import { describe, expect, it } from 'vitest';
import { parseRequest } from './validate.ts';

describe('parseRequest', () => {
  it('accepts well-formed requests and drops unknown fields', () => {
    expect(parseRequest({ type: 'join', name: 'Alice', extra: 1 })).toEqual({ type: 'join', name: 'Alice' });
    expect(parseRequest({ type: 'setSettings', settings: { hunters: 2 } })).toEqual({
      type: 'setSettings',
      settings: { hunters: 2 },
    });
    expect(parseRequest({ type: 'game', command: { type: 'play', play: { type: 'attack', target: 'p2' } } })).toEqual({
      type: 'game',
      command: { type: 'play', play: { type: 'attack', target: 'p2' } },
    });
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      'join',
      [],
      { type: 'hack' },
      { type: 'join', name: 42 },
      { type: 'setSettings', settings: { hunters: 1.5 } },
      { type: 'game', command: { type: 'chooseShield', cardIndex: '0' } },
      { type: 'game', command: { type: 'play', play: { type: 'steal', target: 'p2' } } },
      { type: 'game', command: { type: 'setPreference', preference: 'cheat' } },
    ]) {
      expect(() => parseRequest(bad)).toThrow();
    }
  });
});
