import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readCache, writeCache } from "@/lib/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id      = searchParams.get("id") || "";
  const title   = searchParams.get("title");
  const year    = searchParams.get("year") || "";
  const runtime = searchParams.get("runtime") || "";  // e.g. "142 min"
  const plot    = searchParams.get("plot") || "";

  const lang = searchParams.get("lang") || "zh";
  const isEn = lang === "en";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const cacheKey = isEn ? `${id}_breaks_en` : `${id}_breaks`;
  if (id) {
    const cached = await readCache(cacheKey);
    if (cached) return NextResponse.json({ ...(cached as Record<string, unknown>), cached: true });
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
          description: isEn ? "Generate optimal bathroom break times (without missing key scenes), with conservative and relaxed modes" : "为电影生成最佳厕所时间点（不错过关键剧情），包含保守和宽松两种模式",
          input_schema: {
            type: "object" as const,
            properties: {
              breaks: {
                type: "array",
                description: "2-3个最佳起身时间点，按时间先后排列（兼容旧格式）",
                items: {
                  type: "object",
                  properties: {
                    minute:      { type: "number",  description: "建议起身的大约分钟数（从片头算起）" },
                    duration:    { type: "number",  description: "安全离开的分钟数（3-5分钟）" },
                    scene_hint:  { type: "string",  description: "此时正在发生什么（不剧透关键情节，只描述氛围/场景类型）" },
                    miss_risk:   { type: "string",  enum: isEn ? ["Low", "Mid"] : ["低", "中"], description: isEn ? "Risk of missing important content" : "错过重要内容的风险" },
                  },
                  required: ["minute", "duration", "scene_hint", "miss_risk"],
                },
              },
              best_break: { type: "number", description: isEn ? "The minute value of the most recommended break" : "最推荐的那一个break的minute值" },
              conservative_breaks: {
                type: "array",
                description: isEn ? "Conservative mode: 1-2 safest break times, miss_risk must be 'Low'" : "保守模式：1-2个最安全时间点，miss_risk必须为\"低\"，宁可少推荐也不推荐有风险的",
                items: {
                  type: "object",
                  properties: {
                    minute:      { type: "number" },
                    duration:    { type: "number" },
                    scene_hint:  { type: "string" },
                    miss_risk:   { type: "string", enum: isEn ? ["Low"] : ["低"] },
                  },
                  required: ["minute", "duration", "scene_hint", "miss_risk"],
                },
              },
              relaxed_breaks: {
                type: "array",
                description: isEn ? "Relaxed mode: 3-4 break times including 'Mid' risk options" : "宽松模式：3-4个时间点，包含miss_risk为\"中\"的选项，给喝水多或膀胱小的观众更多选择",
                items: {
                  type: "object",
                  properties: {
                    minute:      { type: "number" },
                    duration:    { type: "number" },
                    scene_hint:  { type: "string" },
                    miss_risk:   { type: "string", enum: isEn ? ["Low", "Mid"] : ["低", "中"] },
                  },
                  required: ["minute", "duration", "scene_hint", "miss_risk"],
                },
              },
            },
            required: ["breaks", "best_break", "conservative_breaks", "relaxed_breaks"],
          },
        },
      ],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: isEn
            ? `You are an assistant helping moviegoers find optimal bathroom break times. Goal: find moments to step out without missing key plot developments. ALL output must be in English.

Movie: ${title} (${year})
Runtime: ${runtimeMin} minutes
Synopsis: ${plot}

Call the break_times tool to generate, based on the film's narrative rhythm:
1. breaks (default list, 2-3)
2. conservative_breaks (safest 1-2 moments, miss_risk must be "Low")
3. relaxed_breaks (3-4 moments, including "Mid" risk options)

Rules:
- Usually a safe window after act 1 ends (~25-35% mark)
- Mid act 2 (~50-60%) often has scene transitions
- Avoid suggesting breaks near the climax
- scene_hint describes "what type of scene is happening" without spoiling plot`
            : `你是帮助观众找最佳厕所时间点的助手。目标：找到不错过关键剧情的起身时机。

电影：${title}（${year}）
片长：${runtimeMin} 分钟
简介：${plot}

请调用 break_times 工具，基于该电影的典型叙事节奏，同时生成：
1. breaks（默认列表，2-3个，兼容旧格式）
2. conservative_breaks（保守模式：只选miss_risk="低"的最安全时机，1-2个）
3. relaxed_breaks（宽松模式：3-4个，包含miss_risk="中"的选项）

规则：
- 通常在第一幕结束后（约25-35%处）有一个安全窗口
- 第二幕中段（约50-60%处）往往有场景过渡
- 避免建议在高潮前后起身
- scene_hint 只描述"这是什么类型的场景"，不透露具体情节`,
        },
      ],
    });

    const toolUse = aiMsg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not call tool");

    const input = toolUse.input as {
      breaks: unknown[];
      best_break: number;
      conservative_breaks?: unknown[];
      relaxed_breaks?: unknown[];
    };
    const result = {
      breaks:               Array.isArray(input.breaks) ? input.breaks : [],
      best_break:           typeof input.best_break === "number" ? input.best_break : 0,
      runtime_min:          runtimeMin,
      conservative_breaks:  Array.isArray(input.conservative_breaks) ? input.conservative_breaks : undefined,
      relaxed_breaks:       Array.isArray(input.relaxed_breaks) ? input.relaxed_breaks : undefined,
    };

    if (id) await writeCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
