# 伴影 CineCompanion

**北美华人观影全程助手** — 观前预习 · 观中辅助 · 观后复盘

> 为在北美生活的中文母语观众打造。看英语电影时，再也不用因为听不懂一个词、不了解文化背景而出戏。

---

## 功能概览

### 观前 — 进影院前做足功课

| 功能 | 说明 |
|------|------|
| **评分聚合** | IMDb · 烂番茄 · Metacritic · 豆瓣，四项评分一屏展示，均可点击跳转 |
| **关键词汇** | Claude AI 生成 10-18 个必懂词汇，附中文释义、语境说明、真人发音 |
| **无剧透背景** | 世界观、时代背景、原著背景、导演风格——看懂故事的前置知识 |
| **轻剧透提示** | 可选解锁：第一幕氛围提示，帮你快速进入状态 |
| **你知道吗** | 6-8 条幕后花絮，零剧透，看之前涨涨知识 |

### 观中 — 坐在影院里的辅助工具

| 功能 | 说明 |
|------|------|
| **厕所时间** | 输入场次时间，AI 推荐 2-3 个最佳起身时间段，显示实际钟表时间 |
| **实时查词** | 听到不懂的词直接打，接头词自动匹配预加载词汇（"solar" → "solar dimming"），无需等 API |

### 观后 — 看完电影再回味一遍

| 功能 | 说明 |
|------|------|
| **剧情复盘** | 自适应分段梳理，按实际叙事结构（不套三幕模板） |
| **人物关系图** | 有向箭头关系图，节点大小按重要度，点击展开角色详情 |
| **彩蛋 & 隐藏细节** | 分类展示，含剧透幕后花絮 |
| **五维度评分** | 剧情 / 视觉 / 表演 / 音乐 / 回味，1-5 星，本地持久化 |

---

## 技术栈

```
前端      Next.js 16 · React 19 · Tailwind CSS
AI        Claude Sonnet 4.6（内容生成）· Claude Haiku 4.5（快速查词）
数据      OMDb API · IMDb 实时抓取 · AMC Theatres（院线片目录）
发音      dictionaryapi.dev（真人）· Web Speech API（fallback）
缓存      服务端文件缓存 cache/{imdbID}[_post|_facts|_breaks].json
部署      Vercel
```

---

## 快速上手

### 环境要求

- Node.js 18+
- Anthropic API Key（[获取](https://console.anthropic.com/)）
- OMDb API Key（[获取](https://www.omdbapi.com/apikey.aspx)，免费版够用）

### 本地运行

```bash
git clone https://github.com/Oldfishermannn/cine-companion.git
cd cine-companion
npm install
```

创建 `.env.local`：

```env
ANTHROPIC_API_KEY=sk-ant-...
OMDB_API_KEY=your_key
```

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

---

## 项目结构

```
app/
├── page.tsx              # 首页：院线片目录，海报网格
├── movie/page.tsx        # 电影详情页：评分、词汇、背景、观中、观后
├── watch/page.tsx        # 独立查词页（观影中入口）
├── globals.css           # 全局样式：主题变量、响应式、动画
└── api/
    ├── movie/            # OMDb 基础数据
    ├── movie-ai/         # Claude 生成词汇、背景、简介
    ├── movie-funfacts/   # 幕后花絮
    ├── movie-breaks/     # 厕所时间推荐
    ├── movie-post/       # 剧情复盘、人物关系图
    ├── ratings/          # 实时评分抓取
    └── word-lookup/      # 单词查询（Haiku）

.claude/
└── commands/
    └── update-amc.md     # /update-amc 院线片目录更新 skill

cache/                    # 服务端 AI 响应缓存（git ignored）
```

---

## 院线片目录更新

片单来自 AMC Theatres 官网实时抓取（CDP），不依赖 OMDb（OMDb 对新片无数据，会返回同名旧片）。

当院线片更新时，在项目目录运行：

```
/update-amc
```

该 slash command 会自动：抓取 AMC 官网 → 对比现有目录 → 输出差异报告 → 确认后更新 `app/page.tsx`。

---

## 设计理念

**电影感暗色主题**

- 主色调 `#09090E`（深黑）+ `#C8973A`（金色）+ `#EDE6D3`（羊皮纸白）
- Cormorant Garamond（衬线标题）+ DM Sans（正文）
- 胶片颗粒纹理叠加（CSS SVG filter，opacity 2.2%）

**性能策略**

- 两阶段加载：OMDb 基础数据（~2s）先显，AI 内容异步填入（骨架屏占位）
- 文件缓存：首次生成约 30s，之后复访秒开，页面标注 ⚡
- 查词本地优先：预加载词汇表匹配（0ms）→ 接头词前缀匹配 → Levenshtein 模糊 → API fallback

---

## License

MIT
