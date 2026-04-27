# Lights Out · 影伴 — STATUS

> Updated: 2026-04-27 (CEO mode session: distribution stack P0)
> Live: https://lights-out-cinema.vercel.app
> Repo: github.com/Oldfishermannn/lights-out (main)

---

## 当前进度

P0 「分发漏斗补丁」全部 ship 到 main，等 Vercel deploy 完成端到端验证。

### 已完成（4 个 commit 上 main）

| Commit | What | Why |
|--------|------|-----|
| `0b64439` | **观影报告分享卡** (ShareCard.tsx) | 唯一的 viral loop —— 用户看完评分后生成 1080×1350 PNG，可下载分享小红书/朋友圈 |
| `3b54ebb` | **首页 Editor's Note hero** | 3 秒钟向小红书来访者解释"我能帮你做什么"，杂志风 §章+amber CTA scroll to grid |
| `638e1ab` | **小红书关注 CTA** + `lib/social.ts` | footer + share card 双位置；env 控制（`NEXT_PUBLIC_XHS_LIVE`）现在隐藏，账号建好就开 |
| `83f10d0` | **AMC affiliate 链路 scaffold** + `lib/affiliate.ts` | 所有 TicketCTA 自动 wrap，FlexOffers 注册后只需设 env 就开始计费 |

### 设计原则记录

- **零依赖原则**：ShareCard 用原生 Canvas 画图，不引 html2canvas / qrcode / 任何包
- **env-flag 原则**：所有"等账号 / 等服务注册"的功能都用 `NEXT_PUBLIC_*` env 控制，部署即开关
- **双语原则**：所有新文案进了 `app/i18n/strings.ts`（zh + en），跟项目现有规范一致

---

## 下一步（按优先级）

### P1 · 等董事长账号到位再做
1. **小红书账号建好后** → Vercel env 加 `NEXT_PUBLIC_XHS_URL` / `NEXT_PUBLIC_XHS_HANDLE` / `NEXT_PUBLIC_XHS_LIVE=1`，redeploy 即生效
2. **FlexOffers 注册批准后** → 加 `NEXT_PUBLIC_AFFILIATE_WRAP_URL` (含 `{url}` 占位符) + `NEXT_PUBLIC_AFFILIATE_LIVE=1`

### P1 · 我下一个 session 可继续的
3. **PWA 添加到主屏幕** —— manifest.json + 引导弹窗（留存）
4. **邮件订阅"新片上映提醒"** —— Vercel + Resend 免费层，主动召回用户
5. **5 篇小红书笔记完整文案** —— 按董事长之前要求的"互联网套路"，已经给了 1 篇 demo（在对话里），其余 4 篇待写

### P2 · 流量起来再做
6. 单点付费 / sponsorship BD
7. AdSense（仅当其他都失败时）

---

## Blocker / 需要董事长决策的事

**目前没有 blocker。** 4 件 P0 全部技术完成，剩下两件 env 配置等董事长账号就绪。

董事长需要做的事（攒批，按时间序）：

1. **建小红书账号**（专门号"影伴 LightsOut"或同义名）→ 配 3 个 env
2. **注册 FlexOffers + 申请 AMC affiliate**（5-7 天审核）→ 配 2 个 env
3. **后续小红书笔记发布**（content 我可以写，董事长复制粘贴发）

---

## 关键事实（不要重复问董事长）

- **Vercel plan**: Hobby 免费层（不是 Pro）
- **真实月烧**: ~$10–18（几乎全是 Claude API 成本）
- **API 成本结构**: 跟用户数无关，只跟影片更新间隔有关（缓存命中率高）
- **技术栈**: Next.js 16 + Tailwind 4 + Claude API + OMDb
- **当前用户**: < 20，绝大多数是创始人 + AI
- **品牌定位**: 北美华人 AMC 院线观影助手（不要扩展电视剧/书评，已被否决）
- **创始人偏好**: 不喜欢做日常内容运营，但愿意"建专门号 + 复制粘贴"

---

## 已端到端验证

- [x] TypeScript clean (`npx tsc --noEmit` exit 0)
- [x] ESLint clean (only pre-existing warning unrelated to changes)
- [x] Next.js production build clean (`npx next build` exit 0)
- [x] **生产端 verify**: lights-out-cinema.vercel.app HTTP 200, 首页含 "听不懂英语电影笑点..." hero 文本，CTA "看本周热映"
- [x] **生产 JS bundle**: `0xw2myj7_vn4t.js` 含 `share.title` / `share.download` 键，`0k_f~fkp0ib~v.js` 含中文文案"保存图片"，`AFFILIATE_LIVE` env 检查已 ship
- [x] **本地 dev 渲染**: `.home-intro` section 渲染，CTA `home-intro-cta` 链接到 `#now-showing` 锚点正确，`.xhs-follow` 隐藏（XHS_LIVE 未设）
- [x] **运行时无 console error**（本地 dev 通过 preview MCP 检查）
