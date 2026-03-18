import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { server } from "../../services/server";
import type { SubscriptionPlan } from "../../services/server";
import { useSettingsStore } from "../../stores/settings.store";
import styles from "./SubscriptionSection.module.css";

interface SubStatus {
  active: boolean;
  plan: string | null;
  expires_at: number | null;
  plan_info: SubscriptionPlan | null;
}

function daysLeft(ts: number | null): number {
  if (!ts) return 0;
  return Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86400000));
}

function formatDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function SubscriptionSection() {
  const { settings } = useSettingsStore();
  const token = (settings as unknown as Record<string, string>).authToken ?? "";

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [qrCanvas, setQrCanvas] = useState<string | null>(null);
  const [qrPlan, setQrPlan] = useState<SubscriptionPlan | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showOferta, setShowOferta] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      server.subscription.plans(),
      token ? server.subscription.status(token) : Promise.resolve(null),
    ]).then(([p, s]) => {
      if (!mounted) return;
      setPlans(p.plans ?? []);
      if (s) setStatus(s);
      setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (!pendingPaymentId || !token) return;
    pollRef.current = setInterval(async () => {
      try {
        setCheckingPayment(true);
        const res = await server.subscription.checkPayment(pendingPaymentId, token);
        if (res.status === "succeeded") {
          const s = await server.subscription.status(token);
          setStatus(s);
          setPendingPaymentId(null);
          setQrCanvas(null);
          setQrPlan(null);
          setSuccessMsg("Подписка активирована!");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (res.status === "canceled") {
          setPendingPaymentId(null);
          setQrCanvas(null);
          setQrPlan(null);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
      finally { setCheckingPayment(false); }
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingPaymentId, token]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!token) { setError("Необходимо войти в аккаунт"); return; }
    setPurchasing(plan.id);
    setError(null);
    try {
      const res = await server.subscription.create(plan.id, token);
      if (!res.ok) {
        setError((res as unknown as Record<string, string>).error ?? "Ошибка создания платежа");
        return;
      }
      const qrDataUrl = await QRCode.toDataURL(res.qr_data, {
        width: 240,
        margin: 2,
        color: { dark: "#f4f4f5", light: "#18181b" },
      });
      setQrCanvas(qrDataUrl);
      setQrPlan(plan);
      setPendingPaymentId(res.payment_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setPurchasing(null);
    }
  };

  const cancelQr = () => {
    setPendingPaymentId(null);
    setQrCanvas(null);
    setQrPlan(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <motion.div className={styles.loadingSpinner}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <AnimatePresence>
        {successMsg && (
          <motion.div className={styles.successBanner}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 7 5.5 10.5 12 4" />
            </svg>
            {successMsg}
            <button className={styles.closeBanner} onClick={() => setSuccessMsg(null)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </motion.div>
        )}
        {error && (
          <motion.div className={styles.errorBanner}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {error}
            <button className={styles.closeBanner} onClick={() => setError(null)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {status?.active && (
        <motion.div className={styles.activeCard}
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}>
          <div className={styles.activeCardLeft}>
            <div className={styles.activePill}>Активна</div>
            <div className={styles.activePlan}>{status.plan_info?.name ?? status.plan}</div>
            <div className={styles.activeDesc}>{status.plan_info?.description}</div>
          </div>
          <div className={styles.activeCardRight}>
            <div className={styles.activeDays}>{daysLeft(status.expires_at)}</div>
            <div className={styles.activeDaysLabel}>дней осталось</div>
            <div className={styles.activeExpires}>до {formatDate(status.expires_at)}</div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showOferta && (
          <motion.div className={styles.ofertaOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={styles.ofertaCard}>
              <div className={styles.ofertaTitle}>Публичная оферта</div>
              <div className={styles.ofertaText}>
                Самозанятый Исмагилов Алмаз Марсович (ИНН 026025619131) предлагает приобрести доступ к программному обеспечению Lurk Browser на условиях настоящей публичной оферты.{"\n\n"}
                Оплачивая подписку, вы подтверждаете ознакомление и согласие с условиями использования сервиса. Подписка оформляется на 1 месяц и не продлевается автоматически. Возврат средств невозможен после активации подписки.{"\n\n"}
                Сервис предоставляется «как есть». Самозанятый не несёт ответственности за временную недоступность сервиса по техническим причинам.
              </div>
              <div className={styles.ofertaBtns}>
                <button className={`${styles.planBtn}`} onClick={() => {
                  const plan = plans.find(p => p.id === showOferta);
                  if (plan) { setShowOferta(null); handleSubscribe(plan); }
                }}>Принять и оплатить</button>
                <button className={styles.ofertaCancel} onClick={() => setShowOferta(null)}>Отмена</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrCanvas && qrPlan && (
          <motion.div className={styles.qrOverlay}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}>
            <div className={styles.qrHeader}>
              <div className={styles.qrTitle}>Оплата через СБП</div>
              <div className={styles.qrPlanBadge}>{qrPlan.name} — {qrPlan.price.replace(".00", "")}₽/мес</div>
            </div>
            <div className={styles.qrImageWrap}>
              <img src={qrCanvas} alt="QR СБП" className={styles.qrImage} />
              {checkingPayment && (
                <div className={styles.qrOverlayCheck}>
                  <motion.div className={styles.qrSpinner}
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                </div>
              )}
            </div>
            <div className={styles.qrHint}>
              Отсканируй QR в приложении банка · СБП
            </div>
            <div className={styles.qrStatus}>
              <motion.div className={styles.qrDot}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              Ожидание оплаты...
            </div>
            <button className={styles.qrCancel} onClick={cancelQr}>Отмена</button>
          </motion.div>
        )}
      </AnimatePresence>

      {!qrCanvas && (
        <div className={styles.plansGrid}>
          {plans.map((plan, i) => {
            const isCurrent = status?.active && status.plan === plan.id;
            const isBuying = purchasing === plan.id;
            return (
              <motion.div key={plan.id}
                className={`${styles.planCard} ${isCurrent ? styles.planCardActive : ""} ${plan.badge === "BEST" ? styles.planCardBest : ""}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 28, delay: i * 0.06 }}>
                {plan.badge && <div className={styles.planBadge}>{plan.badge}</div>}
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.planPrice}>
                  <span className={styles.planPriceAmount}>{plan.price.replace(".00", "")}</span>
                  <span className={styles.planPriceCur}>₽/мес</span>
                </div>
                <div className={styles.planDesc}>{plan.description}</div>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} className={styles.planFeature}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 4.5 8.5 10 3" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className={styles.planCurrent}>Текущий план</div>
                ) : (
                  <motion.button
                    className={`${styles.planBtn} ${plan.badge === "BEST" ? styles.planBtnBest : ""}`}
                    onClick={() => setShowOferta(plan.id)}
                    disabled={isBuying || !!pendingPaymentId || !token}
                    whileTap={{ scale: 0.94 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
                    {isBuying ? (
                      <motion.span className={styles.btnSpinner}
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    ) : (
                      status?.active ? "Сменить план" : "Подписаться"
                    )}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {!token && <div className={styles.noAuth}>Войдите в аккаунт, чтобы оформить подписку</div>}
      <div className={styles.footer}>Оплата через ЮKassa · СБП · Продление вручную</div>
    </div>
  );
}
