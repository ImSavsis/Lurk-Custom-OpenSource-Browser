import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settings.store";
import styles from "./SettingsPanel.module.css";
import aiStyles from "./AISection.module.css";

interface UsageInfo {
  limit: number;
  used: number;
  unlimited: boolean;
  remaining: number;
}

export function AISection() {
  const { settings } = useSettingsStore();
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    if (!settings.authToken) return;
    window.lurk.ai.getUsage().then((res) => {
      if (res.ok) setUsage(res as unknown as UsageInfo);
    }).catch(() => {});
  }, [settings.authToken]);

  return (
    <div>
      <div className={styles.group}>
        <h3 className={styles.label}>AI Provider</h3>
        <div className={aiStyles.statusRow}>
          <div className={`${aiStyles.dot} ${aiStyles.dotOn}`} />
          <div>
            <div className={aiStyles.radioLabel}>Savsis Cloud · LurkAI</div>
            <div className={styles.rowDesc}>Запросы обрабатываются на серверах Savsis. Ключ не нужен.</div>
          </div>
        </div>
      </div>

      {settings.authToken && (
        <div className={styles.group}>
          <h3 className={styles.label}>Использование сегодня</h3>
          {usage === null ? (
            <p className={aiStyles.hint}>Загрузка...</p>
          ) : usage.unlimited ? (
            <div className={aiStyles.statusRow}>
              <div className={`${aiStyles.dot} ${aiStyles.dotOn}`} />
              <span className={aiStyles.statusText}>Безлимит (подписка активна)</span>
            </div>
          ) : (
            <div>
              <div className={aiStyles.usageRow}>
                <span className={aiStyles.usageNum}>{usage.used}</span>
                <span className={aiStyles.usageSep}>/</span>
                <span className={aiStyles.usageMax}>{usage.limit}</span>
                <span className={aiStyles.usageLabel}>запросов сегодня</span>
              </div>
              <div className={aiStyles.usageTrack}>
                <div
                  className={aiStyles.usageFill}
                  style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                />
              </div>
              {usage.remaining === 0 && (
                <p className={aiStyles.hint} style={{ color: "var(--color-danger)", marginTop: 8 }}>
                  Лимит исчерпан. Оформи подписку для безлимитного доступа.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!settings.authToken && (
        <p className={aiStyles.hint}>Войдите в аккаунт для использования LurkAI.</p>
      )}
    </div>
  );
}
