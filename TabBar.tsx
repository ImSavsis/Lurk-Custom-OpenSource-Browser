import { AnimatePresence, Reorder } from "framer-motion";
import { Tab } from "./Tab";
import { NewTabButton } from "./NewTabButton";
import { useTabs } from "../../hooks/useTabs";
import { useTabsStore } from "../../stores/tabs.store";
import styles from "./TabBar.module.css";

export function TabBar() {
  const { tabs, activeTabId, createTab, closeTab, activateTab } = useTabs();
  const { setTabs } = useTabsStore();

  const handleReorder = (newOrder: typeof tabs) => {
    setTabs(newOrder, activeTabId);
  };

  return (
    <div className={styles.tabbar}>
      <NewTabButton onCreate={() => createTab()} />
      <Reorder.Group
        axis="x"
        values={tabs}
        onReorder={handleReorder}
        className={styles.tabList}
        layoutScroll
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => activateTab(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}
