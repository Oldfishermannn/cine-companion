import { NextRequest, NextResponse } from "next/server";

// ── Types ──
interface DictMeaning {
  partOfSpeech: string;
  definitions: Array<{ definition: string; example?: string }>;
}
interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string }>;
  meanings?: DictMeaning[];
}
interface Option { translation: string; brief: string; example?: string }

const POS_ZH: Record<string, string> = {
  noun: "名词", verb: "动词", adjective: "形容词", adverb: "副词",
  pronoun: "代词", preposition: "介词", conjunction: "连词", interjection: "感叹词",
};

// ── Helpers ──

/** Free Dictionary API → phonetic + English definitions */
async function fetchDictionary(word: string): Promise<{ phonetic: string | null; meanings: DictMeaning[] }> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return { phonetic: null, meanings: [] };
    const data: DictEntry[] = await res.json();
    const entry = data?.[0];
    const phonetic = entry?.phonetic ?? entry?.phonetics?.find(p => p.text)?.text ?? null;
    return { phonetic, meanings: entry?.meanings ?? [] };
  } catch {
    return { phonetic: null, meanings: [] };
  }
}

/** Google Translate (free gtx endpoint) → Chinese translation */
async function toZh(text: string): Promise<string> {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text.slice(0, 300))}`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = await res.json();
    // Response format: [[["translated","original",...],...],...]
    return data?.[0]?.[0]?.[0] ?? "";
  } catch {
    return "";
  }
}

// ── Route Handler ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word");

  if (!word) return NextResponse.json({ error: "Missing word" }, { status: 400 });

  try {
    // Step 1: Dictionary + word translation in parallel
    const [dict, wordZh] = await Promise.all([
      fetchDictionary(word),
      toZh(word),
    ]);

    // Step 2: Collect definitions (max 3), clean up headings
    const defs: { pos: string; def: string; example?: string }[] = [];
    for (const m of dict.meanings) {
      for (const d of m.definitions) {
        let text = d.definition.replace(/^\(heading\)\s*/i, "").trim();
        if (text.length < 15) continue;
        defs.push({ pos: m.partOfSpeech, def: text, example: d.example });
        if (defs.length >= 3) break;
      }
      if (defs.length >= 3) break;
    }

    let options: Option[];

    if (defs.length > 0) {
      // Step 3: Translate each definition to Chinese in parallel
      const briefZhs = await Promise.all(defs.map(d => toZh(d.def)));

      options = defs.map((d, i) => ({
        translation: i === 0 ? (wordZh || word) : (POS_ZH[d.pos] ?? d.pos),
        brief: briefZhs[i] || d.def,
        example: d.example,
      }));
    } else {
      // No dictionary entry (phrase or rare word) — just translate
      options = [{ translation: wordZh || word, brief: "" }];
    }

    return NextResponse.json({ word, phonetic: dict.phonetic, options });
  } catch (err) {
    console.error("[word-lookup]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "查询失败，请重试" }, { status: 500 });
  }
}
