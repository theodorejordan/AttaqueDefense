// Chat history and message field (docs/DECISIONS.md > UI > Chat). Lobby for now; the table version comes with step 4e.
import { useEffect, useRef, useState } from 'preact/hooks';
import { type ChatMessage, MAX_CHAT_LENGTH } from '../../shared/protocol.ts';
import { send } from '../connection.ts';
import { t } from '../i18n/index.ts';
import './chat.css';

export function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages.length]);

  const submit = async (event: Event) => {
    event.preventDefault();
    if (!text.trim()) return;
    if (await send({ type: 'chat', text })) setText('');
  };

  return (
    <section class="chat" aria-labelledby="chat-title">
      <h2 id="chat-title" class="visually-hidden">
        {t.chat.title}
      </h2>
      <div class="chat-messages" ref={list} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p class="caption">{t.chat.empty}</p>
        ) : (
          messages.map((message) => (
            <p key={message.id} class="chat-message">
              <span class="chat-name">{message.name ?? t.chat.spectator}</span> {message.text}
            </p>
          ))
        )}
      </div>
      <form class="chat-form" onSubmit={submit}>
        <label class="visually-hidden" for="chat-input">
          {t.chat.placeholder}
        </label>
        <input
          id="chat-input"
          class="text-input"
          value={text}
          onInput={(event) => setText((event.target as HTMLInputElement).value)}
          maxLength={MAX_CHAT_LENGTH}
          placeholder={t.chat.placeholder}
          autocomplete="off"
        />
        <button class="btn" type="submit">
          {t.chat.send}
        </button>
      </form>
    </section>
  );
}
