import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CACHE_DIR  = path.join(process.cwd(), "cache");

function readCache(id: string) {
  try {
    const file = path.join(CACHE_DIR, `${id}_breaks.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch { /* ignore */ }
  return null;
}

function writeCache(id: string, data: unknown) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${id}_breaks.json`), JSON.stringify(data));
  } catch { /* ignore */ }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id      = searchParams.get("id") || "";
  const title   = searchParams.get("title");
  const year    = searchParams.get("year") || "";
  const runtime = searchParams.get("runtime") || "";  // e.g. "142 min"
  const plot    = searchParams.get("plot") || "";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  if (id) {
    const cached = readCache(id);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  // Parse runtime to minutes
  const runtimeMin = parseInt(runtime) || 120;

  try {
    const aiMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [
        {
          name: "break_times",
          description: "为电影生成最佳厕所时间点（不错过关键剧情）",
          input_schema: {
            type: "object" as const,
            properties: {
              breaks: {
                type: "array",
                description: "2-3个最佳起身时间点，按时间先后排列",
                items: {
                  type: "object",
                  properties: {
                    minute:      { type: "number",  description: "建议起身的大约分钟数（从片头算起）" },
                    duration:    { type: "number",  description: "安全离开的分钟数（3-5分钟）" },
                    scene_hint:  { type: "string",  description: "此时正在发生什么（不剧透关键情节，只描述氛围/场景类型）" },
                    miss_risk:   { type: "string",  enum: ["低", "中"], description: "错过重要内容的风险" },
                  },
                  required: ["minute", "duration", "scene_hint", "miss_risk"],
                },
              },
              best_break: { type: "number", description: "最推荐的那一个break的minute值" },
            },
            required: ["breaks", "best_break"],
          },
        },
      ],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `你是帮助观众找最佳厕所时间点的助手。目标：找到不错过关键剧情的起身时机。

电影：${title}（${year}）
片长：${runtimeMin} 分钟
简介：${plot}

请调用 break_times 工具，基于该电影的典型叙事节奏，推荐 2-3 个最佳时间点。
- 通常在第一幕结束后（约25-35%处）有一个
- 第二幕中段（约50-60%处）往往有场景过渡
- 避免建议在高潮前后起身
- scene_hint 只描述"这是什么类型的场景"，不透露具体情节`,
        },
      ],
    });

    const toolUse = aiMsg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not call tool");

    const input = toolUse.input as { breaks: unknown[]; best_break: number };
    const result = {
      breaks:     Array.isArray(input.breaks) ? input.breaks : [],
      best_break: typeof input.best_break === "number" ? input.best_break : 0,
      runtime_min: runtimeMin,
    };

    if (id) writeCache(id, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
