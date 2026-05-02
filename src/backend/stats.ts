// Push game metrics to VictoriaMetrics (or any Prometheus-compatible endpoint).
// Set VICTORIAMETRICS_URL to enable. Optionally set VICTORIAMETRICS_USER and
// VICTORIAMETRICS_PASSWORD for basic auth.
//
// Metrics are tracked as monotonically increasing counters so that Prometheus
// rate() / increase() work correctly.

const vmUrl = process.env.VICTORIAMETRICS_URL || ''
const vmUser = process.env.VICTORIAMETRICS_USER || ''
const vmPass = process.env.VICTORIAMETRICS_PASSWORD || ''
const prefix = 'tippycoco'

const counters: Record<string, number> = {}

if (!vmUrl) {
  console.log('VICTORIAMETRICS_URL not set — game stats will only be logged to stdout.')
}

async function pushMetric(name: string, labels: Record<string, string>, val: number): Promise<void> {
  if (!vmUrl) return
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',')
  const line = `${name}{${labelStr}} ${val}\n`
  const url = `${vmUrl}/api/v1/import/prometheus`
  const headers: Record<string, string> = {'Content-Type': 'text/plain'}
  if (vmUser && vmPass) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${vmUser}:${vmPass}`).toString('base64')
  }
  try {
    await fetch(url, {method: 'POST', headers, body: line})
  } catch (err) {
    console.error(`[stats] failed to push metric: ${err}`)
  }
}

async function count(statName: string, n: number, labels: Record<string, string> = {}): Promise<void> {
  const allLabels: Record<string, string> = {event: statName, ...labels}
  const key = Object.keys(allLabels)
    .sort()
    .map((k) => `${k}=${allLabels[k]}`)
    .join(',')
  counters[key] = (counters[key] || 0) + n
  console.log(`[stats] ${key} +${n} (=${counters[key]})`)
  await pushMetric(`${prefix}_events_total`, allLabels, counters[key])
}

async function value(statName: string, val: number): Promise<void> {
  console.log(`[stats] ${statName} = ${val}`)
  await pushMetric(`${prefix}_value`, {stat: statName}, val)
}

export {count, value}
