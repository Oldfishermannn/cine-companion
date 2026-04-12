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
  const id    = searchParams.get("id") || "";
  const title = searchParams.get("title");
  const year  = searchParams.get("year") || "";
  const genre = searchParams.get("genre") || "";
  const plot  = searchParams.get("plot") || "";

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  if (id) {
    const cached = await readCache(`${id}_post`);
    if (cached) return NextResponse.json({ ...(cached as Record<string, unknown>), cached: true });
  }

  try {
    const aiMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [
        {
          name: "movie_post",
          description: "生成观影后复盘内容（含剧透）",
          input_schema: {
            type: "object" as const,
            properties: {
              plot_summary: {
                type: "object",
                description: "剧情梳理——根据电影实际叙事结构来分段，不要强套三幕式",
                properties: {
                  sections: {
                    type: "array",
                    description: "剧情段落（2-5段）。按电影实际叙事结构分段，不套三幕模板。字数随重要度波动：高潮、转折、感人段落多写（5-7句）；铺垫、过渡、交代背景少写（1-2句）。禁止每段字数相近——节奏感就体现在长短差异上",
                    items: {
                      type: "object",
                      properties: {
                        title:   { type: "string", description: "段落标题（2-6字，体现该段核心情绪或事件）" },
                        content: { type: "string", description: "该段剧情描述。铺垫段：1-2句话点到即止；高潮/转折段：5-7句详细展开，写出情绪张力和关键细节" },
                      },
                      required: ["title", "content"],
                    },
                    minItems: 2,
                    maxItems: 5,
                  },
                  theme: { type: "string", description: "核心主题一句话总结" },
                },
                required: ["sections", "theme"],
              },
              characters: {
                type: "array",
                description: "主要人物（3-5个）",
                items: {
                  type: "object",
                  properties: {
                    name:        { type: "string", description: "角色名（英文原名）" },
                    zh_name:     { type: "string", description: "角色中文译名" },
                    actor:       { type: "string", description: "演员名" },
                    description: { type: "string", description: "一句话描述角色定位和弧线" },
                    importance:  { type: "integer", description: "角色重要程度：1=核心主角（整部电影围绕TA），2=重要配角（大量戏份），3=次要角色（少量戏份）", enum: [1, 2, 3] },
                  },
                  required: ["name", "zh_name", "actor", "description", "importance"],
                },
              },
              relationships: {
                type: "array",
                description: "人物之间的关系（每对有互动的角色各一条，4-8条）",
                items: {
                  type: "object",
                  properties: {
                    from:  { type: "string", description: "关系发起方角色名（英文，必须与characters中的name完全一致）" },
                    to:    { type: "string", description: "关系指向方角色名（英文，必须与characters中的name完全一致）" },
                    label: { type: "string", description: "2-4个字描述关系，如：父子、宿敌、盟友、爱人、上下级、背叛" },
                  },
                  required: ["from", "to", "label"],
                },
              },
              easter_eggs: {
                type: "array",
                description: "彩蛋与隐藏细节（3-6条）",
                items: {
                  type: "object",
                  properties: {
                    detail:   { type: "string", description: "彩蛋内容（中文）" },
                    category: { type: "string", enum: ["致敬", "伏笔", "隐喻", "彩蛋", "续集线索"] },
                  },
                  required: ["detail", "category"],
                },
              },
              spoiler_fun_facts: {
                type: "array",
                description: "含剧透的幕后花絮（3-5条，需结合剧情才能理解的花絮）",
                items: {
                  type: "object",
                  properties: {
                    fact:     { type: "string", description: "花絮内容（中文）" },
                    category: { type: "string", enum: ["制作花絮", "幕后秘闻", "原著改编", "导演意图", "结局解析"] },
                  },
                  required: ["fact", "category"],
                },
              },
            },
            required: ["plot_summary", "characters", "relationships", "easter_eggs", "spoiler_fun_facts"],
          },
        },
      ],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `你是帮助中文语境观众复盘英语电影的助手。

电影：${title}（${year}），类型：${genre}
简介：${plot}

请调用 movie_post 工具，完成观影后复盘内容（含剧透）：
1. 剧情梳理：按电影实际叙事结构分段（2-5段），禁止每段字数相近——这是最重要的要求。铺垫/交代背景：1-2句收住；核心冲突/高潮/情感爆发/关键转折：5-7句展开，写出张力、细节、情绪。读者看完应该感受到节奏的起伏，而不是匀速的流水账
2. 主要人物：3-5个核心角色，包含演员名和角色弧线
3. 人物关系：列出角色之间的关系（方向性），label用2-4字，如"父子""宿敌""盟友""爱人"
4. 彩蛋与隐藏细节：值得二刷注意的细节、致敬、伏笔等
5. 含剧透的幕后花絮：需了解剧情才能理解的制作故事

用词简洁，面向已看完电影的华人观众`,
        },
      ],
    });

    const toolUse = aiMsg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not call tool");

    const input = toolUse.input as Record<string, unknown>;

    const result = {
      plot_summary:      safeParseJSON(input.plot_summary, {}),
      characters:        safeParseJSON(input.characters, []),
      relationships:     safeParseJSON(input.relationships, []),
      easter_eggs:       safeParseJSON(input.easter_eggs, []),
      spoiler_fun_facts: safeParseJSON(input.spoiler_fun_facts, []),
    };

    if (id) await writeCache(`${id}_post`, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
