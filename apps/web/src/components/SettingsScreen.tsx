import { useEffect, useState, type FormEvent, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  CircleUserRound,
  Headphones,
  LockKeyhole,
  Save,
  Settings2,
} from "lucide-react";
import type { UpdateMeInput } from "@sonara/contracts";
import { request } from "../lib/api";
import { useSession } from "../stores/session";

interface ProfileData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  settings: {
    quality: "low" | "normal" | "high";
    autoplay: boolean;
    crossfadeSeconds: number;
    normalizeVolume: boolean;
    explicitFilter: boolean;
    privateSession: boolean;
    shareListeningActivity: boolean;
  };
}
interface ProfileResponse {
  data: ProfileData;
}

export function SettingsScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const setSession = useSession((state) => state.setSession);
  const accessToken = useSession((state) => state.accessToken);
  const cachedUser = useSession((state) => state.user);
  const [displayName, setDisplayName] = useState(cachedUser?.displayName ?? "");
  const [locale, setLocale] = useState("en");
  const [quality, setQuality] =
    useState<ProfileData["settings"]["quality"]>("normal");
  const [autoplay, setAutoplay] = useState(true);
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(0);
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const [explicitFilter, setExplicitFilter] = useState(false);
  const [privateSession, setPrivateSession] = useState(false);
  const [shareListeningActivity, setShareListeningActivity] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");

  const profileQuery = useQuery({
    queryKey: ["me", accessToken],
    queryFn: async () => (await request<ProfileResponse>("/me")).data,
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setDisplayName(profile.displayName);
    setLocale(profile.locale);
    setQuality(profile.settings.quality);
    setAutoplay(profile.settings.autoplay);
    setCrossfadeSeconds(profile.settings.crossfadeSeconds);
    setNormalizeVolume(profile.settings.normalizeVolume);
    setExplicitFilter(profile.settings.explicitFilter);
    setPrivateSession(profile.settings.privateSession);
    setShareListeningActivity(profile.settings.shareListeningActivity);
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (input: UpdateMeInput) =>
      request<ProfileResponse>("/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: async (response) => {
      const profile = response.data;
      setSession(accessToken ?? "", {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setSavedMessage("Your changes are saved.");
      window.setTimeout(() => setSavedMessage(""), 2800);
    },
  });

  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSavedMessage("");
    saveMutation.mutate({
      displayName,
      locale,
      settings: {
        quality,
        autoplay,
        crossfadeSeconds,
        normalizeVolume,
        explicitFilter,
        privateSession,
        shareListeningActivity,
      },
    });
  }

  function toggleRow(
    label: string,
    detail: string,
    checked: boolean,
    onChange: (nextValue: boolean) => void,
  ): JSX.Element {
    return (
      <label className="setting-toggle-row">
        <span>
          <strong>{label}</strong>
          <small>{detail}</small>
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="toggle-track" aria-hidden="true">
          <span />
        </span>
      </label>
    );
  }

  if (profileQuery.isLoading)
    return (
      <div className="settings-loading" aria-label="Loading account settings">
        <div />
        <div />
        <div />
      </div>
    );
  if (profileQuery.isError)
    return (
      <section className="settings-error" role="alert">
        <h1>Settings aren’t available</h1>
        <p>{profileQuery.error.message}</p>
        <button
          className="pill-button primary"
          onClick={() => void profileQuery.refetch()}
        >
          Try again
        </button>
      </section>
    );

  return (
    <form className="settings-page" onSubmit={save}>
      <header className="settings-header">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Settings</h1>
          <p>Make SONARA feel like yours.</p>
        </div>
        <button
          className="pill-button primary settings-save"
          disabled={saveMutation.isPending}
        >
          <Save size={16} />
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </header>
      {saveMutation.isError && (
        <p className="settings-alert" role="alert">
          {saveMutation.error.message}
        </p>
      )}
      {savedMessage && (
        <p className="settings-saved" role="status">
          <Check size={16} />
          {savedMessage}
        </p>
      )}
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">
            <CircleUserRound size={19} />
          </span>
          <div>
            <h2>Profile</h2>
            <p>How you show up in SONARA.</p>
          </div>
        </div>
        <div className="profile-preview">
          <div className="profile-avatar">
            {displayName.slice(0, 1).toUpperCase() || "S"}
          </div>
          <div>
            <strong>{displayName || "Your profile"}</strong>
            <span>{profileQuery.data?.email}</span>
          </div>
        </div>
        <label className="settings-field">
          <span>Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={2}
            maxLength={40}
            required
          />
        </label>
        <label className="settings-field">
          <span>Language</span>
          <span className="select-wrap">
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
            <ChevronDown size={16} />
          </span>
        </label>
        <p className="settings-note">
          Avatar uploads will be available when signed media storage is
          connected.
        </p>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">
            <Headphones size={19} />
          </span>
          <div>
            <h2>Playback</h2>
            <p>Choose how your music sounds.</p>
          </div>
        </div>
        <label className="settings-field">
          <span>Audio quality</span>
          <span className="select-wrap">
            <select
              value={quality}
              onChange={(event) =>
                setQuality(
                  event.target.value as ProfileData["settings"]["quality"],
                )
              }
            >
              <option value="low">Low · data saver</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <ChevronDown size={16} />
          </span>
        </label>
        {toggleRow(
          "Autoplay",
          "Keep the music going when your selection ends.",
          autoplay,
          setAutoplay,
        )}
        <label className="range-setting">
          <span>
            <strong>Crossfade</strong>
            <small>Blend the end of one track into the next.</small>
          </span>
          <span className="range-value">{crossfadeSeconds}s</span>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={crossfadeSeconds}
            onChange={(event) =>
              setCrossfadeSeconds(Number(event.target.value))
            }
            aria-label="Crossfade duration"
          />
        </label>
        {toggleRow(
          "Normalize volume",
          "Keep playback at a consistent listening level.",
          normalizeVolume,
          setNormalizeVolume,
        )}
        {toggleRow(
          "Filter explicit content",
          "Hide tracks marked explicit where available.",
          explicitFilter,
          setExplicitFilter,
        )}
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">
            <LockKeyhole size={19} />
          </span>
          <div>
            <h2>Privacy and social</h2>
            <p>Choose what you share with other listeners.</p>
          </div>
        </div>
        {toggleRow(
          "Private session",
          "Keep listening activity out of your friend feed.",
          privateSession,
          setPrivateSession,
        )}
        {toggleRow(
          "Share listening activity",
          "Let people who follow you see what you play.",
          shareListeningActivity,
          setShareListeningActivity,
        )}
      </section>
      <section className="settings-card security-card">
        <div className="settings-card-heading">
          <span className="settings-icon">
            <Settings2 size={19} />
          </span>
          <div>
            <h2>Security</h2>
            <p>
              Account access is protected with rotating refresh sessions and a
              one-time password reset link.
            </p>
          </div>
        </div>
        <span className="security-badge">Password protected</span>
      </section>
    </form>
  );
}
