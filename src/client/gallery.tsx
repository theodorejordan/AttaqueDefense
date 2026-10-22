// Development page to check the Card piece: http://localhost:3000/gallery.html with `npm run dev`. Not part of the build.
import { render } from 'preact';
import { useState } from 'preact/hooks';
import { RANKS, SUITS } from '../engine/cards.ts';
import { Card } from './cards/Card.tsx';
import { LANGUAGES, getLanguage, setLanguage } from './i18n/index.ts';
import './styles/base.css';

/** Card widths by number of players at the table (docs/DECISIONS.md > UI). */
const TABLE_WIDTHS = [100, 80, 66, 56, 50];

function Gallery() {
  const [, setShown] = useState(getLanguage());
  const switchTo = (language: (typeof LANGUAGES)[number]) => {
    setLanguage(language);
    setShown(language);
  };

  return (
    <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {LANGUAGES.map((language) => (
          <button key={language} type="button" onClick={() => switchTo(language)} aria-pressed={getLanguage() === language}>
            {language.toUpperCase()}
          </button>
        ))}
      </div>
      {SUITS.map((suit) => (
        <div key={suit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {RANKS.map((rank) => (
            <Card key={rank} card={{ rank, suit, deck: 0 }} width={80} />
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {TABLE_WIDTHS.map((width) => (
          <Card key={`10-${width}`} card={{ rank: '10', suit: 'spades', deck: 0 }} width={width} />
        ))}
        {TABLE_WIDTHS.map((width) => (
          <Card key={`Q-${width}`} card={{ rank: 'Q', suit: 'hearts', deck: 0 }} width={width} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <Card card={{ rank: '7', suit: 'diamonds', deck: 0 }} width={80} sideways />
        <Card card={null} width={80} />
        <Card card={null} width={56} />
      </div>
    </main>
  );
}

render(<Gallery />, document.querySelector('#app')!);
