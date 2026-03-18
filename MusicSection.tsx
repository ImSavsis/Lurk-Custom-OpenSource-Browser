import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import type { MusicTrack } from "../../services/server";
import styles from "./SettingsPanel.module.css";
import mStyles from "./MusicSection.module.css";

export function MusicSection() {
  const { settings } = useSettingsStore();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const token = settings.authToken;

  const loadTracks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await server.music.getOwn(token);
      if (res.ok) setTracks(res.tracks);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadTracks();
  }, [token]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (!file.name.endsWith(".mp3") && file.type !== "audio/mpeg") {
      setUploadError("Only MP3 files are supported");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const title = titleInput.trim() || file.name.replace(/\.mp3$/i, "");
    try {
      const res = await server.music.upload(file, title, token);
      if (res.ok) {
        setTracks((prev) => [...prev, res.track]);
        setTitleInput("");
      } else {
        setUploadError("Upload failed");
      }
    } catch {
      setUploadError("Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (filename: string) => {
    if (!token) return;
    try {
      const res = await server.music.delete(filename, token);
      if (res.ok) setTracks((prev) => prev.filter((t) => t.filename !== filename));
    } catch {}
  };

  const togglePlay = (track: MusicTrack) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = track.url;
      audio.play().then(() => setPlayingId(track.id)).catch(() => {});
      audio.onended = () => setPlayingId(null);
    }
  };

  return (
    <div>
      <div className={styles.group}>
        <h3 className={styles.label}>Upload Music</h3>
        <div className={mStyles.uploadArea}>
          <input
            className={styles.textInput}
            placeholder="Track title (optional)"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
          />
          <input
            type="file"
            accept=".mp3,audio/mpeg"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !token}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 1v9M2 5.5l4.5-4.5 4.5 4.5" />
              <path d="M1.5 11.5h10" />
            </svg>
            {uploading ? "Uploading..." : "Upload MP3"}
          </button>
          {uploadError && <div className={mStyles.error}>{uploadError}</div>}
          {!token && <div className={mStyles.warning}>Sign in to upload music</div>}
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>My Tracks {tracks.length > 0 && `(${tracks.length})`}</h3>
        {loading ? (
          <div className={mStyles.empty}>
            <motion.div
              style={{ width: 18, height: 18, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : tracks.length === 0 ? (
          <div className={mStyles.empty}>No tracks yet. Upload your first MP3!</div>
        ) : (
          <div className={mStyles.trackList}>
            <AnimatePresence>
              {tracks.map((track, i) => (
                <motion.div
                  key={track.id}
                  className={`${mStyles.track} ${playingId === track.id ? mStyles.trackPlaying : ""}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: i * 0.03, duration: 0.16 }}
                >
                  <button className={mStyles.playBtn} onClick={() => togglePlay(track)}>
                    {playingId === track.id ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="1" y="1" width="4" height="10" rx="1" />
                        <rect x="7" y="1" width="4" height="10" rx="1" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2 1l9 5-9 5V1z" />
                      </svg>
                    )}
                  </button>
                  <div className={mStyles.trackInfo}>
                    <span className={mStyles.trackTitle}>{track.title}</span>
                    <span className={mStyles.trackFilename}>{track.filename}</span>
                  </div>
                  <button
                    className={mStyles.deleteBtn}
                    onClick={() => handleDelete(track.filename)}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1.5 3h9M4 3V1.5h4V3M9.5 3l-.5 7.5h-6L2.5 3" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
