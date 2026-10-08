import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../lib/api";

export function InviteAcceptScreen({ token }: { token: string }): JSX.Element {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Joining collaborative playlist…");

  useEffect(() => {
    let active = true;
    void request<{ data: { playlistId: string; name: string } }>(
      `/playlist-invites/${encodeURIComponent(token)}/accept`,
      { method: "POST" },
    )
      .then(({ data }) => {
        if (!active) return;
        setMessage(`You joined ${data.name}.`);
        window.setTimeout(() => navigate(`/playlist/${data.playlistId}`), 700);
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "This invite could not be accepted.",
          );
      });
    return () => {
      active = false;
    };
  }, [navigate, token]);

  return (
    <section className="library-message invite-status" role="status">
      {message}
    </section>
  );
}
