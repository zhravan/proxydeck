import { useEffect, useState } from "react";
import { getLogs } from "../../services/logs";

export function useLogs() {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLogs()
      .then((r) => r.json())
      .then((data) => setLines(Array.isArray(data.lines) ? data.lines : []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, []);

  return { lines, loading };
}
