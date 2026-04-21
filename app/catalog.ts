export interface CatalogMovie {
  title: string;
  zh: string;
  year: string;
  released: string;
  genre: string;
  amc: string;
  rank: number;
  /** Baked IMDb rating — precomputed so homepage sorts with zero network cost.
   *  Refresh via /update-amc (runs IMDb scrape for every title and rewrites this field). */
  imdbScore: number | null;
  /** Baked poster URL (OMDb / IMDb, already upscaled to _V1_QL90_UX1200_.jpg).
   *  Precomputed so the homepage + editor slate paint posters with zero network cost.
   *  Refresh via `npm run bake-posters` (standalone) or `/update-amc` (for new movies). */
  posterUrl: string | null;
}

// 数据来源：amctheatres.com/movies CDP 实时抓取，2026-04-20
// IMDb 分数：刻入本文件，首页直接按 imdbScore 本地排序，不再 mount 时并发 fetch。
// 自动更新：launchd 每日拉取 AMC 官网，新片 zh 译名由 Gemini 2.5 Flash 生成；
//          新片的 imdbScore 从 OMDb/IMDb 实时抓取；老片 imdbScore 保持继承。
//          rank 保持既有顺序，新片追加末尾；运行 /update-amc 可手动重排评分
export const MOVIE_CATALOG: CatalogMovie[] = [
  { title: "Project Hail Mary",                         zh: "挽救计划",         year: "2026", released: "March 20, 2026", genre: "科幻", amc: "project-hail-mary-76779",                         rank:  1, imdbScore: 8.4, posterUrl: "https://m.media-amazon.com/images/M/MV5BNTkwNzJiYTctNzI3NC00NjE1LTlhYjktY2Q5MTdmMWFmNzcxXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Beast",                                     zh: "猛兽",           year: "2026", released: "April 10, 2026", genre: "动作", amc: "beast-82916",                                     rank:  2, imdbScore: 6.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BYjQ0OTgwZGUtNDhlYi00ZTM5LWI2NmYtNGYwYWJhNzVlYTc5XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Hoppers",                                   zh: "狸想世界",         year: "2026", released: "March 6, 2026",  genre: "动画", amc: "hoppers-72462",                                   rank:  3, imdbScore: 7.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BNzRiMzZlMTMtNmU3OC00MDUwLThmNDUtMTBjZmQ3MWQ4NTljXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "The Super Mario Galaxy Movie",              zh: "超级马里奥银河电影版",   year: "2026", released: "April 3, 2026",  genre: "动画", amc: "the-super-mario-galaxy-movie-71465",              rank:  4, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BNDMyODQzZjAtNmYxYS00YjNiLWEzYTMtNzgyZWE5ODBkZDVhXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Exit 8",                                    zh: "8号出口",         year: "2026", released: "April 10, 2026", genre: "惊悚", amc: "exit-8-82865",                                    rank:  5, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BM2RjMTZkZjktYjY5MC00Njk4LTlmZjgtZDRjMTBiMTY2MzdhXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "The Drama",                                 zh: "The Drama",    year: "2026", released: "April 3, 2026",  genre: "喜剧", amc: "the-drama-81887",                                 rank:  6, imdbScore: 7.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BZDdmZmFhOTgtYTNjNS00YjM1LWE3NzAtNGU1ZTc1ZjAyYmFiXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Ready or Not 2: Here I Come",               zh: "准备好了没2：我来了",   year: "2026", released: "March 20, 2026", genre: "惊悚", amc: "ready-or-not-2-here-i-come-80592",                rank:  7, imdbScore: 6.9, posterUrl: "https://m.media-amazon.com/images/M/MV5BOTUxZDk2ZmQtYWRlYS00MjkxLWEzYTEtMWUzNTcyYTRjMjI5XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "They Will Kill You",                        zh: "他们会杀了你",       year: "2026", released: "March 27, 2026", genre: "惊悚", amc: "they-will-kill-you-71213",                        rank:  8, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BYjg5ZjQ0ZGQtMmY1NS00NTgyLTlkZWYtMDhlNzE3ZGY5ZDdmXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "You, Me & Tuscany",                         zh: "你、我与托斯卡纳",     year: "2026", released: "April 10, 2026", genre: "爱情", amc: "you-me-tuscany-80165",                            rank:  9, imdbScore: 6.2, posterUrl: "https://m.media-amazon.com/images/M/MV5BZjg0MjliNDctMDE3NS00ZmMzLWE1ODUtZDcyN2I3NDE2YmUxXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Reminders of Him",                          zh: "念你之名",         year: "2026", released: "March 13, 2026", genre: "爱情", amc: "reminders-of-him-71462",                          rank: 10, imdbScore: 6.4, posterUrl: "https://m.media-amazon.com/images/M/MV5BNjI4OGM1NDEtYzA1NS00ZDg3LWFmZjUtMjg1MGQ4MTk3NjQzXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Faces of Death",                            zh: "死亡之脸",         year: "2026", released: "April 10, 2026", genre: "惊悚", amc: "faces-of-death-82688",                            rank: 11, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BMGJlZjY2ZGMtYjY0Ny00MTFmLTg0YTItM2MzYTQ4ZGNjMzkxXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Newborn",                                   zh: "新生",           year: "2026", released: "April 10, 2026", genre: "惊悚", amc: "newborn-83288",                                   rank: 12, imdbScore: 6.1, posterUrl: "https://m.media-amazon.com/images/M/MV5BZWNjMjJmYTktMTk1YS00NTg2LTkxODEtOGJkMjAwNDEzNWRiXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Lee Cronin's The Mummy",                    zh: "木乃伊",          year: "2026", released: "April 17, 2026", genre: "恐怖", amc: "lee-cronin-s-the-mummy-77326",                    rank: 13, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BNWQ1NzI2YTUtN2E0ZS00YzVmLTkxNjktMWIzNTYwMzkyOTU0XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Normal",                                    zh: "常人",           year: "2026", released: "April 17, 2026", genre: "剧情", amc: "normal-81925",                                    rank: 14, imdbScore: 7.1, posterUrl: "https://m.media-amazon.com/images/M/MV5BMjM0N2E0MjQtNTUzNy00OTc1LTliZDctYWVmZGMyNzVjZTg1XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Busboys",                                   zh: "巴士男孩",         year: "2026", released: "April 17, 2026", genre: "剧情", amc: "busboys-83226",                                   rank: 15, imdbScore: null, posterUrl: "https://m.media-amazon.com/images/M/MV5BZTNiNzA4YWYtMjgxMy00NzJhLWJkMjQtMGMxZjA4N2VlNGU3XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Lorne",                                     zh: "洛恩",           year: "2026", released: "April 17, 2026", genre: "剧情", amc: "lorne-82943",                                     rank: 16, imdbScore: 6.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BZTUyMzZkMzMtYzY5Mi00NGZjLWEzMzktZmM4NGVkNTBjMjUwXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Bridesmaids: 15th Anniversary",             zh: "伴娘15周年纪念版",    year: "2026", released: "April 17, 2026", genre: "喜剧", amc: "bridesmaids-15th-anniversary-83085",              rank: 17, imdbScore: 6.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BMjAyOTMyMzUxNl5BMl5BanBnXkFtZTcwODI4MzE0NA@@._V1_QL90_UX1200_.jpg" },
  { title: "Ferris Bueller's Day Off 40th Anniversary", zh: "翘课天才40周年纪念版",  year: "2026", released: "April 17, 2026", genre: "喜剧", amc: "ferris-bueller-s-day-off-40th-anniversary-83295", rank: 18, imdbScore: 7.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BZWYwMjUxNjMtMzE0MC00NDM3LWIxMmQtYmEyNWVjNjdlZGZjXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Bhooth Bangla",                             zh: "鬼宅惊魂",         year: "2026", released: "April 17, 2026", genre: "喜剧", amc: "bhooth-bangla-83200",                             rank: 19, imdbScore: 7.2, posterUrl: "https://m.media-amazon.com/images/M/MV5BN2Y3NjRhYmMtNWVjMy00ZmE1LWJkNGYtNDY3Y2I3NjkzOGE0XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Mile End Kicks",                            zh: "英里末路足球队",      year: "2026", released: "April 17, 2026", genre: "喜剧", amc: "mile-end-kicks-82822",                            rank: 20, imdbScore: 6.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BMTk5YzQ1NWQtNmNmNi00N2IyLWJhOTYtNmQ0YTBiY2Q5N2NmXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "The Christophers",                          zh: "克里斯多夫们",       year: "2026", released: "April 10, 2026", genre: "喜剧", amc: "the-christophers-82684",                          rank: 21, imdbScore: 6.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BMDY1YjgyOTAtYjRlNS00NmE4LWE2YTgtZDcxNTBhZGVmMGVlXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "A Little Something Extra",                  zh: "不一样的小事",       year: "2024", released: "April 17, 2026", genre: "喜剧", amc: "a-little-something-extra-77200",                  rank: 22, imdbScore: 7.0, posterUrl: "https://m.media-amazon.com/images/M/MV5BZTAwODk4M2UtNjEyZC00Y2QzLWJlZDEtNjY2YmE5NGExMzVjXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "AMC Scream Unseen: April 20",               zh: "AMC惊悚盲选4月20日", year: "2026", released: "April 20, 2026", genre: "恐怖", amc: "amc-scream-unseen-april-20-83301",                rank: 23, imdbScore: null, posterUrl: null },
  { title: "Speed Racer",                               zh: "极速赛车手",        year: "2008", released: "April 20, 2026", genre: "动作", amc: "speed-racer-83438",                               rank: 24, imdbScore: 6.1, posterUrl: "https://m.media-amazon.com/images/M/MV5BNzE3MWIxNzktYzQyMy00NGQ5LThmZTktM2ZkZjc0NWEzZTg5XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
];

export const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();
