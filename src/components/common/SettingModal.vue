<script setup lang="ts">
import { ref, watch } from 'vue'
import AIConfigTab from './settings/AIConfigTab.vue'
import AIPromptConfigTab from './settings/AIPromptConfigTab.vue'
import CacheManageTab from './settings/CacheManageTab.vue'

// Props
const props = defineProps<{
  open: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'ai-config-saved': []
}>()

// Tab 配置
const tabs = [
  { id: 'settings', label: '基础设置', icon: 'i-heroicons-cog-6-tooth' },
  { id: 'ai-config', label: '模型配置', icon: 'i-heroicons-sparkles' },
  { id: 'ai-prompt', label: 'AI 对话配置', icon: 'i-heroicons-document-text' },
  { id: 'about', label: '关于', icon: 'i-heroicons-information-circle' },
]

const activeTab = ref('settings')
const aiConfigRef = ref<InstanceType<typeof AIConfigTab> | null>(null)
const cacheManageRef = ref<InstanceType<typeof CacheManageTab> | null>(null)

// AI 配置变更回调
function handleAIConfigChanged() {
  emit('ai-config-saved')
}

// 关闭弹窗
function closeModal() {
  emit('update:open', false)
}

// 监听打开状态
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      activeTab.value = 'ai-config'
      // 刷新 AI 配置
      aiConfigRef.value?.refresh()
    }
  }
)

// 监听 Tab 切换，刷新对应数据
watch(
  () => activeTab.value,
  (newTab) => {
    if (newTab === 'settings') {
      cacheManageRef.value?.refresh()
    }
  }
)
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)" :ui="{ content: 'md:w-full max-w-2xl' }">
    <template #content>
      <div class="p-6">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">全局设置</h2>
          <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="closeModal" />
        </div>

        <!-- Tab 导航 -->
        <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
              :class="[
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
              ]"
              @click="activeTab = tab.id"
            >
              <UIcon :name="tab.icon" class="h-4 w-4" />
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </div>

        <!-- Tab 内容 -->
        <div class="h-[500px] overflow-y-auto">
          <!-- AI 配置 Tab -->
          <div v-show="activeTab === 'ai-config'" class="pr-1">
            <AIConfigTab ref="aiConfigRef" @config-changed="handleAIConfigChanged" />
          </div>

          <!-- 系统提示词配置 Tab -->
          <div v-show="activeTab === 'ai-prompt'" class="pr-1">
            <AIPromptConfigTab @config-changed="handleAIConfigChanged" />
          </div>

          <!-- 设置 Tab -->
          <div v-show="activeTab === 'settings'" class="space-y-6 pr-1">
            <!-- 缓存管理 -->
            <CacheManageTab ref="cacheManageRef" />
          </div>

          <!-- 帮助 Tab -->
          <div v-show="activeTab === 'about'" class="space-y-6 pr-1">
            <!-- 关于 -->
            <div>
              <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <UIcon name="i-heroicons-information-circle" class="h-4 w-4 text-blue-500" />
                关于 ChatLab
              </h3>
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-pink-500 to-pink-600"
                  >
                    <UIcon name="i-heroicons-chat-bubble-left-right" class="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">ChatLab</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">聊天记录分析工具</p>
                    <p class="mt-1 text-xs text-gray-400">版本 0.1.0</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 快捷键 -->
            <div>
              <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <UIcon name="i-heroicons-command-line" class="h-4 w-4 text-green-500" />
                快捷键
              </h3>
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div class="space-y-2 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">发送消息</span>
                    <div class="flex gap-1">
                      <kbd class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">Enter</kbd>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">换行</span>
                    <div class="flex gap-1">
                      <kbd class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">Shift</kbd>
                      <span class="text-gray-400">+</span>
                      <kbd class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">Enter</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
