const MAX_CACHE_ENTRIES = 32

class LRUCache<V> {
  private map = new Map<string, V>()
  private max: number
  constructor(max: number) {
    this.max = max
  }

  get(key: string): V | undefined {
    const value = this.map.get(key)
    if (value !== undefined) {
      this.map.delete(key)
      this.map.set(key, value)
    }
    return value
  }

  set(key: string, value: V) {
    if (this.map.has(key)) this.map.delete(key)
    else if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
    this.map.set(key, value)
  }

  delete(key: string) { this.map.delete(key) }
  has(key: string) { return this.map.has(key) }
  clear() { this.map.clear() }
}

export const queryCache = new LRUCache<unknown[]>(MAX_CACHE_ENTRIES)
export const inflightQueries = new Map<string, Promise<unknown[]>>()

export function clearTableCache() {
  queryCache.clear()
  inflightQueries.clear()
}
