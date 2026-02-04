import React, { useMemo, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

type ChatMessage = {
  id: string;
  from: 'me' | 'them';
  text: string;
  createdAt: string;
};

export default function ChatThread() {
  const navigate = useNavigate();
  const params = useParams();
  const threadId = params.threadId ?? '';

  const title = useMemo(() => {
    if (threadId === 'new') return 'New Message';
    if (threadId === 'followers') return 'New Followers';
    if (threadId === 'likes') return 'Likes';
    if (threadId === 'comments') return 'Comments';
    if (threadId === 'mentions') return 'Mentions';
    return `Chat ${threadId}`;
  }, [threadId]);

  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm1',
      from: 'them',
      text: 'Hey! This is a demo chat thread.',
      createdAt: new Date().toISOString(),
    },
  ]);

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-[500px] flex flex-col min-h-[100dvh]">
        <header className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg">{title}</h1>
          <div className="w-6" />
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6 border ${
                  m.from === 'me'
                    ? 'bg-[#E6B36A] text-black border-[#E6B36A]'
                    : 'bg-transparent text-white border-transparent'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form
          className="pb-safe"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            setMessages((prev) => [
              ...prev,
              { id: String(Date.now()), from: 'me', text, createdAt: new Date().toISOString() },
            ]);
            setDraft('');
          }}
        >
          <div className="flex items-center gap-2 bg-transparent border border-transparent rounded-2xl px-3 py-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Type a message"
              aria-label="Message"
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-xl bg-[#E6B36A] text-black flex items-center justify-center disabled:opacity-60"
              disabled={!draft.trim()}
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
