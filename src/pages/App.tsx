import { type ReactNode } from "react";
import { Layout } from "../components/Layout";
import { Dashboard } from "./Dashboard";
import { Sites } from "./Sites";

interface AppProps {
  path?: string;
  children?: ReactNode;
}

function getPath(): string {
  if (typeof window !== "undefined") return window.location.pathname;
  return "/";
}

function Page({ path }: { path: string }) {
  if (path === "/") return <Dashboard />;
  if (path === "/sites") return <Sites />;
  if (path === "/config") return <h2>Config</h2>;
  if (path === "/certificates") return <h2>Certificates</h2>;
  if (path === "/logs") return <h2>Logs</h2>;
  return <h1>Proxydeck</h1>;
}

export function App({ path: pathProp, children }: AppProps) {
  const path = pathProp ?? getPath();
  return (
    <Layout>
      {children ?? <Page path={path} />}
    </Layout>
  );
}
