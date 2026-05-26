<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>

      <div class="card budget-card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.budgetTitle') }}</h3>
          <div class="budget-display">{{ currencySymbol }}{{ budget.toLocaleString() }}</div>
        </div>
        <div class="slider-row">
          <span class="slider-bound">{{ currencySymbol }}0</span>
          <input
            type="range"
            class="budget-slider"
            :min="0"
            :max="sliderMax"
            :step="sliderStep"
            v-model.number="budget"
            :style="{ '--progress': sliderProgress + '%' }"
          />
          <span class="slider-bound">{{ currencySymbol }}{{ sliderMax.toLocaleString() }}</span>
        </div>
        <p class="hint">{{ t('restocking.budgetHint') }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card info">
          <div class="stat-label">{{ t('restocking.recommendedItems') }}</div>
          <div class="stat-value">{{ recommendations.length }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">{{ t('restocking.totalUnits') }}</div>
          <div class="stat-value">{{ totalUnits.toLocaleString() }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">{{ t('restocking.estimatedCost') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('restocking.remainingBudget') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ remainingBudget.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.recommendationsTitle') }}</h3>
          <button
            class="place-order-btn"
            :disabled="!canSubmit || submitting"
            @click="placeOrder"
          >
            <span v-if="submitting">{{ t('restocking.submitting') }}</span>
            <span v-else>{{ t('restocking.placeOrder') }}</span>
          </button>
        </div>

        <div v-if="recommendations.length === 0" class="empty-state">
          {{ t('restocking.emptyState') }}
        </div>

        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.itemName') }}</th>
                <th>{{ t('restocking.table.category') }}</th>
                <th>{{ t('restocking.table.trend') }}</th>
                <th class="num-col">{{ t('restocking.table.demandGap') }}</th>
                <th class="num-col">{{ t('restocking.table.recommendedQty') }}</th>
                <th class="num-col">{{ t('restocking.table.unitCost') }}</th>
                <th class="num-col">{{ t('restocking.table.lineCost') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in recommendations" :key="rec.item_sku">
                <td><strong>{{ rec.item_sku }}</strong></td>
                <td>{{ rec.item_name }}</td>
                <td>{{ rec.category }}</td>
                <td>
                  <span :class="['badge', rec.trend]">{{ t(`trends.${rec.trend}`) }}</span>
                </td>
                <td class="num-col">{{ rec.demand_gap }}</td>
                <td class="num-col"><strong>{{ rec.quantity }}</strong></td>
                <td class="num-col">{{ currencySymbol }}{{ rec.unit_cost.toFixed(2) }}</td>
                <td class="num-col">{{ currencySymbol }}{{ rec.line_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="successMessage" class="success-toast">{{ successMessage }}</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'

const TREND_PRIORITY = { increasing: 0, stable: 1, decreasing: 2 }

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency } = useI18n()

    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const loading = ref(true)
    const error = ref(null)
    const submitting = ref(false)
    const successMessage = ref('')
    const forecasts = ref([])
    const budget = ref(5000)

    // Slider range derived from data: 0 → cost of fulfilling every demand gap.
    const sliderMax = computed(() => {
      const maxCost = forecasts.value.reduce((sum, f) => {
        const gap = Math.max(0, (f.forecasted_demand || 0) - (f.current_demand || 0))
        return sum + gap * (f.unit_cost || 0)
      }, 0)
      // Round up to nearest $1k, with a $5k floor so the slider feels usable.
      return Math.max(5000, Math.ceil(maxCost / 1000) * 1000)
    })

    const sliderStep = computed(() => sliderMax.value >= 50000 ? 500 : 100)

    const sliderProgress = computed(() => {
      if (!sliderMax.value) return 0
      return Math.min(100, Math.max(0, (budget.value / sliderMax.value) * 100))
    })

    // Greedy fill: rank by trend (increasing first), then by demand gap descending.
    const recommendations = computed(() => {
      const candidates = forecasts.value
        .map(f => ({
          item_sku: f.item_sku,
          item_name: f.item_name,
          category: f.category || 'Uncategorized',
          trend: f.trend,
          unit_cost: f.unit_cost || 0,
          demand_gap: Math.max(0, (f.forecasted_demand || 0) - (f.current_demand || 0)),
        }))
        .filter(c => c.demand_gap > 0 && c.unit_cost > 0)
        .sort((a, b) => {
          const trendDiff = (TREND_PRIORITY[a.trend] ?? 99) - (TREND_PRIORITY[b.trend] ?? 99)
          if (trendDiff !== 0) return trendDiff
          return b.demand_gap - a.demand_gap
        })

      const recs = []
      let remaining = budget.value

      for (const c of candidates) {
        if (remaining < c.unit_cost) continue
        const affordableUnits = Math.floor(remaining / c.unit_cost)
        const qty = Math.min(c.demand_gap, affordableUnits)
        if (qty <= 0) continue
        const line_cost = +(qty * c.unit_cost).toFixed(2)
        recs.push({ ...c, quantity: qty, line_cost })
        remaining -= line_cost
      }
      return recs
    })

    const totalUnits = computed(() => recommendations.value.reduce((s, r) => s + r.quantity, 0))
    const estimatedCost = computed(() => +recommendations.value.reduce((s, r) => s + r.line_cost, 0).toFixed(2))
    const remainingBudget = computed(() => +(budget.value - estimatedCost.value).toFixed(2))
    const canSubmit = computed(() => recommendations.value.length > 0)

    const loadForecasts = async () => {
      try {
        loading.value = true
        forecasts.value = await api.getDemandForecasts()
      } catch (err) {
        error.value = 'Failed to load demand forecasts: ' + err.message
      } finally {
        loading.value = false
      }
    }

    const placeOrder = async () => {
      if (!canSubmit.value) return
      submitting.value = true
      successMessage.value = ''
      try {
        const payload = {
          budget: budget.value,
          items: recommendations.value.map(r => ({
            item_sku: r.item_sku,
            item_name: r.item_name,
            category: r.category,
            quantity: r.quantity,
            unit_cost: r.unit_cost,
          })),
        }
        const result = await api.submitRestockingOrder(payload)
        successMessage.value = t('restocking.successMessage', {
          id: result.id,
          days: result.lead_time_days,
        })
        setTimeout(() => { successMessage.value = '' }, 6000)
      } catch (err) {
        const detail = err.response?.data?.detail || err.message
        error.value = `Failed to submit: ${detail}`
        setTimeout(() => { error.value = null }, 5000)
      } finally {
        submitting.value = false
      }
    }

    onMounted(loadForecasts)

    return {
      t,
      currencySymbol,
      loading,
      error,
      submitting,
      successMessage,
      budget,
      sliderMax,
      sliderStep,
      sliderProgress,
      recommendations,
      totalUnits,
      estimatedCost,
      remainingBudget,
      canSubmit,
      placeOrder,
    }
  }
}
</script>

<style scoped>
.budget-card .card-header {
  align-items: baseline;
}

.budget-display {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: -0.025em;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.slider-bound {
  font-size: 0.813rem;
  color: #64748b;
  font-weight: 500;
  min-width: 64px;
}

.slider-bound:last-child {
  text-align: right;
}

.budget-slider {
  flex: 1;
  appearance: none;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #2563eb 0%, #2563eb var(--progress, 50%), #e2e8f0 var(--progress, 50%), #e2e8f0 100%);
  outline: none;
  cursor: pointer;
}

.budget-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #2563eb;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s;
}

.budget-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.budget-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #2563eb;
  cursor: pointer;
}

.hint {
  font-size: 0.813rem;
  color: #64748b;
  margin-top: 0.75rem;
}

.place-order-btn {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.place-order-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.place-order-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.place-order-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.num-col {
  text-align: right;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.938rem;
}

.success-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #065f46;
  color: white;
  padding: 0.875rem 1.25rem;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 1000;
  max-width: 360px;
}
</style>
