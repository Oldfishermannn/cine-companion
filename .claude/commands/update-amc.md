# 更新 AMC 院线片目录

从 AMC Theatres 官网抓取最新院线片列表，更新 `app/page.tsx` 中的 `MOVIE_CATALOG`。

## 执行步骤

### 第一步：启动 CDP 并抓取 AMC 数据

必须加载 web-access skill 并遵循指引。

1. 检查 CDP 依赖：`node "/Users/oldfisherman/.claude/plugins/cache/web-access/web-access/2.4.2/scripts/check-deps.mjs"`
2. 打开 AMC 页面：`curl -s "http://localhost:3456/new?url=https://www.amctheatres.com/movies"`
3. 等待加载后滚动到底部触发懒加载
4. 用以下 JS 提取全部电影标题 + 上映日期：

```javascript
JSON.stringify(
  Array.from(document.querySelectorAll("h3"))
    .map(h3 => {
      const title = h3.innerText.trim();
      if (!title || title.length > 60) return null;
      const txt = h3.parentElement?.innerText || "";
      const dateMatch = txt.match(/Released\s+([A-Za-z]+ \d+,?\s*\d{4})/);
      const anyDate = txt.match(/([A-Za-z]+ \d+,?\s*\d{4})/);
      return { title, date: dateMatch?.[1] || anyDate?.[1] || "" };
    })
    .filter(x => x && x.title && x.date)
)
```

5. 关闭 tab

### 第二步：对照现有目录，生成差异报告

读取 `app/page.tsx` 中现有的 `MOVIE_CATALOG`，对比抓取结果：
- **新增片**：AMC 有、目录没有
- **已下线片**：目录有、AMC 没有
- **日期变更**：同名片 released 字段不同

向用户展示差异报告，格式如下：
```
新增（N 部）：
  + Title → "released date" → 建议中文译名
下线（N 部）：
  - Title
日期更新（N 部）：
  ~ Title: 旧日期 → 新日期
```

### 第三步：生成中文译名（仅新增片）

对新增片，按以下优先级确定中文译名：
1. 搜索豆瓣 / zh.wikipedia 找官方译名
2. 无官方译名则自行翻译并标注`(暂译)`

### 第四步：更新 app/page.tsx

**仅在用户确认后**执行以下更新：
- 新增片追加到 `MOVIE_CATALOG` 末尾
- 更新有变化的 `released` 字段
- 删除已下线的条目（如用户要求）
- 更新文件头注释中的抓取日期

更新格式：
```typescript
{ title: "Title", zh: "中文译名", year: "YYYY", released: "Month D, YYYY" },
```

### 注意事项

- `released` 字段必须用 AMC 官网一手数据，不用 OMDb（OMDb 对新片无数据，会返回旧片日期）
- 中文译名需人工确认，暂译标注`(暂译)`
- 更新后运行 `npx tsc --noEmit` 验证无 TypeScript 错误
