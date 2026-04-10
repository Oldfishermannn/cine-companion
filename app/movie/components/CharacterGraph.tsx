"use client";

import React from "react";

export function CharacterGraph({
  characters,
  relationships,
}: {
  characters: Array<{ name: string; zh_name: string; actor: string; description: string; importance?: number }>;
  relationships?: Array<{ from: string; to: string; label: string }>;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const n = characters.length;
  if (n === 0) return null;

  const rels = relationships ?? [];

  const connCount = characters.map((c) =>
    rels.filter(r => r.from === c.name || r.to === c.name).length
  );
  const maxConn = Math.max(...connCount, 1);

  const importanceOf = (i: number): number => {
    const imp = characters[i].importance;
    if (imp === 1 || imp === 2 || imp === 3) return imp;
    const t = connCount[i] / maxConn;
    return t >= 0.7 ? 1 : t >= 0.35 ? 2 : 3;
  };

  const NODE_SIZES = { 1: { w: 140, h: 64 }, 2: { w: 116, h: 52 }, 3: { w: 96, h: 44 } } as const;
  const nodeSize = (i: number) => NODE_SIZES[importanceOf(i) as 1 | 2 | 3];

  const protagonistIdx = characters.reduce(
    (best, _, i) => importanceOf(i) < importanceOf(best) ? i : best, 0
  );

  const W = 430, H = 390;
  const cx = W / 2, cy = H / 2;
  const others = characters.map((_, i) => i).filter(i => i !== protagonistIdx);
  const m = others.length;
  const RADIUS = m <= 2 ? 132 : m <= 3 ? 142 : 152;

  const posMap: Record<number, { x: number; y: number; w: number; h: number }> = {};
  posMap[protagonistIdx] = { x: cx, y: cy, ...nodeSize(protagonistIdx) };
  others.forEach((charIdx, j) => {
    const angle = (j / m) * 2 * Math.PI - Math.PI / 2;
    posMap[charIdx] = {
      x: cx + RADIUS * Math.cos(angle),
      y: cy + RADIUS * Math.sin(angle),
      ...nodeSize(charIdx),
    };
  });

  const nameIndex: Record<string, number> = {};
  characters.forEach((c, i) => { nameIndex[c.name] = i; });

  function rectEdgePoint(px: number, py: number, tx: number, ty: number, hw: number, hh: number): [number, number] {
    const dx = tx - px, dy = ty - py;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const ehw = hw + 1, ehh = hh + 1;
    if (absDx === 0 && absDy === 0) return [px, py];
    if (absDx * ehh > absDy * ehw) {
      return [px + (dx > 0 ? ehw : -ehw), py + dy * (ehw / absDx)];
    } else {
      return [px + dx * (ehh / absDy), py + (dy > 0 ? ehh : -ehh)];
    }
  }

  const ac = active !== null ? characters[active] : null;
  const protoPos = posMap[protagonistIdx];

  return (
    <div style={{ background: "linear-gradient(160deg,rgba(22,19,30,1) 0%,rgba(16,14,22,1) 100%)", border: "1px solid rgba(200,151,58,0.18)", borderRadius: 16, overflow: "hidden" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <marker id="arr-on" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,1 L0,6 L7,3.5 z" fill="#C8973A" />
          </marker>
          <marker id="arr-off" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,1 L0,6 L7,3.5 z" fill="rgba(200,151,58,0.28)" />
          </marker>
          <radialGradient id="vgn" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(200,151,58,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="pglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,151,58,0.16)" />
            <stop offset="100%" stopColor="rgba(200,151,58,0)" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#vgn)" />
        <ellipse cx={protoPos.x} cy={protoPos.y} rx={protoPos.w * 0.7} ry={protoPos.h * 0.9} fill="url(#pglow)" />

        {/* Arrows */}
        {rels.map((rel, k) => {
          const fi = nameIndex[rel.from], ti = nameIndex[rel.to];
          if (fi === undefined || ti === undefined) return null;
          const fp = posMap[fi], tp = posMap[ti];
          const isOn = active === fi || active === ti;

          const [sx, sy] = rectEdgePoint(fp.x, fp.y, tp.x, tp.y, fp.w / 2, fp.h / 2);
          const [ex, ey] = rectEdgePoint(tp.x, tp.y, fp.x, fp.y, tp.w / 2, tp.h / 2);

          const midX = (sx + ex) / 2, midY = (sy + ey) / 2;
          const len = Math.hypot(ex - sx, ey - sy) || 1;
          const nudge = (k % 2 === 0 ? 1 : -1) * 14;
          const nx = -(ey - sy) / len * nudge;
          const ny =  (ex - sx) / len * nudge;
          const cpX = midX + nx, cpY = midY + ny;

          const dist2 = Math.hypot(cpX - ex, cpY - ey) || 1;
          const ex2 = ex + (cpX - ex) / dist2 * 8;
          const ey2 = ey + (cpY - ey) / dist2 * 8;
          const lx = midX + nx * 0.65, ly = midY + ny * 0.65;
          const labelW = rel.label.length * 9 + 14;

          return (
            <g key={k}>
              <path d={`M ${sx} ${sy} Q ${cpX} ${cpY} ${ex2} ${ey2}`}
                fill="none"
                stroke={isOn ? "rgba(200,151,58,0.7)" : "rgba(200,151,58,0.2)"}
                strokeWidth={isOn ? "1.8" : "1"}
                markerEnd={isOn ? "url(#arr-on)" : "url(#arr-off)"}
              />
              <rect x={lx - labelW / 2} y={ly - 9} width={labelW} height={18} rx={9}
                fill={isOn ? "rgba(200,151,58,0.2)" : "rgba(14,12,20,0.92)"}
                stroke={isOn ? "rgba(200,151,58,0.55)" : "rgba(200,151,58,0.18)"}
                strokeWidth="0.8"
              />
              <text x={lx} y={ly + 4.5} textAnchor="middle"
                fill={isOn ? "#D4A84B" : "#70687C"}
                fontSize="9.5" fontFamily="-apple-system,'PingFang SC',sans-serif" fontWeight="500"
              >{rel.label}</text>
            </g>
          );
        })}

        {/* Nodes */}
        {[...characters.map((_, i) => i)].sort((a, b) => importanceOf(b) - importanceOf(a)).map((i) => {
          const c = characters[i];
          const { x, y, w, h } = posMap[i];
          const isProto = i === protagonistIdx;
          const isAct = active === i;
          const imp = importanceOf(i);
          const t = (3 - imp) / 2;
          const R = 8 + t * 4;
          const maxLen = imp === 1 ? 15 : imp === 2 ? 13 : 11;
          const engName = c.name.length > maxLen ? c.name.slice(0, maxLen - 1) + "…" : c.name;
          const engFs = 11 + t * 3;
          const zhFs  = 9.5 + t * 1.5;
          const acW   = Math.round(24 + t * 20);

          return (
            <g key={i} onClick={() => setActive(isAct ? null : i)} style={{ cursor: "pointer" }}>
              {isAct && (
                <rect x={x - w / 2 - 6} y={y - h / 2 - 6} width={w + 12} height={h + 12} rx={R + 5}
                  fill="rgba(200,151,58,0.09)" stroke="none" />
              )}
              <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={R}
                fill={isAct ? "rgba(200,151,58,0.18)" : isProto ? "rgba(200,151,58,0.08)" : "rgba(255,255,255,0.03)"}
                stroke={isAct ? "#C8973A" : isProto ? "rgba(200,151,58,0.55)" : "rgba(200,151,58,0.28)"}
                strokeWidth={isProto ? (isAct ? 2 : 1.4) : (isAct ? 1.5 : 0.9)}
              />
              <rect x={x - acW / 2} y={y - h / 2} width={acW} height={2} rx={1}
                fill={isAct ? "#C8973A" : isProto ? "rgba(200,151,58,0.6)" : "rgba(200,151,58,0.25)"}
              />
              <text x={x} y={y - h * 0.08} textAnchor="middle"
                fill={isAct ? "#EAD98B" : "#C8BCA8"}
                fontSize={engFs}
                fontFamily="Georgia,'Times New Roman',serif"
                fontStyle="italic"
              >{engName}</text>
              <text x={x} y={y + h * 0.28} textAnchor="middle"
                fill={isAct ? "rgba(200,151,58,0.85)" : "#5A5468"}
                fontSize={zhFs}
                fontFamily="-apple-system,'PingFang SC','Microsoft YaHei',sans-serif"
                fontWeight="500"
              >{c.zh_name}</text>
            </g>
          );
        })}
      </svg>

      {ac ? (
        <div style={{ borderTop: "1px solid rgba(200,151,58,0.12)", padding: "16px 20px", background: "rgba(200,151,58,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "1.05rem", color: "#E8DECA" }}>{ac.name}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--gold-dim)", fontWeight: 500 }}>{ac.zh_name}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--faint)" }}>· {ac.actor}</span>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.83rem", color: "#9890A8", lineHeight: 1.7, margin: 0 }}>{ac.description}</p>
        </div>
      ) : (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "rgba(255,255,255,0.18)", textAlign: "center", padding: "8px 0 14px", margin: 0, letterSpacing: "0.04em" }}>点击角色查看详情</p>
      )}
    </div>
  );
}
