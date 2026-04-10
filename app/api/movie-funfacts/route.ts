import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CACHE_DIR  = path.join(process.cwd(), "cache");

function readCache(id: string) {
  try {
    const file = path.join(CACHE_DIR, `${id}_facts.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch { /* ignore */ }
  return null;
}

function writeCache(id: string, data: unknown) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${id}_facts.json`), JSON.stringify(data));
  } catch { /* ignore */ }
}

function safeParseJSON(val: unknown, fallback: unknown) {
  if (typeof val !== "string") return val ?? fallback;
  try { return JSON.parse(val); } catch { /* try repair */ }
  try { return JSON.parse(jsonrepair(val)); } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id    = searchParams.get("id") || "";
  const title = searchParams.get("title");
  const year  = searchParams.get("year") || "";
  const genre = searchParams.get("genre") || "";
  const plot  = searchParams.get("plot") || "";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  if (id) {
    const cached = readCache(id);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const aiMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [
        {
          name: "movie_extras",
          description: "生成电影幕后花絮和轻剧透提示",
          input_schema: {
            type: "object" as const,
            properties: {
              fun_facts: {
                type: "array",
                description: "6-8条幕后花絮，绝对零剧透，适合观影前阅读",
                items: {
                  type: "object",
                  properties: {
                    fact:     { type: "string", description: "花絮内容（中文，1-3句话）" },
                    category: {
                      type: "string",
                      enum: ["制作花絮", "幕后秘闻", "选角故事", "原著改编", "技术亮点", "导演风格"],
                    },
                  },
                  required: ["fact", "category"],
                },
              },
              first_act_hint: {
                type: "string",
                description: "轻剧透提示：用2-3句话描述第一幕的氛围/情境，不透露关键情节，帮助观众调整心理预期",
              },
            },
            required: ["fun_facts", "first_act_hint"],
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

请调用 movie_extras 工具，完成：
1. 生成 6-8 条有趣的幕后花絮（制作背景、拍摄故事、演员准备等），绝对不透露任何剧情
2. 写一段"轻剧透提示"，让观众知道大概会看到什么氛围，但不透露关键情节

注意：花絮内容要有趣、具体、适合分享，避免空泛的评价性语言`,
        },
      ],
    });

    const toolUse = aiMsg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not call tool");

    const input      = toolUse.input as Record<string, unknown>;
    const fun_facts  = safeParseJSON(input.fun_facts, []);
    const first_act_hint = typeof input.first_act_hint === "string" ? input.first_act_hint : "";

    const result = {
      fun_facts: Array.isArray(fun_facts) ? fun_facts : [],
      first_act_hint,
    };

    if (id) writeCache(id, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
