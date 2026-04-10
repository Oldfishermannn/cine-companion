import { GENRE_ZH, RATING_KEY, HISTORY_KEY, PersonalRating } from "./types";

export function zhGenre(genre: string): string {
  if (!genre) return "";
  return genre.split(", ").map(g => GENRE_ZH[g.trim()] ?? g.trim()).join(" / ");
}

export function zhRuntime(runtime: string): string {
  if (!runtime) return "";
  const m = runtime.match(/(\d+)\s*min/);
  if (!m) return runtime;
  const total = parseInt(m[1], 10);
  const h = Math.floor(total / 60);
  const min = total % 60;
  if (h === 0) return `${min} 分钟`;
  if (min === 0) return `${h} 小时`;
  return `${h} 小时 ${min} 分钟`;
}

export function zhReleased(released: string): string {
  if (!released) return "";
  const MONTHS: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  const omdb = released.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (omdb) {
    const [, d, mon, y] = omdb;
    const mNum = MONTHS[mon];
    if (mNum) return `${y}年${mNum}月${parseInt(d)}日`;
  }
  const iso = released.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
  }
  return released;
}

// TTS: Google Translate audio (stable quality, supports words & phrases)
const audioCache = new Map<string, HTMLAudioElement>();

export async function speak(word: string) {
  if (typeof window === "undefined" || !word) return;
  const key = word.toLowerCase().trim();
  let audio = audioCache.get(key);
  if (!audio) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(key)}`;
    audio = new Audio(url);
    audioCache.set(key, audio);
  }
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Fallback to Web Speech API if Google TTS blocked
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function loadRating(imdbId: string): number[] {
  try {
    const all: PersonalRating[] = JSON.parse(localStorage.getItem(RATING_KEY) ?? "[]");
    return all.find(r => r.imdbId === imdbId)?.scores ?? [0, 0, 0, 0, 0];
  } catch { return [0, 0, 0, 0, 0]; }
}

export function saveRating(imdbId: string, scores: number[]) {
  try {
    const all: PersonalRating[] = JSON.parse(localStorage.getItem(RATING_KEY) ?? "[]");
    const others = all.filter(r => r.imdbId !== imdbId);
    localStorage.setItem(RATING_KEY, JSON.stringify([{ imdbId, scores, timestamp: Date.now() }, ...others]));
  } catch { /* ignore */ }
}

export function saveHistory(item: { id: string; title: string; poster: string | null; year: string }) {
  try {
    const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as Array<typeof item & { timestamp: number }>;
    const deduped = prev.filter(h => h.id !== item.id);
    const next = [{ ...item, timestamp: Date.now() }, ...deduped].slice(0, 8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}
