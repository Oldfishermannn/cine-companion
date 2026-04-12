# Lights Out

**北美院线 · 华人观影助手** — 帮你快速决定值不值得去影院，然后从观前到观后全程陪同。

🎬 **Live Demo**: [lights-out-cinema.vercel.app](https://lights-out-cinema.vercel.app/)

> 核心命题：北美院线 19 部同期上映。哪部值得专程去？哪部等流媒体就够？  
> Lights Out 用 AI 给出有依据的答案，而不是让你自己去刷评论。

---

## 产品截图

首页 Cinéma Nocturne 风格海报网格 → 点击任意电影 → 详情页快速决策卡 + 全程内容。

---

## 核心功能

### 快速决策卡（差异化功能）

每部电影详情页顶部，一屏内完成观影决策：

| 字段 | 说明 |
|------|------|
| **推荐指数** | 4.5–10 分，衡量「值不值得专程去影院」 |
| **一句话综合评价** | AI 生成的具体判断，不说废话 |
| **适合 / 不适合人群** | 具体观众画像标签 |
| **前置知识 / 英语难度 / 节奏 / 热门程度 / 影院必要性** | 五项指标可视化 |
| **英语难度说明** | 口音/专业术语/文化梗具体说明 |
| **片尾彩蛋** | 有无 + 出现时机 |

推荐指数与影院必要性强制一致（`theatrical_need=low` 分数上限 6.5，服务端 clamp），不会出现语义矛盾。

### 观前内容

- **评分聚合**：IMDb · 烂番茄 · Metacritic · 豆瓣，四项一屏，均可点击原站
- **预告片**：YouTube 自动搜索嵌入
- **演职表**：导演 + 主演照片卡，横向滚动
- **背景知识**：世界观 / 时代背景 / 导演风格，零剧透
- **关键词汇**：8–12 个必懂词汇，中英释义 + 语境说明，按俚语 / 专业术语 / 文化背景词 / 人名地名分组
- **幕后花絮**：5–6 条精炼花絮（制作/选角/技术/导演风格），展开更多
- **厕所时间**：AI 推荐最佳起身时段，输入场次时间换算为实际钟表时间

### 观后内容（解锁后可见）

- **剧情分段复盘**：折叠式展示，点击展开，首幕默认打开
- **彩蛋 & 隐藏细节**：致敬 / 伏笔 / 隐喻 / 续集线索
- **人物关系**：角色卡片 + 关系标签
- **五维度打分**：剧情 / 视觉 / 表演 / 音乐 / 回味，localStorage 持久化

### 首页

- **Editorial Masthead**：Cinéma Nocturne 风格刊头，动态期号
- **Editor's Choice**：按推荐指数自动选出 Top 4，非对称海报排版
- **Now Showing 网格**：19 部 AMC 院线片，支持按「值得看指数 / IMDb评分 / 上映日期」排序
- **场景筛选标签**：口碑最好 / 轻松不费脑 / 约会首选 / 科幻迷友 / 本周新片，从 AI 数据自动派生
- **每张海报附一句话摘要**：AI 生成的 18–28 字精炼描述
- **想看标记**：收藏按钮，localStorage 持久化
- **Recent / Coming Soon**：近期上映 / 即将上映横向卡片

---

## 技术架构

### 技术栈

```
框架      Next.js 16.2 (App Router) · React 19 · Tailwind CSS v4
字体      Fraunces · Noto Serif SC · JetBrains Mono · Cormorant Garamond · Outfit
AI        Claude Sonnet 4.6（内容生成：词汇/背景/花絮/决策卡/观后复盘）
数据      OMDb API + IMDb 直接抓取 fallback
院线数据  AMC Theatres 官网 CDP 抓取（一手上映日期）
评分      OMDb · IMDb · Rotten Tomatoes · Metacritic · 豆瓣
部署      Vercel（Edge Runtime）
```

### 四级缓存系统

```
Tier 0  app/generated/baked.json   预烘焙（warm-catalog 构建期写入，首屏零延迟）
Tier 1  内存 LRU（200 条）         同进程命中秒返回
Tier 2  Vercel KV（可选）          跨实例持久化
Tier 3  文件系统 cache/            本地开发持久化
```

19 部 AMC 院线片全量预烘焙：元数据 / AI 内容 / 评分 / 花絮 / 厕所时间 / 决策卡，首次访问无感知延迟。非目录电影走 AI 实时生成（30s），生成后自动缓存。

### 性能特点

- **首屏零网络请求**：海报 URL 和 AI 内容预烘焙在 baked.json，Server Component 直接注入
- **Server → Client 直传**：Server Component 读缓存，通过 `initialData` prop 传给客户端，跳过二次 fetch
- **后台预取**：AI 内容就绪后自动拉取观后数据，切 tab 时秒出
- **Link prefetch**：悬停即预载目标页 JS bundle

---

## 本地运行

### 环境要求

- Node.js 18+
- Anthropic API Key — [console.anthropic.com](https://console.anthropic.com/)
- OMDb API Key — [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)（免费版够用）

### 启动步骤

```bash
git clone https://github.com/Oldfishermannn/lights-out.git
cd lights-out
npm install
```

创建 `.env.local`：

```env
ANTHROPIC_API_KEY=sk-ant-...
OMDB_API_KEY=your_key
```

```bash
npm run dev
# 打开 http://localhost:3000
```

### 预烘焙（可选）

```bash
# 为所有院线片预生成 AI 内容，写入 baked.json
FORCE=1 npm run warm-catalog
```

---

## 项目结构

```
app/
├── page.tsx                    # 首页 Server Component（服务端预读缓存 + verdictMap）
├── HomeClient.tsx              # 首页交互（筛选/排序/海报网格）
├── catalog.ts                  # 院线片目录（19 部，AMC 来源，含预烘焙分数/海报）
├── globals.css                 # 主题变量 · 组件样式 · 动画
├── generated/baked.json        # 预烘焙缓存（Tier 0，构建期写入）
├── movie/
│   ├── page.tsx                # 电影详情 Server Component
│   ├── MovieDetailClient.tsx   # 客户端状态编排
│   ├── types.ts                # 共享类型定义
│   └── components/
│       ├── DecisionCard.tsx    # 快速决策卡（推荐指数/人群/指标/彩蛋）
│       ├── PreMovie.tsx        # 观前模块
│       ├── PostMovie.tsx       # 观后模块
│       └── shared.tsx          # 通用组件（RatingBlock/VocabCard/CollapsibleLayer）
├── watch/page.tsx              # 独立查词页
└── api/
    ├── movie/                  # OMDb 基础数据
    ├── movie-ai/               # Claude：词汇 + 背景知识
    ├── movie-verdict/          # Claude：快速决策卡（核心端点）
    ├── movie-funfacts/         # Claude：幕后花絮
    ├── movie-breaks/           # Claude：厕所时间
    ├── movie-post/             # Claude：剧情复盘 + 人物 + 彩蛋
    ├── ratings/                # 实时评分抓取（RT/MC/豆瓣）
    ├── trailer/                # YouTube 预告片
    └── cast/                   # 演职表照片

lib/
├── cache.ts                    # 四级缓存实现
├── baked-index.ts              # baked.json 标题索引（三级匹配：精确/大小写/关系词）
└── analytics.ts                # 行为埋点（page_view/tab_switch/cta_click 等）

scripts/
└── warm-catalog.mjs            # 预烘焙脚本（并行生成 19 部 × 7 个端点）
```

---

## 设计语言

**Cinéma Nocturne** — 法式影评刊物 × 35mm 胶片 contact sheet × 深夜放映厅

| 元素 | 规格 |
|------|------|
| 背景 | `#08080C` 墨黑 |
| 主强调 | `#E8B661` 琥珀金 |
| 签名点缀 | `#D94F2A` 朱砂红（全站 ≤ 5 处） |
| 标题字体 | Fraunces 300（SOFT/WONK 光学轴） |
| 中文字体 | Noto Serif SC 600 |
| 代码/索引 | JetBrains Mono，字间距 0.18–0.3em |
| 视觉氛围 | 胶片颗粒 + 暗角 + 顶部扫描线 |

---

## 院线片目录更新

片单来自 AMC Theatres 官网 CDP 实时抓取，运行 `/update-amc` 自动对比 + 更新：

```
/update-amc
```

自动：抓取 AMC 官网 → 对比现有目录 → 新片中文译名由 Claude Haiku 生成 → 确认后更新 `catalog.ts`。

---

## License

MIT
