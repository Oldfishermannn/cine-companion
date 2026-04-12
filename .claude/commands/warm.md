# /warm — 预烘焙 AI 内容到 baked.json

为所有院线片预生成 AI 内容，写入 `app/generated/baked.json`（Tier 0 缓存）。

预烘焙后，访问任意院线片详情页时所有内容（词汇/背景/花絮/厕所时间/决策卡/观后复盘）均从静态文件读取，首屏零 AI 延迟。

---

## 使用场景

| 场景 | 命令 |
|------|------|
| 全量烘焙（跳过已存在的内容） | `/warm` |
| 强制重烘焙所有内容（如修改了 prompt） | `/warm force` |
| 只重烘焙决策卡（verdict） | `/warm verdict` |
| 只重烘焙幕后花絮（facts） | `/warm facts` |

---

## 执行步骤

### 第一步：检查 dev server

```bash
curl -s http://localhost:3000/api/movie?q=test | head -c 100
```

如果返回 JSON 则 server 正在运行，跳到第二步。否则先在另一个终端启动：

```bash
npm run dev
```

等待 `✓ Ready` 出现后继续。

### 第二步：读取参数

解析用户输入：
- 无参数 → 标准模式（跳过已有内容）
- `force` → 设置 `FORCE=1`
- `verdict` → 仅烘焙 `_verdict` 端点
- `facts` → 仅烘焙 `_facts` 端点
- `ai` → 仅烘焙 `_ai`（词汇+背景）端点
- `breaks` → 仅烘焙 `_breaks` 端点

### 第三步：运行预烘焙脚本

**标准模式（跳过已有）：**
```bash
cd /Users/oldfisherman/Desktop/cine-companion && npm run warm-catalog
```

**强制重烘焙所有内容：**
```bash
cd /Users/oldfisherman/Desktop/cine-companion && FORCE=1 npm run warm-catalog
```

**只重烘焙 verdict（修改了决策卡 prompt 后使用）：**

使用 Node.js 直接调用 API，只更新 `_verdict` 键：

```bash
cd /Users/oldfisherman/Desktop/cine-companion && node -e "
const fs = require('fs');
const path = require('path');

// 解析环境变量
const dotenv = fs.readFileSync('.env.local', 'utf8');
for (const line of dotenv.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const BAKED = path.join(__dirname, 'app/generated/baked.json');
const baked = JSON.parse(fs.readFileSync(BAKED, 'utf8'));
const BASE = 'http://localhost:3000';

// 提取 catalog
const src = fs.readFileSync('app/catalog.ts', 'utf8');
const entries = [...src.matchAll(/title:\s*\"([^\"]+)\"[^}]*?zh:\s*\"([^\"]+)\"[^}]*?year:\s*\"([^\"]+)\"/g)]
  .map(m => ({ title: m[1], zh: m[2], year: m[3] }));

(async () => {
  for (const { title, zh, year } of entries) {
    const metaKey = Object.keys(baked).find(k => k.endsWith('_meta') && baked[k]?.title?.toLowerCase() === title.toLowerCase());
    if (!metaKey) { console.log('skip (no meta):', title); continue; }
    const id = metaKey.replace('_meta', '');
    const meta = baked[metaKey];
    const params = new URLSearchParams({ id, title: meta.title, year: meta.year||'', genre: meta.genre||'', plot: meta.plot||'', director: meta.director||'', actors: meta.actors||'', runtime: meta.runtime||'' });
    try {
      const r = await fetch(BASE + '/api/movie-verdict?' + params, { signal: AbortSignal.timeout(90000) });
      const v = await r.json();
      if (v.error) { console.warn('FAIL', title, v.error); continue; }
      delete v.cached;
      baked[id + '_verdict'] = v;
      fs.writeFileSync(BAKED, JSON.stringify(baked, null, 2));
      console.log('OK', title, v.recommendation_score);
    } catch(e) { console.warn('ERR', title, e.message); }
  }
  console.log('done');
})();
"
```

### 第四步：验证结果

```bash
cd /Users/oldfisherman/Desktop/cine-companion && node -e "
const b = require('./app/generated/baked.json');
const keys = Object.keys(b);
const meta = keys.filter(k => k.endsWith('_meta')).length;
const verdict = keys.filter(k => k.endsWith('_verdict')).length;
const facts = keys.filter(k => k.endsWith('_facts')).length;
const breaks = keys.filter(k => k.endsWith('_breaks')).length;
const post = keys.filter(k => k.endsWith('_post')).length;
console.log('baked.json 统计：');
console.log('  _meta:    ', meta, '部电影');
console.log('  _verdict: ', verdict, '个决策卡');
console.log('  _facts:   ', facts, '个花絮');
console.log('  _breaks:  ', breaks, '个厕所时间');
console.log('  _post:    ', post, '个观后内容');
console.log('  total:    ', keys.length, '个键');
"
```

期望输出：19 部电影，每类内容 19 个。

### 第五步：提交

如果内容更新有意义（如修改了 prompt 后重烘焙）：

```bash
cd /Users/oldfisherman/Desktop/cine-companion && git add app/generated/baked.json && git commit -m "chore: rebake AI content$([ -n \"$CONTENT_TYPE\" ] && echo \" ($CONTENT_TYPE)\" || echo \"\")"
```

---

## 注意事项

- dev server 必须运行（warm 脚本调用 HTTP API，不直接调用 Claude SDK）
- 全量烘焙约需 5–8 分钟（19 部 × 6 端点，串行执行避免 rate limit）
- `FORCE=1` 模式会重新消耗 Anthropic API token，谨慎使用
- 烘焙过程中 baked.json 增量写入，中断后重跑不会丢失已完成内容
