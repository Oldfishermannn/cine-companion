export interface CatalogMovie {
  title: string;
  zh: string;
  year: string;
  released: string;
  genre: string;
  amc: string;
  rank: number;
}

// 数据来源：amctheatres.com/movies CDP 实时抓取，2026-04-11
// 自动更新：launchd 每日拉取 AMC 官网，新片 zh 译名由 Claude Haiku 生成；
//          rank 保持既有顺序，新片追加末尾；运行 /update-amc 可手动重排评分
export const MOVIE_CATALOG: CatalogMovie[] = [
  { title: "Project Hail Mary",            zh: "挽救计划",        year: "2026", released: "March 20, 2026",    genre: "科幻", amc: "project-hail-mary-76779",            rank: 1 },
  { title: "Beast",                        zh: "猛兽",          year: "2026", released: "April 10, 2026",    genre: "动作", amc: "beast-82916",                        rank: 2 },
  { title: "Hoppers",                      zh: "狸想世界",        year: "2026", released: "March 6, 2026",     genre: "动画", amc: "hoppers-72462",                      rank: 3 },
  { title: "Hamlet",                       zh: "哈姆雷特",        year: "2026", released: "April 10, 2026",    genre: "剧情", amc: "hamlet-82659",                       rank: 4 },
  { title: "Exit 8",                       zh: "8号出口",        year: "2026", released: "April 10, 2026",    genre: "惊悚", amc: "exit-8-82865",                       rank: 5 },
  { title: "ChaO",                         zh: "ChaO",        year: "2026", released: "April 10, 2026",    genre: "动画", amc: "chao-82925",                         rank: 6 },
  { title: "Goat",                         zh: "传奇山羊",        year: "2026", released: "February 13, 2026", genre: "运动", amc: "goat-77194",                         rank: 7 },
  { title: "Hunting Matthew Nichols",      zh: "追捕马修·尼科尔斯",   year: "2026", released: "March 27, 2026",    genre: "惊悚", amc: "hunting-matthew-nichols-82455",      rank: 8 },
  { title: "A Great Awakening",            zh: "大觉醒",         year: "2026", released: "April 3, 2026",     genre: "剧情", amc: "a-great-awakening-81931",            rank: 9 },
  { title: "The Drama",                    zh: "The Drama",   year: "2026", released: "April 3, 2026",     genre: "喜剧", amc: "the-drama-81887",                    rank: 10 },
  { title: "Ready or Not 2: Here I Come",  zh: "准备好了没2：我来了",  year: "2026", released: "March 27, 2026",    genre: "惊悚", amc: "ready-or-not-2-here-i-come-80592",   rank: 11 },
  { title: "They Will Kill You",           zh: "他们会杀了你",      year: "2026", released: "March 27, 2026",    genre: "惊悚", amc: "they-will-kill-you-71213",           rank: 12 },
  { title: "You, Me & Tuscany",            zh: "你、我与托斯卡纳",    year: "2026", released: "April 10, 2026",    genre: "爱情", amc: "you-me-tuscany-80165",               rank: 13 },
  { title: "Reminders of Him",             zh: "念你之名",        year: "2026", released: "March 13, 2026",    genre: "爱情", amc: "reminders-of-him-71462",             rank: 14 },
  { title: "Faces of Death",               zh: "死亡之脸",        year: "2026", released: "April 10, 2026",    genre: "惊悚", amc: "faces-of-death-82688",               rank: 15 },
  { title: "The Super Mario Galaxy Movie", zh: "超级马里奥银河电影版",  year: "2026", released: "April 3, 2026",     genre: "动画", amc: "the-super-mario-galaxy-movie-71465", rank: 16 },
  { title: "Scream 7",                     zh: "惊声尖叫7",       year: "2026", released: "February 27, 2026", genre: "惊悚", amc: "scream-7-78363",                     rank: 17 },
  { title: "Newborn",                      zh: "新生",          year: "2026", released: "April 10, 2026",    genre: "惊悚", amc: "newborn-83288",                      rank: 18 },
  { title: "Dacoit: A Love Story",         zh: "Dacoit：爱情故事", year: "2026", released: "April 10, 2026",    genre: "动作", amc: "dacoit-a-love-story-80879",          rank: 19 },
];

export const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();
