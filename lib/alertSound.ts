/** เสียงสั้นครั้งเดียว เรียกหลังท่าทางของผู้ใช้เท่านั้น */
export function playAlertChime() {
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(784, now);
  osc.frequency.exponentialRampToValueAtTime(1174, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.46);
  osc.onended = () => {
    void ctx.close();
  };
}
