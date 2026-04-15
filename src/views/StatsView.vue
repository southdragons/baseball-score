<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'

const currentSeason = ref(new Date().getFullYear())
const seasons = ref([])
const players = ref([])
const games = ref([])
const atBats = ref([])
const steals = ref([])
const loading = ref(true)

async function fetchData() {
  loading.value = true
  const [playersRes, gamesRes, atBatsRes, stealsRes] = await Promise.all([
    supabase.from('players').select('*').eq('status', 'active').order('player_code'),
    supabase.from('games').select('*').eq('status', 'finished').eq('season', currentSeason.value),
    supabase.from('at_bats').select('*, games!inner(season)').eq('games.season', currentSeason.value),
    supabase.from('steals').select('*, games!inner(season)').eq('games.season', currentSeason.value)
  ])
  if (!playersRes.error) players.value = playersRes.data || []
  if (!gamesRes.error) games.value = gamesRes.data || []
  if (!atBatsRes.error) atBats.value = atBatsRes.data || []
  if (!stealsRes.error) steals.value = stealsRes.data || []

  const { data: seasonData } = await supabase
    .from('games')
    .select('season')
    .order('season', { ascending: false })
  if (seasonData) {
    seasons.value = [...new Set(seasonData.map(g => g.season))]
  }

  loading.value = false
}

const teamStats = computed(() => {
  return { total: games.value.length }
})

const playerStats = computed(() => {
  return players.value.map(p => {
    const playerAtBats = atBats.value.filter(ab => ab.player_id === p.id)
    const playerSteals = steals.value.filter(s => s.player_id === p.id)
    const ab = playerAtBats.filter(ab => !['四球', '死球', '犠打'].includes(ab.result)).length
    const hits = playerAtBats.filter(ab => ['ヒット', '2塁打', '3塁打', 'ホームラン'].includes(ab.result)).length
    const doubles = playerAtBats.filter(ab => ab.result === '2塁打').length
    const triples = playerAtBats.filter(ab => ab.result === '3塁打').length
    const hr = playerAtBats.filter(ab => ab.result === 'ホームラン').length
    const rbi = playerAtBats.reduce((s, ab) => s + (ab.rbi || 0), 0)
    const avg = ab > 0 ? hits / ab : 0
    return {
      id: p.id, name: p.name, grade: p.grade,
      ab, hits, doubles, triples, hr, rbi,
      steals: playerSteals.length, avg,
      avgStr: ab > 0 ? (hits / ab).toFixed(3) : '---'
    }
  }).filter(p => p.ab > 0)
})

const avgRanking = computed(() => [...playerStats.value].sort((a, b) => b.avg - a.avg).slice(0, 3))
const hrRanking = computed(() => [...playerStats.value].filter(p => p.hr > 0).sort((a, b) => b.hr - a.hr).slice(0, 3))
const rbiRanking = computed(() => [...playerStats.value].filter(p => p.rbi > 0).sort((a, b) => b.rbi - a.rbi).slice(0, 3))
const stealRanking = computed(() => [...playerStats.value].filter(p => p.steals > 0).sort((a, b) => b.steals - a.steals).slice(0, 3))
const hitsRanking = computed(() => [...playerStats.value].filter(p => p.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, 3))

