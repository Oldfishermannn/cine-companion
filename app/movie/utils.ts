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

// TTS: real human audio from dictionary APIs, premium browser voice fallback
const audioCache = new Map<string, string>();

async function fetchDictAudio(word: string): Promise<string | null> {
  const cached = audioCache.get(word);
  if (cached) return cached;
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.[0]?.phonetics?.find((p: { audio?: string }) => p.audio)?.audio;
    if (url) {
      const full = url.startsWith("//") ? "https:" + url : url;
      audioCache.set(word, full);
      return full;
    }
  } catch { /* fall through */ }
  return null;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  // Prefer premium/enhanced voices
  const premium = voices.find(v => v.lang === "en-US" && /Samantha|Ava|Allison|Zoe|Susan|Natural|Enhanced|Premium/i.test(v.name));
  const google = voices.find(v => v.lang === "en-US" && /Google/i.test(v.name));
  const enUS = voices.find(v => v.lang === "en-US");
  const en = voices.find(v => v.lang.startsWith("en"));
  cachedVoice = premium || google || enUS || en || null;
  return cachedVoice;
}

export async function speak(word: string) {
  if (typeof window === "undefined" || !word) return;

  // Try real human recording first (single words)
  const clean = word.trim().split(/\s+/);
  if (clean.length <= 2) {
    const audioUrl = await fetchDictAudio(clean.join(" "));
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
      return;
    }
  }

  // Fallback: browser speech with best available voice
  const voice = pickVoice();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
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
