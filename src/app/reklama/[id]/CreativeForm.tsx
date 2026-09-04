"use client";

import { useActionState } from "react";
import { uploadAdCreativeAction, type UploadCreativeState } from "./actions";

export default function CreativeForm({ purchaseId }: { purchaseId: string }) {
  const actionWithId = uploadAdCreativeAction.bind(null, purchaseId);
  const [state, formAction, pending] = useActionState<UploadCreativeState | undefined, FormData>(
    actionWithId,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Kreacja reklamowa (zdjęcie JPG/PNG lub film MP4/WEBM)
        <input
          name="media"
          type="file"
          accept="image/jpeg,image/png,video/mp4,video/webm,video/quicktime"
          required
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Link docelowy (dokąd trafi kliknięcie)
        <input
          name="linkUrl"
          type="url"
          required
          placeholder="https://twojastrona.pl"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">
          Gotowe! Reklama jest aktywna przez najbliższe 30 dni.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Wysyłanie..." : "Uruchom reklamę"}
      </button>
    </form>
  );
}
