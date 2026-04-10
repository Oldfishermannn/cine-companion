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

  // Claude for Chinese translation + multiple options
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `翻译英文单词/短语，面向北美华人观影观众。
单词：${word}${context ? `\n电影语境：${context}` : ""}

列出该词 1-3 种最常见的释义（若只有一个意思就只写一个），每条包含：
- 简短中文翻译（1-4字）
- 一句使用场景说明（10-20字，贴近电影/日常用语）
- 该释义下的例句（可选，简短）

请用以下JSON格式回复（只返回JSON，不要其他文字）：
{
  "options": [
    { "translation": "中文译法", "brief": "场景说明", "example": "例句（可选）" }
  ]
}`,
        },
      ],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const options: Array<{ translation: string; brief: string; example?: string }> =
      Array.isArray(parsed.options) && parsed.options.length > 0
        ? parsed.options
        : [{ translation: parsed.translation ?? word, brief: parsed.brief ?? "" }];

    return NextResponse.json({ word, phonetic, options });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
