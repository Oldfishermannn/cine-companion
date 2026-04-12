import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { readCache, writeCache } from "@/lib/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchWikipedia(title: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": "LightsOut/1.0" } });
  if (!res.ok) return null;
  return res.json();
}

function safeParseJSON(val: unknown, fallback: unknown) {
  if (typeof val !== "string") return val ?? fallback;
  try { return JSON.parse(val); } catch { /* try repair */ }
  try { return JSON.parse(jsonrepair(val)); } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const title = searchParams.get("title");
  const year = searchParams.get("year") || "";
  const genre = searchParams.get("genre") || "";
  const plot = searchParams.get("plot") || "";
  const director = searchParams.get("director") || "";
  const actors = searchParams.get("actors") || "";

  const lang = searchParams.get("lang") || "zh";
  const isEn = lang === "en";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  // Cache hit → instant return
  const cacheKey = isEn ? `${id}_en` : id;
  if (id) {
    const cached = await readCache(cacheKey);
    if (cached) return NextResponse.json({ ...(cached as Record<string, unknown>), cached: true });
  }

  const isComplex = /sci-fi|fantasy|history|mystery|thriller|horror/i.test(genre);
  const wordCount = isComplex ? 12 : 8;

  try {
    const [aiMsg, wiki] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [
          {
            name: "movie_analysis",
            description: isEn ? "Analyze movie vocabulary and background knowledge" : "分析电影词汇和背景知识",
            input_schema: {
              type: "object" as const,
              properties: {
                background: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    context: { type: "array", items: { type: "string" } },
                    director_note: { type: "string" },
                  },
                  required: ["summary", "context", "director_note"],
                },
                vocabulary: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      word: { type: "string" },
                      translation: { type: "string" },
                      explanation: { type: "string" },
                      category: {
                        type: "string",
                        enum: isEn
                          ? ["Slang", "Technical", "Cultural", "Names & Places"]
                          : ["俚语", "专业术语", "文化背景词", "人名地名"],
                      },
                    },
                    required: ["word", "translation", "explanation", "category"],
                  },
                },
              },
              required: ["background", "vocabulary"],
            },
          },
        ],
        tool_choice: { type: "any" },
        messages: [
          {
            role: "user",
            content: isEn
              ? `You are an assistant helping English-speaking moviegoers prepare for films.

Movie: ${title} (${year}), Genre: ${genre}
${director ? `Director: ${director}` : ""}
${actors ? `Cast: ${actors}` : ""}
Synopsis: ${plot}

Call the movie_analysis tool to:
1. Extract ${wordCount} notable English words/phrases useful for understanding this film (slang, technical terms, cultural references, proper nouns)
2. Provide spoiler-free background knowledge in English

Important: the director_note field should focus on the director's style, notable works, and filmmaking techniques.${director ? ` The director is ${director} — discuss their known works and style.` : " If director info is unknown, focus on the genre conventions and filmmaking style."}
All output MUST be in English.`
              : `你是帮助中文语境观众看英语电影的助手。

电影：${title}（${year}），类型：${genre}
${director ? `导演：${director}` : ""}
${actors ? `主演：${actors}` : ""}
简介：${plot}

请调用 movie_analysis 工具，完成：
1. 提取 ${wordCount} 个观看此电影有帮助的英语难词/短语
2. 提供零剧透的中文背景知识介绍

重要：director_note 字段应聚焦于导演的创作风格、代表作、拍摄手法等有价值的信息。${director ? `导演是${director}，请围绕其已知作品和风格展开。` : "如果导演信息不详，请围绕影片的类型特色和风格手法来写，不要写'尚未上映'、'信息暂未公开'等废话。"}`,
          },
        ],
      }),
      fetchWikipedia(title),
    ]);

    const toolUse = aiMsg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not call tool");

    const input = toolUse.input as Record<string, unknown>;
    const vocabulary = safeParseJSON(input.vocabulary, []);
    const background = safeParseJSON(input.background, {});

    const result = {
      vocabulary: Array.isArray(vocabulary) ? vocabulary : [],
      background: {
        ...((typeof background === "object" && background !== null) ? background : {}),
        wikipedia: wiki?.extract || null,
      },
    };

    // Save to cache
    if (id) await writeCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
