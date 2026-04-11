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
  "movie.searching":        { zh: "正在搜索...",       en: "Searching..." },
  "movie.networkError":     { zh: "网络错误，请重试",    en: "Network error. Please retry." },
  "movie.notFound":         { zh: "未找到该电影，请尝试英文片名", en: "Movie not found. Try English title." },
  "movie.tabBefore":        { zh: "观 前",            en: "Before" },
  "movie.tabAfter":         { zh: "观 后",            en: "After" },
  "movie.director":         { zh: "导演",              en: "Director" },
  "movie.similar":          { zh: "同类推荐",          en: "More Like This" },

  // ── Pre-movie sections ─────────────────────────────────────────────────
  "pre.ratings":            { zh: "评分",              en: "Ratings" },
  "pre.ratingsEmpty":       { zh: "新片上映不久，评分数据待更新", en: "Newly released — ratings pending." },
  "pre.rtLabel":            { zh: "烂番茄",            en: "Rotten Tomatoes" },
  "pre.doubanLabel":        { zh: "豆瓣",              en: "Douban" },
  "pre.trailer":            { zh: "预告片",            en: "Trailer" },
  "pre.cast":               { zh: "演职表",            en: "Cast & Crew" },
  "pre.background":         { zh: "观影前背景",         en: "Background" },
  "pre.zeroSpoiler":        { zh: "零剧透",            en: "Zero spoilers" },
  "pre.funFacts":           { zh: "幕后花絮",          en: "Fun Facts" },
  "pre.vocabulary":         { zh: "关键词汇",          en: "Key Vocabulary" },
  "pre.vocabHint":          { zh: "点击展开解释 · ▶ 播放发音", en: "Tap to expand · ▶ play audio" },
  "pre.breaks":             { zh: "厕所时间",          en: "Bathroom Breaks" },
  "pre.breaksHint":         { zh: "AI 分析叙事节奏，推荐不错过关键剧情的起身时机", en: "AI analyzes story beats for the best moments to step out." },
  "pre.amcLink":            { zh: "去看这场？",        en: "See this showing?" },
  "pre.amcCta":             { zh: "AMC 购票 →",        en: "Buy on AMC →" },
  "pre.firstActHint":       { zh: "轻剧透提示",        en: "First-Act Preview" },
  "pre.lightSpoilerWarn":   { zh: "⚠ 含轻微剧透",      en: "⚠ Light spoiler" },
  "pre.noHintInfo":         { zh: "暂无提示信息",      en: "No preview info available." },
  "pre.directorNote":       { zh: "导演注解",          en: "Director's Note" },
  "pre.wikipedia":          { zh: "维基百科",          en: "Wikipedia" },
  "pre.showtimeLabel":      { zh: "🎬 场次时间",       en: "🎬 Showtime" },
  "pre.showtimePlaceholder":{ zh: "选择场次时间",      en: "Pick showtime" },
  "pre.bestBreak":          { zh: "⭐ 最佳时机",        en: "⭐ Best moment" },
  "pre.minuteUnit":         { zh: "分钟",              en: "min" },
  "pre.breakInfo":          { zh: "第 {m} 分钟 · 安全 {d} 分钟 · 风险 {r}", en: "At {m}min · {d}min safe · risk {r}" },
  "pre.breakInfoNoStart":   { zh: "安全 {d} 分钟 · 风险 {r}", en: "{d}min safe · risk {r}" },
  "pre.includeTrailers":    { zh: "包含预告片时间",     en: "Include trailers" },
  "pre.trailerPlus":        { zh: "+25 分钟",          en: "+25 min" },
  "pre.trailerSkip":        { zh: "不计入",            en: "Excluded" },
  "pre.missRiskLow":        { zh: "低",               en: "Low" },
  "pre.missRiskMid":        { zh: "中",               en: "Mid" },
  "pre.missRiskLabel":      { zh: "错过风险",          en: "Miss risk" },
  "pre.durationMin":        { zh: "约 {n} 分钟",       en: "~{n} min" },
  "pre.spoilerUnlock":      { zh: "🔓 解锁轻剧透（第一幕提示）", en: "🔓 Reveal light spoiler (first-act hint)" },
  "pre.spoilerLocked":      { zh: "此段含轻微剧情氛围提示，点击展开", en: "Contains light atmosphere hint. Tap to reveal." },
  "pre.cached":             { zh: "⚡ 已缓存",          en: "⚡ Cached" },
  "pre.aiGenerating":       { zh: "AI 生成中…",        en: "Generating…" },
  "pre.aiAnalyzing":        { zh: "AI 分析中…",        en: "Analyzing…" },
  "pre.expandMore":         { zh: "展开更多（还有 {n} 条）", en: "Show more ({n} more)" },
  "pre.aiError":            { zh: "AI 内容生成失败，请刷新页面重试", en: "AI content failed. Please refresh." },
  "pre.factsError":         { zh: "花絮加载失败，请刷新页面重试", en: "Fun facts failed. Please refresh." },
  "pre.vocabError":         { zh: "词汇预习生成失败，请刷新页面重试", en: "Vocabulary generation failed. Please refresh." },
  "pre.breaksError":        { zh: "厕所时间分析失败，请刷新页面重试", en: "Break analysis failed. Please refresh." },
  "pre.roleDirector":       { zh: "导演",              en: "Director" },
  "pre.roleActor":          { zh: "演员",              en: "Actor" },
  "pre.playPronunciation":  { zh: "播放发音",          en: "Play pronunciation" },

  // ── Post-movie sections ────────────────────────────────────────────────
  "post.plotSummary":       { zh: "剧情梳理",          en: "Plot Summary" },
  "post.characters":        { zh: "人物关系",          en: "Characters" },
  "post.easterEggs":        { zh: "彩蛋 & 隐藏细节",    en: "Easter Eggs & Hidden Details" },
  "post.spoilerFunFacts":   { zh: "幕后揭秘",          en: "Behind the Scenes" },
  "post.personalRating":    { zh: "我的评分",          en: "My Rating" },
  "post.lockTitle":         { zh: "观后复盘",          en: "Post-Film Review" },
  "post.lockHintLine1":     { zh: "以下内容包含完整剧透", en: "Contains full spoilers" },
  "post.lockHintLine2":     { zh: "剧情梳理 · 人物关系 · 彩蛋解析", en: "Plot · Characters · Easter Eggs" },
  "post.lockHintLine3":     { zh: "请确认已看完电影再解锁", en: "Confirm you've finished the film." },
  "post.unlockButton":      { zh: "我已看完，解锁复盘",  en: "I've watched it — unlock" },
  "post.spoilerBar":        { zh: "以下内容含完整剧透",  en: "Contains full spoilers" },
  "post.generating":        { zh: "AI 正在生成复盘内容…", en: "Generating review content…" },
  "post.error":             { zh: "观后复盘生成失败，请刷新页面重试", en: "Review generation failed. Please refresh." },
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
