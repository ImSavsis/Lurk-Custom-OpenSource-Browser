import { useState, useRef } from "react";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import { openProfilePopupFromElement } from "../FloatingProfile/FloatingProfile";
import styles from "./SettingsPanel.module.css";
import pStyles from "./ProfileSection.module.css";

export function ProfileSection() {
  const { settings, updateSettings } = useSettingsStore();
  const [displayName, setDisplayName] = useState(settings.userName ?? "");
  const [username, setUsername] = useState(settings.userUsername ?? "");
  const [bio, setBio] = useState(settings.userBio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(settings.userAvatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(settings.userBannerUrl ?? "");
  const [gifUrl, setGifUrl] = useState(settings.userGifUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const token = settings.authToken;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingAvatar(true);
    try {
      const res = await server.profile.upload(file, token);
      if (res.ok) setAvatarUrl(res.url);
    } catch {}
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingBanner(true);
    try {
      const res = await server.profile.upload(file, token);
      if (res.ok) setBannerUrl(res.url);
    } catch {}
    setUploadingBanner(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    const patch = {
      userName: displayName.trim(),
      userUsername: username.trim(),
      userBio: bio.trim(),
      userAvatarUrl: avatarUrl || null,
      userBannerUrl: bannerUrl || null,
      userGifUrl: gifUrl || null,
    };
    window.lurk.settings.set(patch);
    updateSettings(patch);
    if (token) {
      try {
        await server.profile.update({
          displayName: displayName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl || null,
          bannerUrl: bannerUrl || null,
          gifUrl: gifUrl || null,
        }, token);
      } catch {}
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className={pStyles.bannerWrap}>
        <div className={pStyles.banner} style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}>
          <div className={pStyles.bannerActions}>
            <button className={pStyles.bannerUploadBtn} onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
              {uploadingBanner ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
        <input type="file" accept="image/*" ref={bannerInputRef} style={{ display: "none" }} onChange={handleBannerUpload} />
        <div className={pStyles.avatarRow}>
          <div className={pStyles.avatarWrap}>
            <div className={pStyles.avatar}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className={pStyles.avatarImg} />
              ) : (
                <div className={pStyles.avatarFallback}>
                  {(username || displayName || settings.userEmail || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button className={pStyles.avatarUploadBtn} onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} title="Upload avatar">
              {uploadingAvatar ? "..." : (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M5.5 1v9M1 5.5h9" />
                </svg>
              )}
            </button>
            <input type="file" accept="image/*,image/gif" ref={avatarInputRef} style={{ display: "none" }} onChange={handleAvatarUpload} />
          </div>
        </div>
      </div>

      <div className={styles.group} style={{ marginTop: 12 }}>
        <h3 className={styles.label}>Identity</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div className={styles.rowLabel} style={{ marginBottom: 6 }}>Username</div>
            <input className={styles.textInput} value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="your_username" maxLength={30} />
          </div>
          <div>
            <div className={styles.rowLabel} style={{ marginBottom: 6 }}>Display Name</div>
            <input className={styles.textInput} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" maxLength={50} />
          </div>
          <div>
            <div className={styles.rowLabel} style={{ marginBottom: 6 }}>Bio</div>
            <textarea className={styles.textInput} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few words about yourself..." rows={3} maxLength={200} style={{ resize: "vertical", minHeight: 72 }} />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Images by URL</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div className={styles.rowLabel} style={{ marginBottom: 6 }}>Avatar URL</div>
            <input className={styles.textInput} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" />
          </div>
          <div>
            <div className={styles.rowLabel} style={{ marginBottom: 6 }}>Banner URL</div>
            <input className={styles.textInput} value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://example.com/banner.jpg" />
          </div>
          <div>
            <div className={styles.rowLabel} style={{ marginBottom: 6 }}>Profile GIF URL</div>
            <input className={styles.textInput} value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="https://example.com/animation.gif" />
            <div className={styles.rowDesc} style={{ marginTop: 4 }}>Shown as animated overlay on your banner</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
          {saved ? "Saved" : saving ? "Saving..." : "Save Profile"}
        </button>
        <button
          className={styles.btn}
          onClick={(e) => openProfilePopupFromElement(e.currentTarget, {
            email: settings.userEmail ?? "",
            name: displayName || settings.userName || "",
            username: username || settings.userUsername || "",
            avatar: avatarUrl || settings.userAvatarUrl || null,
            banner: bannerUrl || settings.userBannerUrl || null,
            gif: gifUrl || settings.userGifUrl || null,
            bio: bio || settings.userBio || "",
            isOwn: true,
          })}
        >
          Preview Profile
        </button>
      </div>

      {settings.userEmail && (
        <div className={styles.group} style={{ marginTop: 24 }}>
          <h3 className={styles.label}>Account</h3>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Email</div>
              <div className={styles.rowDesc}>{settings.userEmail}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
