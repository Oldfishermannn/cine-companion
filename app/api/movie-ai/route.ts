import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CACHE_DIR = path.join(process.cwd(), "cache");

function readCache(id: string) {
  try {
    const file = path.join(CACHE_DIR, `${id}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch { /* ignore */ }
  return null;
}

function writeCache(id: string, data: unknown) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${id}.json`), JSON.stringify(data));
  } catch { /* ignore */ }
}

async function fetchWikipedia(title: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": "CineCompanion/1.0" } });
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

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  // Cache hit → instant return
  if (id) {
    const cached = readCache(id);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const isComplex = /sci-fi|fantasy|history|mystery|thriller|horror/i.test(genre);
  const wordCount = isComplex ? 18 : 10;

  try {
    const [aiMsg, wiki] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [
          {
            name: "movie_analysis",
            description: "分析电影词汇和背景知识",
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
                      category: { type: "string", enum: ["俚语", "专业术语", "文化背景词", "人名地名"] },
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
            content: `你是帮助中文语境观众看英语电影的助手。

电影：${title}（${year}），类型：${genre}
简介：${plot}

请调用 movie_analysis 工具，完成：
1. 提取 ${wordCount} 个观看此电影有帮助的英语难词/短语
2. 提供零剧透的中文背景知识介绍`,
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
    if (id) writeCache(id, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
