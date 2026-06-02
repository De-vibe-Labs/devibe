import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { Send, Smartphone, Monitor, Sparkles, Play, MessageSquare, Loader2 } from 'lucide-react';

interface ChatTurn {
  role: 'user' | 'agent';
  text: string;
}

interface IDEPanelProps {
  /** Code emitted by the AI; treated as the "source of truth" until user edits. */
  initialCode: string;
  filename?: string;
  chat: ChatTurn[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSubmitChat: () => void;
  isWorking?: boolean;
  /** Optional callback for save-as-new-version. */
  onSaveSnapshot?: (code: string) => void;
}

/**
 * 3-pane IDE: AI chat | Monaco code editor | Sandpack live preview (web or mobile frame).
 * Editor edits are local until the user clicks "Run" — keeps the preview from churning on
 * every keystroke. AI-driven code updates (via `initialCode` changing) overwrite the editor
 * automatically.
 */
export function IDEPanel({
  initialCode,
  filename = 'App.tsx',
  chat,
  chatInput,
  onChatInputChange,
  onSubmitChat,
  isWorking = false,
  onSaveSnapshot,
}: IDEPanelProps) {
  const [editorCode, setEditorCode] = useState(initialCode);
  const [previewCode, setPreviewCode] = useState(initialCode);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [dirty, setDirty] = useState(false);

  // When the AI ships new code, reset the editor and preview to match it.
  useEffect(() => {
    setEditorCode(initialCode);
    setPreviewCode(initialCode);
    setDirty(false);
  }, [initialCode]);

  const runPreview = () => {
    setPreviewCode(editorCode);
    setDirty(false);
  };

  // Tailwind via Play CDN so the AI's Tailwind classes actually render in the sandbox.
  const sandpackFiles = useMemo(
    () => ({
      '/App.tsx': { code: previewCode, active: true },
      '/public/index.html': {
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Devibe preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>html,body,#root{height:100%;margin:0;background:#0B0F19;color:#fff;font-family:system-ui,sans-serif}</style>
  </head>
  <body><div id="root"></div></body>
</html>`,
        hidden: true,
      },
    }),
    [previewCode],
  );

  const previewWrapperClass =
    device === 'mobile'
      ? 'mx-auto w-[375px] h-[640px] rounded-[28px] border-[6px] border-slate-800 bg-black overflow-hidden shadow-2xl'
      : 'w-full h-full rounded-lg overflow-hidden border border-slate-800';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_minmax(320px,440px)] gap-3 h-[640px] text-slate-100">
      {/* ——— LEFT: AI CHAT ——— */}
      <aside className="bg-[#0F1424] border border-slate-800 rounded-xl flex flex-col min-h-0">
        <header className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold text-white">AI Chat</span>
        </header>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {chat.length === 0 && (
            <p className="text-[11px] text-slate-500 text-center mt-4">
              Ask the AI to refine the code — "make it dark mode", "add a sign-up button"…
            </p>
          )}
          {chat.map((m, i) => (
            <div
              key={i}
              className={`text-[11px] leading-relaxed px-2.5 py-2 rounded-xl border ${
                m.role === 'user'
                  ? 'bg-violet-600/15 border-violet-500/30 text-violet-100 ml-4'
                  : 'bg-slate-900/70 border-slate-800 text-slate-200 mr-4'
              }`}
            >
              {m.text}
            </div>
          ))}
          {isWorking && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
              <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
              <span>Devibe agents are working…</span>
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isWorking) onSubmitChat();
          }}
          className="p-2 border-t border-slate-800"
        >
          <div className="flex items-end gap-1.5 bg-slate-900 border border-slate-700 focus-within:border-violet-500/60 rounded-lg p-1.5">
            <textarea
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isWorking) onSubmitChat();
                }
              }}
              rows={1}
              placeholder="Ask Devibe…"
              className="flex-1 bg-transparent resize-none outline-none text-[11px] text-slate-100 placeholder-slate-500 px-1 py-1 max-h-24"
              disabled={isWorking}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isWorking}
              className="shrink-0 w-7 h-7 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition"
              aria-label="Send"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </aside>

      {/* ——— MIDDLE: MONACO EDITOR ——— */}
      <main className="bg-[#0F1424] border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
        <header className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono text-slate-300 truncate">{filename}</span>
            {dirty && <span className="text-[10px] font-mono text-amber-400">• unsaved</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {onSaveSnapshot && (
              <button
                onClick={() => onSaveSnapshot(editorCode)}
                className="px-2 py-1 text-[10px] font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded transition"
              >
                Save
              </button>
            )}
            <button
              onClick={runPreview}
              disabled={!dirty}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
            >
              <Play className="w-3 h-3" />
              <span>Run</span>
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language="typescript"
            value={editorCode}
            theme="vs-dark"
            onChange={(value) => {
              const next = value ?? '';
              setEditorCode(next);
              setDirty(next !== previewCode);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 10 },
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        </div>
      </main>

      {/* ——— RIGHT: LIVE PREVIEW ——— */}
      <section className="bg-[#0F1424] border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
        <header className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-white">Live preview</span>
          <div className="inline-flex bg-slate-900 border border-slate-700 rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => setDevice('desktop')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                device === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Web</span>
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                device === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0 p-3 bg-[#070B14] flex items-center justify-center overflow-auto">
          <div className={previewWrapperClass}>
            <SandpackProvider
              key={previewCode.length /* force remount on big changes */}
              template="react-ts"
              files={sandpackFiles}
              customSetup={{ dependencies: { 'lucide-react': 'latest' } }}
              theme="dark"
              options={{ recompileMode: 'delayed', recompileDelay: 400 }}
            >
              <SandpackPreview
                style={{ height: '100%', width: '100%' }}
                showOpenInCodeSandbox={false}
                showRefreshButton
              />
            </SandpackProvider>
          </div>
        </div>
      </section>
    </div>
  );
}
