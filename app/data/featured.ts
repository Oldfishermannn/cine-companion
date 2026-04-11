/**
 * The Editor's Slate — 4 hand-picked films rendered as the big
 * asymmetric contact-sheet on the homepage. These live outside the AMC
 * catalog because some of them aren't currently in theaters — they're
 * editorial picks, not showtimes.
 *
 * Click → /movie?q=${title}; the detail page's /api/movie route handles
 * Chinese↔English translation and poster fetch on its own.
 */

export interface FeaturedFilm {
  title: string;   // English title used for the query
  zh: string;      // Chinese title rendered alongside
  year: string;    // displayed in the mono meta line
  note: string;    // one-line Chinese editorial hook
}

export const FEATURED_FILMS: FeaturedFilm[] = [
  {
    title: "Project Hail Mary",
    zh: "挽救计划",
    year: "2026",
    note: "Andy Weir · 孤身一人的星际救赎",
  },
  {
    title: "Dune",
    zh: "沙丘",
    year: "2021",
    note: "Villeneuve · 沙海中的命运与权力",
  },
  {
    title: "Oppenheimer",
    zh: "奥本海默",
    year: "2023",
    note: "Nolan · 黎明前的核火",
  },
  {
    title: "Reminders of Him",
    zh: "念你之名",
    year: "2026",
    note: "Colleen Hoover · 救赎与心碎",
  },
];
