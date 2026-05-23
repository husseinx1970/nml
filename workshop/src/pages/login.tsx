import { useState, type FormEvent } from "react";
import { Loader2, Lock, AlertCircle } from "lucide-react";

interface Props {
  onLoggedIn: () => void;
}

export default function LoginPage({ onLoggedIn }: Props) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setErr("Felaktig kod. Försök igen.");
        return;
      }
      onLoggedIn();
    } catch {
      setErr("Något gick fel. Försök igen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1f242b 0%, #2c333d 60%, #1a1e24 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#ffffff",
          borderRadius: 14,
          padding: "36px 32px 32px",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 14px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #f5a623, #e58e0a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(245,166,35,0.35)",
            }}
          >
            <Lock size={26} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1f242b",
              margin: 0,
              letterSpacing: 0.3,
            }}
          >
            Utby Snabb Bilservice
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12.5,
              color: "#6b7280",
            }}
          >
            Verkstadssystem — privat åtkomst
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <label
            htmlFor="code"
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: "#374151",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Åtkomstkod
          </label>
          <input
            id="code"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="Ange kod"
            disabled={busy}
            style={{
              width: "100%",
              padding: "11px 14px",
              fontSize: 14,
              fontFamily: "inherit",
              border: "1.5px solid #d1d5db",
              borderRadius: 8,
              outline: "none",
              background: "#f9fafb",
              transition: "border 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.border = "1.5px solid #f5a623")}
            onBlur={(e) => (e.currentTarget.style.border = "1.5px solid #d1d5db")}
          />

          {err && (
            <div
              style={{
                marginTop: 12,
                padding: "9px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 7,
                color: "#b91c1c",
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <AlertCircle size={14} />
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || code.length === 0}
            style={{
              marginTop: 18,
              width: "100%",
              padding: "11px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background:
                busy || code.length === 0
                  ? "#d1a85c"
                  : "linear-gradient(135deg, #f5a623, #e58e0a)",
              border: "none",
              borderRadius: 8,
              cursor: busy || code.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 6px 16px rgba(245,166,35,0.30)",
              transition: "transform 0.08s",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? "Loggar in…" : "Logga in"}
          </button>
        </form>

        <p
          style={{
            marginTop: 22,
            textAlign: "center",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          © {new Date().getFullYear()} Utby Snabb Bilservice
        </p>
      </div>
    </div>
  );
}
