import { createRouter, createWebHashHistory } from 'vue-router'
import GameListView from '../views/GameListView.vue'
import GameDetailView from '../views/GameDetailView.vue'
import AdminView from '../views/AdminView.vue'
import GameAddView from '../views/GameAddView.vue'
import GameEditView from '../views/GameEditView.vue'
import OrderView from '../views/OrderView.vue'
import StatsView from '../views/StatsView.vue'
import PlayerStatsView from '../views/PlayerStatsView.vue'
import AllPlayersStatsView from '../views/AllPlayersStatsView.vue'
import ObStatsView from '../views/ObStatsView.vue'
import PastGamesView from '../views/PastGamesView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: GameListView },
    { path: '/past-games', component: PastGamesView },
    { path: '/stats', component: StatsView },
    { path: '/stats/players', component: AllPlayersStatsView },
    { path: '/stats/ob', component: ObStatsView },
    { path: '/stats/:playerId', component: PlayerStatsView },
    { path: '/games/:id', component: GameDetailView },
    { path: '/admin', component: AdminView },
    { path: '/admin/games/add', component: GameAddView },
    { path: '/admin/games/:id', component: GameEditView },
    { path: '/admin/games/:id/order', component: OrderView },
  ],
})

export default router