<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const gameDate = ref('')
const opponent = ref('')
const location = ref('')
const batFirst = ref('our')
const loading = ref(false)
const season = ref(new Date().getFullYear())
const toast = ref('')

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 試合日付が変わったら自動でシーズン（年）を更新
watch(gameDate, (val) => {
  if (val) {
    season.value = parseInt(val.split('-')[0])
  }
})

async function submit() {
  if (!gameDate.value || !opponent.value) {
    toast.value = '日付と対戦相手を入力してください'
    setTimeout(() => toast.value = '', 3000)
    return
  }
  loading.value = true
  try {
    const { error } = await supabase.from('games').insert({
      game_date: gameDate.value,
      opponent: opponent.value,
      location: location.value || null,
      status: 'upcoming',
      season: season.value,
      bat_first: batFirst.value
    })
    if (error) throw error
    router.push('/admin')
  } catch (e) {
    toast.value = 'エラーが発生しました'
    setTimeout(() => toast.value = '', 3000)
  } finally {
    loading.value = false
  }
}

gameDate.value = formatDate(new Date())
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="flex items-center mb-6 gap-2">
      <router-link to="/admin" class="btn btn-sm btn-ghost">←</router-link>
      <h1 class="text-xl font-bold">試合を追加</h1>
    </div>

    <div class="card bg-base-100 shadow border border-gray-200">
      <div class="card-body flex flex-col gap-4">

        <div>
          <label class="text-sm font-bold mb-1 block">試合日</label>
          <input
            type="date"
            v-model="gameDate"
            class="input w-full border-2 border-gray-400 focus:border-primary"
          />
        </div>

        <div>
          <label class="text-sm font-bold mb-1 block">対戦相手</label>
          <input
            v-model="opponent"
            placeholder="例：東山ファイターズ"
            class="input w-full border-2 border-gray-400 focus:border-primary"
          />
        </div>

        <div>
          <label class="text-sm font-bold mb-1 block">会場（任意）</label>
          <input
            v-model="location"
            placeholder="例：○○グラウンド"
            class="input w-full border-2 border-gray-400 focus:border-primary"
          />
        </div>

        <div>
          <label class="text-sm font-bold mb-1 block">先攻・後攻</label>
          <div class="flex gap-2">
            <button
              class="btn flex-1"
              :class="batFirst === 'our' ? 'btn-primary' : 'btn-outline'"
              @click="batFirst = 'our'"
            >先攻</button>
            <button
              class="btn flex-1"
              :class="batFirst === 'opponent' ? 'btn-primary' : 'btn-outline'"
              @click="batFirst = 'opponent'"
            >後攻</button>
          </div>
        </div>

        <button
          class="btn btn-primary w-full mt-2"
          :disabled="loading"
          @click="submit"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          登録する
        </button>

      </div>
    </div>

    <div v-if="toast" class="toast toast-top toast-center z-50">
      <div class="alert alert-error">
        <span>{{ toast }}</span>
      </div>
    </div>
  </div>
</template>