import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { readCache, writeCache } from "@/lib/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const runtime = searchParams.get("runtime") || "";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  // Cache hit
  if (id) {
    const cached = await readCache(`${id}_verdict`);
    if (cached) return NextResponse.json({ ...(cached as Record<string, unknown>), cached: true });
  }

  try {
    const aiMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [
        {
          name: "movie_verdict",
          description: "为中文语境观众生成电影快速决策卡",
          input_schema: {
            type: "object" as const,
            properties: {
              one_line_verdict: {
                type: "string",
                description: "一句话观影结论，30-50字，说明适合谁、值不值得去影院",
              },
              good_for: {
                type: "array",
                items: { type: "string" },
                description: "适合的观众类型，3-5个标签，如：科幻迷、解谜爱好者、约会首选",
              },
              not_good_for: {
                type: "array",
                items: { type: "string" },
                description: "不太适合的观众类型，1-3个标签",
              },
              prior_knowledge: {
                type: "string",
                enum: ["none", "low", "medium", "high"],
                description: "观影前需要的背景知识量",
              },
              pacing: {
                type: "string",
                enum: ["slow", "mixed", "fast"],
                description: "影片节奏",
              },
              english_difficulty: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "英语理解难度（对中文母语观众）",
              },
              english_note: {
                type: "string",
                description: "英语难度的具体说明，15-25字",
              },
              theatrical_need: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "影院观看的必要性（视觉/音效是否值得大银幕）",
              },
              recommendation_score: {
                type: "number",
                description: "综合推荐指数，1-10，保留一位小数",
              },
              has_credits_scene: {
                type: "boolean",
                description: "是否有片尾彩蛋",
              },
              credits_detail: {
                type: "string",
                description: "片尾彩蛋说明，如有则简要描述何时出现，无则写'无片尾彩蛋'",
              },
              one_line_summary: {
                type: "string",
                description: "用于首页卡片的超短摘要，18-28个中文字，不剧透，突出风格和适合人群",
              },
            },
            required: [
              "one_line_verdict", "good_for", "not_good_for",
              "prior_knowledge", "pacing", "english_difficulty", "english_note",
              "theatrical_need", "recommendation_score",
              "has_credits_scene", "credits_detail", "one_line_summary",
            ],
          },
        },
      ],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `你是帮助中文语境观众做出观影决策的助手。请基于以下电影信息，调用 movie_verdict 工具生成快速决策卡。

电影：${title}（${year}）
类型：${genre}
${director ? `导演：${director}` : ""}
${actors ? `主演：${actors}` : ""}
${runtime ? `时长：${runtime}` : ""}
简介：${plot}

要求：
1. one_line_verdict 要具体、有判断力，不要泛泛而谈。明确说「适合XXX的观众」「影院体验优于/不如流媒体」等有决策价值的信息。
2. good_for 和 not_good_for 要具体到观众画像，不要用「所有人」这种无意义标签。
3. english_difficulty 考虑：对白速度、口音、专业术语、文化梗的多少。
4. theatrical_need 考虑：视觉特效规模、音效设计、IMAX适配度。如果是对白驱动的文艺片就写low。
5. recommendation_score 综合考虑影片质量、观众口碑、影院体验价值。不要所有电影都给高分。
6. has_credits_scene 请基于你的知识判断。如果电影尚未上映或你不确定，根据同系列/同导演的惯例推测，并在 credits_detail 中注明是推测。
7. one_line_summary 用于首页展示，要像杂志短评一样精练有态度。示例：「硬科幻解谜，对白密集但值得影院」「轻松约会首选，笑点密集无门槛」`,
        },
      ],
    });

    const toolUse = aiMsg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not call tool");

    const input = toolUse.input as Record<string, unknown>;
    const result = {
      one_line_verdict: String(input.one_line_verdict || ""),
      good_for: safeParseJSON(input.good_for, []) as string[],
      not_good_for: safeParseJSON(input.not_good_for, []) as string[],
      prior_knowledge: String(input.prior_knowledge || "none"),
      pacing: String(input.pacing || "mixed"),
      english_difficulty: String(input.english_difficulty || "medium"),
      english_note: String(input.english_note || ""),
      theatrical_need: String(input.theatrical_need || "medium"),
      recommendation_score: Number(input.recommendation_score) || 7,
      has_credits_scene: Boolean(input.has_credits_scene),
      credits_detail: String(input.credits_detail || ""),
      one_line_summary: String(input.one_line_summary || ""),
    };

    if (id) await writeCache(`${id}_verdict`, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
