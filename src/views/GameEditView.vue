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
const editBatFirst = ref('our')
const orders = ref([])
const allPlayers = ref([])
const innings = ref([])
const atBats = ref([])
const steals = ref([])
const loading = ref(true)
const toast = ref('')

const currentInning = ref(1)
const selectedPlayer = ref('')
const selectedResult = ref('')
const selectedDirection = ref('')
const rbi = ref(0)
const stealPlayer = ref('')

const showEditAtBatModal = ref(false)
const editAtBat = ref(null)
const editAtBatResult = ref('')
const editAtBatDirection = ref('')
const editAtBatRbi = ref(0)

const results = [
  { label: '安打', value: 'ヒット', class: 'btn-success', needsDirection: true },
  { label: '二塁打', value: '2塁打', class: 'btn-success', needsDirection: true },
  { label: '三塁打', value: '3塁打', class: 'btn-success', needsDirection: true },
  { label: '本塁打', value: '本塁打', class: 'btn-warning', needsDirection: false },
  { label: '三振', value: '三振', class: 'btn-error', needsDirection: false },
  { label: 'ゴロ', value: 'ゴロ', class: 'btn-error', needsDirection: true },
  { label: 'フライ', value: 'フライ', class: 'btn-error', needsDirection: true },
  { label: '四球', value: '四球', class: 'btn-info', needsDirection: false },
  { label: '死球', value: '死球', class: 'btn-info', needsDirection: false },
  { label: '犠打', value: '犠打', class: 'btn-ghost', needsDirection: true },
  { label: '犠飛', value: '犠飛', class: 'btn-ghost', needsDirection: true },
  { label: '失策', value: '失策', class: 'btn-warning', needsDirection: true },
  { label: 'FC', value: 'フィルダースチョイス', class: 'btn-warning', needsDirection: true },
  { label: '併殺', value: '併殺打', class: 'btn-error', needsDirection: true },
]

const directions = ['投', '捕', '一', '二', '三', '遊', '左', '中', '右']

const needsDirection = computed(() => {
  const r = results.find(r => r.value === selectedResult.value)
  return r?.needsDirection || false
})

const needsDirectionEdit = computed(() => {
  const r = results.find(r => r.value === editAtBatResult.value)
  return r?.needsDirection || false
})

function buildResult(result, direction) {
  const r = results.find(r => r.value === result)
  if (r?.needsDirection && direction) {
    return `${result}(${direction})`
  }
  return result
}

async function fetchData() {
  loading.value = true

  const [gameRes, ordersRes, inningsRes, atBatsRes, stealsRes, playersRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', route.params.id).single(),
    supabase.from('orders').select('*, players(name, player_code)').eq('game_id', route.params.id).order('batting_order'),
    supabase.from('innings').select('*').eq('game_id', route.params.id).order('inning'),
    supabase.from('at_bats').select('*, players(name)').eq('game_id', route.params.id).order('created_at', { ascending: true }),
    supabase.from('steals').select('*, players(name)').eq('game_id', route.params.id).order('created_at', { ascending: false }),
    supabase.from('players').select('*').eq('status', 'active').order('player_code')
  ])

  if (!gameRes.error) game.value = gameRes.data
  if (!ordersRes.error) orders.value = ordersRes.data || []
  if (!inningsRes.error) innings.value = inningsRes.data || []
  if (!atBatsRes.error) atBats.value = atBatsRes.data || []
  if (!stealsRes.error) steals.value = stealsRes.data || []
  if (!playersRes.error) allPlayers.value = playersRes.data || []

  loading.value = false
}

const subPlayers = computed(() => {
  const orderPlayerIds = orders.value.map(o => o.player_id)
  return allPlayers.value.filter(p => !orderPlayerIds.includes(p.id))
})

const atBatsByInning = computed(() => {
  const grouped = {}
  for (let n = 1; n <= 7; n++) {
    const records = atBats.value.filter(ab => ab.inning === n)
    if (records.length) grouped[n] = records
  }
  return grouped
})

function openEditGame() {
  editOpponent.value = game.value.opponent
  editLocation.value = game.value.location || ''
  editDate.value = game.value.game_date
  editBatFirst.value = game.value.bat_first || 'our'
  editGameModal.value = true
}

async function saveGame() {
  const { error } = await supabase
    .from('games')
    .update({
      opponent: editOpponent.value,
      location: editLocation.value || null,
      game_date: editDate.value,
      bat_first: editBatFirst.value
    })
    .eq('id', route.params.id)
  if (!error) {
    toast.value = '更新しました'
    setTimeout(() => toast.value = '', 3000)
    editGameModal.value = false
    await fetchData()
  } else {
    toast.value = 'エラーが発生しました'
    setTimeout(() => toast.value = '', 3000)
  }
}

const batFirstLabel = computed(() => {
  return game.value?.bat_first === 'our' ? '先攻' : '後攻'
})

function getInning(n) {
  return innings.value.find(i => i.inning === n) || { our_score: null, opponent_score: null }
}

