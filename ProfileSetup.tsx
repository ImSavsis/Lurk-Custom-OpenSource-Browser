import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMessengerStore } from "../../stores/messenger.store";
import type { MessengerProfile, ProfileSetupStep } from "@lurk/shared";
import styles from "./ProfileSetup.module.css";

const STEPS: ProfileSetupStep[] = ["username", "avatar", "banner", "done"];

const STEP_LABELS: Record<ProfileSetupStep, string> = {
  username: "Choose your username",
  avatar: "Set your avatar",
  banner: "Add a banner",
  done: "All set",
};

const STEP_DESCS: Record<ProfileSetupStep, string> = {
  username: "Your unique name on SyncMess. Others will find you by it.",
  avatar: "Upload a profile picture. It can be a GIF.",
  banner: "Add a banner to make your profile stand out.",
  done: "Your SyncMess profile is ready.",
};

interface ProfileSetupProps {
  onComplete: (profile: MessengerProfile) => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const currentStep = STEPS[stepIndex];

  const validateUsername = (value: string): boolean => {
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("Only letters, numbers, and underscores");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const goNext = () => {
    if (currentStep === "username" && !validateUsername(username)) return;

    if (currentStep === "done") {
      onComplete({
        username,
        displayName: displayName || username,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        status: "online",
        bio: "",
      });
      return;
    }

    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.brandRow}>
          <span className={styles.brand}>SyncMess</span>
        </div>

        <div className={styles.progressBar}>
          {STEPS.map((step, i) => (
            <motion.div
              key={step}
              className={styles.progressDot}
              animate={{
                background: i <= stepIndex ? "var(--color-accent)" : "var(--color-surface-3)",
                scale: i === stepIndex ? 1.2 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>

        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            className={styles.stepContent}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDesc}>{STEP_DESCS[currentStep]}</p>

            {currentStep === "username" && (
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Username</label>
                  <input
                    className={`${styles.input} ${usernameError ? styles.inputError : ""}`}
                    placeholder="e.g. savsis_lurk"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) validateUsername(e.target.value);
                    }}
                    maxLength={30}
                    autoFocus
                  />
                  {usernameError && <span className={styles.errorText}>{usernameError}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Display Name <span className={styles.optional}>(optional)</span></label>
                  <input
                    className={styles.input}
                    placeholder="How others will see you"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            {currentStep === "avatar" && (
              <div className={styles.avatarSetup}>
                <div className={styles.avatarPreview}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar preview" className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <circle cx="16" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  className={styles.input}
                  placeholder="Paste image or GIF URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
                <p className={styles.hint}>Supports images and animated GIFs</p>
              </div>
            )}

            {currentStep === "banner" && (
              <div className={styles.bannerSetup}>
                <div
                  className={styles.bannerPreview}
                  style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
                >
                  {!bannerUrl && (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="2" y="6" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M2 19l6-5 4 4 4-3 8 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  className={styles.input}
                  placeholder="Paste banner image or GIF URL"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </div>
            )}

            {currentStep === "done" && (
              <div className={styles.doneSection}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" className={styles.doneAvatar} />
                ) : (
                  <div className={styles.doneAvatarPlaceholder} />
                )}
                <p className={styles.doneUsername}>@{username}</p>
                <p className={styles.doneDisplayName}>{displayName || username}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className={styles.actions}>
          {stepIndex > 0 && currentStep !== "done" && (
            <button className={styles.backBtn} onClick={goBack}>
              Back
            </button>
          )}
          {currentStep !== "done" && currentStep !== "username" && (
            <button className={styles.skipBtn} onClick={goNext}>
              Skip
            </button>
          )}
          <motion.button
            className={styles.nextBtn}
            onClick={goNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={currentStep === "username" && !username.trim()}
          >
            {currentStep === "done" ? "Start messaging" : "Continue"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
