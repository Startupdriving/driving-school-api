export function safeArray(data) {
  return Array.isArray(data) ? data : [];
}

export function safeNumber(value) {
  const n = Number(value);
  return isNaN(n) ? null : n;
}
