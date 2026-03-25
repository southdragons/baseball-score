<script setup>
import { ref, computed, onMounted } from 'vue'

/* =====================
   GAS URL
===================== */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwDO9vI4vece_1h5s-IYPopKXW7c8I7_gNIQzhUf7z6nJrLN2dBlFiabj7ULaLh7HDd/exec' // ←ここにGAS URL

/* =====================
   日付
===================== */
const selectedDate = ref(new Date())
const calendarOpen = ref(false)
const calendarMonth = ref(new Date())
const today = new Date()

function formatDisplay(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString()
}

/* =====================
   カレンダー
===================== */
const days = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()

  const rows = []
  let week = Array(firstDay).fill(null)

  for (let d = 1; d <= lastDate; d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) {
      rows.push(week)
      week = []
    }
  }

  if (week.length) {
    while (week.length < 7) week.push(null)
    rows.push(week)
  }

  return rows
})

function prevMonth() {
  calendarMonth.value = new Date(
    calendarMonth.value.getFullYear(),
    calendarMonth.value.getMonth() - 1,
    1
  )
}

function nextMonth() {
  calendarMonth.value = new Date(
    calendarMonth.value.getFullYear(),
    calendarMonth.value.getMonth() + 1,
    1
  )
}

/* =====================
   カレンダースタイル
===================== */
function getDayStyle(d) {
  if (!d) return baseStyle

  const isToday = sameDay(d, today)
  const isSelected = sameDay(d, selectedDate.value)

  if (isSelected) return selectedStyle
  if (isToday) return todayStyle

  return baseStyle
}

const baseStyle = {
  flex: 1,
  textAlign: 'center',
  padding: '10px',
  cursor: 'pointer'
}

const todayStyle = {
  ...baseStyle,
  backgroundColor: '#bfdbfe'
}

const selectedStyle = {
  ...baseStyle,
  backgroundColor: '#2563eb',
  color: '#fff'
}

/* =====================
   メンバー
===================== */
function generateId() {
  return Math.random().toString(36).substring(2)
}

const members = ref([
  { id: generateId(), name: '', status: null }
])

function addMember() {
  members.value.push({
    id: generateId(),
    name: '',
    status: null
  })
}

function removeMember(id) {
  if (members.value.length === 1) return
  members.value = members.value.filter(m => m.id !== id)
}

function updateMember(id, key, value) {
  members.value = members.value.map(m =>
    m.id === id ? { ...m, [key]: value } : m
  )
}

/* =====================
   ステータスボタン
===================== */
function getStatusStyle(current, target) {
  const base = {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  }

  if (current === target) {
    return {
      ...base,
      backgroundColor: target === '欠席' ? '#fecaca' : '#fde68a'
    }
  }

  return {
    ...base,
    backgroundColor: '#e5e7eb'
  }
}

/* =====================
   トースト
===================== */
const toast = ref('')

function showToast(msg) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

/* =====================
   履歴
===================== */
const records = ref([])

async function fetchRecords() {
  if (!GAS_URL) return

  try {
    const res = await fetch(`${GAS_URL}?userId=test-user`)
    if (!res.ok) throw new Error()

    const data = await res.json()

    if (Array.isArray(data)) {
      records.value = data
    } else {
      records.value = []
    }

  } catch (e) {
    console.error(e)
    showToast('履歴取得失敗')
  }
}

onMounted(() => {
  fetchRecords()
})

/* =====================
   送信
===================== */
async function handleSubmit() {
  const validMembers = members.value.filter(
    m => m.name.trim() !== '' && m.status !== null
  )

  if (validMembers.length === 0) {
    alert('名前とステータスを入力してください')
    return
  }

  if (!GAS_URL) {
    showToast('GAS URL未設定')
    return
  }

  const payload = {
    type: 'create',
    userId: 'test-user',
    date: selectedDate.value.toISOString().slice(0, 10),
    members: validMembers.map(m => ({
      name: m.name,
      status: m.status
    }))
  }

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!res.ok) throw new Error()

    showToast('送信完了')

    members.value = [{ id: generateId(), name: '', status: null }]

    await fetchRecords()

  } catch (e) {
    console.error(e)
    showToast('送信失敗')
  }
}

