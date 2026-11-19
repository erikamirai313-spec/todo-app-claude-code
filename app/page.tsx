"use client";

import { useRef, useState, useSyncExternalStore } from "react";

type Task = { id: string; text: string; done: boolean };

const KEY = "todo-app:tasks";
const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cacheVal: Task[] = [];

function read(): Task[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cacheVal = Array.isArray(parsed) ? parsed : [];
    } catch {
      cacheVal = [];
    }
  }
  return cacheVal;
}

function write(tasks: Task[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export default function Home() {
  // null on the server / first render, so there is no hydration mismatch
  const tasks = useSyncExternalStore<Task[] | null>(subscribe, read, () => null);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function notify(msg: string) {
    clearTimeout(timer.current);
    setNotice(msg);
    timer.current = setTimeout(() => setNotice(null), 3000);
  }

  function add() {
    const t = text.trim();
    if (!tasks) return;
    if (!t) {
      setError(true);
      return;
    }
    write([{ id: crypto.randomUUID(), text: t, done: false }, ...tasks]);
    setText("");
    notify("追加しました");
  }
  function toggle(id: string) {
    if (!tasks) return;
    const target = tasks.find((t) => t.id === id);
    write(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    notify(target?.done ? "未完了に戻しました" : "完了しました");
  }
  function remove(id: string) {
    if (!tasks) return;
    write(tasks.filter((t) => t.id !== id));
    notify("削除しました");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:py-16">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">ToDo リスト</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mb-8"
      >
        <div className="flex gap-3">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(false);
            }}
            placeholder="新しいタスクを入力"
            aria-label="新しいタスク"
            aria-invalid={error}
            className={`min-h-14 min-w-0 flex-1 rounded-xl border-2 bg-white px-4 text-base text-gray-900 outline-none focus:ring-4 focus:ring-blue-200 ${
              error ? "border-red-600" : "border-gray-300 focus:border-blue-600"
            }`}
          />
          <button
            type="submit"
            className="min-h-14 min-w-20 shrink-0 cursor-pointer rounded-xl bg-blue-600 px-6 text-base font-semibold text-white transition hover:bg-blue-800 active:scale-95 active:bg-blue-900"
          >
            追加
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-base font-medium text-red-700">
            ⚠ タスクを入力してください
          </p>
        )}
      </form>

      {tasks === null ? null : tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-base text-gray-600">
          タスクはまだありません
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white py-2 pl-2 pr-3 shadow-sm"
            >
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg hover:bg-gray-50 active:bg-gray-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggle(t.id)}
                    className="h-7 w-7 cursor-pointer accent-blue-600"
                  />
                </span>
                <span
                  className={`break-words text-base leading-snug ${
                    t.done ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                >
                  {t.done && <span className="mr-2 inline-block font-semibold">✓ 完了</span>}
                  {t.text}
                </span>
              </label>
              <button
                onClick={() => remove(t.id)}
                aria-label={`「${t.text}」を削除`}
                className="min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg border border-red-300 px-4 text-base font-medium text-red-700 transition hover:bg-red-50 active:scale-95 active:bg-red-100"
              >
                <span className="flex items-center gap-1.5">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                  </svg>
                  削除
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-5"
      >
        {notice && (
          <p className="rounded-xl bg-gray-900 px-6 py-3 text-base font-medium text-white shadow-lg">
            ✓ {notice}
          </p>
        )}
      </div>
    </main>
  );
}
