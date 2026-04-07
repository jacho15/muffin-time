export const queryCache = new Map<string, unknown[]>()
export const inflightQueries = new Map<string, Promise<unknown[]>>()

export function clearTableCache() {
  queryCache.clear()
  inflightQueries.clear()
}
