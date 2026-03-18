import { useSettingsStore } from "../../stores/settings.store";
import { useUIStore } from "../../stores/ui.store";
import type { Theme, PresetTheme, BorderRadius, UIDensity } from "@lurk/shared";
import styles from "./ThemeSection.module.css";

const ACCENT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
];

const PRESET_THEMES: { id: PresetTheme; label: string; bg: string; surface: string; text: string }[] = [
  { id: "dark", label: "Dark", bg: "#0f0f10", surface: "#18181b", text: "#f4f4f5" },
  { id: "light", label: "Light", bg: "#ffffff", surface: "#f4f4f5", text: "#09090b" },
  { id: "amoled", label: "AMOLED", bg: "#000000", surface: "#0a0a0a", text: "#ffffff" },
  { id: "nord", label: "Nord", bg: "#2e3440", surface: "#3b4252", text: "#eceff4" },
  { id: "catppuccin", label: "Catppuccin", bg: "#1e1e2e", surface: "#313244", text: "#cdd6f4" },
  { id: "dracula", label: "Dracula", bg: "#282a36", surface: "#44475a", text: "#f8f8f2" },
  { id: "custom", label: "Custom", bg: "", surface: "", text: "" },
];

export function ThemeSection() {
  const { settings, updateSettings } = useSettingsStore();
  const { toggleEditMode, isEditMode } = useUIStore();

  const apply = (patch: Partial<typeof settings>) => {
    window.lurk.settings.set(patch);
    updateSettings(patch);
  };

  const handlePreset = (preset: PresetTheme) => {
    if (preset === "custom") {
      apply({ presetTheme: "custom" });
      return;
    }
    const found = PRESET_THEMES.find((p) => p.id === preset)!;
    const theme: Theme = preset === "light" ? "light" : "dark";
    apply({
      presetTheme: preset,
      colorBg: found.bg,
      colorSurface: found.surface,
      colorText: found.text,
      theme,
    });
    document.documentElement.setAttribute("data-theme", theme);
  };

  const handleCustomColor = (key: "colorBg" | "colorSurface" | "colorText", value: string) => {
    apply({ [key]: value, presetTheme: "custom" });
  };

  const handleTheme = (theme: Theme) => {
    apply({ theme });
    document.documentElement.setAttribute("data-theme", theme === "system" ? "dark" : theme);
  };

  const handleAccent = (color: string) => {
    apply({ accentColor: color });
  };

  const handleRadius = (borderRadius: BorderRadius) => {
    apply({ borderRadius });
    document.documentElement.setAttribute("data-radius", borderRadius);
  };

  const handleDensity = (uiDensity: UIDensity) => {
    apply({ uiDensity });
    document.documentElement.setAttribute("data-density", uiDensity);
  };

  return (
    <div className={styles.section}>
      <div className={styles.group}>
        <h3 className={styles.label}>Preset Theme</h3>
        <div className={styles.presetGrid}>
          {PRESET_THEMES.map((p) => (
            <button
              key={p.id}
              className={`${styles.presetCard} ${settings.presetTheme === p.id ? styles.presetCardActive : ""}`}
              onClick={() => handlePreset(p.id)}
            >
              <span
                className={styles.presetPreview}
                style={
                  p.id === "custom"
                    ? { background: "conic-gradient(#6366f1, #ec4899, #f97316, #22c55e, #6366f1)" }
                    : { background: p.bg, border: `1px solid ${p.surface}` }
                }
              >
                {p.id !== "custom" && (
                  <span className={styles.presetBar} style={{ background: p.surface }} />
                )}
              </span>
              <span className={styles.presetLabel}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {settings.presetTheme === "custom" && (
        <div className={styles.group}>
          <h3 className={styles.label}>Custom Colors</h3>
          <div className={styles.colorPickerRow}>
            <label className={styles.colorPickerItem}>
              <span className={styles.colorPickerLabel}>Background</span>
              <span className={styles.colorPickerTrack}>
                <input
                  type="color"
                  className={styles.colorPickerInput}
                  value={settings.colorBg}
                  onChange={(e) => handleCustomColor("colorBg", e.target.value)}
                />
                <span className={styles.colorPickerSwatch} style={{ background: settings.colorBg }} />
              </span>
              <span className={styles.colorPickerHex}>{settings.colorBg}</span>
            </label>
            <label className={styles.colorPickerItem}>
              <span className={styles.colorPickerLabel}>Surface</span>
              <span className={styles.colorPickerTrack}>
                <input
                  type="color"
                  className={styles.colorPickerInput}
                  value={settings.colorSurface}
                  onChange={(e) => handleCustomColor("colorSurface", e.target.value)}
                />
                <span className={styles.colorPickerSwatch} style={{ background: settings.colorSurface }} />
              </span>
              <span className={styles.colorPickerHex}>{settings.colorSurface}</span>
            </label>
            <label className={styles.colorPickerItem}>
              <span className={styles.colorPickerLabel}>Text</span>
              <span className={styles.colorPickerTrack}>
                <input
                  type="color"
                  className={styles.colorPickerInput}
                  value={settings.colorText}
                  onChange={(e) => handleCustomColor("colorText", e.target.value)}
                />
                <span className={styles.colorPickerSwatch} style={{ background: settings.colorText }} />
              </span>
              <span className={styles.colorPickerHex}>{settings.colorText}</span>
            </label>
          </div>
        </div>
      )}

      <div className={styles.group}>
        <h3 className={styles.label}>Appearance Mode</h3>
        <div className={styles.themeOptions}>
          {(["dark", "light", "system"] as Theme[]).map((t) => (
            <button
              key={t}
              className={`${styles.themeBtn} ${settings.theme === t ? styles.themeBtnActive : ""}`}
              onClick={() => handleTheme(t)}
            >
              <span className={`${styles.themePreview} ${styles[t]}`} />
              <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Accent Color</h3>
        <div className={styles.colors}>
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              className={`${styles.colorSwatch} ${settings.accentColor === color ? styles.colorActive : ""}`}
              style={{ background: color }}
              onClick={() => handleAccent(color)}
            />
          ))}
          <label className={styles.colorSwatchWrapper}>
            <input
              type="color"
              className={styles.colorPickerHidden}
              value={settings.accentColor}
              onChange={(e) => handleAccent(e.target.value)}
            />
            <span
              className={`${styles.colorSwatch} ${styles.colorSwatchCustomIcon} ${!ACCENT_COLORS.includes(settings.accentColor) ? styles.colorActive : ""}`}
              style={{ background: settings.accentColor }}
            />
          </label>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Border Radius</h3>
        <div className={styles.segmented}>
          {(["sharp", "rounded", "pill"] as BorderRadius[]).map((r) => (
            <button
              key={r}
              className={`${styles.segBtn} ${settings.borderRadius === r ? styles.segBtnActive : ""}`}
              onClick={() => handleRadius(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>UI Density</h3>
        <div className={styles.segmented}>
          {(["comfortable", "compact"] as UIDensity[]).map((d) => (
            <button
              key={d}
              className={`${styles.segBtn} ${settings.uiDensity === d ? styles.segBtnActive : ""}`}
              onClick={() => handleDensity(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Background GIF</h3>
        <input
          className={styles.textInput}
          type="url"
          placeholder="https://example.com/background.gif"
          value={settings.backgroundGifUrl ?? ""}
          onChange={(e) => apply({ backgroundGifUrl: e.target.value || null })}
        />
        {settings.backgroundGifUrl && (
          <button className={styles.clearBtn} onClick={() => apply({ backgroundGifUrl: null })}>
            Clear background
          </button>
        )}
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>New Tab Page</h3>
        <label className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Show clock</span>
          <div
            className={`${styles.toggle} ${settings.showClock ? styles.toggleOn : ""}`}
            onClick={() => apply({ showClock: !settings.showClock })}
          >
            <div className={styles.toggleThumb} />
          </div>
        </label>
        <label className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Show bookmarks bar</span>
          <div
            className={`${styles.toggle} ${settings.showBookmarksBar ? styles.toggleOn : ""}`}
            onClick={() => apply({ showBookmarksBar: !settings.showBookmarksBar })}
          >
            <div className={styles.toggleThumb} />
          </div>
        </label>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Layout</h3>
        <button
          className={`${styles.editLayoutBtn} ${isEditMode ? styles.editLayoutBtnActive : ""}`}
          onClick={toggleEditMode}
        >
          {isEditMode ? "Exit Edit Mode" : "Edit Layout"}
        </button>
        <p className={styles.editLayoutHint}>
          Rearrange and hide browser panels to build your own layout.
        </p>
      </div>
    </div>
  );
}
