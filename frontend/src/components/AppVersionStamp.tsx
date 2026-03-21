import { clientAppVersion } from "../lib/appVersion";

type Props = {
  /** Extra class names (e.g. layout-specific spacing). */
  className?: string;
};

/** Muted “v0.0.0” line; use in sidebar, auth shells, etc. */
export function AppVersionStamp({ className }: Props) {
  return (
    <p
      className={className ?? "text-light pd-app-version"}
      aria-label={`Application version ${clientAppVersion}`}
    >
      v{clientAppVersion}
    </p>
  );
}
