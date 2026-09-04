"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEditorAction } from "./actions";

export default function CreateEditorForm() {
  const [state, formAction, pending] = useActionState(createEditorAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Imię i nazwisko
        <input name="name" required className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input name="email" type="email" required className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hasło
        <input name="password" type="password" required className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Rola
        <select name="role" className="rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black">
          <option value="EDITOR">Redaktor</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Dodawanie..." : "Dodaj do zespołu"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
