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

// 数据来源：amctheatres.com/movies CDP 实时抓取，2026-04-25
// IMDb 分数：刻入本文件，首页直接按 imdbScore 本地排序，不再 mount 时并发 fetch。
// 自动更新：launchd 每日拉取 AMC 官网，新片 zh 译名由 Gemini 2.5 Flash 生成；
//          新片的 imdbScore 从 OMDb/IMDb 实时抓取；老片 imdbScore 保持继承。
//          rank 保持既有顺序，新片追加末尾；运行 /update-amc 可手动重排评分
export const MOVIE_CATALOG: CatalogMovie[] = [
  { title: "Project Hail Mary",            zh: "挽救计划",         year: "2026", released: "March 20, 2026",    genre: "科幻", amc: "project-hail-mary-76779",            rank:  1, imdbScore: 8.4, posterUrl: "https://m.media-amazon.com/images/M/MV5BNTkwNzJiYTctNzI3NC00NjE1LTlhYjktY2Q5MTdmMWFmNzcxXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Hoppers",                      zh: "狸想世界",         year: "2026", released: "March 6, 2026",     genre: "动画", amc: "hoppers-72462",                      rank:  2, imdbScore: 7.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BNzRiMzZlMTMtNmU3OC00MDUwLThmNDUtMTBjZmQ3MWQ4NTljXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "The Super Mario Galaxy Movie", zh: "超级马里奥银河电影版",   year: "2026", released: "April 3, 2026",     genre: "动画", amc: "the-super-mario-galaxy-movie-71465", rank:  3, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BNDMyODQzZjAtNmYxYS00YjNiLWEzYTMtNzgyZWE5ODBkZDVhXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "The Drama",                    zh: "戏剧人生",         year: "2026", released: "April 3, 2026",     genre: "喜剧", amc: "the-drama-81887",                    rank:  4, imdbScore: 7.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BZDdmZmFhOTgtYTNjNS00YjM1LWE3NzAtNGU1ZTc1ZjAyYmFiXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "You, Me & Tuscany",            zh: "你、我与托斯卡纳",     year: "2026", released: "April 10, 2026",    genre: "爱情", amc: "you-me-tuscany-80165",               rank:  5, imdbScore: 6.2, posterUrl: "https://m.media-amazon.com/images/M/MV5BZjg0MjliNDctMDE3NS00ZmMzLWE1ODUtZDcyN2I3NDE2YmUxXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Lee Cronin's The Mummy",       zh: "木乃伊",          year: "2026", released: "April 17, 2026",    genre: "恐怖", amc: "lee-cronin-s-the-mummy-77326",       rank:  6, imdbScore: 6.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BNWQ1NzI2YTUtN2E0ZS00YzVmLTkxNjktMWIzNTYwMzkyOTU0XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Normal",                       zh: "常人",           year: "2026", released: "April 17, 2026",    genre: "剧情", amc: "normal-81925",                       rank:  7, imdbScore: 7.1, posterUrl: "https://m.media-amazon.com/images/M/MV5BMjM0N2E0MjQtNTUzNy00OTc1LTliZDctYWVmZGMyNzVjZTg1XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Busboys",                      zh: "巴士男孩",         year: "2026", released: "April 17, 2026",    genre: "剧情", amc: "busboys-83226",                      rank:  8, imdbScore: null, posterUrl: "https://m.media-amazon.com/images/M/MV5BZTNiNzA4YWYtMjgxMy00NzJhLWJkMjQtMGMxZjA4N2VlNGU3XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Lorne",                        zh: "洛恩",           year: "2026", released: "April 17, 2026",    genre: "剧情", amc: "lorne-82943",                        rank:  9, imdbScore: 6.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BZTUyMzZkMzMtYzY5Mi00NGZjLWEzMzktZmM4NGVkNTBjMjUwXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Michael",                      zh: "迈克",           year: "2026", released: "April 24, 2026",    genre: "喜剧", amc: "michael-75846",                      rank: 10, imdbScore: 5.7, posterUrl: "https://m.media-amazon.com/images/M/MV5BNzllNmRlN2EtMDQyOC00ODJjLTg4OWQtZDNmNGU3YzlkNjc1XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Mother Mary",                  zh: "圣母玛利亚",        year: "2026", released: "April 17, 2026",    genre: "剧情", amc: "mother-mary-82637",                  rank: 11, imdbScore: 4.0, posterUrl: "https://m.media-amazon.com/images/M/MV5BZWM0NTIzMWEtOWU1ZC00OTEyLThmNTItYjM1N2Y1MDllMGYzXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Over Your Dead Body",          zh: "致命遗产",         year: "2026", released: "April 24, 2026",    genre: "剧情", amc: "over-your-dead-body-82791",          rank: 12, imdbScore: 6.1, posterUrl: "https://m.media-amazon.com/images/M/MV5BMWU2M2YyNTMtZGM4ZC00MDcwLWI3NmItZWM0YjIyOTEyNDZhXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Desert Warrior",               zh: "沙漠战士",         year: "2026", released: "April 24, 2026",    genre: "动作", amc: "desert-warrior-82915",               rank: 13, imdbScore: 3.5, posterUrl: "https://m.media-amazon.com/images/M/MV5BYjBhN2U5NjMtYjA2Yi00ZTVlLTlkNGMtNjViOWQzMzc5M2I2XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Fuze",                         zh: "聚变",           year: "2026", released: "April 24, 2026",    genre: "动作", amc: "fuze-82395",                         rank: 14, imdbScore: 6.4, posterUrl: "https://m.media-amazon.com/images/M/MV5BM2FlZWFjNTItMDk2MS00Mjg5LWJkYWEtY2I3Yjc0NjI1MTE5XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "I Swear",                      zh: "我发誓",          year: "2026", released: "April 24, 2026",    genre: "剧情", amc: "i-swear-82964",                      rank: 15, imdbScore: 8.4, posterUrl: "https://m.media-amazon.com/images/M/MV5BNWQxYTMyZTktZDg5Yi00Y2YwLWI4YzQtMjkyYmYxNmFjYThmXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Fight Club 4K Remaster",       zh: "搏击俱乐部 4K 修复版", year: "1999", released: "April 22, 2026",    genre: "剧情", amc: "fight-club-4k-remaster-83179",       rank: 16, imdbScore: 8.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Speed Racer",                  zh: "极速赛车手",        year: "2008", released: "April 20, 2026",    genre: "动作", amc: "speed-racer-83438",                  rank: 17, imdbScore: 6.1, posterUrl: "https://m.media-amazon.com/images/M/MV5BNzE3MWIxNzktYzQyMy00NGQ5LThmZTktM2ZkZjc0NWEzZTg5XkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Broken Bird",                  zh: "断翼之鸟",         year: "2024", released: "April 24, 2026",    genre: "剧情", amc: "broken-bird-81435",                  rank: 18, imdbScore: null, posterUrl: null },
  { title: "Whisper of the Heart",         zh: "侧耳倾听",         year: "1995", released: "April 21, 2026",    genre: "动画", amc: "whisper-of-the-heart-4k-imax-83027", rank: 19, imdbScore: 7.8, posterUrl: "https://m.media-amazon.com/images/M/MV5BZWVlOGNlYjgtYWE4Yi00MjdiLWE1MTEtZTRmNzI1ODk5NzMzXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
  { title: "Blue Angels 3D",               zh: "蓝天使 3D",       year: "2024", released: "February 14, 2026", genre: "剧情", amc: "blue-angels-3d-82514",               rank: 20, imdbScore: null, posterUrl: "https://m.media-amazon.com/images/M/MV5BMzczNmI3YTYtZjhiYy00N2RmLTliZDktZDQ5NTEzMWE1ZjAyXkEyXkFqcGc@._V1_QL90_UX1200_.jpg" },
];

export const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();
