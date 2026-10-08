import { useState, type FormEvent, type JSX } from "react";
import { Music2, Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";
import { request } from "../lib/api";
import { sessionUserSchema, type SessionUser } from "@sonara/contracts";
import { useSession } from "../stores/session";

type AuthMode = "login" | "signup" | "forgot" | "reset";
interface AuthResponse {
  data: { accessToken: string; user: unknown };
}

export function AuthScreen({
  initialMode = "login",
  resetToken = "",
}: {
  initialMode?: AuthMode;
  resetToken?: string;
}): JSX.Element {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const setSession = useSession((state) => state.setSession);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        const result = await request<{ data: { message: string } }>(
          "/auth/password/forgot",
          {
            method: "POST",
            body: JSON.stringify({ email }),
          },
        );
        setNotice(result.data.message);
      } else if (mode === "reset") {
        await request<void>("/auth/password/reset", {
          method: "POST",
          body: JSON.stringify({ token: resetToken, password }),
        });
        setMode("login");
        setNotice(
          "Your password has been reset. Log in with your new password.",
        );
        setNotice(
          "Your password has been reset. Log in with your new password.",
        );
      } else {
        const path = mode === "signup" ? "/auth/signup" : "/auth/login";
        const body =
          mode === "signup"
            ? { email, password, displayName }
            : { email, password };
        const result = await request<AuthResponse>(path, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const user = sessionUserSchema.parse(result.data.user) as SessionUser;
        setSession(result.data.accessToken, user);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to continue. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const heading =
    mode === "signup"
      ? "Join the listening"
      : mode === "forgot" || mode === "reset"
        ? "Reset your password"
        : "Welcome back";
  const submitLabel =
    mode === "signup"
      ? "Create account"
      : mode === "forgot"
        ? "Send reset link"
        : mode === "reset"
          ? "Save new password"
          : "Log in";

  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/" aria-label="SONARA home">
        <span className="brand-mark">
          <Music2 size={21} strokeWidth={2.8} />
        </span>
        <span>SONARA</span>
      </a>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">YOUR SOUND, YOUR SPACE</p>
        <h1 id="auth-title">{heading}</h1>
        <p className="auth-subtitle">
          {mode === "signup"
            ? "Create an account and make room for more music."
            : mode === "forgot"
              ? "Enter your email and we’ll send reset instructions."
              : mode === "reset"
                ? "Choose a new password to get back to your music."
                : "Pick up right where the music left you."}
        </p>
        <form onSubmit={(event) => void submit(event)}>
          {mode === "signup" && (
            <label className="field">
              <span>Display name</span>
              <input
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                minLength={2}
                maxLength={40}
                required
              />
            </label>
          )}
          <label className="field">
            <span>Email address</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {mode !== "forgot" && (
            <label className="field">
              <span>{mode === "reset" ? "New password" : "Password"}</span>
              <span className="password-wrap">
                <input
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  type={showPassword ? "text" : "password"}
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="icon-button reveal-password"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          )}
          {mode === "login" && (
            <button
              className="text-button forgot-link"
              type="button"
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
            >
              Forgot password?
            </button>
          )}
          {error && (
            <p className="form-message error-message" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-message success-message" role="status">
              {notice}
            </p>
          )}
          <button
            className="pill-button primary auth-submit"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <>
                {submitLabel}
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <div className="auth-divider">
          <span>OR</span>
        </div>
        {mode !== "forgot" && mode !== "reset" && (
          <p className="auth-switch">
            {mode === "signup"
              ? "Already listening with us?"
              : "New to SONARA?"}{" "}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
                setNotice("");
              }}
            >
              {mode === "signup" ? "Log in" : "Create an account"}
            </button>
          </p>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button
            className="text-button back-link"
            type="button"
            onClick={() => setMode("login")}
          >
            Back to log in
          </button>
        )}
        <p className="legal-copy">
          By continuing, you agree to SONARA’s Terms of Service and Privacy
          Policy.
        </p>
      </section>
      <footer className="auth-footer">
        A little more room for what moves you.
      </footer>
    </main>
  );
}
