import { useState } from "react";
import { useNavigate } from "react-router";
import { useApp, UserRole } from "../context/AppContext";
import { AlertCircle, Eye, EyeOff, LogIn, ChevronDown, Gem } from "lucide-react";


export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // const [role, setRole] = useState<UserRole>("Admin");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    // const success = login(username, password, role);
    const success = await login(username, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Use password: '123'");
    }
    setIsLoading(false);
  };

  return (
    <div className="lp-root">


      {/* decorative blobs */}
      <div className="lp-blob lp-blob-tl" />
      <div className="lp-blob lp-blob-br" />

      <div className="lp-card">
        {/* ── Logo ── */}
        <div className="lp-logo-wrap">
          <div className="lp-logo-icon"><Gem size={34} strokeWidth={1.5} color="#fff" /></div>
          <h1 className="lp-brand">AT PLUS ERP</h1>
          <p className="lp-brand-sub">Handmade Jewellery Unit</p>
        </div>

        <div className="lp-divider" />

        {/* ── Error ── */}
        {error && (
          <div className="lp-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="lp-form" autoComplete="off">
          {/* Username */}
          <div className="lp-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="lp-field">
            <label htmlFor="password">Password</label>
            <div className="lp-pw-wrap">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lp-pw-toggle"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="lp-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="lp-spinner" />
            ) : (
              <>
                <LogIn size={17} />
                Sign In
              </>
            )}
          </button>
        </form>
        {/* ── Demo hint ── */}
        {/*   */}
      </div >

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* ── Root ──────────────────────────────── */
        .lp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%);
          padding: 1.5rem;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* ── Decorative blobs ───────────────────── */
        .lp-blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
          opacity: 0.55;
        }
        .lp-blob-tl {
          width: 400px; height: 400px;
          background: #fcd34d;
          top: -140px; left: -100px;
        }
        .lp-blob-br {
          width: 350px; height: 350px;
          background: #f59e0b;
          bottom: -100px; right: -80px;
        }

        /* ── Card ───────────────────────────────── */
        .lp-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 430px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 24px;
          padding: 2.6rem 2.4rem;
          box-shadow:
            0 4px 6px rgba(0,0,0,0.04),
            0 20px 60px rgba(0,0,0,0.1),
            0 0 0 1px rgba(255,255,255,0.8);
        }

        /* ── Logo ───────────────────────────────── */
        .lp-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.6rem;
        }
        .lp-logo-icon {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px rgba(245,158,11,0.4);
        }
        .lp-brand {
          font-size: 1.45rem;
          font-weight: 800;
          color: #1c1917;
          letter-spacing: 0.04em;
          margin: 0;
        }
        .lp-brand-sub {
          font-size: 0.82rem;
          color: #78716c;
          margin-top: 0.25rem;
        }

        /* ── Divider ────────────────────────────── */
        .lp-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e5e7eb, transparent);
          margin-bottom: 1.6rem;
        }

        /* ── Error ──────────────────────────────── */
        .lp-error {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 0.82rem;
          border-radius: 10px;
          padding: 10px 13px;
          margin-bottom: 1.2rem;
          font-weight: 500;
        }

        /* ── Form ───────────────────────────────── */
        .lp-form { display: flex; flex-direction: column; gap: 1rem; }

        .lp-field { display: flex; flex-direction: column; gap: 6px; }
        .lp-field label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #57534e;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .lp-field input,
        .lp-select-wrap select {
          width: 100%;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 11px 14px;
          color: #1c1917;
          font-size: 0.92rem;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .lp-field input::placeholder { color: #a8a29e; }
        .lp-field input:focus,
        .lp-select-wrap select:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.18);
        }

        /* Password */
        .lp-pw-wrap { position: relative; }
        .lp-pw-wrap input { padding-right: 42px; }
        .lp-pw-toggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #a8a29e; padding: 3px;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .lp-pw-toggle:hover { color: #f59e0b; }

        /* Select */
        .lp-select-wrap { position: relative; }
        .lp-select-wrap select { appearance: none; cursor: pointer; padding-right: 34px; }
        .lp-select-icon {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          color: #a8a29e; pointer-events: none;
        }

        /* ── Submit button ──────────────────────── */
        .lp-btn {
          margin-top: 0.4rem;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          box-shadow: 0 4px 18px rgba(245,158,11,0.4);
          letter-spacing: 0.02em;
        }
        .lp-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(245,158,11,0.5);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        /* Spinner */
        .lp-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.7s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* ── Warning ────────────────────────────── */
        .lp-warning {
          margin-top: 1.4rem;
          padding: 10px 14px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          font-size: 0.78rem;
          color: #92400e;
          font-weight: 500;
        }

        /* ── Demo hint ──────────────────────────── */
        .lp-hint {
          margin-top: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 0.78rem;
          color: #78716c;
        }
        .lp-hint-badge {
          background: #fef3c7;
          color: #b45309;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid #fde68a;
        }
        .lp-hint code {
          background: #fef3c7;
          border: 1px solid #fde68a;
          color: #b45309;
          border-radius: 5px;
          padding: 1px 7px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* ── Responsive ─────────────────────────── */
        @media (max-width: 480px) {
          .lp-card { padding: 2rem 1.6rem; }
          .lp-logo-icon { width: 58px; height: 58px; font-size: 1.8rem; }
          .lp-brand { font-size: 1.25rem; }
        }
      `}</style>
    </div >
  );
};