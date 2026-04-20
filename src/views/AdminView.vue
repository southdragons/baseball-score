<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const games = ref([])
const loading = ref(true)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref(null)
const deleteTargetName = ref('')

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

function confirmDelete(id, opponent) {
  deleteTargetId.value = id
  deleteTargetName.value = opponent
  showDeleteConfirm.value = true
}

async function deleteGame() {
  const id = deleteTargetId.value

  // 関連データを先に削除
  await supabase.from('innings').delete().eq('game_id', id)
  await supabase.from('at_bats').delete().eq('game_id', id)
  await supabase.from('steals').delete().eq('game_id', id)
  await supabase.from('orders').delete().eq('game_id', id)

  // 試合を削除
  const { error } = await supabase.from('games').delete().eq('id', id)

  showDeleteConfirm.value = false
  deleteTargetId.value = null
  deleteTargetName.value = ''

  if (!error) fetchGames()
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
              @click="confirmDelete(g.id, g.opponent)"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 削除確認モーダル -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-xl w-72">
        <h2 class="font-bold text-lg mb-2">🗑️ 試合を削除しますか？</h2>
        <p class="text-sm text-gray-500 mb-2">
          <span class="font-bold text-error">vs {{ deleteTargetName }}</span>
        </p>
        <p class="text-sm text-gray-500 mb-4">
          この試合に関連するスコア・打席記録・盗塁記録・オーダーも全て削除されます。この操作は取り消せません。
        </p>
        <div class="flex gap-2">
          <button class="btn btn-outline flex-1" @click="showDeleteConfirm = false">キャンセル</button>
          <button class="btn btn-error flex-1" @click="deleteGame">削除</button>
        </div>
      </div>
    </div>

  </div>
</template>