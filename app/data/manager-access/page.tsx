"use client";
import { useEffect, useState } from "react";
import { portalRequest } from "@/app/manager/Portal";
type Account = {
  visiblePassword?: string;
  id: string;
  name: string;
  managerKey: string;
  username: string;
  enabled: boolean;
  passwordSet: boolean;
  passwordChangedAt: string | null;
  version: number;
};
function AccountRow({
  account,
  onSave,
  onDelete,
}: {
  account: Account;
  onSave: (a: Account) => void;
  onDelete: (a: Account) => void;
}) {
  const [username, setUsername] = useState(account.username),
    [password, setPassword] = useState(account.visiblePassword || ""),
    [passwordEdited, setPasswordEdited] = useState(false),
    [enabled, setEnabled] = useState(account.enabled),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const copyMessage = async () => {
    const text = `Hey ${account.name.replace(/^Team\s+/i, "")} 👋

We’ve introduced the new First Class Manager Portal — a simple space designed to give you a clearer insight and more control over your day-to-day management.

You’ll be able to view your team overview, track creator progress, see helpful reminders, access the leaderboards, and use the resource library for graphics and useful information for creators.

Log in here:
https://firstclassagency.management/login/manager

Username: ${username}
Password: ${password || "[SET PASSWORD]"}

Please don’t share your login details with anyone.`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Manager message copied.");
    } catch {
      setMessage("Could not copy automatically. Please try again.");
    }
  };
  return (
    <form
      className="manager-card manager-account-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const d = await portalRequest("accounts", {
            id: account.id,
            version: account.version,
            username,
            ...(passwordEdited && password ? { password } : {}),
            enabled,
          });
          onSave({
            ...d.account,
            visiblePassword: passwordEdited
              ? password
              : account.visiblePassword,
          });
          setPasswordEdited(false);
          setMessage(
            passwordEdited && password
              ? "Password saved successfully. Previous sessions are signed out."
              : "Account saved successfully.",
          );
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>{account.name}</h2>
        <p className="manager-muted" style={{ overflowWrap: "anywhere" }}>
          {account.managerKey}
        </p>
        {!account.passwordSet && (
          <p className="manager-muted">Set a password before first login.</p>
        )}
        {account.passwordChangedAt && (
          <p className="manager-muted">
            Changed{" "}
            {new Date(account.passwordChangedAt).toLocaleDateString("en-GB")}
          </p>
        )}
        <label className="manager-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          Account enabled
        </label>
      </div>
      <label className="manager-label">
        Username
        <input
          className="manager-input"
          value={username}
          onChange={(e) => setUsername(e.target.value.toUpperCase())}
          maxLength={64}
          required
        />
      </label>
      <label className="manager-label">
        Current password
        <input
          className="manager-input"
          type="text"
          autoComplete="new-password"
          placeholder="Set a password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordEdited(true);
            setMessage("");
          }}
          minLength={4}
          maxLength={128}
        />
      </label>
      <button className="manager-button" disabled={busy}>
        {busy ? "Saving…" : "Save account"}
      </button>
      <button
        type="button"
        className="manager-button"
        onClick={() => void copyMessage()}
      >
        Copy message
      </button>
      {!account.enabled && (
        <button
          type="button"
          className="manager-button"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(`Delete ${account.name}? This cannot be undone.`)
            )
              return;
            setBusy(true);
            setMessage("");
            try {
              await portalRequest("accounts", {
                action: "delete",
                id: account.id,
                version: account.version,
              });
              onDelete(account);
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete manager
        </button>
      )}
      {message && (
        <p
          role="status"
          className="manager-muted"
          style={{ gridColumn: "1 / -1" }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
export default function Page() {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [search, setSearch] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setAccounts((await portalRequest("accounts")).accounts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const matching = [...accounts]
    .sort((a, b) =>
      a.name
        .replace(/^team\s+/i, "")
        .localeCompare(b.name.replace(/^team\s+/i, ""), "en-GB", {
          sensitivity: "base",
          numeric: true,
        }),
    )
    .filter((a) =>
      (a.name + " " + a.username).toLowerCase().includes(search.toLowerCase()),
    );
  const update = (saved: Account) =>
    setAccounts((all) => all.map((x) => (x.id === saved.id ? saved : x)));
  const remove = (account: Account) =>
    setAccounts((all) => all.filter((x) => x.id !== account.id));
  return (
    <main className="manager-shell">
      <div className="manager-wrap">
        <a href="/data/menu" style={{ color: "#f6d557" }}>
          ← Data Space
        </a>
        <div className="manager-hero">
          <p className="manager-eyebrow">Leadership / Account controls</p>
          <h1 className="manager-title">Manager access</h1>
          <p className="manager-muted">
            Accounts follow Manager Assignments. Share each manager’s username
            and password, then direct them to the Manager Portal. Passwords
            remain visible here for Leadership and only change when you save a
            new one.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            className="manager-input"
            style={{ flex: 1 }}
            placeholder="Find a manager…"
            aria-label="Find a manager"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="manager-button" disabled={busy} onClick={load}>
            {busy ? "Loading…" : "Refresh managers"}
          </button>
          <a className="manager-button" href="/login/manager">
            Manager portal ↗
          </a>
          <button
            className="manager-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setAccounts(
                  (
                    await portalRequest("accounts", {
                      action: "reactivate-mike-indi",
                    })
                  ).accounts,
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Restore Mike / Indi managers
          </button>
          <button
            className="manager-button"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Apply the fixed usernames and password codes for the manager login plan? This will replace the listed managers’ current passwords.",
                )
              )
                return;
              setBusy(true);
              setError("");
              try {
                setAccounts(
                  (
                    await portalRequest("accounts", {
                      action: "apply-credential-plan",
                    })
                  ).accounts,
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Apply manager login plan
          </button>
        </div>
        {error && (
          <div className="manager-error">
            {error}
            <p>
              <a href="/login/leadership">Sign in through Leadership →</a>
            </p>
          </div>
        )}
        {matching
          .filter((a) => a.enabled)
          .map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              onSave={update}
              onDelete={remove}
            />
          ))}
        {matching.some((a) => !a.enabled) && (
          <section style={{ marginTop: 28 }}>
            <p className="manager-eyebrow">Account controls</p>
            <h2 className="manager-title" style={{ fontSize: 28 }}>
              Disabled managers
            </h2>
            <p className="manager-muted">
              Disabled managers cannot log in or appear in login activity.
              Re-enable them by ticking Account enabled and saving, or delete
              them permanently.
            </p>
            {matching
              .filter((a) => !a.enabled)
              .map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  onSave={update}
                  onDelete={remove}
                />
              ))}
          </section>
        )}
      </div>
    </main>
  );
}
