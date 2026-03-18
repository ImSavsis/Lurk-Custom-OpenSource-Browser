import { useEffect } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import { useIPC } from "./hooks/useIPC";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSettingsStore } from "./stores/settings.store";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { TabBar } from "./components/TabBar/TabBar";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { NewTabPage } from "./components/NewTabPage/NewTabPage";
import { FirstRunWizard } from "./components/FirstRun/FirstRunWizard";
import { EditModePanel } from "./components/EditMode/EditModePanel";
import { DownloadBar } from "./components/Downloads/DownloadBar";
import { BookmarksBar } from "./components/BookmarksBar/BookmarksBar";
import { SavePasswordPrompt } from "./components/Passwords/SavePasswordPrompt";
import { UpdateBanner } from "./components/UpdateBanner/UpdateBanner";
import { FindBar } from "./components/FindBar/FindBar";
import { AINotificationToast } from "./components/AINotification/AINotificationToast";
import { useUIStore } from "./stores/ui.store";
import { useTabsStore } from "./stores/tabs.store";
import styles from "./App.module.css";

function renderPanel(id: string) {
  if (id === "titlebar") return <TitleBar />;
  if (id === "tabbar") return <TabBar />;
  if (id === "toolbar") return <Toolbar />;
  return null;
}

export function App() {
  useIPC();
  useKeyboardShortcuts();

  const { settings, updateSettings } = useSettingsStore();
  const { isSidebarOpen, isSettingsOpen, isEditMode, setSettingsOpen } = useUIStore();
  const { activeTab } = useTabsStore();
  const tab = activeTab();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme === "system" ? "dark" : settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", settings.accentColor);
  }, [settings.accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-bg", settings.colorBg);
    document.documentElement.style.setProperty("--color-surface", settings.colorSurface);
    document.documentElement.style.setProperty("--color-text", settings.colorText);
  }, [settings.colorBg, settings.colorSurface, settings.colorText]);

  useEffect(() => {
    document.documentElement.setAttribute("data-radius", settings.borderRadius);
  }, [settings.borderRadius]);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", settings.uiDensity);
  }, [settings.uiDensity]);

  useEffect(() => {
    window.lurk.ui.setOverlay(isSettingsOpen);
  }, [isSettingsOpen]);

  useEffect(() => {
    window.lurk.ui.setSidebar(isSidebarOpen);
  }, [isSidebarOpen]);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const parse = (v: string) => parseInt(cs.getPropertyValue(v).trim(), 10) || 0;
    const titlebarH = settings.hiddenPanels.includes("titlebar") ? 0 : parse("--titlebar-height");
    const tabbarH = settings.hiddenPanels.includes("tabbar") ? 0 : parse("--tabbar-height");
    const toolbarH = settings.hiddenPanels.includes("toolbar") ? 0 : parse("--toolbar-height");
    const total = titlebarH + tabbarH + toolbarH;
    if (total > 0) window.lurk.ui.setHeight(total);
  }, [settings.uiDensity, settings.hiddenPanels]);

  const showNewTab = !tab || tab.url === "about:blank" || tab.url === "lurk://newtab";

  if (settings.isFirstRun) {
    return <FirstRunWizard />;
  }

  const orderedPanels = settings.panelOrder.filter((id) => !settings.hiddenPanels.includes(id));

  const handleReorder = (newOrder: string[]) => {
    window.lurk.settings.set({ panelOrder: newOrder });
    updateSettings({ panelOrder: newOrder });
  };

  return (
    <div className={styles.root}>
      {isEditMode ? (
        <>
          <Reorder.Group
            as="div"
            axis="y"
            values={orderedPanels}
            onReorder={handleReorder}
            className={styles.panelsGroup}
          >
            {orderedPanels.map((id) => (
              <Reorder.Item
                as="div"
                key={id}
                value={id}
                className={`${styles.panelWrapper} ${styles.panelWrapperEdit}`}
              >
                {renderPanel(id)}
                <EditModePanel panelId={id} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {settings.hiddenPanels.length > 0 && (
            <div className={styles.editModeHiddenPanels}>
              {settings.hiddenPanels.map((id) => (
                <EditModePanel key={id} panelId={id} isHidden />
              ))}
            </div>
          )}
        </>
      ) : (
        orderedPanels.map((id) => (
          <div key={id} className={styles.panelWrapper}>
            {renderPanel(id)}
          </div>
        ))
      )}
      {settings.showBookmarksBar && <BookmarksBar />}
      <div className={styles.content}>
        <AnimatePresence>
          {showNewTab && <NewTabPage key="newtab" />}
        </AnimatePresence>
        <AnimatePresence>
          {isSidebarOpen && <Sidebar key="sidebar" />}
        </AnimatePresence>
      </div>
      <FindBar />
      <DownloadBar />
      <SavePasswordPrompt />
      <UpdateBanner />
      <AINotificationToast />
      {isSettingsOpen && (
        <div className={styles.settingsBackdrop} onClick={() => setSettingsOpen(false)} />
      )}
      <div style={{ pointerEvents: isSettingsOpen ? "auto" : "none" }}>
        <AnimatePresence>
          {isSettingsOpen && <SettingsPanel key="settings" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
