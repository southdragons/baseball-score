<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const games = ref([])
const loading = ref(true)
const showPasswordModal = ref(false)
const passwordInput = ref('')
const passwordError = ref(false)
const ADMIN_PASSWORD = 'admin' // ここでパスワード設定

function openAdmin() {
  const saved = localStorage.getItem('adminAuth')
  if (saved === ADMIN_PASSWORD) {
    router.push('/admin')
  } else {
    showPasswordModal.value = true
    passwordInput.value = ''
    passwordError.value = false
  }
}

function submitPassword() {
  if (passwordInput.value === ADMIN_PASSWORD) {
    localStorage.setItem('adminAuth', ADMIN_PASSWORD)
    showPasswordModal.value = false
    router.push('/admin')
  } else {
    passwordError.value = true
  }
}

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
    .eq('game_date', today)
    .order('game_date', { ascending: true })
  if (!error) games.value = data || []
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

onMounted(fetchGames)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="text-center mb-6">
      <div class="text-4xl mb-2">⚾</div>
      <h1 class="text-2xl font-bold">試合情報</h1>
      <p class="text-gray-500 text-sm mt-1">サウスドラゴンズ</p>
    </div>

    <div class="grid grid-cols-3 gap-2 mb-4">
      <router-link to="/stats" class="btn btn-sm btn-warning opacity-90 hover:opacity-100">
        🏆 成績ランキング
      </router-link>
      <router-link to="/past-games" class="btn btn-sm btn-outline opacity-90 hover:opacity-100">
        📅 過去の試合
      </router-link>
      <button class="btn btn-sm btn-outline opacity-50 hover:opacity-100" @click="openAdmin">
        ⚙️ 管理者
      </button>
    </div>

    <!-- パスワードモーダル -->
    <div v-if="showPasswordModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-xl w-72">
        <h2 class="font-bold text-lg mb-4">🔐 管理者認証</h2>
        <input
          v-model="passwordInput"
          type="password"
          placeholder="パスワードを入力"
          class="input w-full border-2 border-gray-400 mb-2"
          @keyup.enter="submitPassword"
        />
        <div v-if="passwordError" class="text-error text-sm mb-2">パスワードが違います</div>
        <div class="flex gap-2">
          <button class="btn btn-outline flex-1" @click="showPasswordModal = false">キャンセル</button>
          <button class="btn btn-primary flex-1" @click="submitPassword">入力</button>
        </div>
      </div>
    </div>

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
