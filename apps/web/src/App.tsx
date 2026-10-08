import { useEffect, useState, type JSX } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { refreshSession } from "./lib/api";
import { useSession } from "./stores/session";

export function App(): JSX.Element {
  const user = useSession((state) => state.user);
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/preview");
  const [searchParams] = useSearchParams();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void refreshSession().finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession)
    return (
      <main className="boot-screen" aria-label="Loading SONARA">
        <div className="boot-mark">S</div>
        <div className="boot-shimmer" />
      </main>
    );
  if (
    !user &&
    !isPreview &&
    !location.pathname.startsWith("/login") &&
    !location.pathname.startsWith("/signup") &&
    !location.pathname.startsWith("/reset-password")
  )
    return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <AuthScreen />}
      />
      <Route
        path="/signup"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <AuthScreen initialMode="signup" />
          )
        }
      />
      <Route
        path="/reset-password"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <AuthScreen
              initialMode="reset"
              resetToken={searchParams.get("token") ?? ""}
            />
          )
        }
      />
      <Route
        path="/preview/*"
        element={<AppShell preview />}
      />
      <Route
        path="/*"
        element={user ? <AppShell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
