import { useState } from "react";
import { YoomLogo } from "./Logo";
import { API_BASE_URL } from "../config";

interface PasswordGateProps {
  onAuthenticated: (password: string) => void;
}

export function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`${API_BASE_URL}/screen-record/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      onAuthenticated(password);
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--surface)" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 rounded-2xl border p-8" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", backdropFilter: "blur(8px)" }}>
        <div className="space-y-2 flex flex-col items-center">
          <YoomLogo size="lg" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Enter password to start recording
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-1 transition-all"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
          autoFocus
        />
        {error && (
          <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          {loading ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  );
}