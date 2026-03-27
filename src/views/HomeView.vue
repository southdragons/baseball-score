<script setup>
import { ref, onMounted } from 'vue'
import DatePicker from '../components/DatePicker.vue'
import MemberForm from '../components/MemberForm.vue'
import SubmitBar from '../components/SubmitBar.vue'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwDO9vI4vece_1h5s-IYPopKXW7c8I7_gNIQzhUf7z6nJrLN2dBlFiabj7ULaLh7HDd/exec'

const userId = ref('')
const members = ref([{ id: Date.now(), name: '', status: null }])
const selectedDate = ref(new Date())
const records = ref([])
const loading = ref(false)

/* userId */
function initUserId() {
  const saved = localStorage.getItem('userId')
  if (saved) userId.value = saved
  else {
    const id = 'user-' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem('userId', id)
    userId.value = id
  }
}

/* メンバー */
function addMember() {
  members.value.push({ id: Date.now(), name: '', status: null })
}

function updateMember(id, key, val) {
  members.value = members.value.map(m =>
    m.id === id ? { ...m, [key]: val } : m
  )
}

function removeMember(id) {
  if (members.value.length === 1) return
  members.value = members.value.filter(m => m.id !== id)
}

/* 日付 */
function formatDate(d) {
  return d.toISOString().split('T')[0]
}

/* 履歴 */

/* 送信 */
async function submit() {
  const valid = members.value.filter(m => m.name && m.status)

  if (!valid.length) {
    toast.value = '入力してください'
    return
  }

  loading.value = true  // ★追加

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'create',
        userId: userId.value,
        date: formatDate(selectedDate.value),
        members: valid
      })
    })

    toast.value = '送信完了'

    setTimeout(() => {
      toast.value = ''
    }, 2000)

    members.value = [{ id: Date.now(), name: '', status: null }]
    fetchRecords()

  } catch (e) {
    toast.value = 'エラーが発生しました'
  }

  loading.value = false  // ★追加
}

/* 初期化 */
onMounted(() => {
  initUserId()
})
</script>

<template>
  <div class="max-w-md mx-auto px-3 pb-28">

    <div class="text-xl font-bold mb-3 flex items-center gap-2">
      ⚾ 出欠連絡
    </div>

    <DatePicker
      :date="selectedDate"
      @change="d => selectedDate = d"
    />

    <MemberForm
      :members="members"
      @add="addMember"
      @update="updateMember"
      @remove="removeMember"
    />
    <router-link
      to="/history"
      class="btn btn-outline w-full mt-4"
    >
      📄 履歴を見る
    </router-link>

    <SubmitBar
      :loading="loading"
      @submit="submit"
    />

    <!-- ★ここ修正 -->
    <div v-if="toast" class="toast toast-top toast-center z-50">
      <div class="alert alert-success">
        <span>{{ toast }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>

</style>