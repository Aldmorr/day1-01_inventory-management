import axios from 'axios'

const API_BASE_URL = 'http://localhost:8001/api'

// Short-TTL GET cache: switching between Dashboard / Orders / Spending hits the
// same endpoints with the same filters in quick succession. 30s is short enough
// not to mask backend changes during dev but long enough to absorb tab-flipping.
const CACHE_TTL_MS = 30_000
const cache = new Map()

async function cachedGet(path, params = null) {
  const qs = params ? params.toString() : ''
  const key = qs ? `${path}?${qs}` : path
  const entry = cache.get(key)
  const now = Date.now()
  if (entry && now - entry.t < CACHE_TTL_MS) {
    return entry.v
  }
  const response = await axios.get(`${API_BASE_URL}${key}`)
  cache.set(key, { t: now, v: response.data })
  return response.data
}

function clearCache() {
  cache.clear()
}

function inventoryFilters(filters) {
  const params = new URLSearchParams()
  if (filters.warehouse && filters.warehouse !== 'all') params.append('warehouse', filters.warehouse)
  if (filters.category && filters.category !== 'all') params.append('category', filters.category)
  return params
}

function orderFilters(filters) {
  const params = inventoryFilters(filters)
  if (filters.status && filters.status !== 'all') params.append('status', filters.status)
  if (filters.month && filters.month !== 'all') params.append('month', filters.month)
  return params
}

export const api = {
  getInventory: (filters = {}) => cachedGet('/inventory', inventoryFilters(filters)),
  getInventoryItem: (id) => cachedGet(`/inventory/${id}`),
  getOrders: (filters = {}) => cachedGet('/orders', orderFilters(filters)),
  getOrder: (id) => cachedGet(`/orders/${id}`),
  getDemandForecasts: () => cachedGet('/demand'),
  getBacklog: () => cachedGet('/backlog'),
  getDashboardSummary: (filters = {}) => cachedGet('/dashboard/summary', orderFilters(filters)),
  getSpendingSummary: () => cachedGet('/spending/summary'),
  getMonthlySpending: () => cachedGet('/spending/monthly'),
  getCategorySpending: () => cachedGet('/spending/categories'),
  getTransactions: () => cachedGet('/spending/transactions'),
  getQuarterlyReports: (filters = {}) => cachedGet('/reports/quarterly', orderFilters(filters)),
  getMonthlyTrends: (filters = {}) => cachedGet('/reports/monthly-trends', orderFilters(filters)),

  async submitRestockingOrder(payload) {
    const response = await axios.post(`${API_BASE_URL}/restocking/orders`, payload)
    // Restocking mutates state the GET endpoints might surface; nuke the cache.
    clearCache()
    return response.data
  },

  getRestockingOrders: () => cachedGet('/restocking/orders'),

  clearCache,
}
