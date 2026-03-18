import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import styles from "./ExtensionsSection.module.css";

interface Extension {
  id: string;
  name: string;
  version: string;
}

export function ExtensionsSection() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.lurk.extensions.list().then(setExtensions);
  }, []);

  const handleLoadExtension = async () => {
    setError(null);
    const path = prompt("Enter extension path (absolute path to unpacked extension folder):");
    if (!path) return;

    setLoading(true);
    try {
      const ext = await window.lurk.extensions.load({ path });
      setExtensions((prev) => [...prev, { ...ext, version: "?" }]);
    } catch (e) {
      setError(`Failed to load extension: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <h3 className={styles.label}>Installed Extensions</h3>
        <motion.button
          className={styles.loadBtn}
          onClick={handleLoadExtension}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "Loading..." : "Load extension"}
        </motion.button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {extensions.length === 0 ? (
        <p className={styles.empty}>No extensions installed</p>
      ) : (
        <div className={styles.list}>
          {extensions.map((ext) => (
            <div key={ext.id} className={styles.extItem}>
              <div className={styles.extInfo}>
                <span className={styles.extName}>{ext.name}</span>
                <span className={styles.extVersion}>v{ext.version}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={styles.note}>
        Only unpacked Chrome extensions are supported. Compatibility may vary.
      </p>
    </div>
  );
}
