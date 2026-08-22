"use client";

let audioContext: AudioContext | null = null;

/** Lazily created on first use (inside a click handler, so autoplay policies never block it) and reused across rolls rather than recreated every time. */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

/** One short filtered noise burst, mimicking a single die clacking against the table — synthesized with the Web Audio API rather than a bundled audio file, since a few lines of noise generation avoids sourcing/licensing an actual asset for one small decorative sound. */
function playClack(ctx: AudioContext, when: number, gainPeak: number) {
  const duration = 0.05;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200 + Math.random() * 800;
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(when);
  source.stop(when + duration);
}

/**
 * Plays a short multi-die "clatter" — a handful of staggered clack bursts —
 * when the Roll button is pressed. Silently does nothing if the Web Audio
 * API is unavailable or fails to start (a decorative sound effect isn't
 * worth surfacing an error over).
 */
export function playDiceRollSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const clackCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clackCount; i++) {
      const when = now + i * (0.035 + Math.random() * 0.02);
      const gainPeak = 0.18 * (1 - i / (clackCount + 2));
      playClack(ctx, when, gainPeak);
    }
  } catch {
    // Decorative sound effect — never worth surfacing an error over.
  }
}
