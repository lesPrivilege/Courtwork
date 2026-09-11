// Agent presence · specimen clock (return-v1).
//
// One virtual timeline for the whole page. `now()` is milliseconds on that
// timeline; it advances only while playing. Pausing, setting a fixed time and
// a hidden document all stop it, so a screenshot at `?t=` is repeatable and a
// background tab spends no frames.

export function createClock({ start = 0, playing = true, realNow = () => performance.now() } = {}) {
  let base = start;
  let anchor = realNow();
  let isPlaying = playing;
  let hiddenPause = false;
  const listeners = new Set();

  const now = () => (isPlaying && !hiddenPause ? base + (realNow() - anchor) : base);
  const emit = () => listeners.forEach((fn) => fn());

  const clock = {
    now,
    get playing() {
      return isPlaying && !hiddenPause;
    },
    get paused() {
      return !isPlaying;
    },
    play() {
      if (isPlaying) return;
      anchor = realNow();
      isPlaying = true;
      emit();
    },
    pause() {
      if (!isPlaying) return;
      base = now();
      isPlaying = false;
      emit();
    },
    set(t) {
      base = t;
      anchor = realNow();
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        base = now();
        hiddenPause = true;
      } else {
        anchor = realNow();
        hiddenPause = false;
      }
      emit();
    });
  }
  return clock;
}
