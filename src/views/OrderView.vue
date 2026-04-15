<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const players = ref([])
const orders = ref([])
const loading = ref(true)
const saving = ref(false)
const toast = ref('')

const positions = ['投手', '捕手', '一塁手', '二塁手', '三塁手', '遊撃手', '左翼手', '中堅手', '右翼手']

async function fetchData() {
  loading.value = true
  const { data: playersData } = await supabase
    .from('players')
    .select('*')
    .eq('status', 'active')
    .order('player_code')

  players.value = playersData || []

  const { data: ordersData } = await supabase
    .from('orders')
    .select('*')
    .eq('game_id', route.params.id)
    .order('batting_order')

  if (ordersData && ordersData.length) {
    orders.value = ordersData.map(o => ({
      id: o.id,
      batting_order: o.batting_order,
      player_id: o.player_id,
      position: o.position
    }))
  } else {
    orders.value = Array.from({ length: 9 }, (_, i) => ({
      batting_order: i + 1,
      player_id: '',
      position: ''
    }))
  }

  loading.value = false
}

async function save() {
  const valid = orders.value.filter(o => o.player_id && o.position)
  if (!valid.length) {
    toast.value = '選手とポジションを入力してください'
    setTimeout(() => toast.value = '', 3000)
    return
  }
  saving.value = true
  try {
    await supabase.from('orders').delete().eq('game_id', route.params.id)
    const rows = valid.map(o => ({
      game_id: route.params.id,
      player_id: o.player_id,
      batting_order: o.batting_order,
      position: o.position
    }))
    const { error } = await supabase.from('orders').insert(rows)
    if (error) throw error
    toast.value = '保存しました'
    setTimeout(() => {
      toast.value = ''
      router.push('/admin')
    }, 1500)
  } catch (e) {
    toast.value = 'エラーが発生しました'
    setTimeout(() => toast.value = '', 3000)
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="flex items-center mb-6 gap-2">
      <router-link to="/admin" class="btn btn-sm btn-ghost">←</router-link>
      <h1 class="text-xl font-bold">📋 オーダー登録</h1>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="o in orders"
        :key="o.batting_order"
        class="card bg-base-100 shadow border border-gray-200"
      >
        <div class="card-body py-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="badge badge-primary font-bold">{{ o.batting_order }}番</div>
          </div>
          <div class="flex gap-2">
            <select
              v-model="o.player_id"
              class="select select-bordered flex-1 text-sm"
            >
              <option value="">選手を選択</option>
              <option v-for="p in players" :key="p.id" :value="p.id">
                {{ p.player_code }} {{ p.name }}
              </option>
            </select>
            <select
              v-model="o.position"
              class="select select-bordered flex-1 text-sm"
            >
              <option value="">ポジション</option>
              <option v-for="pos in positions" :key="pos" :value="pos">{{ pos }}</option>
            </select>
          </div>
        </div>
      </div>

      <button
        class="btn btn-primary w-full h-14 text-lg mt-2"
        :disabled="saving"
        @click="save"
      >
        <span v-if="saving" class="loading loading-spinner loading-sm"></span>
        保存する
      </button>
    </div>

    <div v-if="toast" class="toast toast-top toast-center z-50">
      <div class="alert alert-success">
        <span>{{ toast }}</span>
      </div>
    </div>
  </div>
</template>
