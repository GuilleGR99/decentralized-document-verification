import fs from "fs";

const METRICS_PATH = "/shared/metrics.json";

function loadMetrics() {
  if (!fs.existsSync(METRICS_PATH)) return [];
  return JSON.parse(fs.readFileSync(METRICS_PATH));
}

function saveMetrics(data) {
  fs.writeFileSync(METRICS_PATH, JSON.stringify(data, null, 2));
}

export function persistMetrics(entry) {
  const metrics = loadMetrics();

  if (!metrics.some(e => e.cid === entry.cid)) {
    metrics.push(entry);
    saveMetrics(metrics);
  }
}

export function getMetrics() {
  return loadMetrics();
}