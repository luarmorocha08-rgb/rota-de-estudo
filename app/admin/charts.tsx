/** Gráfico de barras de uma série só (sem legenda; o título do cartão diz o que é). */
export function DayBars({ days, values, color, unit }: { days: string[]; values: number[]; color: string; unit: string }) {
  const W = 600, H = 170, padL = 26, padB = 22, padT = 8;
  const max = Math.max(1, ...values);
  const nice = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const bw = (W - padL) / days.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / nice);
  const ticks = [0, nice / 2, nice].filter((v, i, a) => a.indexOf(v) === i && Number.isInteger(v));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${unit} por dia nos últimos ${days.length} dias`}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={padL} x2={W} y1={y(t)} y2={y(t)} />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end">{t}</text>
        </g>
      ))}
      {values.map((v, i) => {
        const h = Math.max(0, y(0) - y(v));
        const x = padL + i * bw + 1;
        const w = Math.max(2, bw - 2);
        const [yy, mm, dd] = days[i].split("-");
        return (
          <g key={days[i]}>
            <rect x={x} y={padT} width={w} height={H - padT - padB} fill="transparent">
              <title>{`${dd}/${mm}/${yy}: ${v} ${unit}`}</title>
            </rect>
            {v > 0 && (
              <path className="bar" fill={color} d={`M${x},${y(0)} V${y(v) + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, w / 2)},-${Math.min(4, h)} H${x + w - Math.min(4, w / 2)} q${Math.min(4, w / 2)},0 ${Math.min(4, w / 2)},${Math.min(4, h)} V${y(0)} Z`}>
                <title>{`${dd}/${mm}/${yy}: ${v} ${unit}`}</title>
              </path>
            )}
            {(i === 0 || i === days.length - 1 || (i % 7 === 0 && days.length - 1 - i >= 4)) && <text x={x + w / 2} y={H - 6} textAnchor="middle">{`${dd}/${mm}`}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function HBars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="empty">Ainda não há dados.</p>;
  return (
    <div className="hbars">
      {rows.map(([l, v]) => (
        <div className="hbar" key={l} title={`${l}: ${v}`}>
          <span className="lbl">{l}</span>
          <span className="track"><span className="fill" style={{ display: "block", width: `${(v / max) * 100}%` }} /></span>
          <span className="val">{v}</span>
        </div>
      ))}
    </div>
  );
}

