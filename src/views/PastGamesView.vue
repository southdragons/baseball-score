<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const games = ref([])
const loading = ref(true)
const currentSeason = ref(new Date().getFullYear())
const seasons = ref([])

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function fetchGames() {
  loading.value = true
  const today = formatDate(new Date())

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .lt('game_date', today)
    .eq('season', currentSeason.value)
    .order('game_date', { ascending: false })

  if (!error) games.value = data || []

  const { data: seasonData } = await supabase
    .from('games')
    .select('season')
    .order('season', { ascending: false })
  if (seasonData) {
    seasons.value = [...new Set(seasonData.map(g => g.season))]
  }

  loading.value = false
}

function statusLabel(status) {
  if (status === 'upcoming') return '⏳ 試合前'
  if (status === 'in_progress') return '⚾ 試合中'
  if (status === 'finished') return '✅ 試合終了'
  return ''
}

function statusClass(status) {
  if (status === 'upcoming') return 'badge-ghost'
  if (status === 'in_progress') return 'badge-warning'
  if (status === 'finished') return 'badge-success'
  return ''
}

watch(currentSeason, fetchGames)
onMounted(fetchGames)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="mb-4">
      <div class="relative flex items-center justify-center mb-2">
        <router-link to="/" class="btn btn-sm btn-ghost absolute left-0">←</router-link>
        <h1 class="text-xl font-bold">📅 過去の試合</h1>
      </div>
      <select v-model="currentSeason" class="select select-bordered select-sm w-full text-center mt-2">
        <option v-for="s in seasons" :key="s" :value="s">{{ s }}年シーズン</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else>
      <div v-if="!games.length" class="text-center text-gray-500 py-10">
        過去の試合がありません
      </div>

      <div
        v-for="g in games"
        :key="g.id"
        @click="router.push(`/games/${g.id}`)"
        class="card bg-base-100 shadow border border-gray-200 mb-3 cursor-pointer hover:shadow-md transition"
      >
        <div class="card-body py-3">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-500">{{ g.game_date }}</div>
            <div :class="`badge ${statusClass(g.status)}`">{{ statusLabel(g.status) }}</div>
          </div>
          <div class="font-bold text-lg">vs {{ g.opponent }}</div>
          <div v-if="g.location" class="text-sm text-gray-500">📍 {{ g.location }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
