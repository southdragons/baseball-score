<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoute } from 'vue-router'

const route = useRoute()
const game = ref(null)
const orders = ref([])
const innings = ref([])
const atBats = ref([])
const steals = ref([])
const loading = ref(true)
let subscription = null

async function fetchData() {
  const [gameRes, ordersRes, inningsRes, atBatsRes, stealsRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', route.params.id).single(),
    supabase.from('orders').select('*, players(name, player_code)').eq('game_id', route.params.id).order('batting_order'),
    supabase.from('innings').select('*').eq('game_id', route.params.id).order('inning'),
    supabase.from('at_bats').select('*, players(name)').eq('game_id', route.params.id).order('created_at', { ascending: false }),
    supabase.from('steals').select('*, players(name)').eq('game_id', route.params.id).order('created_at', { ascending: false })
  ])

  if (!gameRes.error) game.value = gameRes.data
  if (!ordersRes.error) orders.value = ordersRes.data || []
  if (!inningsRes.error) innings.value = inningsRes.data || []
  if (!atBatsRes.error) atBats.value = atBatsRes.data || []
  if (!stealsRes.error) steals.value = stealsRes.data || []

  loading.value = false
}

// 合計スコア
const totalOur = computed(() => innings.value.reduce((s, i) => s + (i.our_score || 0), 0))
const totalOpponent = computed(() => innings.value.reduce((s, i) => s + (i.opponent_score || 0), 0))

function getInning(n) {
  return innings.value.find(i => i.inning === n) || { our_score: '-', opponent_score: '-' }
}

// 選手別打席成績
const playerStats = computed(() => {
  return orders.value.map(o => {
    const playerAtBats = atBats.value.filter(ab => ab.player_id === o.player_id)
    const playerSteals = steals.value.filter(s => s.player_id === o.player_id)

    const hits = playerAtBats.filter(ab => ['ヒット', '2塁打', '3塁打', 'ホームラン'].includes(ab.result)).length
    const hr = playerAtBats.filter(ab => ab.result === 'ホームラン').length
    const rbi = playerAtBats.reduce((s, ab) => s + (ab.rbi || 0), 0)
    const ab = playerAtBats.filter(ab => !['四球', '死球', '犠打'].includes(ab.result)).length

    return {
      name: o.players?.name,
      batting_order: o.batting_order,
      position: o.position,
      ab,
      hits,
      hr,
      rbi,
      steals: playerSteals.length,
      avg: ab > 0 ? (hits / ab).toFixed(3) : '-'
    }
  })
})

// リアルタイム購読
function subscribeRealtime() {
  subscription = supabase
    .channel('game-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'innings' }, fetchData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'at_bats' }, fetchData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'steals' }, fetchData)
    .subscribe()
}

onMounted(async () => {
  await fetchData()
  subscribeRealtime()
})

onUnmounted(() => {
  if (subscription) supabase.removeChannel(subscription)
})
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="flex items-center mb-4 gap-2">
      <router-link to="/" class="btn btn-sm btn-ghost">←</router-link>
      <h1 class="text-xl font-bold">⚾ 試合速報</h1>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- 試合情報 -->
      <div class="card bg-primary text-white shadow">
        <div class="card-body py-3">
          <div class="font-bold text-xl">vs {{ game?.opponent }}</div>
          <div class="text-sm opacity-80">{{ game?.game_date }} {{ game?.location }}</div>
          <div class="badge badge-outline mt-1">
            {{ game?.status === 'in_progress' ? '⚾ 試合中' : game?.status === 'finished' ? '✅ 試合終了' : '⏳ 試合前' }}
          </div>
        </div>
      </div>

      <!-- スコアボード -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body py-3">
          <div class="overflow-x-auto">
            <table class="table table-xs text-center">
              <thead>
                <tr>
                  <th></th>
                  <th v-for="n in 7" :key="n">{{ n }}</th>
                  <th>計</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-bold text-xs">我々</td>
                  <td v-for="n in 7" :key="n" class="font-bold">
                    {{ getInning(n).our_score ?? '-' }}
                  </td>
                  <td class="font-bold text-primary text-lg">{{ totalOur }}</td>
                </tr>
                <tr>
                  <td class="font-bold text-xs">相手</td>
                  <td v-for="n in 7" :key="n">
                    {{ getInning(n).opponent_score ?? '-' }}
                  </td>
                  <td class="font-bold text-error text-lg">{{ totalOpponent }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 打席成績 -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body py-3">
          <h2 class="font-bold mb-2">打席成績</h2>
          <div class="overflow-x-auto">
            <table class="table table-xs text-center">
              <thead>
                <tr>
                  <th>打順</th>
                  <th>名前</th>
                  <th>打数</th>
                  <th>安打</th>
                  <th>打点</th>
                  <th>HR</th>
                  <th>盗塁</th>
                  <th>打率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in playerStats" :key="p.batting_order">
                  <td>{{ p.batting_order }}</td>
                  <td class="font-bold text-left">{{ p.name }}</td>
                  <td>{{ p.ab }}</td>
                  <td class="text-success font-bold">{{ p.hits }}</td>
                  <td>{{ p.rbi }}</td>
                  <td class="text-warning font-bold">{{ p.hr || '-' }}</td>
                  <td>{{ p.steals || '-' }}</td>
                  <td class="font-bold">{{ p.avg }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 直近の打席 -->
      <div v-if="atBats.length" class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body py-3">
          <h2 class="font-bold mb-2">📋 打席履歴</h2>
          <div
            v-for="ab in atBats.slice(0, 10)"
            :key="ab.id"
            class="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <span class="font-bold text-sm">{{ ab.players?.name }}</span>
              <span class="text-xs text-gray-500 ml-2">{{ ab.inning }}回</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge badge-outline text-xs">{{ ab.result }}</span>
              <span v-if="ab.rbi" class="text-xs text-primary font-bold">{{ ab.rbi }}打点</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
