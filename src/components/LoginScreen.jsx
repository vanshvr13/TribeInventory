import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseClient";
import { useSettings } from "../lib/i18n.jsx";
import { Field, inputCls, btnPrimary } from "./ui.jsx";

export default function LoginScreen() {
  const { t } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-stone-200 w-full max-w-sm p-6 space-y-4"
      >
        <h1 className="text-lg font-semibold text-stone-900">{t("login.title")}</h1>
        <Field label={t("login.email")}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("login.password")}>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={loading} className={`w-full ${btnPrimary}`}>
          {loading ? t("login.loading") : t("login.title")}
        </button>
      </form>
    </div>
  );
}