/* =====================
   編集・削除
===================== */
function handleEdit(r) {
  selectedDate.value = new Date(r.date)

  members.value = [
    {
      id: generateId(),
      name: r.name,
      status: r.status
    }
  ]

  showToast('履歴を読み込みました')
}

async function handleDelete(id) {
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'delete',
        id
      })
    })

    showToast('削除完了')
    fetchRecords()

  } catch (e) {
    console.error(e)
    showToast('削除失敗')
  }
}
</script>

<template>
  <div style="padding:20px;background:#f3f4f6;min-height:100vh;">

    <h1 style="font-size:22px;font-weight:bold;margin-bottom:16px;">
      ⚾ 出欠連絡
    </h1>

    <!-- 日付 -->
    <div @click="calendarOpen = !calendarOpen"
         style="background:#fff;padding:14px;border-radius:12px;margin-bottom:12px;">
      📅 {{ formatDisplay(selectedDate) }}
    </div>

    <!-- カレンダー -->
    <div v-if="calendarOpen" style="background:#fff;padding:12px;border-radius:12px;">

      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <button @click="prevMonth">◀</button>
        <div>{{ calendarMonth.getFullYear() }}年 {{ calendarMonth.getMonth()+1 }}月</div>
        <button @click="nextMonth">▶</button>
      </div>

      <div style="display:flex;margin-bottom:6px;">
        <div v-for="w in ['日','月','火','水','木','金','土']"
             :key="w"
             style="flex:1;text-align:center;font-weight:bold;color:#6b7280;">
          {{ w }}
        </div>
      </div>

      <div v-for="(week,i) in days" :key="i" style="display:flex;">
        <div v-for="(d,j) in week"
             :key="j"
             @click="d && (selectedDate = d, calendarOpen=false)"
             :style="getDayStyle(d)">
          {{ d ? d.getDate() : '' }}
        </div>
      </div>

    </div>

    <!-- メンバー -->
    <div v-for="(m,i) in members" :key="m.id"
         style="background:#fff;padding:14px;border-radius:12px;margin-top:12px;">

      <div>{{ i + 1 }}人目</div>

      <input v-model="m.name"
             placeholder="名前"
             style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;" />

      <div style="display:flex;gap:10px;">
        <button @click="updateMember(m.id,'status','欠席')"
                :style="getStatusStyle(m.status,'欠席')">
          ❌ 欠席
        </button>

        <button @click="updateMember(m.id,'status','10時参加')"
                :style="getStatusStyle(m.status,'10時参加')">
          🕙 10時
        </button>
      </div>

      <div v-if="members.length > 1" style="margin-top:10px;">
        <button @click="removeMember(m.id)">🗑 削除</button>
      </div>

    </div>

    <div style="margin-top:10px;">
      <button @click="addMember">➕ 兄弟追加</button>
    </div>

    <div style="margin-top:20px;">
      <button @click="handleSubmit"
              style="width:100%;padding:16px;background:#2563eb;color:#fff;border:none;border-radius:12px;">
        📤 送信
      </button>
    </div>

    <!-- 履歴 -->
    <div style="margin-top:20px;">
      <h2 style="font-weight:bold;">履歴</h2>

      <div v-for="r in records" :key="r.id"
           style="background:#fff;padding:12px;border-radius:12px;margin-top:8px;">

        <div style="color:#6b7280;">{{ r.timestamp }}</div>
        <div>{{ r.name }} - {{ r.status }}</div>

        <div style="display:flex;gap:10px;margin-top:6px;">
          <button @click="handleEdit(r)">編集</button>
          <button @click="handleDelete(r.id)">削除</button>
        </div>

      </div>
    </div>

    <!-- トースト -->
    <div v-if="toast"
         style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
                background:#2563eb;color:#fff;padding:10px 20px;border-radius:10px;">
      {{ toast }}
    </div>

  </div>
</template>