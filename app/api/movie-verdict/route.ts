import { NextRequest, NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";
import { readCache, writeCache } from "@/lib/cache";
import { generateStructured } from "@/lib/ai";

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

  const lang = searchParams.get("lang") || "zh";
  const isEn = lang === "en";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  // Cache hit
  const cacheKey = isEn ? `${id}_verdict_en` : `${id}_verdict`;
  if (id) {
    const cached = await readCache(cacheKey);
    if (cached) return NextResponse.json({ ...(cached as Record<string, unknown>), cached: true });
  }

  const schema = {
    type: "object",
    properties: {
      one_line_verdict: { type: "string", description: "一句话观影结论，30-50字，说明适合谁、值不值得去影院" },
      good_for: { type: "array", items: { type: "string" }, description: "适合的观众类型，3-5个标签" },
      not_good_for: { type: "array", items: { type: "string" }, description: "不太适合的观众类型，1-3个标签" },
      prior_knowledge: { type: "string", enum: ["none", "low", "medium", "high"], description: "观影前需要的背景知识量" },
      pacing: { type: "string", enum: ["slow", "mixed", "fast"], description: "影片节奏" },
      english_difficulty: { type: "string", enum: ["low", "medium", "high"], description: "英语理解难度（对中文母语观众）" },
      english_note: { type: "string", description: "英语难度的具体说明，15-25字" },
      theatrical_need: { type: "string", enum: ["low", "medium", "high"], description: "影院观看的必要性" },
      popularity: { type: "string", enum: ["low", "medium", "high"], description: "当前院线热门程度" },
      recommendation_score: { type: "number", description: "综合推荐指数，1-10，保留一位小数" },
      has_credits_scene: { type: "boolean", description: "是否有片尾彩蛋" },
      credits_detail: { type: "string", description: "片尾彩蛋说明" },
      one_line_summary: { type: "string", description: "首页卡片摘要，18-28个中文字" },
    },
    required: [
      "one_line_verdict", "good_for", "not_good_for",
      "prior_knowledge", "pacing", "english_difficulty", "english_note",
      "theatrical_need", "popularity", "recommendation_score",
      "has_credits_scene", "credits_detail", "one_line_summary",
    ],
  };

  const prompt = isEn
    ? `You are an assistant helping moviegoers make viewing decisions. Generate a quick decision card matching the required schema. ALL output must be in English.

Movie: ${title} (${year})
Genre: ${genre}
${director ? `Director: ${director}` : ""}
${actors ? `Cast: ${actors}` : ""}
${runtime ? `Runtime: ${runtime}` : ""}
Synopsis: ${plot}

Requirements:
1. one_line_verdict: Be specific and opinionated — state who it's for and whether it's worth seeing in theaters vs streaming.
2. good_for / not_good_for: Specific audience tags (e.g. "sci-fi fans", "puzzle lovers", "date night pick").
3. english_difficulty: Consider dialogue speed, accents, jargon, cultural references.
4. theatrical_need: Consider visual spectacle, sound design, IMAX suitability, and event-viewing value.
5. recommendation_score: 1-10 "is it worth the theater trip?" index. Must be consistent with theatrical_need.
6. has_credits_scene: Best knowledge estimate. Note if speculative.
7. one_line_summary: A punchy 10-20 word magazine-style blurb for the home page card.`
    : `你是帮助中文语境观众做出观影决策的助手。请基于以下电影信息生成一份符合 schema 的快速决策卡。

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
4. theatrical_need 考虑：视觉特效规模、音效设计、IMAX适配度、**事件型观影价值**（热门IP续集/大制作首映周末氛围、社交话题性——这类电影「错过首映就错过了集体体验」）。如果是对白驱动的文艺片就写low。
5. recommendation_score 是「值不值得专程去影院看」的综合指数，必须与 theatrical_need 逻辑一致：
   - theatrical_need=low（流媒体即可）→ score 上限 6.5，范围 4.0–6.5；平庸之作给 4–5，还行给 5–6，口碑不错但影院体验无优势给 6–6.5
   - theatrical_need=medium（建议影院）→ score 在 5.5–8.0 区间
   - theatrical_need=high（必须影院）→ score 在 7.5–10.0 区间
   分数要有梯度，不要全堆在 6–7。真正值得推荐的和真正建议流媒体的之间要有 2–3 分的明显差距。
   分数衡量的是「去影院的必要性」，包含：视觉音效损耗 + **事件型价值**（热门IP、首映社群氛围、错过就是错过）。一部好文艺片流媒体无损所以分低；但一部热门大IP首映，社群体验本身就是价值，score 应相应偏高。
6. has_credits_scene 请基于你的知识判断。如果电影尚未上映或你不确定，根据同系列/同导演的惯例推测，并在 credits_detail 中注明是推测。
7. one_line_summary 用于首页展示，要像杂志短评一样精练有态度。示例：「硬科幻解谜，对白密集但值得影院」「轻松约会首选，笑点密集无门槛」`;

  try {
    const input = await generateStructured<Record<string, unknown>>({
      prompt,
      schema,
      maxTokens: 2048,
    });
    const theatricalNeed = String(input.theatrical_need || "medium");
    let rawScore = Number(input.recommendation_score) || 7;
    // Enforce score/theatrical_need consistency server-side
    if (theatricalNeed === "low"    && rawScore > 6.5) rawScore = 6.5;
    if (theatricalNeed === "low"    && rawScore < 4.0) rawScore = 4.0;
    if (theatricalNeed === "medium" && rawScore < 5.5) rawScore = 5.5;
    if (theatricalNeed === "medium" && rawScore > 8.0) rawScore = 8.0;
    if (theatricalNeed === "high"   && rawScore < 7.5) rawScore = 7.5;
    const result = {
      one_line_verdict: String(input.one_line_verdict || ""),
      good_for: safeParseJSON(input.good_for, []) as string[],
      not_good_for: safeParseJSON(input.not_good_for, []) as string[],
      prior_knowledge: String(input.prior_knowledge || "none"),
      pacing: String(input.pacing || "mixed"),
      english_difficulty: String(input.english_difficulty || "medium"),
      english_note: String(input.english_note || ""),
      theatrical_need: theatricalNeed,
      popularity: String(input.popularity || "medium") as "low" | "medium" | "high",
      recommendation_score: rawScore,
      has_credits_scene: Boolean(input.has_credits_scene),
      credits_detail: String(input.credits_detail || ""),
      one_line_summary: String(input.one_line_summary || ""),
    };

    if (id) await writeCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
