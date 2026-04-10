import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word    = searchParams.get("word");
  const context = searchParams.get("context") || "";  // optional: movie title for contextual meaning

  if (!word) return NextResponse.json({ error: "Missing word" }, { status: 400 });

  // First try free dictionary API for basic pronunciation + phonetic
  let phonetic: string | null = null;
  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
      phonetic = dictData?.[0]?.phonetic ?? dictData?.[0]?.phonetics?.find((p: { text?: string }) => p.text)?.text ?? null;
    }
  } catch { /* ignore */ }

  // Claude for Chinese translation + context
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `快速翻译英文单词/短语，面向北美华人观众。
单词：${word}${context ? `\n电影语境：${context}` : ""}

请用以下JSON格式回复（只返回JSON，不要其他文字）：
{
  "translation": "中文翻译（1-4字）",
  "pinyin": "拼音（可选）",
  "brief": "一句话解释（10-20字，结合电影语境）",
  "example": "电影中可能的用法示例（可选）"
}`,
        },
      ],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      word,
      phonetic,
      translation: parsed.translation ?? "",
      brief:       parsed.brief ?? "",
      example:     parsed.example ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
