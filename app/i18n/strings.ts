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
