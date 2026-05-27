/**
 * HelpBot — "Leef" the PayLeef AI Help Assistant
 * Floating chat widget available on all admin pages.
 * Powered by Google Gemini via /api/ai/help-bot
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, ChevronDown, RotateCcw } from 'lucide-react';
import api from '@/lib/api';

const G = '#1A7A4A';

// ── Leaf + chat icon for the floating button ─────────────────────────────────
const LeafChatIcon = () => (
  <svg viewBox="0 0 36 36" fill="none" width="36" height="36">
    {/* Leaf shape */}
    <path d="M18 4C24 4 30 10 29 18C28 26 24 31 18 32C12 31 8 26 7 18C6 10 12 4 18 4Z" fill="white" opacity="0.95"/>
    {/* Rupee lines */}
    <line x1="18" y1="5" x2="18" y2="31" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="13" x2="25" y2="13" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="18" x2="25" y2="18" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="18" x2="22" y2="29" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    {/* Chat dots */}
    <circle cx="27" cy="9" r="8" fill="#22C55E"/>
    <circle cx="24.5" cy="9" r="1.3" fill="white"/>
    <circle cx="27" cy="9" r="1.3" fill="white"/>
    <circle cx="29.5" cy="9" r="1.3" fill="white"/>
  </svg>
);

// ── Leef avatar (small, in chat bubbles) ────────────────────────────────────
const LeefAvatar = ({ size = 28 }) => (
  <div
    className="flex items-center justify-center rounded-full shrink-0 font-bold text-white"
    style={{ width: size, height: size, background: `linear-gradient(135deg, ${G} 0%, #22C55E 100%)`, fontSize: size * 0.4 }}
  >
    🌿
  </div>
);

// ── Typing dots animation ────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <LeefAvatar />
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: '#F1F5F9', maxWidth: 80 }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: '#94A3B8',
              animation: 'leef-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Suggested question chips ─────────────────────────────────────────────────
const SUGGESTIONS = [
  '👤 How do I add employees?',
  '⚡ How do I generate payslips?',
  '📅 What is LOP and why does it reduce salary?',
  '🏛️ What is PF deduction?',
  '📊 How do I download PF or ESI report?',
  '💰 What is the difference between CTC and take-home?',
  '📧 How to send payslips by email?',
  '⚙️ How do I set up payroll config?',
];

// ── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && <LeefAvatar />}
      <div
        className="px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed"
        style={{
          maxWidth: '82%',
          background: isUser ? G : '#F1F5F9',
          color: isUser ? '#fff' : '#1E293B',
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── Main HelpBot component ───────────────────────────────────────────────────
export default function HelpBot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [pulse, setPulse]       = useState(true); // green pulse on button

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const chatRef    = useRef(null);

  // Stop pulsing after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const userMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history excluding the latest message (it's sent as `message`)
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/ai/help-bot', { message: question, history });
      const botMsg = { role: 'assistant', content: data.answer || "I'm not sure! Try asking your HR team. 😊" };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops, I had a hiccup! 😅 Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const showWelcome = messages.length === 0;

  return (
    <>
      {/* ── Bounce animation keyframes ── */}
      <style>{`
        @keyframes leef-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes leef-pulse {
          0% { box-shadow: 0 0 0 0 rgba(26,122,74,0.5); }
          70% { box-shadow: 0 0 0 14px rgba(26,122,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(26,122,74,0); }
        }
        @keyframes leef-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .leef-chat-window {
          animation: leef-slide-up 0.2s ease-out;
        }
      `}</style>

      {/* ── Floating button ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
        }}
      >
        {/* Chat window */}
        {open && (
          <div
            className="leef-chat-window"
            style={{
              width: 360,
              height: 520,
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            {/* ── Header ── */}
            <div style={{
              background: `linear-gradient(135deg, ${G} 0%, #22C55E 100%)`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              {/* Leef avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                🌿
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                  Leef — PayLeef Helper
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
                  🟢 Online · Ask me anything about PayLeef
                </p>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {/* Reset chat */}
                {messages.length > 0 && (
                  <button
                    onClick={resetChat}
                    title="Start new chat"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                {/* Collapse */}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* ── Chat area ── */}
            <div
              ref={chatRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 14px 8px',
                background: '#FAFBFC',
              }}
            >
              {/* Welcome state — shown before any message */}
              {showWelcome && (
                <div style={{ marginBottom: 16 }}>
                  {/* Leef intro bubble */}
                  <div className="flex items-end gap-2 mb-3">
                    <LeefAvatar />
                    <div style={{
                      background: '#F1F5F9',
                      borderRadius: '16px 16px 16px 4px',
                      padding: '12px 14px',
                      maxWidth: '85%',
                    }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                        👋 Hi! I'm <strong>Leef</strong> — your PayLeef helper!
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                        I can explain how to use PayLeef and answer payroll questions — in super simple words. Ask me anything! 😊
                      </p>
                    </div>
                  </div>

                  {/* Suggested questions */}
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px 2px' }}>
                      Common questions
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {SUGGESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q.replace(/^[^\s]+ /, ''))}
                          style={{
                            textAlign: 'left',
                            background: '#fff',
                            border: `1.5px solid #E2E8F0`,
                            borderRadius: 10,
                            padding: '8px 12px',
                            fontSize: 12.5,
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; e.currentTarget.style.background = '#F0FDF4'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.background = '#fff'; }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {/* Typing indicator */}
              {loading && <TypingIndicator />}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* ── Input area ── */}
            <div style={{
              padding: '10px 12px',
              borderTop: '1px solid #F1F5F9',
              background: '#fff',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about PayLeef..."
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  color: '#1E293B',
                  outline: 'none',
                  lineHeight: 1.5,
                  maxHeight: 100,
                  overflow: 'auto',
                  background: input.length > 0 ? '#fff' : '#FAFBFC',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = G; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: input.trim() && !loading ? G : '#E2E8F0',
                  border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                <Send size={15} color={input.trim() && !loading ? '#fff' : '#94A3B8'} />
              </button>
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: '6px 12px 10px',
              background: '#fff',
              textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: 10.5, color: '#CBD5E1' }}>
                Powered by AI · Press Enter to send · Esc to close
              </p>
            </div>
          </div>
        )}

        {/* ── Floating button ── */}
        <button
          onClick={() => { setOpen(v => !v); setPulse(false); }}
          title="Ask Leef — PayLeef Helper"
          style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${G} 0%, #22C55E 100%)`,
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: open
              ? `0 4px 24px rgba(26,122,74,0.4)`
              : `0 4px 20px rgba(26,122,74,0.35)`,
            transform: open ? 'rotate(0deg)' : 'rotate(0deg)',
            transition: 'all 0.2s',
            animation: pulse && !open ? 'leef-pulse 2s ease-out infinite' : 'none',
            position: 'relative',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {open
            ? <X size={22} color="white" />
            : <LeafChatIcon />
          }

          {/* Unread badge — shown when bot hasn't been opened yet */}
          {!open && pulse && (
            <span style={{
              position: 'absolute',
              top: 4, right: 4,
              width: 10, height: 10,
              background: '#EF4444',
              borderRadius: '50%',
              border: '2px solid white',
            }} />
          )}
        </button>

        {/* ── Tooltip — shows briefly on first load ── */}
        {!open && pulse && (
          <div style={{
            position: 'absolute',
            bottom: 64, right: 0,
            background: '#0F172A',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}>
            💬 Hi! I'm Leef — ask me anything!
            <div style={{
              position: 'absolute', bottom: -5, right: 20,
              width: 10, height: 10,
              background: '#0F172A',
              transform: 'rotate(45deg)',
            }} />
          </div>
        )}
      </div>
    </>
  );
}