const totalOur = computed(() => innings.value.reduce((s, i) => {
  const val = parseInt(i.our_score) || 0
  return s + val
}, 0))

const totalOpponent = computed(() => innings.value.reduce((s, i) => {
  const val = parseInt(i.opponent_score) || 0
  return s + val
}, 0))

async function updateInningScore(inning, field, value) {
  const existing = innings.value.find(i => i.inning === inning)
  if (existing) {
    await supabase.from('innings').update({ [field]: value }).eq('id', existing.id)
  } else {
    await supabase.from('innings').insert({
      game_id: route.params.id,
      inning,
      [field]: value
    })
  }
  fetchData()
}

async function addAtBat() {
  if (!selectedPlayer.value || !selectedResult.value) {
    toast.value = '選手と結果を選択してください'
    setTimeout(() => toast.value = '', 3000)
    return
  }
  if (needsDirection.value && !selectedDirection.value) {
    toast.value = '打球方向を選択してください'
    setTimeout(() => toast.value = '', 3000)
    return
  }
  const finalResult = buildResult(selectedResult.value, selectedDirection.value)
  const { error } = await supabase.from('at_bats').insert({
    game_id: route.params.id,
    player_id: selectedPlayer.value,
    inning: currentInning.value,
    result: finalResult,
    rbi: rbi.value
  })
  if (!error) {
    toast.value = '記録しました'
    setTimeout(() => toast.value = '', 2000)
    selectedResult.value = ''
    selectedDirection.value = ''
    rbi.value = 0
    fetchData()
  }
}

function openEditAtBat(ab) {
  editAtBat.value = ab
  const match = ab.result.match(/^(.+?)(\((.+)\))?$/)
  editAtBatResult.value = match ? match[1] : ab.result
  editAtBatDirection.value = match && match[3] ? match[3] : ''
  editAtBatRbi.value = ab.rbi || 0
  showEditAtBatModal.value = true
}

