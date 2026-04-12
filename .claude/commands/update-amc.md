# /update-amc — 更新 AMC 院线片目录

从 AMC Theatres 官网实时抓取最新片单，与 `app/catalog.ts` 中的 `MOVIE_CATALOG` 对比，生成差异报告并在确认后更新。

---

## 执行步骤

### 第一步：检查 CDP 并抓取 AMC 数据

必须加载 web-access skill 并遵循指引。

```bash
node "/Users/oldfisherman/.claude/plugins/cache/web-access/web-access/2.4.2/scripts/check-deps.mjs"
```

打开 AMC 页面并提取电影列表：

```javascript
// 在 CDP eval 中运行，提取所有院线片
JSON.stringify(
  Array.from(document.querySelectorAll('[class*="MovieTitle"], h3, [data-testid*="movie"]'))
    .map(el => {
      const title = el.innerText?.trim();
      if (!title || title.length > 80 || title.length < 2) return null;
      const container = el.closest('[class*="movie"], [class*="Movie"], article, li') || el.parentElement?.parentElement;
      const text = container?.innerText || "";
      const dateMatch = text.match(/(?:Opens?|Released?|Coming)[\s:]*([A-Za-z]+ \d{1,2},?\s*\d{4})/i)
                     || text.match(/([A-Za-z]+ \d{1,2},?\s*\d{4})/);
      return { title, date: dateMatch?.[1] || "" };
    })
    .filter(x => x?.title && x?.date)
    .filter((x, i, arr) => arr.findIndex(y => y.title === x.title) === i)
)
```

如果 JS 提取失败，回退到滚动 + 截图分析。

### 第二步：读取现有目录，生成差异报告

读取 `app/catalog.ts` 中的 `MOVIE_CATALOG`，对比抓取结果：

**输出格式：**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AMC 院线更新报告 · 2026.XX.XX
━━━━━━━━━━━━━━━━━━━━━━━━━━━

新增（N 部）
  + Film Title          → 预计上映：Month D, YYYY
  + Film Title 2        → 预计上映：Month D, YYYY

已下线（N 部）
  - Film Title          （catalog rank #N）

上映日期变更（N 部）
  ~ Film Title          旧：March 1, 2026 → 新：March 15, 2026

无变化：N 部
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

如无差异，报告并结束：`✓ 目录与 AMC 官网一致，无需更新。`

### 第三步：确定中文译名（仅新增片）

对新增片，按优先级确定中文译名：
1. 搜索豆瓣官网 / zh.wikipedia / 官方中文宣传页
2. 找不到官方译名则自行翻译，后缀标注 `（暂译）`

### 第四步：等待用户确认

**在用户明确说「确认更新」或「yes」之前，不修改任何文件。**

询问用户：
```
以上变更是否确认？
输入「确认」执行更新，或指定要跳过的影片。
```

### 第五步：更新 app/catalog.ts（确认后）

按以下规则修改 `MOVIE_CATALOG`：

- **新增片**：追加到末尾，`rank` 续接最大值+1，`imdbScore: null`，`posterUrl: null`
- **下线片**：默认保留（注释掉），仅在用户明确要求删除时删除
- **日期变更**：更新 `released` 字段

新增片模板：
```typescript
{ title: "Film Title", zh: "中文译名", year: "2026", released: "Month D, YYYY", genre: "类型", amc: "film-title-XXXXX", rank: N, imdbScore: null, posterUrl: null },
```

`amc` slug 从 AMC URL 路径提取（如 `amctheatres.com/movies/film-title-82865` → `film-title-82865`）。

### 第六步：补全 imdbScore 和 posterUrl

对新增片运行补全：

```bash
cd /Users/oldfisherman/Desktop/cine-companion && node scripts/bake-posters.mjs
```

### 第七步：验证 + 提交

```bash
cd /Users/oldfisherman/Desktop/cine-companion && npx tsc --noEmit
```

无报错后提交：

```bash
git add app/catalog.ts && git commit -m "catalog: add N new AMC titles (Month YYYY)"
```

---

## 提示

更新目录后建议运行 `/warm` 为新片预烘焙 AI 内容，否则首次访问新片详情页时需等待 AI 实时生成（约 30s）。
