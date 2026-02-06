// Shared vertical scrollbar helpers.

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function getVerticalScrollMetrics({
  scroll,
  contentSize,
  viewSize,
  trackX,
  trackY,
  trackW,
  trackH,
  minThumb = 20
}) {
  const max = Math.max(0, contentSize - viewSize);
  const enabled = max > 0;
  const thumbH = enabled ? Math.max(minThumb, Math.round((viewSize / contentSize) * trackH)) : trackH;
  const thumbTravel = Math.max(1, trackH - thumbH);
  const thumbY = trackY + Math.round((clamp(scroll, 0, Math.max(1, max)) / Math.max(1, max)) * thumbTravel);
  return { enabled, max, trackX, trackY, trackW, trackH, thumbH, thumbY, thumbTravel };
}

export function isPointInTrack(x, y, m) {
  return x >= m.trackX && x <= m.trackX + m.trackW &&
    y >= m.trackY && y <= m.trackY + m.trackH;
}

export function scrollFromPointerY(y, m) {
  const ratio = (y - m.trackY) / m.trackH;
  return Math.round(clamp(ratio, 0, 1) * m.max);
}

export function drawVerticalScrollbar(ctx, m, style = {}) {
  if (!m.enabled) return;
  const trackColor = style.trackColor || 'rgba(40,56,84,0.9)';
  const thumbColor = style.thumbColor || '#FFDD44';
  ctx.fillStyle = trackColor;
  ctx.fillRect(m.trackX, m.trackY, m.trackW, m.trackH);
  ctx.fillStyle = thumbColor;
  ctx.fillRect(m.trackX + 1, m.thumbY, Math.max(1, m.trackW - 2), m.thumbH);
}
