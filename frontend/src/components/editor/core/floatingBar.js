// Shared by TableTools/MediaTools/LinkTools: each is a small floating bar
// anchored just above whatever you're currently interacting with (a
// table cell, an image/video, a link). All three had the same bug when
// that anchor was near the top of the scrollable editor area: with
// nowhere to fit above it, the bar would still render there anyway,
// landing right on top of (and hiding) the very thing you were editing,
// with no way to move it out of the way. This flips the bar below the
// target when there isn't room above, and keeps it from running off the
// right edge of the visible editor too.
//
// `barEl` is the floating bar's own DOM node, if it's been rendered
// already — its real measured size is what "is there room above"
// actually depends on, but that's only available *after* the first
// paint, so every caller does a same-effect measurement using a
// reasonable guess, then a requestAnimationFrame follow-up once barEl is
// real. See TableTools/MediaTools/LinkTools for that two-pass pattern.
export function computeFloatingBarPosition(targetRect, bodyEl, barEl, fallback = {}) {
  const bodyRect = bodyEl.getBoundingClientRect();
  const barHeight = barEl?.offsetHeight || fallback.height || 38;
  const barWidth = barEl?.offsetWidth || fallback.width || 200;

  const spaceAbove = targetRect.top - bodyRect.top;
  const top = spaceAbove >= barHeight + 10
    ? targetRect.top - bodyRect.top + bodyEl.scrollTop - barHeight - 6
    : targetRect.bottom - bodyRect.top + bodyEl.scrollTop + 6;

  const naturalLeft = targetRect.left - bodyRect.left + bodyEl.scrollLeft;
  const maxLeft = bodyEl.scrollLeft + Math.max(4, bodyEl.clientWidth - barWidth - 4);
  const left = Math.min(Math.max(naturalLeft, bodyEl.scrollLeft + 4), maxLeft);

  return { top: Math.max(4, top), left };
}

export default computeFloatingBarPosition;
