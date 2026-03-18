<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalysisSession, MessageType } from '@/types/base'
import { getMessageTypeName } from '@/types/base'
import type { MemberActivity, HourlyActivity, DailyActivity, WeekdayActivity } from '@/types/analysis'
import { EChartPie } from '@/components/charts'
import type { EChartPieData } from '@/components/charts'
import { SectionCard } from '@/components/UI'
import { useOverviewStatistics } from '@/composables/analysis/useOverviewStatistics'
import { useDailyTrend } from '@/composables/analysis/useDailyTrend'
import OverviewStatCards from '@/components/analysis/Overview/OverviewStatCards.vue'
import OverviewIdentityCard from '@/components/analysis/Overview/OverviewIdentityCard.vue'
import DailyTrendCard from '@/components/analysis/Overview/DailyTrendCard.vue'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'openSessionIndex'): void
  (e: 'openIncrementalImport'): void
  (e: 'openMessageExport'): void
}>()

const props = defineProps<{
  session: AnalysisSession
  memberActivity: MemberActivity[]
  topMembers: MemberActivity[]
  bottomMembers: MemberActivity[]
  messageTypes: Array<{ type: MessageType; count: number }>
  hourlyActivity: HourlyActivity[]
  dailyActivity: DailyActivity[]
  timeRange: { start: number; end: number } | null
  selectedYear: number | null
  filteredMessageCount: number
  filteredMemberCount: number
  timeFilter?: { startTs?: number; endTs?: number }
}>()

// 星期活跃度数据（用于统计信息计算）
const weekdayActivity = ref<WeekdayActivity[]>([])

// 使用 Composables
const {
  durationDays,
  dailyAvgMessages,
  totalDurationDays,
  totalDailyAvgMessages,
  imageCount,
  peakHour,
  peakWeekday,
  weekdayNames,
  weekdayVsWeekend,
  peakDay,
  activeDays,
  totalDays,
  activeRate,
  maxConsecutiveDays,
} = useOverviewStatistics(props, weekdayActivity)

const { dailyChartData } = useDailyTrend(() => props.dailyActivity)

// 消息类型图表数据
const typeChartData = computed<EChartPieData>(() => {
  return {
    labels: props.messageTypes.map((item) => getMessageTypeName(item.type, t)),
    values: props.messageTypes.map((item) => item.count),
  }
})

// 成员水群分布图表数据
const memberChartData = computed<EChartPieData>(() => {
  const sortedMembers = [...props.memberActivity].sort((a, b) => b.messageCount - a.messageCount)
  const top10 = sortedMembers.slice(0, 10)
  const othersCount = sortedMembers.slice(10).reduce((sum, m) => sum + m.messageCount, 0)

  const labels = top10.map((m) => m.name)
  const values = top10.map((m) => m.messageCount)

  if (othersCount > 0) {
    labels.push(t('analysis.overview.others'))
    values.push(othersCount)
  }

  return {
    labels,
    values,
  }
})

// 加载星期活跃度数据（用于统计信息计算）
async function loadWeekdayActivity() {
  if (!props.session.id) return
  try {
    weekdayActivity.value = await window.chatApi.getWeekdayActivity(props.session.id, props.timeFilter)
  } catch (error) {
    console.error('加载星期活跃度失败:', error)
  }
}

// 监听 session.id 和 timeFilter 变化
watch(
  () => [props.session.id, props.timeFilter],
  () => {
    loadWeekdayActivity()
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div class="main-content space-y-6 p-6">
    <!-- 群聊身份卡 -->
    <OverviewIdentityCard
      :session="session"
      :total-duration-days="totalDurationDays"
      :total-daily-avg-messages="totalDailyAvgMessages"
      :time-range="timeRange"
    >
      <template #tools>
        <div class="flex flex-col gap-2">
          <span class="mb-0.5 text-xs font-semibold tracking-wide text-white/60 dark:text-gray-500">
            {{ t('analysis.overview.tools') }}
          </span>
          <button
            class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 dark:bg-gray-700 dark:hover:bg-gray-600"
            @click="emit('openIncrementalImport')"
          >
            <UIcon name="i-heroicons-plus-circle" class="h-4 w-4 shrink-0" />
            {{ t('analysis.tooltip.incrementalImport') }}
          </button>
          <button
            class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 dark:bg-gray-700 dark:hover:bg-gray-600"
            @click="emit('openSessionIndex')"
          >
            <UIcon name="i-heroicons-clock" class="h-4 w-4 shrink-0" />
            {{ t('analysis.tooltip.sessionIndex') }}
          </button>
          <button
            class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 dark:bg-gray-700 dark:hover:bg-gray-600"
            @click="emit('openMessageExport')"
          >
            <UIcon name="i-heroicons-document-arrow-down" class="h-4 w-4 shrink-0" />
            {{ t('analysis.messageExport.title') }}
          </button>
        </div>
      </template>
    </OverviewIdentityCard>

    <!-- 关键指标卡片 -->
    <OverviewStatCards
      :daily-avg-messages="dailyAvgMessages"
      :duration-days="durationDays"
      :image-count="imageCount"
      :peak-hour="peakHour"
      :peak-weekday="peakWeekday"
      :weekday-names="weekdayNames"
      :weekday-vs-weekend="weekdayVsWeekend"
      :peak-day="peakDay"
      :active-days="activeDays"
      :total-days="totalDays"
      :active-rate="activeRate"
      :max-consecutive-days="maxConsecutiveDays"
    />

    <!-- 图表区域：消息类型 & 成员分布 -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- 消息类型分布 -->
      <SectionCard :title="t('analysis.overview.messageTypeDistribution')" :show-divider="false">
        <div class="p-5">
          <EChartPie :data="typeChartData" :height="256" />
        </div>
      </SectionCard>

      <!-- 成员水群分布 -->
      <SectionCard :title="t('analysis.overview.memberDistribution')" :show-divider="false">
        <div class="p-5">
          <EChartPie :data="memberChartData" :height="256" />
        </div>
      </SectionCard>
    </div>

    <!-- 每日消息趋势 -->
    <DailyTrendCard :daily-activity="dailyActivity" :daily-chart-data="dailyChartData" />
  </div>
</template>
