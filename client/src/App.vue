<template>
  <div class="app">
    <header class="top-nav">
      <div class="nav-container">
        <div class="logo">
          <h1>{{ t('nav.companyName') }}</h1>
          <span class="subtitle">{{ t('nav.subtitle') }}</span>
        </div>
        <nav class="nav-tabs">
          <router-link to="/" :class="{ active: $route.path === '/' }">
            {{ t('nav.overview') }}
          </router-link>
          <router-link to="/inventory" :class="{ active: $route.path === '/inventory' }">
            {{ t('nav.inventory') }}
          </router-link>
          <router-link to="/orders" :class="{ active: $route.path === '/orders' }">
            {{ t('nav.orders') }}
          </router-link>
          <router-link to="/spending" :class="{ active: $route.path === '/spending' }">
            {{ t('nav.finance') }}
          </router-link>
          <router-link to="/demand" :class="{ active: $route.path === '/demand' }">
            {{ t('nav.demandForecast') }}
          </router-link>
          <router-link to="/restocking" :class="{ active: $route.path === '/restocking' }">
            {{ t('nav.restocking') }}
          </router-link>
          <router-link to="/reports" :class="{ active: $route.path === '/reports' }">
            {{ t('nav.reports') }}
          </router-link>
        </nav>
        <button
          class="theme-toggle"
          :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          {{ theme === 'dark' ? '☀' : '☾' }}
        </button>
        <LanguageSwitcher />
        <ProfileMenu
          @show-profile-details="showProfileDetails = true"
          @show-tasks="showTasks = true"
        />
      </div>
    </header>
    <FilterBar />
    <main class="main-content">
      <router-view />
    </main>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import { useTheme } from './composables/useTheme'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

