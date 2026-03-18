import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { server } from "../../services/server";
import styles from "./CallOverlay.module.css";

interface CallState {
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  direction: "outgoing" | "incoming";
}

interface Props {
  call: CallState | null;
  myToken: string;
  onEnd: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function CallOverlay({ call, myToken, onEnd }: Props) {
  const [status, setStatus] = useState<"connecting" | "ringing" | "active" | "ended">("connecting");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (durationRef.current) clearInterval(durationRef.current);
    pollRef.current = null;
    durationRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (call) {
      server.call.clearSignals(call.peerId, myToken).catch(() => {});
    }
  }, [call, myToken]);

  const startDurationTimer = useCallback(() => {
    setDuration(0);
    durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
      setStatus("active");
      startDurationTimer();
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && call) {
        server.call.sendSignal(call.peerId, { type: "candidate", candidate: e.candidate.toJSON() }, myToken).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setStatus("ended");
        cleanup();
        setTimeout(onEnd, 1200);
      }
    };

    return pc;
  }, [call, myToken, startDurationTimer, cleanup, onEnd]);

  const startCall = useCallback(async () => {
    if (!call) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await server.call.sendSignal(call.peerId, { type: "offer", sdp: offer.sdp }, myToken);
      setStatus("ringing");

      pollRef.current = setInterval(async () => {
        try {
          const res = await server.call.getSignals(call.peerId, myToken);
          if (!res.ok) return;
          for (const sig of res.signals as Array<{ type: string; sdp?: string; candidate?: RTCIceCandidateInit }>) {
            if (sig.type === "answer" && sig.sdp) {
              await pc.setRemoteDescription({ type: "answer", sdp: sig.sdp });
            } else if (sig.type === "candidate" && sig.candidate) {
              await pc.addIceCandidate(sig.candidate);
            } else if (sig.type === "reject" || sig.type === "end") {
              setStatus("ended");
              cleanup();
              setTimeout(onEnd, 1200);
            }
          }
        } catch {}
      }, 1500);
    } catch {
      setStatus("ended");
      cleanup();
      setTimeout(onEnd, 1000);
    }
  }, [call, myToken, createPC, cleanup, onEnd]);

  const answerCall = useCallback(async (offerSdp: string) => {
    if (!call) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await server.call.sendSignal(call.peerId, { type: "answer", sdp: answer.sdp }, myToken);

      pollRef.current = setInterval(async () => {
        try {
          const res = await server.call.getSignals(call.peerId, myToken);
          if (!res.ok) return;
          for (const sig of res.signals as Array<{ type: string; candidate?: RTCIceCandidateInit }>) {
            if (sig.type === "candidate" && sig.candidate) {
              await pc.addIceCandidate(sig.candidate);
            } else if (sig.type === "end") {
              setStatus("ended");
              cleanup();
              setTimeout(onEnd, 1200);
            }
          }
        } catch {}
      }, 1500);
    } catch {
      setStatus("ended");
      cleanup();
      setTimeout(onEnd, 1000);
    }
  }, [call, myToken, createPC, cleanup, onEnd]);

  useEffect(() => {
    if (!call) return;
    if (call.direction === "outgoing") {
      startCall();
    } else {
      setStatus("ringing");
      server.call.getSignals(call.peerId, myToken).then((res) => {
        if (res.ok) {
          for (const sig of res.signals as Array<{ type: string; sdp?: string }>) {
            if (sig.type === "offer" && sig.sdp) {
              answerCall(sig.sdp);
              break;
            }
          }
        }
      }).catch(() => {});
    }
    return () => cleanup();
  }, []);

  const handleEnd = () => {
    if (call) {
      server.call.sendSignal(call.peerId, { type: "end" }, myToken).catch(() => {});
    }
    setStatus("ended");
    cleanup();
    setTimeout(onEnd, 600);
  };

  const handleReject = () => {
    if (call) {
      server.call.sendSignal(call.peerId, { type: "reject" }, myToken).catch(() => {});
    }
    setStatus("ended");
    cleanup();
    setTimeout(onEnd, 600);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setMuted((m) => !m);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!call) return null;

  const fallback = (call.peerName || call.peerId).charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className={styles.card}
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.avatarWrap}>
            {call.peerAvatar ? (
              <img src={call.peerAvatar} className={styles.avatar} alt="" />
            ) : (
              <div className={styles.avatarFallback}>{fallback}</div>
            )}
            {status === "active" && <div className={styles.pulseRing} />}
          </div>

          <div className={styles.peerName}>{call.peerName}</div>

          <div className={styles.statusText}>
            {status === "connecting" && "Connecting..."}
            {status === "ringing" && call.direction === "outgoing" && "Ringing..."}
            {status === "ringing" && call.direction === "incoming" && "Incoming call"}
            {status === "active" && formatDuration(duration)}
            {status === "ended" && "Call ended"}
          </div>

          {status === "ringing" && call.direction === "incoming" ? (
            <div className={styles.actions}>
              <button className={`${styles.actionBtn} ${styles.acceptBtn}`} onClick={() => {
                server.call.getSignals(call.peerId, myToken).then((res) => {
                  if (res.ok) {
                    for (const sig of res.signals as Array<{ type: string; sdp?: string }>) {
                      if (sig.type === "offer" && sig.sdp) { answerCall(sig.sdp); break; }
                    }
                  }
                });
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M14.5 12.38c-.93-.08-1.83-.3-2.67-.63-.28-.11-.6-.04-.82.18l-1.3 1.3a10.13 10.13 0 0 1-4.94-4.94l1.3-1.3c.22-.22.29-.54.18-.82A9.37 9.37 0 0 1 5.62 3.5C5.5 2.95 5.03 2.5 4.47 2.5H2.5C1.94 2.5 1.5 2.97 1.5 3.53c0 7.73 6.24 13.97 13.97 13.97.56 0 1.03-.44 1.03-1V14.53c0-.56-.45-1.07-1-1.15z" />
                </svg>
              </button>
              <button className={`${styles.actionBtn} ${styles.endBtn}`} onClick={handleReject}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{ transform: "rotate(135deg)" }}>
                  <path d="M14.5 12.38c-.93-.08-1.83-.3-2.67-.63-.28-.11-.6-.04-.82.18l-1.3 1.3a10.13 10.13 0 0 1-4.94-4.94l1.3-1.3c.22-.22.29-.54.18-.82A9.37 9.37 0 0 1 5.62 3.5C5.5 2.95 5.03 2.5 4.47 2.5H2.5C1.94 2.5 1.5 2.97 1.5 3.53c0 7.73 6.24 13.97 13.97 13.97.56 0 1.03-.44 1.03-1V14.53c0-.56-.45-1.07-1-1.15z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              {status === "active" && (
                <button
                  className={`${styles.actionBtn} ${styles.muteBtn} ${muted ? styles.mutedActive : ""}`}
                  onClick={toggleMute}
                  title={muted ? "Unmute" : "Mute"}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    {muted ? (
                      <>
                        <line x1="1" y1="1" x2="15" y2="15" />
                        <path d="M8 1v6M6 2.18A4 4 0 0 0 4 6v2c0 .38.05.74.14 1.09M10.82 10.82A4 4 0 0 1 4 8V6M1 10.5a9 9 0 0 0 14 0M8 13v2M6 15h4" />
                      </>
                    ) : (
                      <>
                        <path d="M8 1a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
                        <path d="M1 10.5a9 9 0 0 0 14 0M8 13v2M6 15h4" />
                      </>
                    )}
                  </svg>
                </button>
              )}
              <button className={`${styles.actionBtn} ${styles.endBtn}`} onClick={handleEnd}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{ transform: "rotate(135deg)" }}>
                  <path d="M14.5 12.38c-.93-.08-1.83-.3-2.67-.63-.28-.11-.6-.04-.82.18l-1.3 1.3a10.13 10.13 0 0 1-4.94-4.94l1.3-1.3c.22-.22.29-.54.18-.82A9.37 9.37 0 0 1 5.62 3.5C5.5 2.95 5.03 2.5 4.47 2.5H2.5C1.94 2.5 1.5 2.97 1.5 3.53c0 7.73 6.24 13.97 13.97 13.97.56 0 1.03-.44 1.03-1V14.53c0-.56-.45-1.07-1-1.15z" />
                </svg>
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export type { CallState };
