<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const players = ref([])
const atBats = ref([])
const steals = ref([])
const loading = ref(true)
const currentSeason = ref(new Date().getFullYear())
const seasons = ref([])

async function fetchData() {
  loading.value = true
  const [playersRes, atBatsRes, stealsRes, seasonRes] = await Promise.all([
    supabase.from('players').select('*').eq('status', 'active').order('player_code'),
    supabase.from('at_bats').select('*, games!inner(season)').eq('games.season', currentSeason.value),
    supabase.from('steals').select('*, games!inner(season)').eq('games.season', currentSeason.value),
    supabase.from('games').select('season').order('season', { ascending: false })
  ])
  if (!playersRes.error) players.value = playersRes.data || []
  if (!atBatsRes.error) atBats.value = atBatsRes.data || []
  if (!stealsRes.error) steals.value = stealsRes.data || []
  if (!seasonRes.error) seasons.value = [...new Set(seasonRes.data.map(g => g.season))]
  loading.value = false
}

const playerStats = computed(() => {
  return players.value.map(p => {
    const playerAtBats = atBats.value.filter(ab => ab.player_id === p.id)
    const playerSteals = steals.value.filter(s => s.player_id === p.id)
    const ab = playerAtBats.filter(ab => !['四球', '死球', '犠打', '犠飛'].includes(ab.result.split('(')[0])).length
    const hits = playerAtBats.filter(ab => ['ヒット', '2塁打', '3塁打', 'ホームラン'].includes(ab.result.split('(')[0])).length
    const hr = playerAtBats.filter(ab => ab.result.split('(')[0] === 'ホームラン').length
    const rbi = playerAtBats.reduce((s, ab) => s + (ab.rbi || 0), 0)
    return {
      id: p.id,
      name: p.name,
      grade: p.grade,
      player_code: p.player_code,
      ab,
      hits,
      hr,
      rbi,
      steals: playerSteals.length,
      avgStr: ab > 0 ? (hits / ab).toFixed(3) : '---'
    }
  })
})

watch(currentSeason, fetchData)
onMounted(fetchData)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6 bg-gray-50 min-h-screen">
    <div class="mb-4">
      <div class="relative flex items-center justify-center mb-2">
        <router-link to="/stats" class="btn btn-sm btn-ghost absolute left-0">←</router-link>
        <h1 class="text-xl font-bold">👥 全選手の記録</h1>
      </div>
      <p class="text-xs text-gray-500 text-center mb-2">タップして個人成績を確認</p>
      <select v-model="currentSeason" class="select select-bordered select-sm w-full text-center">
        <option v-for="s in seasons" :key="s" :value="s">{{ s }}年</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else class="flex flex-col gap-3">
      <div v-if="!playerStats.length" class="text-center text-gray-500 py-10">
        データがありません
      </div>

      <div
        v-for="p in playerStats"
        :key="p.id"
        @click="router.push(`/stats/${p.id}`)"
        class="card bg-base-100 shadow border border-gray-200 cursor-pointer hover:shadow-md transition active:scale-95"
      >
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <div class="badge badge-outline font-mono">{{ p.player_code }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ p.name }}</div>
              <div class="text-xs text-gray-500">{{ p.grade }}年生</div>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center">
              <div>
                <div class="font-bold text-primary text-sm">{{ p.avgStr }}</div>
                <div class="text-xs text-gray-400">打率</div>
              </div>
              <div>
                <div class="font-bold text-success text-sm">{{ p.hits }}</div>
                <div class="text-xs text-gray-400">安打</div>
              </div>
              <div>
                <div class="font-bold text-warning text-sm">{{ p.hr }}</div>
                <div class="text-xs text-gray-400">本塁打</div>
              </div>
              <div>
                <div class="font-bold text-info text-sm">{{ p.steals }}</div>
                <div class="text-xs text-gray-400">盗塁</div>
              </div>
            </div>
            <div class="text-gray-400">›</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>