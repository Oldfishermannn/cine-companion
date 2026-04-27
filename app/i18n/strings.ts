/**
 * Single source of truth for all UI chrome strings.
 *
 * Scope note (保守版 v1): only static UI labels are bilingual. AI-generated
 * content (background blurbs, plot summaries, character descriptions, etc.)
 * remains Chinese regardless of lang, because translating every Claude response
 * would double API cost. English-mode users see Chinese AI content — this is an
 * acceptable first cut. Future pass: translate AI content server-side on demand
 * and key it into the baked cache.
 *
 * Key naming: `section.description` dotted format, one line per key to keep
 * diffs readable when adding strings.
 */

export type Lang = "zh" | "en";

type StringTable = Record<string, { zh: string; en: string }>;

export const STRINGS: StringTable = {
  // ── Brand / masthead ───────────────────────────────────────────────────
  "brand.tagline":          { zh: "北美院线观影助手", en: "North America Theater Companion" },
  "brand.showingCount":     { zh: "{n} 部在映",       en: "{n} now showing" },
  "brand.toggleLang":       { zh: "EN",              en: "中" },
  "brand.toggleLangLabel":  { zh: "切换英文",         en: "Switch to Chinese" },
  "brand.poweredBy":        { zh: "Powered by Claude AI · OMDb", en: "Powered by Claude AI · OMDb" },

  // ── Home sections ──────────────────────────────────────────────────────
  "home.featuredBadge":     { zh: "#{rank} 推荐",     en: "#{rank} Pick" },
  "home.recentReleases":    { zh: "近期上映",          en: "Recently Released" },
  "home.comingSoon":        { zh: "即将上映",          en: "Coming Soon" },
  "home.filterAll":         { zh: "全部",             en: "All" },
  "home.countSuffix":       { zh: "{n} 部",          en: "{n} films" },
  "home.sortByVerdict":     { zh: "值得看 ↓",          en: "Worth It ↓" },
  "home.sortByRating":      { zh: "评分最高 ★",       en: "Top Rated ★" },
  "home.sortByNewest":      { zh: "最新上映 ↓",       en: "Newest ↓" },
  "home.sortByOldest":      { zh: "最早上映 ↑",       en: "Oldest ↑" },
  "home.noMatches":         { zh: "没有符合筛选条件的电影", en: "No movies match this filter" },
  "home.showingAll":        { zh: "已显示全部 {n} 部",  en: "Showing all {n}" },
  "home.releasedOn":        { zh: "{date} 上映",      en: "Released {date}" },
  "home.watchlistAdd":      { zh: "标记想看",          en: "Add to watchlist" },
  "home.watchlistRemove":   { zh: "取消想看",          en: "Remove from watchlist" },
  "home.viewDetails":       { zh: "查看详情",          en: "View details" },
  "home.viewDetailsArrow":  { zh: "查看详情 →",        en: "View details →" },

  // ── Movie detail page ──────────────────────────────────────────────────
  "movie.searching":        { zh: "搜索中…",           en: "Searching…" },
  "movie.networkError":     { zh: "网络异常 · 重试",   en: "Network error · retry" },
  "movie.notFound":         { zh: "没找到 · 试英文名", en: "Not found · try English" },
  "movie.tabBefore":        { zh: "观 前",            en: "Before" },
  "movie.tabAfter":         { zh: "观 后",            en: "After" },
  "movie.director":         { zh: "导演",              en: "Director" },
  "movie.similar":          { zh: "同类推荐",          en: "More Like This" },

  // ── Pre-movie sections ─────────────────────────────────────────────────
  "pre.ratings":            { zh: "评分",              en: "Ratings" },
  "pre.ratingsEmpty":       { zh: "新片 · 评分未出",   en: "New · ratings pending" },
  "pre.rtLabel":            { zh: "烂番茄",            en: "Rotten Tomatoes" },
  "pre.doubanLabel":        { zh: "豆瓣",              en: "Douban" },
  "pre.trailer":            { zh: "预告片",            en: "Trailer" },
  "pre.cast":               { zh: "演职表",            en: "Cast & Crew" },
  "pre.background":         { zh: "观影前背景",         en: "Background" },
  "pre.zeroSpoiler":        { zh: "零剧透",            en: "Zero spoilers" },
  "pre.funFacts":           { zh: "幕后花絮",          en: "Fun Facts" },
  "pre.vocabulary":         { zh: "关键词汇",          en: "Key Vocabulary" },
  "pre.vocabHint":          { zh: "点看释义 · ▶ 发音", en: "Tap · ▶ audio" },
  "pre.breaks":             { zh: "厕所时间",          en: "Bathroom Breaks" },
  "pre.breaksHint":         { zh: "按剧情推算的起身时机", en: "Low-risk break timing" },
  "pre.amcLink":            { zh: "去看这场？",        en: "See this showing?" },
  "pre.amcCta":             { zh: "AMC 购票 →",        en: "Buy on AMC →" },
  "pre.firstActHint":       { zh: "轻剧透提示",        en: "First-Act Preview" },
  "pre.lightSpoilerWarn":   { zh: "⚠ 含轻微剧透",      en: "⚠ Light spoiler" },
  "pre.noHintInfo":         { zh: "暂无提示",          en: "No preview" },
  "pre.directorNote":       { zh: "导演注解",          en: "Director's Note" },
  "pre.wikipedia":          { zh: "维基百科",          en: "Wikipedia" },
  "pre.showtimePrompt":     { zh: "你看几点场？",      en: "Showtime?" },
  "pre.showtimeHelper":     { zh: "换算成钟表时间",    en: "→ wall-clock times" },
  "pre.showtimeEmpty":      { zh: "点这里 →",          en: "Tap →" },
  "pre.showtimeLabel":      { zh: "场次时间",          en: "Showtime" },
  "pre.showtimePlaceholder":{ zh: "选择场次时间",      en: "Pick showtime" },
  "pre.bestBreak":          { zh: "⭐ 最佳",           en: "⭐ Best" },
  "pre.minuteUnit":         { zh: "分",                en: "min" },
  "pre.breakInfo":          { zh: "第 {m} 分 · {d} 分窗口 · {r} 风险", en: "{m}min · {d}min window · {r}" },
  "pre.breakInfoNoStart":   { zh: "{d} 分窗口 · {r} 风险", en: "{d}min window · {r}" },
  "pre.includeTrailers":    { zh: "含预告片",          en: "Trailers" },
  "pre.trailerPlus":        { zh: "+25 分",            en: "+25" },
  "pre.trailerSkip":        { zh: "跳过",              en: "Skip" },
  "pre.missRiskLow":        { zh: "低",               en: "Low" },
  "pre.missRiskMid":        { zh: "中",               en: "Mid" },
  "pre.missRiskLabel":      { zh: "错过风险",          en: "Miss risk" },
  "pre.durationMin":        { zh: "{n} 分",            en: "{n}m" },
  "pre.spoilerUnlock":      { zh: "▸ 看第一幕提示",    en: "▸ Peek Act I" },
  "pre.spoilerLocked":      { zh: "含微剧透",          en: "Light spoiler" },
  "pre.cached":             { zh: "⚡ 已缓存",          en: "⚡ Cached" },
  "pre.aiGenerating":       { zh: "整理中…",           en: "Loading…" },
  "pre.aiAnalyzing":        { zh: "推算中…",           en: "Working…" },
  "pre.expandMore":         { zh: "展开剩余 {n} 条",   en: "Show {n} more" },
  "pre.aiError":            { zh: "加载失败 · 刷新重试", en: "Failed · refresh" },
  "pre.factsError":         { zh: "花絮加载失败 · 重试",   en: "Failed · refresh" },
  "pre.vocabError":         { zh: "词汇加载失败 · 重试", en: "Failed · refresh" },
  "pre.breaksError":        { zh: "分析失败 · 刷新重试", en: "Failed · refresh" },
  "pre.roleDirector":       { zh: "导演",              en: "Director" },
  "pre.roleActor":          { zh: "演员",              en: "Actor" },
  "pre.playPronunciation":  { zh: "播放发音",          en: "Play audio" },

  // ── Post-movie sections ────────────────────────────────────────────────
  "post.plotSummary":       { zh: "剧情梳理",          en: "Plot Summary" },
  "post.characters":        { zh: "人物关系",          en: "Characters" },
  "post.easterEggs":        { zh: "彩蛋 & 隐藏细节",    en: "Easter Eggs & Hidden Details" },
  "post.spoilerFunFacts":   { zh: "幕后揭秘",          en: "Behind the Scenes" },
  "post.personalRating":    { zh: "我的评分",          en: "My Rating" },
  "post.lockTitle":         { zh: "观后复盘",          en: "Post-Film Review" },
  "post.lockHintLine1":     { zh: "以下含完整剧透",     en: "Full spoilers below" },
  "post.lockHintLine2":     { zh: "剧情 · 人物 · 彩蛋", en: "Plot · Cast · Eggs" },
  "post.lockHintLine3":     { zh: "看完再解锁",         en: "Watch first" },
  "post.unlockButton":      { zh: "已看完 · 解锁",     en: "Unlock" },
  "post.spoilerBar":        { zh: "完整剧透",           en: "Full spoilers" },
  "post.generating":        { zh: "生成复盘…",          en: "Loading…" },
  "post.error":             { zh: "生成失败 · 刷新重试", en: "Failed · refresh" },
  "post.act1":              { zh: "第一幕 · 建置",     en: "Act I · Setup" },
  "post.act2":              { zh: "第二幕 · 对抗",     en: "Act II · Confrontation" },
  "post.act3":              { zh: "第三幕 · 结局",     en: "Act III · Resolution" },
  "post.overallRating":     { zh: "综合评分",          en: "Overall" },
  "post.dim.plot":          { zh: "剧情",              en: "Plot" },
  "post.dim.visual":        { zh: "视觉",              en: "Visuals" },
  "post.dim.acting":        { zh: "表演",              en: "Acting" },
  "post.dim.music":         { zh: "音乐",              en: "Music" },
  "post.dim.lasting":       { zh: "回味",              en: "Lasting" },
  "post.theme":             { zh: "核心主题",          en: "Theme" },

  // ── Loading / error ────────────────────────────────────────────────────
  "common.loading":         { zh: "加载中...",         en: "Loading..." },
  "common.retry":           { zh: "重试",              en: "Retry" },
  "common.error":           { zh: "加载失败",          en: "Failed to load" },
  "common.expand":          { zh: "展开",              en: "Expand" },
  "common.collapse":        { zh: "收起",              en: "Collapse" },
  "common.back":            { zh: "返回",              en: "Back" },
  "common.cached":          { zh: "缓存",              en: "Cached" },

  // ── Decision Card ─────────────────────────────────────────────────────
  "dc.title":               { zh: "值不值得看",         en: "Worth Watching?" },
  "dc.error":               { zh: "决策卡加载失败，请刷新重试", en: "Failed to load · refresh" },
  "dc.notRecommended":      { zh: "不推荐",            en: "Skip" },
  "dc.highlyRecommended":   { zh: "强烈推荐",          en: "Must-See" },
  "dc.goodFor":             { zh: "适合",              en: "Good For" },
  "dc.notGoodFor":          { zh: "不适合",            en: "Not For" },
  "dc.score.high":          { zh: "强烈推荐",          en: "Highly Recommended" },
  "dc.score.good":          { zh: "值得一看",          en: "Worth Seeing" },
  "dc.score.ok":            { zh: "可以考虑",          en: "Consider It" },
  "dc.score.low":           { zh: "流媒体即可",         en: "Stream It" },
  "dc.stat.knowledge":      { zh: "前置知识",          en: "Prior Knowledge" },
  "dc.stat.english":        { zh: "英语难度",          en: "English Level" },
  "dc.stat.pacing":         { zh: "节奏快慢",          en: "Pacing" },
  "dc.stat.popularity":     { zh: "热门程度",          en: "Popularity" },
  "dc.stat.theatrical":     { zh: "影院必要",          en: "Theatrical Need" },
  "dc.pacing.slow":         { zh: "慢热",              en: "Slow Burn" },
  "dc.pacing.mixed":        { zh: "张弛有度",          en: "Mixed" },
  "dc.pacing.fast":         { zh: "快节奏",            en: "Fast-Paced" },
  "dc.diff.low":            { zh: "友好",              en: "Easy" },
  "dc.diff.medium":         { zh: "中等",              en: "Moderate" },
  "dc.diff.high":           { zh: "较难",              en: "Challenging" },
  "dc.theatrical.low":      { zh: "流媒体即可",         en: "Stream It" },
  "dc.theatrical.medium":   { zh: "建议影院",          en: "Better in Theaters" },
  "dc.theatrical.high":     { zh: "必须影院",          en: "Must-See in Theaters" },
  "dc.knowledge.none":      { zh: "无需",              en: "None" },
  "dc.knowledge.low":       { zh: "略知即可",          en: "Minimal" },
  "dc.knowledge.medium":    { zh: "建议了解",          en: "Helpful" },
  "dc.knowledge.high":      { zh: "需要补课",          en: "Required" },
  "dc.popularity.low":      { zh: "小众冷门",          en: "Niche" },
  "dc.popularity.medium":   { zh: "稳健热映",          en: "Solid Run" },
  "dc.popularity.high":     { zh: "现象级爆款",         en: "Blockbuster" },

  // ── Pre-movie extras ──────────────────────────────────────────────────
  "pre.vocabTitle":         { zh: "关键词汇",          en: "Key Vocabulary" },
  "pre.factsTitle":         { zh: "幕后花絮",          en: "Behind the Scenes" },
  "pre.vocabCount":         { zh: "{n} 词",            en: "{n} words" },
  "pre.factsCount":         { zh: "{n} 条冷知识",       en: "{n} facts" },
  "pre.moreFacts":          { zh: "▸ 还有 {n} 条花絮",  en: "▸ {n} more facts" },
  "pre.moreVocab":          { zh: "▸ 还有 {n} 个词汇（{m} 个分类）", en: "▸ {n} more words ({m} categories)" },
  "pre.amcSub":             { zh: "查看场次 & 购票",     en: "Showtimes & Tickets" },

  // ── Movie detail extras ────────────────────────────────────────────────
  "movie.tabPre":           { zh: "观影前",            en: "Before" },
  "movie.tabPost":          { zh: "观影后",            en: "After" },
  "movie.stickyCta":        { zh: "查看场次 & 购票",     en: "Showtimes & Tickets" },

  // ── Home extras ────────────────────────────────────────────────────────
  "home.sceneTopRated":     { zh: "口碑最好",          en: "Top Rated" },
  "home.sceneEasy":         { zh: "轻松不费脑",         en: "Easy Watch" },
  "home.sceneDate":         { zh: "约会首选",          en: "Date Night" },
  "home.sceneScifi":        { zh: "科幻迷友",          en: "Sci-Fi Fans" },
  "home.sceneNew":          { zh: "本周新片",          en: "New This Week" },
  "home.mastheadSub":       { zh: "不剧透，帮你快速决定值不值得去影院看", en: "No spoilers — quickly decide if it's worth the trip to the theater" },
  "home.heroSection":       { zh: "Editor's Note · 编者按",   en: "Editor's Note" },
  "home.heroLead":          { zh: "听不懂英语电影笑点？字幕都看不全？Lights Out 用 AI 把每部 AMC 院线片 为北美华人读了一遍。", en: "Missing the jokes in English films? Lights Out reads every AMC release for you, in Chinese, before you sit down." },
  "home.heroFeatures":      { zh: "词汇预习 · 背景知识 · 厕所时间 · 观后复盘 · 暗光实时查词", en: "Vocabulary · Background · Bathroom timing · Post-film review · In-theater word lookup" },
  "home.heroCta":           { zh: "看本周热映", en: "See What's Showing" },

  // ── Post-movie extras ─────────────────────────────────────────────────
  "post.q1":                { zh: "还行",              en: "Meh" },
  "post.q2":                { zh: "凑合",              en: "Fair" },
  "post.q3":                { zh: "挺好",              en: "Good" },
  "post.q4":                { zh: "值得看",            en: "Great" },
  "post.q5":                { zh: "真香",              en: "Masterpiece" },
  "post.protagonist":       { zh: "主角",              en: "Lead" },
  "post.supporting":        { zh: "配角",              en: "Supporting" },

  // ── Share card ────────────────────────────────────────────────────────
  "share.title":            { zh: "分享我的观影笔记",   en: "Share My Review" },
  "share.hint":             { zh: "保存图片发到小红书 / 朋友圈，或复制链接发给朋友", en: "Save the image for Xiaohongshu / WeChat, or copy the link" },
  "share.download":         { zh: "保存图片",           en: "Save Image" },
  "share.downloading":      { zh: "生成中…",            en: "Saving…" },
  "share.copyLink":         { zh: "复制链接",           en: "Copy Link" },
  "share.copied":           { zh: "✓ 已复制",           en: "✓ Copied" },
  "share.copyFallback":     { zh: "复制下面这条链接：", en: "Copy this link:" },
  "share.platforms":        { zh: "适合 · 小红书 · 朋友圈 · 即刻 · 微信群", en: "Best on · Xiaohongshu · WeChat · Discord" },

  // ── Social ────────────────────────────────────────────────────────────
  "social.xhsFollow":       { zh: "关注小红书 · 每周新片速览", en: "Follow on Xiaohongshu · Weekly picks" },

  // ── Source badges ─────────────────────────────────────────────────────
  "badge.data":             { zh: "数据来源",          en: "Data Source" },
  "badge.ai":               { zh: "AI 整理",           en: "AI Generated" },
  "badge.inferred":         { zh: "仅供参考",          en: "Estimated" },
  "badge.official":         { zh: "数据来源：OMDb",     en: "Source: OMDb" },
  "badge.editorial":        { zh: "编辑整理",          en: "Editorial" },
};

