import { type ReactNode } from "react";
import { Layout } from "../components/Layout";
import { Dashboard } from "./Dashboard";
import { Sites } from "./Sites";
import { Certificates } from "./Certificates";
import { Config } from "./Config";
import { Logs } from "./Logs";

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
  if (path === "/config") return <Config />;
  if (path === "/certificates") return <Certificates />;
  if (path === "/logs") return <Logs />;
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
