<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const games = ref([])
const loading = ref(true)

async function fetchGames() {
  loading.value = true
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('game_date', { ascending: false })
  if (!error) games.value = data || []
  loading.value = false
}

function statusLabel(status) {
  if (status === 'upcoming') return '⏳ 試合前'
  if (status === 'in_progress') return '⚾ 試合中'
  if (status === 'finished') return '✅ 試合終了'
  return ''
}

async function updateStatus(id, status) {
  await supabase.from('games').update({ status }).eq('id', id)
  fetchGames()
}

async function deleteGame(id) {
  await supabase.from('games').delete().eq('id', id)
  fetchGames()
}

onMounted(fetchGames)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="flex items-center mb-6 gap-2">
      <router-link to="/" class="btn btn-sm btn-ghost">←</router-link>
      <h1 class="text-xl font-bold">⚙️ 管理者メニュー</h1>
    </div>

    <router-link to="/admin/games/add" class="btn btn-primary w-full mb-4">
      ＋ 試合を追加
    </router-link>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else>
      <div v-if="!games.length" class="text-center text-gray-500 py-10">
        試合が登録されていません
      </div>

      <div
        v-for="g in games"
        :key="g.id"
        class="card bg-base-100 shadow border border-gray-200 mb-3"
      >
        <div class="card-body py-3">
          <div class="flex justify-between items-center mb-2">
            <div class="font-bold">vs {{ g.opponent }}</div>
            <div class="text-sm text-gray-500">{{ g.game_date }}</div>
          </div>

          <div class="flex gap-2 flex-wrap">
            <router-link
              :to="`/admin/games/${g.id}`"
              class="btn btn-sm btn-outline"
            >
              📝 記録入力
            </router-link>
            <router-link
              :to="`/admin/games/${g.id}/order`"
              class="btn btn-sm btn-outline"
            >
              📋 オーダー
            </router-link>
            <select
              :value="g.status"
              @change="updateStatus(g.id, $event.target.value)"
              class="select select-bordered select-sm"
            >
              <option value="upcoming">⏳ 試合前</option>
              <option value="in_progress">⚾ 試合中</option>
              <option value="finished">✅ 試合終了</option>
            </select>
            <button
              class="btn btn-sm btn-outline btn-error"
              @click="deleteGame(g.id)"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