// Chinese genre label → English. Used only in English mode for grid pills.
export const GENRE_EN: Record<string, string> = {
  "科幻": "Sci-Fi",
  "动作": "Action",
  "动画": "Animation",
  "剧情": "Drama",
  "惊悚": "Thriller",
  "运动": "Sport",
  "喜剧": "Comedy",
  "爱情": "Romance",
  "奇幻": "Fantasy",
  "恐怖": "Horror",
  "悬疑": "Mystery",
  "历史": "History",
  "战争": "War",
  "犯罪": "Crime",
  "纪录片": "Documentary",
  "音乐": "Music",
  "家庭": "Family",
};

// ── Category translation maps (Chinese AI values → English display) ─────────
// Used to translate category strings from baked Chinese AI content in English mode.

export const VOCAB_CAT_EN: Record<string, string> = {
  "俚语": "Slang",
  "专业术语": "Technical",
  "文化背景词": "Cultural",
  "人名地名": "Names & Places",
};

export const FACT_CAT_EN: Record<string, string> = {
  "制作花絮": "Production",
  "幕后秘闻": "Behind the Scenes",
  "选角故事": "Casting",
  "原著改编": "Adaptation",
  "技术亮点": "Technical",
  "导演风格": "Director's Style",
};

export const EGG_CAT_EN: Record<string, string> = {
  "致敬": "Homage",
  "伏笔": "Foreshadowing",
  "隐喻": "Symbolism",
  "彩蛋": "Easter Egg",
  "续集线索": "Sequel Hint",
};

export const SPOILER_CAT_EN: Record<string, string> = {
  "制作花絮": "Production",
  "幕后秘闻": "Behind the Scenes",
  "原著改编": "Adaptation",
  "导演意图": "Director's Intent",
  "结局解析": "Ending Analysis",
};

// ── Miss risk translation ───────────────────────────────────────────────────
export const MISS_RISK_EN: Record<string, string> = {
  "低": "Low",
  "中": "Mid",
};

// ── Rating dimensions translation ───────────────────────────────────────────
export const RATING_DIMS_EN = ["Story", "Visuals", "Acting", "Music", "Aftertaste"];

/**
 * Format with {placeholder} substitution. Missing placeholders are left intact
 * so typos fail loudly in dev instead of silently dropping content.
 */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
