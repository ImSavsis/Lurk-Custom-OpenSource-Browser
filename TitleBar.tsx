import styles from "./TitleBar.module.css";
import { WindowControls } from "./WindowControls";

export function TitleBar() {
  return (
    <div className={styles.titlebar}>
      <span className={styles.brand}>Lurk</span>
      <div className={styles.drag} />
      <WindowControls />
    </div>
  );
}
