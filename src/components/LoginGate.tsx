/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { login } from "../api";

interface LoginGateProps {
  onSuccess: () => void;
}

export default function LoginGate({ onSuccess }: LoginGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(password);
      setPassword("");
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Invalid password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-6">
      <form
        id="master-password-form"
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6"
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-zinc-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Protected workspace
            </span>
          </div>
          <h1 className="text-xl font-display font-semibold tracking-tight text-zinc-900">
            Lead Processor
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Enter the master password to continue.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="master-password-input"
            className="text-xs font-mono uppercase tracking-wider text-zinc-400"
          >
            Master password
          </label>
          <input
            id="master-password-input"
            type="password"
            autoComplete="current-password"
            autoFocus
            className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2.5 px-4 text-sm font-sans text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
          {error && (
            <p className="text-xs text-red-500 font-sans">{error}</p>
          )}
        </div>

        <button
          id="btn-unlock"
          type="submit"
          disabled={submitting || !password}
          className="w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-[#fafaf9] text-xs font-sans py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
        >
          {submitting ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
