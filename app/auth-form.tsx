"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

type Field = { name: string; label: string; type?: string; autoComplete?: string; minLength?: number };

export function AuthForm({
  action, fields, submit, hidden,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} minLength={f.minLength} required />
        </div>
      ))}
      {state.error && <p className="alert err" role="alert">{state.error}</p>}
      {state.message && <p className="alert ok" role="status">{state.message}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
        {pending ? "Aguarde…" : submit}
      </button>
    </form>
  );
}
