<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoute } from 'vue-router'

const route = useRoute()
const player = ref(null)
const atBats = ref([])
const steals = ref([])
const runs = ref([])
const loading = ref(true)

async function fetchData() {
  loading.value = true
  const [playerRes, atBatsRes, stealsRes, runsRes] = await Promise.all([
    supabase.from('players').select('*').eq('id', route.params.playerId).single(),
    supabase.from('at_bats').select('*, games(game_date, opponent)').eq('player_id', route.params.playerId).order('created_at', { ascending: false }),
    supabase.from('steals').select('*').eq('player_id', route.params.playerId),
    supabase.from('runs').select('*').eq('player_id', route.params.playerId)
  ])
  if (!playerRes.error) player.value = playerRes.data
  if (!atBatsRes.error) atBats.value = atBatsRes.data || []
  if (!stealsRes.error) steals.value = stealsRes.data || []
  if (!runsRes.error) runs.value = runsRes.data || []
  loading.value = false
}

const stats = computed(() => {
  const pa = atBats.value.length
  const ab = atBats.value.filter(ab => !['四球', '死球', '犠打', '犠飛'].includes(ab.result.split('(')[0])).length
  const hits = atBats.value.filter(ab => ['ヒット', '2塁打', '3塁打', 'ホームラン'].includes(ab.result.split('(')[0])).length
  const doubles = atBats.value.filter(ab => ab.result.split('(')[0] === '2塁打').length
  const triples = atBats.value.filter(ab => ab.result.split('(')[0] === '3塁打').length
  const hr = atBats.value.filter(ab => ab.result.split('(')[0] === 'ホームラン').length
  const rbi = atBats.value.reduce((s, ab) => s + (ab.rbi || 0), 0)
  const walks = atBats.value.filter(ab => ab.result.split('(')[0] === '四球').length
  const hbp = atBats.value.filter(ab => ab.result.split('(')[0] === '死球').length
  const sf = atBats.value.filter(ab => ab.result.split('(')[0] === '犠飛').length

  // 出塁率 = (安打 + 四球 + 死球) ÷ (打数 + 四球 + 死球 + 犠飛)
  const obpDenominator = ab + walks + hbp + sf
  const obp = obpDenominator > 0 ? ((hits + walks + hbp) / obpDenominator).toFixed(3) : '---'

  return {
    pa, ab, hits, doubles, triples, hr, rbi, walks, hbp,
    steals: steals.value.length,
    runs: runs.value.length,
    avg: ab > 0 ? (hits / ab).toFixed(3) : '---',
    obp
  }
})

const gameStats = computed(() => {
  const grouped = {}
  atBats.value.forEach(ab => {
    const key = ab.game_id
    if (!grouped[key]) {
      grouped[key] = {
        game_date: ab.games?.game_date,
        opponent: ab.games?.opponent,
        atBats: []
      }
    }
    grouped[key].atBats.push(ab)
  })
  return Object.values(grouped)
})

onMounted(fetchData)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6 bg-gray-50 min-h-screen">
    <div class="flex items-center mb-6 gap-2">
      <router-link to="/stats" class="btn btn-sm btn-ghost">←</router-link>
      <h1 class="text-xl font-bold">個人成績</h1>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- 選手情報 -->
      <div class="card bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg">
        <div class="card-body py-4 text-center">
          <div class="text-4xl mb-1">⚾</div>
          <div class="text-2xl font-bold">{{ player?.name }}</div>
          <div class="text-sm opacity-80">{{ player?.grade }}年生</div>
        </div>
      </div>

      <!-- 通算成績 -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">📊 通算成績</h2>

          <!-- 主要スタッツ -->
          <div class="grid grid-cols-4 gap-2 text-center mb-2">
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-primary">{{ stats.avg }}</div>
              <div class="text-xs text-gray-500">打率</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-success">{{ stats.obp }}</div>
              <div class="text-xs text-gray-500">出塁率</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-success">{{ stats.hits }}</div>
              <div class="text-xs text-gray-500">安打</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-error">{{ stats.rbi }}</div>
              <div class="text-xs text-gray-500">打点</div>
            </div>
          </div>

          <!-- サブスタッツ -->
          <div class="grid grid-cols-4 gap-2 text-center mb-2">
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-warning">{{ stats.hr }}</div>
              <div class="text-xs text-gray-500">本塁打</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-info">{{ stats.runs }}</div>
              <div class="text-xs text-gray-500">得点</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold text-info">{{ stats.steals }}</div>
              <div class="text-xs text-gray-500">盗塁</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold">{{ stats.walks }}</div>
              <div class="text-xs text-gray-500">四死球</div>
            </div>
          </div>

          <!-- 詳細スタッツ -->
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold">{{ stats.pa }}</div>
              <div class="text-xs text-gray-500">打席</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold">{{ stats.ab }}</div>
              <div class="text-xs text-gray-500">打数</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold">{{ stats.doubles }}</div>
              <div class="text-xs text-gray-500">二塁打</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="text-2xl font-bold">{{ stats.triples }}</div>
              <div class="text-xs text-gray-500">三塁打</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 試合別成績 -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold text-lg mb-3">📅 試合別成績</h2>
          <div v-if="!gameStats.length" class="text-gray-500 text-sm">データなし</div>
          <div v-for="(g, i) in gameStats" :key="i" class="mb-3 pb-3 border-b last:border-0">
            <div class="flex justify-between items-center mb-2">
              <div class="font-bold text-sm">vs {{ g.opponent }}</div>
              <div class="text-xs text-gray-500">{{ g.game_date }}</div>
            </div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="(ab, j) in g.atBats"
                :key="j"
                class="badge badge-sm"
                :class="{
                  'badge-success': ['ヒット','2塁打','3塁打','ホームラン'].includes(ab.result.split('(')[0]),
                  'badge-warning': ab.result.split('(')[0] === 'ホームラン',
                  'badge-error': ['三振','ゴロ','フライ'].includes(ab.result.split('(')[0]),
                  'badge-info': ['四球','死球'].includes(ab.result.split('(')[0]),
                  'badge-ghost': ['犠打','犠飛'].includes(ab.result.split('(')[0])
                }"
              >
                {{ ab.result }}{{ ab.rbi ? ` ${ab.rbi}点` : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>