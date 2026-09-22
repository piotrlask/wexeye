"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addContentAction } from "./actions";
import { CATEGORIES, POST_TYPES, POST_TYPE_LABELS, SOURCE_TYPES, SOURCE_TYPE_LABELS } from "@/lib/constants";

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ContentForm() {
  const [state, formAction, pending] = useActionState(addContentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationHidden, setLocationHidden] = useState(false);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setCoords(null);
    }
  }, [state]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Typ publikacji
          <select
            name="postType"
            defaultValue="STORY"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
          >
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kategoria
          <select
            name="category"
            required
            defaultValue=""
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
          >
            <option value="" disabled>
              Wybierz kategorię
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Podkategoria (opcjonalnie)
        <input
          name="subcategory"
          maxLength={191}
          placeholder="np. Pożar, Koncert, Wypadek drogowy"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Tytuł
        <input
          name="title"
          required
          maxLength={191}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Treść
        <textarea
          name="body"
          required
          rows={8}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Zdjęcia / filmy / rolki
        <input
          name="media"
          type="file"
          accept="image/*,video/*"
          multiple
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      <fieldset className="rounded border border-black/10 p-3 dark:border-white/10">
        <legend className="px-1 text-sm font-medium">WHERE — lokalizacja</legend>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            >
              {locating ? "Ustalanie…" : "Użyj mojej lokalizacji (GPS)"}
            </button>
            {coords && (
              <span className="text-xs text-black/50 dark:text-white/50">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Miasto
              <input name="city" maxLength={191} className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Region
              <input name="region" maxLength={191} className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Kraj
              <input name="country" maxLength={191} className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Kontynent
              <input name="continent" maxLength={191} className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="locationHidden"
              checked={locationHidden}
              onChange={(e) => setLocationHidden(e.target.checked)}
            />
            Ukryj dokładną lokalizację (nie pokazuj na mapie ani w publikacji)
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          WHEN — data i godzina wydarzenia
          <input
            type="datetime-local"
            name="eventAt"
            defaultValue={nowForInput()}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Źródło informacji
          <select
            name="sourceType"
            defaultValue="WITNESSED"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Hashtagi
        <input
          name="hashtags"
          placeholder="#pożar #warszawa"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">
          Dodano! Treść czeka na zatwierdzenie przez redakcję.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Wysyłanie..." : "Wyślij do zatwierdzenia"}
      </button>
    </form>
  );
}
