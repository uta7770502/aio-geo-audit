export function getTrend(rows){return (rows||[]).filter(r=>Number.isFinite(Number(r.appearance))&&Number.isFinite(Number(r.cited))).slice(-12)}