export default {
  name: 'App',
  components: {
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const { theme, toggle: toggleTheme } = useTheme()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const localTasks = ref([])

    const tasks = computed(() => [...currentUser.value.tasks, ...localTasks.value])

    const nextTaskId = () => {
      const all = [...currentUser.value.tasks, ...localTasks.value]
      return all.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1
    }

    const addTask = (taskData) => {
      localTasks.value.unshift({
        id: nextTaskId(),
        status: 'pending',
        ...taskData,
      })
    }

    const deleteTask = (taskId) => {
      const mockIdx = currentUser.value.tasks.findIndex(t => t.id === taskId)
      if (mockIdx !== -1) {
        currentUser.value.tasks.splice(mockIdx, 1)
        return
      }
      localTasks.value = localTasks.value.filter(t => t.id !== taskId)
    }

    const toggleTask = (taskId) => {
      const target = currentUser.value.tasks.find(t => t.id === taskId)
        || localTasks.value.find(t => t.id === taskId)
      if (target) {
        target.status = target.status === 'pending' ? 'completed' : 'pending'
      }
    }

    return {
      t,
      theme,
      toggleTheme,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-nav {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 2rem;
  height: 70px;
}

.nav-container > .nav-tabs {
  margin-left: auto;
  margin-right: 1rem;
}

.nav-container > .language-switcher {
  margin-right: 1rem;
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.logo h1 {
  font-size: 1.375rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.subtitle {
  font-size: 0.813rem;
  color: #64748b;
  font-weight: 400;
  padding-left: 0.75rem;
  border-left: 1px solid #e2e8f0;
}

.nav-tabs {
  display: flex;
  gap: 0.25rem;
}

.nav-tabs a {
  padding: 0.625rem 1.25rem;
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.938rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-tabs a:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.nav-tabs a.active {
  color: #2563eb;
  background: #eff6ff;
}

.nav-tabs a.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #2563eb;
}

.main-content {
  flex: 1;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h2 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.375rem;
  letter-spacing: -0.025em;
}

.page-header p {
  color: #64748b;
  font-size: 0.938rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.625rem;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.stat-card.warning .stat-value {
  color: #ea580c;
}

.stat-card.success .stat-value {
  color: #059669;
}

.stat-card.danger .stat-value {
  color: #dc2626;
}

.stat-card.info .stat-value {
  color: #2563eb;
}

.card {
  background: white;
  border-radius: 10px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  color: #475569;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #f1f5f9;
  color: #334155;
  font-size: 0.875rem;
}

tbody tr {
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: #f8fafc;
}

.badge {
  display: inline-block;
  padding: 0.313rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge.success {
  background: #d1fae5;
  color: #065f46;
}

.badge.warning {
  background: #fed7aa;
  color: #92400e;
}

.badge.danger {
  background: #fecaca;
  color: #991b1b;
}

.badge.info {
  background: #dbeafe;
  color: #1e40af;
}

.badge.increasing {
  background: #d1fae5;
  color: #065f46;
}

.badge.decreasing {
  background: #fecaca;
  color: #991b1b;
}

.badge.stable {
  background: #e0e7ff;
  color: #3730a3;
}

.badge.high {
  background: #fecaca;
  color: #991b1b;
}

.badge.medium {
  background: #fed7aa;
  color: #92400e;
}

.badge.low {
  background: #dbeafe;
  color: #1e40af;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 0.938rem;
}

.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-size: 0.938rem;
}

.theme-toggle {
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  margin-right: 0.75rem;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.theme-toggle:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

/* ===== Dark mode overrides =====
   Uses !important to win over scoped styles in components that hardcode
   light hex colors (kpi-card, filter-bar, etc.). A real implementation
   would refactor scoped styles to CSS custom properties. */

/* Surfaces */
html[data-theme='dark'] body {
  background: #0b1220 !important;
  color: #e2e8f0 !important;
}
html[data-theme='dark'] .top-nav,
html[data-theme='dark'] .filters-bar {
  background: #0f172a !important;
  border-color: #1e293b !important;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.4) !important;
}
html[data-theme='dark'] .card,
html[data-theme='dark'] .stat-card,
html[data-theme='dark'] .kpi-card,
html[data-theme='dark'] .modal-content,
html[data-theme='dark'] .dropdown-menu,
html[data-theme='dark'] .summary-card {
  background: #111c2e !important;
  border-color: #1e293b !important;
  color: #e2e8f0 !important;
}
html[data-theme='dark'] .stat-card:hover,
html[data-theme='dark'] .kpi-card:hover {
  border-color: #334155 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35) !important;
}
html[data-theme='dark'] .card-header,
html[data-theme='dark'] .kpi-progress-bar {
  border-bottom-color: #1e293b !important;
  background: #1e293b !important;
}
html[data-theme='dark'] thead {
  background: #0f172a !important;
  border-color: #1e293b !important;
}
html[data-theme='dark'] tbody tr:hover {
  background: #0f172a !important;
}

/* Borders for striped rows */
html[data-theme='dark'] td,
html[data-theme='dark'] tr {
  border-top-color: #1e293b !important;
}

/* Typography — headings */
html[data-theme='dark'] .logo h1,
html[data-theme='dark'] .page-header h2,
html[data-theme='dark'] .card-title,
html[data-theme='dark'] .stat-value,
html[data-theme='dark'] .kpi-value,
html[data-theme='dark'] .donut-center-value,
html[data-theme='dark'] h1,
html[data-theme='dark'] h2,
html[data-theme='dark'] h3 {
  color: #f1f5f9 !important;
}

/* Typography — muted/secondary */
html[data-theme='dark'] .subtitle,
html[data-theme='dark'] .page-header p,
html[data-theme='dark'] .header-meta,
html[data-theme='dark'] .stat-label,
html[data-theme='dark'] .kpi-label,
html[data-theme='dark'] .kpi-goal,
html[data-theme='dark'] .section-title,
html[data-theme='dark'] .legend-item,
html[data-theme='dark'] .hint,
html[data-theme='dark'] .loading,
html[data-theme='dark'] th,
html[data-theme='dark'] .filter-group label,
html[data-theme='dark'] .filter-group > span {
  color: #94a3b8 !important;
}

/* Body text inside tables/cards */
html[data-theme='dark'] td,
html[data-theme='dark'] .legend-item-compact {
  color: #cbd5e1 !important;
}
html[data-theme='dark'] .subtitle {
  border-left-color: #1e293b !important;
}

/* Nav tabs */
html[data-theme='dark'] .nav-tabs a {
  color: #94a3b8;
}
html[data-theme='dark'] .nav-tabs a:hover {
  color: #f1f5f9;
  background: #1e293b;
}
html[data-theme='dark'] .nav-tabs a.active {
  color: #60a5fa;
  background: rgba(37, 99, 235, 0.15);
}
html[data-theme='dark'] .nav-tabs a.active::after {
  background: #60a5fa;
}

/* Theme toggle button */
html[data-theme='dark'] .theme-toggle {
  border-color: #334155;
  color: #cbd5e1;
}
html[data-theme='dark'] .theme-toggle:hover {
  background: #1e293b;
  color: #f1f5f9;
  border-color: #475569;
}

/* Form controls */
html[data-theme='dark'] input,
html[data-theme='dark'] select,
html[data-theme='dark'] textarea,
html[data-theme='dark'] .filter-select,
html[data-theme='dark'] .reset-filters-btn {
  background: #0f172a !important;
  color: #e2e8f0 !important;
  border-color: #334155 !important;
}
html[data-theme='dark'] .filter-select:hover,
html[data-theme='dark'] .reset-filters-btn:hover:not(:disabled) {
  background: #1e293b !important;
  border-color: #475569 !important;
  color: #f1f5f9 !important;
}
html[data-theme='dark'] input::placeholder {
  color: #64748b !important;
}

/* Buttons (excluding primary action buttons that carry brand color) */
html[data-theme='dark'] button:not(.place-order-btn):not(.theme-toggle):not(.btn-primary) {
  color: inherit;
}
</style>
