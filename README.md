# 伴影 CineCompanion

**中文语境观影全程助手** — 观前预习 · 观中辅助 · 观后复盘

> 为北美华人观众打造。看英语电影时，再也不用因为听不懂一个词、不了解文化背景而出戏。

---

## 功能概览

### 观前 — 进影院前做足功课

| 功能 | 说明 |
|------|------|
| **评分聚合** | IMDb · 烂番茄 · Metacritic · 豆瓣，四项评分一屏展示，均可点击跳转原站 |
| **预告片** | YouTube 自动搜索嵌入，骨架屏占位加载 |
| **演职表** | 导演 + 主演照片卡片（IMDb 抓取），横向滚动浏览 |
| **观影前背景** | 世界观、时代背景、原著背景、导演风格——零剧透前置知识 |
| **幕后花絮** | 4-8 条分类花絮（制作/选角/技术/导演风格），可展开更多，零剧透 |
| **关键词汇** | Claude AI 生成 10-18 个必懂词汇，按类型分组，附中文释义、语境说明、真人发音 |
| **厕所时间** | 输入场次时间，AI 推荐 2-3 个最佳起身时段，显示实际钟表时间，含预告片偏移 |

### 观中 — 坐在影院里的辅助工具

| 功能 | 说明 |
|------|------|
| **实时查词** | 词典优先：输入即查，返回中文翻译 + 音标 + 语境解释；本片相关词汇自动高亮 |

### 观后 — 看完电影再回味一遍

| 功能 | 说明 |
|------|------|
| **剧情复盘** | 自适应分段梳理（按实际叙事结构，不套三幕模板），主题引言 |
| **人物关系** | 角色卡片 + 关系标签，按重要度排序，主角高亮 |
| **彩蛋 & 隐藏细节** | 致敬 / 伏笔 / 隐喻 / 续集线索分类展示 |
| **幕后揭秘** | 含剧透的深度花絮 |
| **五维度评分** | 剧情 / 视觉 / 表演 / 音乐 / 回味，1-5 星，localStorage 持久化 |

### 首页

| 功能 | 说明 |
|------|------|
| **推荐电影** | 评分最高的影片独立 hero 展示 |
| **近期上映** | 14 天内上映的新片横向卡片（带海报缩略图，左右箭头滚动） |
| **即将上映** | 未来上映日期的影片 |
| **类型筛选** | 动画 / 科幻 / 爱情 / 恐怖 / 喜剧 / 动作 / 惊悚 / 剧情 |
| **排序切换** | 评分最高 / 最新上映 / 最早上映 |
| **想看标记** | 收藏按钮，localStorage 持久化 |

---

## 技术栈

```
前端      Next.js 16 · React 19 · Tailwind CSS
字体      Cormorant Garamond（衬线标题）· Outfit（正文）
AI        Claude Sonnet 4.6（内容生成）· Claude Haiku 4.5（快速查词）
数据      OMDb API · IMDb 实时抓取 · YouTube 搜索（预告片）
院线      AMC Theatres 官网 CDP 实时抓取（一手上映日期）
评分      OMDb + /api/ratings 实时补全（IMDb/RT/MC/豆瓣）
发音      dictionaryapi.dev（真人）· Web Speech API（fallback）
缓存      三级：内存 LRU（200）→ Vercel KV（可选）→ 文件系统
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
├── page.tsx                    # 首页 Server Component（SEO + metadata）
├── HomeClient.tsx              # 首页交互（筛选/排序/海报网格/推荐栏）
├── catalog.ts                  # 院线片目录数据（19 部，AMC 来源）
├── layout.tsx                  # 全局布局 + 字体加载
├── globals.css                 # 主题变量 · 响应式 · 动画 · 组件样式
├── movie/
│   ├── page.tsx                # 电影详情页 orchestrator
│   ├── loading.tsx             # 导航过渡骨架屏
│   ├── types.ts                # 共享类型定义
│   ├── utils.ts                # 工具函数（评分/历史/发音）
│   └── components/
│       ├── shared.tsx          # RatingBlock · VocabCard · FactCard · SectionLabel
│       ├── PreMovie.tsx        # 观前模块（评分/预告片/演职表/背景/花絮/词汇/厕所时间）
│       ├── DuringMovie.tsx     # 观中模块（实时查词）
│       ├── PostMovie.tsx       # 观后模块（剧情复盘/人物/彩蛋/评分）
│       ├── CharacterGraph.tsx  # 人物关系图组件
│       └── InlineWordLookup.tsx # 内嵌查词组件
├── watch/page.tsx              # 独立查词页（观影中入口）
└── api/
    ├── movie/                  # OMDb 基础数据
    ├── movie-ai/               # Claude 生成词汇、背景、简介
    ├── movie-funfacts/         # 幕后花絮
    ├── movie-breaks/           # 厕所时间推荐
    ├── movie-post/             # 剧情复盘、人物关系
    ├── ratings/                # 实时评分抓取（IMDb/RT/MC/豆瓣）
    ├── trailer/                # YouTube 预告片搜索
    ├── cast/                   # 演职表照片抓取
    └── word-lookup/            # 单词查询（Haiku）

lib/
└── cache.ts                    # 三级缓存：内存 LRU → Vercel KV → 文件系统

.claude/commands/
└── update-amc.md               # /update-amc 院线片目录更新 slash command
```

---

## 院线片目录更新

片单来自 AMC Theatres 官网实时抓取（CDP），不依赖 OMDb。

当院线片更新时，在项目目录运行：

```
/update-amc
```

自动：抓取 AMC 官网 → 对比现有目录 → 输出差异报告 → 确认后更新 `app/catalog.ts`。

---

## 性能策略

- **两阶段加载**：OMDb 基础数据（~2s）先显，AI 内容异步填入（骨架屏占位）
- **三级缓存**：首次生成约 30s，之后复访秒开（页面标注 ⚡）
- **预加载**：`<Link prefetch>` 悬停即预载目标页 JS
- **导航过渡**：`loading.tsx` 骨架屏 + `page-enter` 淡入动画
- **观后预取**：AI 内容就绪后自动后台拉取观后数据，切 tab 秒开
- **查词本地优先**：预加载词汇表匹配（0ms）→ 前缀 → Levenshtein 模糊 → API fallback

---

## 设计语言

- 主色调 `#0A0A0F`（深黑）+ `#D4A853`（金色）+ `#F0E9D8`（羊皮纸白）
- 胶片颗粒纹理叠加（CSS SVG filter，opacity 1.8%）
- 电影感暗色主题，卡片圆角 + 毛玻璃效果
- 响应式：海报网格 4→3→2 列，hero 横排压缩，tab/内容区自适应

---

## License

MIT
