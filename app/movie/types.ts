export interface VocabItem {
  word: string;
  translation: string;
  explanation: string;
  category: string;
}

export interface MovieData {
  id: string;
  title: string;
  zhTitle?: string;
  zhPlot?: string;
  year: string;
  released?: string;
  genre: string;
  director: string;
  actors: string;
  runtime: string;
  poster: string | null;
  plot: string;
  ratings: {
    imdb: string | null;
    imdbVotes: string | null;
    rt: string | null;
    metacritic: string | null;
  };
}

export interface BreakItem {
  minute: number;
  duration: number;
  scene_hint: string;
  miss_risk: "低" | "中";
}

export interface BreaksContent {
  breaks: BreakItem[];
  best_break: number;
  runtime_min: number;
  conservative_breaks?: BreakItem[];
  relaxed_breaks?: BreakItem[];
  cached?: boolean;
}

export interface LiveRatings {
  imdb:   { score: string | null; votes: string | null } | null;
  rt:     { tomatometer: string | null; audience: string | null; url: string | null } | null;
  mc:     { metascore: string | null; userScore: string | null; url: string | null } | null;
  douban: { score: string | null; votes: string | null; url: string | null } | null;
}

export interface AiContent {
  vocabulary: VocabItem[];
  background: {
    summary: string;
    context: string[];
    director_note: string;
    wikipedia: string | null;
  };
}

export interface FunFactItem {
  fact: string;
  category: "制作花絮" | "幕后秘闻" | "选角故事" | "原著改编" | "技术亮点" | "导演风格";
}

export interface FunFacts {
  fun_facts: FunFactItem[];
  first_act_hint: string;
}

export interface PostContent {
  plot_summary: { sections: Array<{ title: string; content: string }>; theme: string; act1?: string; act2?: string; act3?: string };
  characters: Array<{ name: string; zh_name: string; actor: string; description: string; importance?: number }>;
  relationships?: Array<{ from: string; to: string; label: string }>;
  easter_eggs: Array<{ detail: string; category: string }>;
  spoiler_fun_facts: Array<{ fact: string; category: string }>;
}

export interface VerdictContent {
  one_line_verdict: string;
  good_for: string[];
  not_good_for: string[];
  prior_knowledge: "none" | "low" | "medium" | "high";
  pacing: "slow" | "mixed" | "fast";
  english_difficulty: "low" | "medium" | "high";
  english_note: string;
  theatrical_need: "low" | "medium" | "high";
  recommendation_score: number;
  has_credits_scene: boolean;
  credits_detail: string;
  one_line_summary: string;
}

export interface PersonalRating { imdbId: string; scores: number[]; timestamp: number; }

export const GENRE_ZH: Record<string, string> = {
  "Action": "动作", "Adventure": "冒险", "Animation": "动画", "Biography": "传记",
  "Comedy": "喜剧", "Crime": "犯罪", "Documentary": "纪录片", "Drama": "剧情",
  "Family": "家庭", "Fantasy": "奇幻", "History": "历史", "Horror": "恐怖",
  "Music": "音乐", "Musical": "音乐剧", "Mystery": "悬疑", "Romance": "爱情",
  "Sci-Fi": "科幻", "Short": "短片", "Sport": "体育", "Thriller": "惊悚",
  "War": "战争", "Western": "西部",
};

export const TITLE_ZH: Record<string, string> = {
  "The Super Mario Galaxy Movie": "超级马里奥银河电影版",
  "Project Hail Mary": "挽救计划",
  "You, Me & Tuscany": "你、我与托斯卡纳",
  "Faces of Death": "死亡之脸",
  "The Drama": "The Drama",
  "Hoppers": "狸想世界",
  "Newborn": "新生",
  "Beast": "猛兽",
  "Hunting Matthew Nichols": "追捕马修·尼科尔斯",
  "A Great Awakening": "大觉醒",
  "They Will Kill You": "他们会杀了你",
  "Reminders of Him": "念你之名",
  "Exit 8": "8号出口",
  "Ready or Not 2: Here I Come": "准备好了没2：我来了",
  "Hamlet": "哈姆雷特",
  "Dacoit: A Love Story": "Dacoit：爱情故事",
  "ChaO": "ChaO",
  "Scream 7": "惊声尖叫7",
  "Goat": "传奇山羊",
};

export const RATING_KEY = "cine-companion-ratings";
export const HISTORY_KEY = "cine-companion-history";
export const RATING_DIMS = ["剧情", "视觉", "表演", "音乐", "回味"];

export const EGG_ICON: Record<string, string> = { "致敬": "🎞️", "伏笔": "🔍", "隐喻": "💡", "彩蛋": "🥚", "续集线索": "🔗" };

export const FACT_CATEGORY_ICON: Record<string, string> = {
  "制作花絮": "🎥",
  "幕后秘闻": "🔍",
  "选角故事": "🌟",
  "原著改编": "📖",
  "技术亮点": "⚡",
  "导演风格": "🎬",
};

export const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  俚语:     { bg: "rgba(194,65,12,0.2)",  text: "#FB923C", dot: "#F97316" },
  专业术语: { bg: "rgba(3,105,161,0.2)",  text: "#38BDF8", dot: "#0EA5E9" },
  文化背景词:{ bg: "rgba(88,28,135,0.2)", text: "#C084FC", dot: "#A855F7" },
  人名地名: { bg: "rgba(6,78,59,0.2)",    text: "#34D399", dot: "#10B981" },
};

export const CATEGORY_ORDER = ["文化背景词", "俚语", "人名地名", "专业术语"];
