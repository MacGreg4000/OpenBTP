export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  // unwrap { data } if present
  return (Array.isArray(j) || j?.data === undefined) ? j : j.data
}

