<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const game = ref(null)
const editGameModal = ref(false)
const editOpponent = ref('')
const editLocation = ref('')
const editDate = ref('')
const orders = ref([])
const innings = ref([])
const atBats = ref([])
const steals = ref([])
const loading = ref(true)
const toast = ref('')

const currentInning = ref(1)
const selectedPlayer = ref('')
const selectedResult = ref('')
const rbi = ref(0)

const results = [
  { label: '安打', value: 'ヒット', class: 'btn-success' },
  { label: '二塁打', value: '2塁打', class: 'btn-success' },
  { label: '三塁打', value: '3塁打', class: 'btn-success' },
  { label: 'HR', value: 'ホームラン', class: 'btn-warning' },
  { label: '三振', value: '三振', class: 'btn-error' },
  { label: 'ゴロ', value: 'ゴロ', class: 'btn-error' },
  { label: 'フライ', value: 'フライ', class: 'btn-error' },
  { label: '四球', value: '四球', class: 'btn-info' },
  { label: '死球', value: '死球', class: 'btn-info' },
  { label: '犠打', value: '犠打', class: 'btn-ghost' },
]

async function fetchData() {
  loading.value = true

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

function openEditGame() {
  editOpponent.value = game.value.opponent
  editLocation.value = game.value.location || ''
  editDate.value = game.value.game_date
  editGameModal.value = true
}

async function saveGame() {
  const { error } = await supabase
    .from('games')
    .update({
      opponent: editOpponent.value,
      location: editLocation.value || null,
      game_date: editDate.value
    })
    .eq('id', route.params.id)
  if (!error) {
    toast.value = '更新しました'
    setTimeout(() => toast.value = '', 3000)
    editGameModal.value = false
    fetchData()
  }
}
// イニングスコア取得
function getInning(n) {
  return innings.value.find(i => i.inning === n) || { our_score: 0, opponent_score: 0 }
}

// 合計スコア
const totalOur = computed(() => innings.value.reduce((s, i) => s + (i.our_score || 0), 0))
const totalOpponent = computed(() => innings.value.reduce((s, i) => s + (i.opponent_score || 0), 0))

// イニングスコア更新
async function updateInningScore(inning, field, value) {
  const existing = innings.value.find(i => i.inning === inning)
  if (existing) {
    await supabase.from('innings').update({ [field]: parseInt(value) || 0 }).eq('id', existing.id)
  } else {
    await supabase.from('innings').insert({
      game_id: route.params.id,
      inning,
      [field]: parseInt(value) || 0
    })
  }
  fetchData()
}

// 打席記録追加
async function addAtBat() {
  if (!selectedPlayer.value || !selectedResult.value) {
    toast.value = '選手と結果を選択してください'
    setTimeout(() => toast.value = '', 3000)
    return
  }
  const { error } = await supabase.from('at_bats').insert({
    game_id: route.params.id,
    player_id: selectedPlayer.value,
    inning: currentInning.value,
    result: selectedResult.value,
    rbi: rbi.value
  })
  if (!error) {
    toast.value = '記録しました'
    setTimeout(() => toast.value = '', 2000)
    selectedResult.value = ''
    rbi.value = 0
    fetchData()
  }
}

// 盗塁追加
async function addSteal(playerId) {
  await supabase.from('steals').insert({
    game_id: route.params.id,
    player_id: playerId,
    inning: currentInning.value
  })
  toast.value = '盗塁記録しました'
  setTimeout(() => toast.value = '', 2000)
  fetchData()
}

// 打席記録削除
async function deleteAtBat(id) {
  await supabase.from('at_bats').delete().eq('id', id)
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="flex items-center mb-4 gap-2">
      <router-link to="/admin" class="btn btn-sm btn-ghost">←</router-link>
      <h1 class="text-xl font-bold">📝 記録入力</h1>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- 試合情報 -->
      <div class="card bg-primary text-white shadow">
        <div class="card-body py-3">
          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold text-xl">vs {{ game?.opponent }}</div>
              <div class="text-sm opacity-80">{{ game?.game_date }} {{ game?.location }}</div>
            </div>
            <button class="btn btn-sm btn-outline btn-white" @click="openEditGame">編集</button>
          </div>
        </div>
      </div>

      <!-- 試合情報編集モーダル -->
      <div v-if="editGameModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-xl w-80">
          <h2 class="font-bold text-lg mb-4">試合情報を編集</h2>
          <div class="flex flex-col gap-3">
            <div>
              <label class="text-sm font-bold mb-1 block">試合日</label>
              <input type="date" v-model="editDate" class="input w-full border-2 border-gray-400" />
            </div>
            <div>
              <label class="text-sm font-bold mb-1 block">対戦相手</label>
              <input v-model="editOpponent" class="input w-full border-2 border-gray-400" />
            </div>
            <div>
              <label class="text-sm font-bold mb-1 block">会場</label>
              <input v-model="editLocation" class="input w-full border-2 border-gray-400" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button class="btn btn-outline flex-1" @click="editGameModal = false">キャンセル</button>
            <button class="btn btn-primary flex-1" @click="saveGame">保存</button>
          </div>
        </div>
      </div>
      <!-- スコアボード -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body py-3">
          <h2 class="font-bold mb-2">スコア</h2>
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
                  <td class="font-bold">我々</td>
                  <td v-for="n in 7" :key="n">
                    <input
                      type="number"
                      :value="getInning(n).our_score"
                      @change="updateInningScore(n, 'our_score', $event.target.value)"
                      class="w-8 text-center border rounded"
                      min="0"
                    />
                  </td>
                  <td class="font-bold text-primary">{{ totalOur }}</td>
                </tr>
                <tr>
                  <td class="font-bold">相手</td>
                  <td v-for="n in 7" :key="n">
                    <input
                      type="number"
                      :value="getInning(n).opponent_score"
                      @change="updateInningScore(n, 'opponent_score', $event.target.value)"
                      class="w-8 text-center border rounded"
                      min="0"
                    />
                  </td>
                  <td class="font-bold text-error">{{ totalOpponent }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 打席記録入力 -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold mb-3">打席記録入力</h2>

          <div class="flex items-center gap-2 mb-3">
            <label class="text-sm font-bold">イニング</label>
            <select v-model="currentInning" class="select select-bordered select-sm">
              <option v-for="n in 7" :key="n" :value="n">{{ n }}回</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="text-sm font-bold mb-1 block">打者</label>
            <select v-model="selectedPlayer" class="select select-bordered w-full">
              <option value="">選手を選択</option>
              <option v-for="o in orders" :key="o.player_id" :value="o.player_id">
                {{ o.batting_order }}番 {{ o.players?.name }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="text-sm font-bold mb-1 block">結果</label>
            <div class="grid grid-cols-5 gap-1">
              <button
                v-for="r in results"
                :key="r.value"
                class="btn btn-sm"
                :class="selectedResult === r.value ? r.class : 'btn-outline'"
                @click="selectedResult = r.value"
              >
                {{ r.label }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 mb-3">
            <label class="text-sm font-bold">打点</label>
            <input
              type="number"
              v-model="rbi"
              min="0"
              max="4"
              class="input input-bordered w-20 text-center"
            />
          </div>

          <button class="btn btn-primary w-full" @click="addAtBat">
            記録する
          </button>
        </div>
      </div>

      <!-- 盗塁記録 -->
      <div class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold mb-3">盗塁記録</h2>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="o in orders"
              :key="o.player_id"
              class="btn btn-sm btn-outline"
              @click="addSteal(o.player_id)"
            >
              {{ o.players?.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 直近の打席記録 -->
      <div v-if="atBats.length" class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold mb-3">直近の記録</h2>
          <div
            v-for="ab in atBats.slice(0, 5)"
            :key="ab.id"
            class="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <span class="text-sm font-bold">{{ ab.players?.name }}</span>
              <span class="text-xs text-gray-500 ml-2">{{ ab.inning }}回</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge badge-outline">{{ ab.result }}</span>
              <span v-if="ab.rbi" class="text-xs text-primary">{{ ab.rbi }}打点</span>
              <button class="btn btn-xs btn-outline btn-error" @click="deleteAtBat(ab.id)">削除</button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div v-if="toast" class="toast toast-top toast-center z-50">
      <div class="alert alert-success">
        <span>{{ toast }}</span>
      </div>
    </div>
  </div>
</template>
