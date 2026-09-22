"use client";

import { useActionState, useState } from "react";
import { updateProfileAction } from "./actions";
import { GENDERS, GENDER_LABELS } from "@/lib/constants";
import Avatar from "@/components/Avatar";

export default function ProfileForm({
  name,
  avatarUrl,
  city,
  gender,
  age,
}: {
  name: string;
  avatarUrl: string | null;
  city: string | null;
  gender: string | null;
  age: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={name} avatarUrl={preview ?? avatarUrl} size="lg" />
        <label className="flex flex-col gap-1 text-sm">
          Zdjęcie profilowe
          <input
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Miejscowość
          <input
            name="city"
            defaultValue={city ?? ""}
            maxLength={191}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Płeć
          <select
            name="gender"
            defaultValue={gender ?? ""}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
          >
            <option value="">nie podano</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Wiek
          <input
            name="age"
            type="number"
            min={13}
            max={120}
            defaultValue={age ?? ""}
            className="w-24 rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Zapisywanie..." : "Zapisz profil"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Zapisano.</p>}
    </form>
  );
}
