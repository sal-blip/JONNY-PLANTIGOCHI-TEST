// Flex only the lamina below its attachment. Repeated rows deepen a wilt
// without breaking a blade into detached pixels or lifting it off the vine.
export function vineBladeRows({rows, ay}, pose) {
  const wilt = pose === "dry" || pose === "critical";
  const result = [];
  rows.forEach((row, y) => {
    const depth = Math.max(0, (y - ay) / Math.max(1, rows.length - 1 - ay));
    const shift = Math.round(depth * (wilt ? (pose === "critical" ? 4 : 2) : pose));
    const line = ".".repeat(2 + shift) + row;
    result.push(line);
    if (wilt && y > ay && y % (pose === "critical" ? 3 : 6) === 0) result.push(line);
  });
  return result;
}