async function saveEditAtBat() {
  const finalResult = buildResult(editAtBatResult.value, editAtBatDirection.value)
  const { error } = await supabase
    .from('at_bats')
    .update({
      result: finalResult,
      rbi: editAtBatRbi.value
    })
    .eq('id', editAtBat.value.id)
  if (!error) {
    toast.value = '更新しました'
    setTimeout(() => toast.value = '', 3000)
    showEditAtBatModal.value = false
    fetchData()
  }
}

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
              <div class="text-sm opacity-80">
                {{ game?.game_date }} {{ game?.location }}
                <span class="ml-2 badge badge-outline badge-sm">{{ batFirstLabel }}</span>
              </div>
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
            <div>
              <label class="text-sm font-bold mb-1 block">先攻・後攻</label>
              <div class="flex gap-2">
                <button
                  class="btn flex-1"
                  :class="editBatFirst === 'our' ? 'btn-primary' : 'btn-outline'"
                  @click="editBatFirst = 'our'"
                >先攻</button>
                <button
                  class="btn flex-1"
                  :class="editBatFirst === 'opponent' ? 'btn-primary' : 'btn-outline'"
                  @click="editBatFirst = 'opponent'"
                >後攻</button>
              </div>
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
                  <th class="text-xs w-10"></th>
                  <th v-for="n in 7" :key="n" class="text-xs px-1">{{ n }}</th>
                  <th class="text-xs px-1">計</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-bold text-xs whitespace-nowrap w-10">
                    {{ game?.bat_first === 'our' ? 'SD' : game?.opponent.slice(0,3) }}<br>
                    <span class="badge badge-xs badge-primary">先攻</span>
                  </td>
                  <td v-for="n in 7" :key="n" class="px-0">
                    <input
                      type="text"
                      :value="game?.bat_first === 'our' ? (getInning(n).our_score ?? '') : (getInning(n).opponent_score ?? '')"
                      @focus="$event.target.select()"
                      @change="updateInningScore(n, game?.bat_first === 'our' ? 'our_score' : 'opponent_score', $event.target.value)"
                      class="w-7 text-center border rounded text-xs"
                      placeholder="-"
                    />
                  </td>
                  <td class="font-bold text-primary text-xs">{{ game?.bat_first === 'our' ? totalOur : totalOpponent }}</td>
                </tr>
                <tr>
                  <td class="font-bold text-xs whitespace-nowrap w-10">
                    {{ game?.bat_first === 'our' ? game?.opponent.slice(0,3) : 'SD' }}<br>
                    <span class="badge badge-xs badge-ghost">後攻</span>
                  </td>
                  <td v-for="n in 7" :key="n" class="px-0">
                    <input
                      type="text"
                      :value="game?.bat_first === 'our' ? (getInning(n).opponent_score ?? '') : (getInning(n).our_score ?? '')"
                      @focus="$event.target.select()"
                      @change="updateInningScore(n, game?.bat_first === 'our' ? 'opponent_score' : 'our_score', $event.target.value)"
                      class="w-7 text-center border rounded text-xs"
                      placeholder="-"
                    />
                  </td>
                  <td class="font-bold text-error text-xs">{{ game?.bat_first === 'our' ? totalOpponent : totalOur }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400 mt-2">※後攻の攻撃なしは X、さよならは 2X のように入力</p>
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
              <optgroup label="オーダー">
                <option v-for="o in orders" :key="o.player_id" :value="o.player_id">
                  {{ o.batting_order }}番 {{ o.players?.name }}
                </option>
              </optgroup>
              <optgroup label="途中出場" v-if="subPlayers.length">
                <option v-for="p in subPlayers" :key="p.id" :value="p.id">
                  {{ p.player_code }} {{ p.name }}（{{ p.grade }}年）
                </option>
              </optgroup>
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
                @click="selectedResult = r.value; selectedDirection = ''"
              >{{ r.label }}</button>
            </div>
          </div>

          <!-- 打球方向 -->
          <div v-if="needsDirection" class="mb-3">
            <label class="text-sm font-bold mb-1 block">打球方向</label>
            <div class="grid grid-cols-9 gap-1">
              <button
                v-for="d in directions"
                :key="d"
                class="btn btn-sm"
                :class="selectedDirection === d ? 'btn-primary' : 'btn-outline'"
                @click="selectedDirection = d"
              >{{ d }}</button>
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
          <div class="flex gap-2">
            <select v-model="stealPlayer" class="select select-bordered flex-1">
              <option value="">選手を選択</option>
              <optgroup label="オーダー">
                <option v-for="o in orders" :key="o.player_id" :value="o.player_id">
                  {{ o.batting_order }}番 {{ o.players?.name }}
                </option>
              </optgroup>
              <optgroup label="代走・その他" v-if="subPlayers.length">
                <option v-for="p in subPlayers" :key="p.id" :value="p.id">
                  {{ p.player_code }} {{ p.name }}（{{ p.grade }}年）
                </option>
              </optgroup>
            </select>
            <button
              class="btn btn-primary"
              :disabled="!stealPlayer"
              @click="addSteal(stealPlayer); stealPlayer = ''"
            >登録</button>
          </div>
        </div>
      </div>

      <!-- 打席記録一覧（イニング別） -->
      <div v-if="atBats.length" class="card bg-base-100 shadow border border-gray-200">
        <div class="card-body">
          <h2 class="font-bold mb-3">📋 打席記録</h2>
          <div v-for="(records, inning) in atBatsByInning" :key="inning" class="mb-4">
            <div class="text-sm font-bold text-gray-500 mb-2 bg-gray-50 px-2 py-1 rounded">{{ inning }}回</div>
            <div
              v-for="ab in records"
              :key="ab.id"
              class="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <span class="text-sm font-bold">{{ ab.players?.name }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="badge badge-outline text-xs">{{ ab.result }}</span>
                <span v-if="ab.rbi" class="text-xs text-primary">{{ ab.rbi }}打点</span>
                <button class="btn btn-xs btn-outline btn-info" @click="openEditAtBat(ab)">編集</button>
                <button class="btn btn-xs btn-outline btn-error" @click="deleteAtBat(ab.id)">削除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 打席記録編集モーダル -->
    <div v-if="showEditAtBatModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-xl w-80 max-h-screen overflow-y-auto">
        <h2 class="font-bold text-lg mb-2">打席記録を編集</h2>
        <p class="text-sm text-gray-500 mb-4">{{ editAtBat?.players?.name }} / {{ editAtBat?.inning }}回</p>

        <div class="mb-3">
          <label class="text-sm font-bold mb-1 block">結果</label>
          <div class="grid grid-cols-5 gap-1">
            <button
              v-for="r in results"
              :key="r.value"
              class="btn btn-sm"
              :class="editAtBatResult === r.value ? r.class : 'btn-outline'"
              @click="editAtBatResult = r.value; editAtBatDirection = ''"
            >{{ r.label }}</button>
          </div>
        </div>

        <div v-if="needsDirectionEdit" class="mb-3">
          <label class="text-sm font-bold mb-1 block">打球方向</label>
          <div class="grid grid-cols-9 gap-1">
            <button
              v-for="d in directions"
              :key="d"
              class="btn btn-sm"
              :class="editAtBatDirection === d ? 'btn-primary' : 'btn-outline'"
              @click="editAtBatDirection = d"
            >{{ d }}</button>
          </div>
        </div>

        <div class="flex items-center gap-2 mb-4">
          <label class="text-sm font-bold">打点</label>
          <input
            type="number"
            v-model="editAtBatRbi"
            min="0"
            max="4"
            class="input input-bordered w-20 text-center"
          />
        </div>

        <div class="flex gap-2">
          <button class="btn btn-outline flex-1" @click="showEditAtBatModal = false">キャンセル</button>
          <button class="btn btn-primary flex-1" @click="saveEditAtBat">保存</button>
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