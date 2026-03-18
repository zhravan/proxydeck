import { useState, useEffect } from "react";

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: string;
  inviterName: string;
  createdAt: string;
}

export function Team() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    // Get current user role from session
    const raw = sessionStorage.getItem("pd_session");
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setUser(d?.user ?? d?.data ?? d ?? null);
      } catch {}
    }

    fetch("/api/invites")
      .then((r) => r.json())
      .then((d) => setInvites(Array.isArray(d) ? d : []))
      .catch((e) => setError("Failed to load invites"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (res.ok) {
        const newInvite = await res.json();
        setInvites([newInvite, ...invites]);
        setEmail("");
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create invite");
      }
    } catch {
      setError("Failed to create invite");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteInvite(id: string) {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvites(invites.filter((i) => i.id !== id));
      }
    } catch {
      setError("Failed to delete invite");
    }
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="vstack gap-6">
      <header className="hstack justify-between">
        <div>
          <h1>Team & Invites</h1>
          <p className="text-light">Manage who can access this dashboard.</p>
        </div>
      </header>

      {isAdmin && (
        <article className="card p-4">
          <header className="mb-4">
            <h2>Invite Team Member</h2>
          </header>
          <form onSubmit={handleCreateInvite} className="hstack gap-4 items-end">
            <div data-field style={{ flex: 1 }}>
              <label htmlFor="invite-email">Email Address</label>
              <input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div data-field>
              <label htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ height: "2.5rem" }}
              >
                <option value="member">Member (Read/Write)</option>
                <option value="admin">Admin (Manage Team)</option>
              </select>
            </div>
            <button type="submit" disabled={creating} style={{ height: "2.5rem" }}>
              {creating ? "Inviting..." : "Send Invite"}
            </button>
          </form>
          {error && <p className="text-danger mt-2">{error}</p>}
        </article>
      )}

      <article className="card overflow-hidden">
        <header className="p-4 border-bottom">
          <h2>Active & Pending Invitations</h2>
        </header>
        {loading ? (
          <div className="p-4">Loading invites...</div>
        ) : invites.length === 0 ? (
          <div className="p-4 text-center grayscale opacity-50">
            <p>No invitations yet.</p>
          </div>
        ) : (
          <table className="w-100">
            <thead>
              <tr>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Invited By</th>
                {isAdmin && <th className="text-right p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-top">
                  <td className="p-4 font-mono">{invite.email}</td>
                  <td className="p-4">
                    <span className="badge">{invite.role}</span>
                  </td>
                  <td className="p-4">
                    <span
                      data-status={invite.status === "pending" ? "warning" : "success"}
                      className="indicator"
                    >
                      {invite.status}
                    </span>
                  </td>
                  <td className="p-4 text-light text-small">{invite.inviterName || "Unknown"}</td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      {invite.status === "pending" && (
                        <button
                          className="outline small danger"
                          onClick={() => handleDeleteInvite(invite.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <article className="card p-4 bg-muted">
        <h3>How Invitations Work</h3>
        <p className="text-small text-light">
          When you invite someone, they must sign up using the exact email address you provided. 
          The sign-up page will recognize their valid invitation and allow them to create an account.
        </p>
      </article>
    </div>
  );
}
