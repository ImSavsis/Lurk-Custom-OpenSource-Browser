import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import type { ServerProfile } from "../../services/server";
import styles from "./ProfileView.module.css";

interface Props {
  email?: string;
  displayName?: string;
  avatarUrl?: string | null;
  onBack: () => void;
}

export function ProfileView({ email, displayName, avatarUrl, onBack }: Props) {
  const { settings } = useSettingsStore();
  const isOwn = !email || email === settings.userEmail;

  const [profile, setProfile] = useState<ServerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOwn) return;
    if (!email) return;
    setLoading(true);
    server.profile.getPublic(email)
      .then((res) => { if (res.ok) setProfile(res.profile); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email, isOwn]);

  const name = isOwn
    ? (settings.userName || settings.userUsername || settings.userEmail || "You")
    : (profile?.displayName || displayName || email || "");
  const username = isOwn
    ? (settings.userUsername || "")
    : (profile?.username || "");
  const bio = isOwn ? (settings.userBio || "") : (profile?.bio || "");
  const avatar = isOwn ? (settings.userAvatarUrl || "") : (profile?.avatarUrl || avatarUrl || "");
  const banner = isOwn ? (settings.userBannerUrl || "") : (profile?.bannerUrl || "");
  const gif = isOwn ? (settings.userGifUrl || "") : (profile?.gifUrl || "");
  const emailDisplay = isOwn ? settings.userEmail : email;

  const fallbackLetter = (username || name || emailDisplay || "?").charAt(0).toUpperCase();

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2L4 7l5 5" />
          </svg>
          Back
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : (
        <div className={styles.card}>
          <div
            className={styles.banner}
            style={banner ? { backgroundImage: `url(${banner})` } : undefined}
          >
            {gif && <img src={gif} className={styles.gif} alt="" />}
          </div>

          <div className={styles.avatarRow}>
            <div className={styles.avatarWrap}>
              {avatar ? (
                <img src={avatar} className={styles.avatarImg} alt="" />
              ) : (
                <div className={styles.avatarFallback}>{fallbackLetter}</div>
              )}
              {isOwn && <span className={styles.onlineDot} />}
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.name}>{name}</div>
            {username && <div className={styles.username}>@{username}</div>}
            {bio && <div className={styles.bio}>{bio}</div>}
            {emailDisplay && <div className={styles.email}>{emailDisplay}</div>}

            {isOwn && (
              <div className={styles.badge}>Your profile</div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
