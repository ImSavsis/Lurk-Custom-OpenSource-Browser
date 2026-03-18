import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import styles from "./SettingsPanel.module.css";
import vpnStyles from "./VpnSection.module.css";

interface ServerInfo {
  url: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  flag: string;
}

function pingColor(ms: number): string {
  if (ms < 0) return "var(--color-danger)";
  if (ms < 100) return "var(--color-success)";
  if (ms < 300) return "#f59e0b";
  return "var(--color-danger)";
}

export function VpnSection() {
  const { settings, updateSettings } = useSettingsStore();
  const [running, setRunning] = useState(false);
  const [serverName, setServerName] = useState<string | undefined>();
  const [progress, setProgress] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState(0);
  const [locations, setLocations] = useState<ServerInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [pings, setPings] = useState<Record<string, number>>({});
  const [pingLoading, setPingLoading] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSub, setHasSub] = useState<boolean | null>(null);

  const token = (settings as unknown as Record<string, string>).authToken ?? "";

  useEffect(() => {
    window.lurk.vpn.status().then((s) => {
      setRunning(s.running);
      setServerName(s.server);
    });
    const unsub = window.lurk.vpn.onStatusChanged((s) => {
      setRunning(s.running);
      setServerName(s.server);
      if (s.progress) {
        setProgress(s.progress);
        const match = s.progress.match(/(\d+)%/);
        setDownloadPct(match ? parseInt(match[1], 10) : 0);
      } else {
        setProgress(null);
        setDownloadPct(0);
      }
    });

    server.subscription.status(token || undefined).then((res) => {
      setHasSub(res.active);
      if (res.active && settings.vpnSubscriptionUrl) {
        fetchLocations();
      }
    }).catch(() => setHasSub(false));

    return unsub;
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    const result = await window.lurk.vpn.fetchConfig(settings.vpnSubscriptionUrl);
    setLoading(false);
    if (result.ok) {
      setLocations(result.servers);
      if (result.servers.length > 0 && !selected) setSelected(result.servers[0].url);
    } else {
      setError(result.error ?? "Failed to fetch");
    }
  };

  const handlePing = async (loc: ServerInfo) => {
    setPingLoading((prev) => new Set(prev).add(loc.url));
    const ms = await window.lurk.vpn.ping(loc.host, loc.port);
    setPings((prev) => ({ ...prev, [loc.url]: ms }));
    setPingLoading((prev) => { const s = new Set(prev); s.delete(loc.url); return s; });
  };

  const handlePingAll = () => {
    locations.forEach(handlePing);
  };

  const handleConnect = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const result = await window.lurk.vpn.start(selected);
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Failed to start VPN");
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await window.lurk.vpn.stop();
    setLoading(false);
  };

  return (
    <div>
      <div className={vpnStyles.status}>
        <div className={`${vpnStyles.dot} ${running ? vpnStyles.dotOn : ""}`} />
        <span className={vpnStyles.statusText}>
          {running ? `Connected${serverName ? ` — ${serverName}` : ""}` : "Disconnected"}
        </span>
      </div>

      {hasSub === false && (
        <div className={vpnStyles.lockCard}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div className={vpnStyles.lockTitle}>VPN доступен по подписке</div>
          <div className={vpnStyles.lockDesc}>Оформи любой план чтобы разблокировать VPN доступ ко всем серверам.</div>
        </div>
      )}

      {hasSub === true && (
        <>
          {locations.length > 0 && (
            <div className={styles.group}>
              <div className={vpnStyles.locHeader}>
                <h3 className={styles.label} style={{ margin: 0 }}>{locations.length} locations</h3>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={handlePingAll}
                >
                  Ping all
                </button>
              </div>
              <div className={vpnStyles.locList}>
                {locations.map((loc) => (
                  <button
                    key={loc.url}
                    className={`${vpnStyles.locCard} ${selected === loc.url ? vpnStyles.locCardSelected : ""}`}
                    onClick={() => setSelected(loc.url)}
                  >
                    <span className={vpnStyles.locFlag}>{loc.flag}</span>
                    <span className={vpnStyles.locName}>{loc.name}</span>
                    <span className={vpnStyles.locProto}>{loc.protocol.toUpperCase()}</span>
                    <span
                      className={vpnStyles.locPing}
                      style={pings[loc.url] !== undefined ? { color: pingColor(pings[loc.url]) } : {}}
                      onClick={(e) => { e.stopPropagation(); handlePing(loc); }}
                    >
                      {pingLoading.has(loc.url)
                        ? "..."
                        : pings[loc.url] !== undefined
                          ? pings[loc.url] < 0 ? "timeout" : `${pings[loc.url]}ms`
                          : "ping"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className={vpnStyles.error}>{error}</p>}

          <div className={vpnStyles.actions}>
            {running ? (
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDisconnect} disabled={loading}>
                Disconnect
              </button>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleConnect}
                disabled={loading || !selected}
              >
                {loading ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>

          {progress && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>{progress}</div>
              <div style={{ height: 4, background: "var(--color-border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--color-accent)", width: `${downloadPct}%`, borderRadius: 4, transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}
        </>
      )}

      <div className={styles.group} style={{ marginTop: 24 }}>
        <h3 className={styles.label}>Options</h3>
        <div className={styles.row}>
          <div className={styles.rowLabel}>Auto-connect on startup</div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.vpnAutoConnect}
              onChange={(e) => {
                window.lurk.settings.set({ vpnAutoConnect: e.target.checked });
                updateSettings({ vpnAutoConnect: e.target.checked });
              }}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>
        <p className={vpnStyles.note}>xray.exe: %LOCALAPPDATA%\xray\xray.exe</p>
      </div>
    </div>
  );
}
