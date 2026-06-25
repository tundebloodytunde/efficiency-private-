'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState(1);
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setContent(transcript);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      inputRef.current?.focus();
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', e.error);
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    stopListening();
    setSaving(true);
    await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', content, priority, due_string: due }),
    });
    setSaving(false);
    setSaved(true);
    setContent('');
    setPriority(1);
    setDue('');
    setTimeout(() => { setSaved(false); setOpen(false); }, 800);
  }

  function handleClose() {
    stopListening();
    setOpen(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-600 to-pink-600 rounded-full shadow-2xl shadow-violet-500/40 flex items-center justify-center text-2xl font-light hover:scale-110 transition-transform active:scale-95 z-40"
        aria-label="Quick capture"
      >
        +
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0"
          onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="bg-white border border-gray-200 dark:bg-gray-900 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Quick Capture</h3>
              <span className="text-xs text-gray-400 hidden sm:block">⌘K to toggle</span>
            </div>

            {saved ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-500 font-semibold">Task added to Todoist</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={listening ? 'Listening...' : "What's on your mind?"}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className={`w-full bg-gray-50 border focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition text-lg ${
                      listening ? 'border-red-400 dark:border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                        listening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400'
                      }`}
                      aria-label={listening ? 'Stop listening' : 'Start voice input'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <select
                    value={priority}
                    onChange={e => setPriority(parseInt(e.target.value))}
                    className="flex-1 bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none transition"
                  >
                    <option value={4}>🔴 Urgent</option>
                    <option value={3}>🟠 High</option>
                    <option value={2}>🟡 Medium</option>
                    <option value={1}>⚪ Low</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Due: today, tomorrow..."
                    value={due}
                    onChange={e => setDue(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={handleClose}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/20 transition text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm">
                    {saving ? 'Saving...' : 'Add Task →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
