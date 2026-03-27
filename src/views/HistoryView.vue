<script setup>
import { ref, onMounted } from 'vue'
import HistoryList from '../components/HistoryList.vue'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwDO9vI4vece_1h5s-IYPopKXW7c8I7_gNIQzhUf7z6nJrLN2dBlFiabj7ULaLh7HDd/exec'

const userId = ref('')
const records = ref([])
const loading = ref(true) // ★追加

function initUserId() {
  const saved = localStorage.getItem('userId')

  if (saved) {
    userId.value = saved
  } else {
    console.log('userIdなし')
  }
}

async function fetchRecords() {
  loading.value = true // ★追加

  try {
    console.log('userId:', userId.value)

    const res = await fetch(`${GAS_URL}?userId=${userId.value}`)
    const data = await res.json()

    console.log('取得データ:', data)

    const now = new Date()
    const DAYS = 30

    records.value = (data || [])
      .filter(r => {
        const d = new Date(r.date)
        const diff = (now - d) / (1000 * 60 * 60 * 24)
        return diff <= DAYS
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))

  } catch (e) {
    console.error(e)
  }

  loading.value = false // ★追加
}

onMounted(() => {
  initUserId()
  fetchRecords()
})
</script>

<template>
  <div class="max-w-md mx-auto px-3 pb-10 bg-base-200 min-h-screen">

    <div class="text-xl font-bold mb-4">
      📄 履歴
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <div class="mt-3 text-sm text-gray-500">
        読み込み中...
      </div>
    </div>

    <!-- データ表示 -->
    <div v-else>
      <HistoryList :records="records" />
    </div>

    <!-- 戻る -->
    <router-link to="/" class="btn btn-primary text-white w-full mt-6">
      ← 入力画面へ戻る
    </router-link>

  </div>
</template>

<style scoped>
</style>