export function layoutRightLabels(items, minGapPx, topPx, bottomPx) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const minGap = Math.max(0, Number(minGapPx) || 0);
  const top = Number(topPx) || 0;
  const bottom = Number(bottomPx) || 0;

  const sortByY = (a, b) => {
    if (a.y === b.y) {
      return (b.priority || 0) - (a.priority || 0);
    }
    return a.y - b.y;
  };

  const place = (activeItems) => {
    const sorted = [...activeItems].sort(sortByY);
    if (sorted.length === 0) {
      return [];
    }

    const placed = [];
    let prevY = top - minGap;

    sorted.forEach((item, index) => {
      const floorY = top + index * minGap;
      const y = Math.max(item.y, prevY + minGap, floorY);
      placed.push({ ...item, y });
      prevY = y;
    });

    const overflow = Math.max(0, placed[placed.length - 1].y - bottom);
    if (overflow > 0) {
      const shiftCap = placed.reduce((minShift, item, index) => {
        const floorY = top + index * minGap;
        return Math.min(minShift, item.y - floorY);
      }, Infinity);
      const shift = Math.min(overflow, Math.max(0, shiftCap));
      if (shift > 0) {
        return placed.map((item) => ({ ...item, y: item.y - shift }));
      }
    }

    return placed;
  };

  let active = [...items];
  let placed = place(active);

  while (placed.length > 0 && placed[placed.length - 1].y > bottom) {
    let removeIndex = 0;
    for (let i = 1; i < active.length; i += 1) {
      const removeCurrent =
        (active[i].priority || 0) < (active[removeIndex].priority || 0) ||
        ((active[i].priority || 0) === (active[removeIndex].priority || 0) && active[i].y > active[removeIndex].y);
      if (removeCurrent) {
        removeIndex = i;
      }
    }

    active.splice(removeIndex, 1);
    placed = place(active);
  }

  const placedByKey = new Map(placed.map((item) => [item.key, item]));
  return items.map((item) => {
    const match = placedByKey.get(item.key);
    if (!match) {
      return { ...item, visible: false };
    }
    return { ...item, y: match.y, visible: true };
  });
}