watch(currentSeason, fetchData)
onMounted(fetchData)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6 bg-gray-50 min-h-screen">
    <div class="mb-4">
      <div class="relative flex items-center justify-center mb-2">
        <router-link to="/" class="btn btn-sm btn-ghost absolute left-0">←</router-link>
        <h1 class="text-2xl font-bold">⚾ サウスドラゴンズJ.B.C.</h1>
      </div>
      <h3 class="text-base text-gray-600 font-bold mb-2 text-center">🏆 今シーズンの成績</h3>
      <select v-model="currentSeason" class="select select-bordered select-sm w-full text-center">
        <option v-for="s in seasons" :key="s" :value="s">{{ s }}年シーズン</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- チーム試合数 -->
      <div class="card bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg">
        <div class="card-body py-4 text-center">
          <div class="text-sm opacity-80 mb-1">⚾ 試合数</div>
          <div class="text-5xl font-bold">{{ teamStats.total }}</div>
          <div class="text-sm opacity-80 mt-1">試合</div>
        </div>
      </div>

      <!-- 打率ランキング -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">🔥 打率ランキング</h2>
          <div v-if="!avgRanking.length" class="text-gray-500 text-sm">データなし</div>
          <div v-for="(p, i) in avgRanking" :key="p.id" class="flex items-center gap-3 py-2 border-b last:border-0">
            <div class="text-2xl w-8 text-center">{{ i === 0 ? '👑' : i === 1 ? '🥈' : '🥉' }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ p.name }}</div>
              <div class="text-xs text-gray-500">{{ p.grade }}年生 / {{ p.ab }}打数{{ p.hits }}安打</div>
            </div>
            <div class="text-2xl font-bold" :class="i === 0 ? 'text-yellow-500' : 'text-primary'">{{ p.avgStr }}</div>
          </div>
        </div>
      </div>

      <!-- 安打ランキング -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">⚾ 安打ランキング</h2>
          <div v-if="!hitsRanking.length" class="text-gray-500 text-sm">データなし</div>
          <div v-for="(p, i) in hitsRanking" :key="p.id" class="flex items-center gap-3 py-2 border-b last:border-0">
            <div class="text-2xl w-8 text-center">{{ i === 0 ? '👑' : i === 1 ? '🥈' : '🥉' }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ p.name }}</div>
              <div class="text-xs text-gray-500">
                {{ p.grade }}年生
                <span v-if="p.doubles"> / 二塁打{{ p.doubles }}</span>
                <span v-if="p.triples"> / 三塁打{{ p.triples }}</span>
                <span v-if="p.hr"> / HR{{ p.hr }}</span>
              </div>
            </div>
            <div class="text-2xl font-bold" :class="i === 0 ? 'text-yellow-500' : 'text-primary'">{{ p.hits }}<span class="text-sm font-normal text-gray-500">本</span></div>
          </div>
        </div>
      </div>

      <!-- HRランキング -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">🏠 本塁打ランキング</h2>
          <div v-if="!hrRanking.length" class="text-gray-500 text-sm">データなし</div>
          <div v-for="(p, i) in hrRanking" :key="p.id" class="flex items-center gap-3 py-2 border-b last:border-0">
            <div class="text-2xl w-8 text-center">{{ i === 0 ? '👑' : i === 1 ? '🥈' : '🥉' }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ p.name }}</div>
              <div class="text-xs text-gray-500">{{ p.grade }}年生</div>
            </div>
            <div class="text-2xl font-bold" :class="i === 0 ? 'text-yellow-500' : 'text-primary'">{{ p.hr }}<span class="text-sm font-normal text-gray-500">本</span></div>
          </div>
        </div>
      </div>

      <!-- 打点ランキング -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">💪 打点ランキング</h2>
          <div v-if="!rbiRanking.length" class="text-gray-500 text-sm">データなし</div>
          <div v-for="(p, i) in rbiRanking" :key="p.id" class="flex items-center gap-3 py-2 border-b last:border-0">
            <div class="text-2xl w-8 text-center">{{ i === 0 ? '👑' : i === 1 ? '🥈' : '🥉' }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ p.name }}</div>
              <div class="text-xs text-gray-500">{{ p.grade }}年生</div>
            </div>
            <div class="text-2xl font-bold" :class="i === 0 ? 'text-yellow-500' : 'text-primary'">{{ p.rbi }}<span class="text-sm font-normal text-gray-500">点</span></div>
          </div>
        </div>
      </div>

      <!-- 盗塁ランキング -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">⚡ 盗塁ランキング</h2>
          <div v-if="!stealRanking.length" class="text-gray-500 text-sm">データなし</div>
          <div v-for="(p, i) in stealRanking" :key="p.id" class="flex items-center gap-3 py-2 border-b last:border-0">
            <div class="text-2xl w-8 text-center">{{ i === 0 ? '👑' : i === 1 ? '🥈' : '🥉' }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ p.name }}</div>
              <div class="text-xs text-gray-500">{{ p.grade }}年生</div>
            </div>
            <div class="text-2xl font-bold" :class="i === 0 ? 'text-yellow-500' : 'text-primary'">{{ p.steals }}<span class="text-sm font-normal text-gray-500">個</span></div>
          </div>
        </div>
      </div>

      <!-- 全選手記録ボタン -->
      <router-link to="/stats/players" class="card bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg hover:shadow-xl transition">
        <div class="card-body py-4 flex-row items-center justify-between">
          <div>
            <div class="font-bold text-lg">👥 全選手の記録</div>
            <div class="text-sm opacity-80">選手をタップして個人成績を確認</div>
          </div>
          <div class="text-3xl">›</div>
        </div>
      </router-link>

      <!-- OB記録ボタン -->
      <router-link to="/stats/ob" class="card bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg hover:shadow-xl transition">
        <div class="card-body py-4 flex-row items-center justify-between">
          <div>
            <div class="font-bold text-lg">🎓 OB記録</div>
            <div class="text-sm opacity-80">卒団選手の通算成績</div>
          </div>
          <div class="text-3xl">›</div>
        </div>
      </router-link>

    </div>
  </div>
</template>