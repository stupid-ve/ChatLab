<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import { FileDropZone } from '@/components/UI'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const chatStore = useChatStore()
const { isImporting, importProgress } = storeToRefs(chatStore)

const importError = ref<string | null>(null)
const showTutorialModal = ref(false)
const showFormatModal = ref(false)

const features = [
  {
    icon: '⚡️',
    title: '极致性能',
    desc: '将聊天记录导入为本地数据库方案，千万级数据秒级索引，体验流畅',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    delay: '0ms',
  },
  {
    icon: '📊',
    title: '多维度分析',
    desc: '从群榜单到群语录，全方位解读群聊数据，发现隐藏的趣味。',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    delay: '100ms',
  },
  {
    icon: '🔒',
    title: '隐私至上',
    desc: '聊天记录本地存储本地分析，保护你的隐私。',
    color: 'text-green-500',
    bg: 'bg-green-50',
    delay: '200ms',
  },
  {
    icon: '🤖',
    title: 'AI 洞察',
    desc: '内置 AI Agent，智能回答关于群聊的一切疑问，挖掘数据背后的趣事。',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    delay: '300ms',
  },
]

const router = useRouter()

// 根据会话类型导航到对应页面
async function navigateToSession(sessionId: string) {
  const session = await window.chatApi.getSession(sessionId)
  if (session) {
    const routeName = session.type === 'private' ? 'private-chat' : 'group-chat'
    router.push({ name: routeName, params: { id: sessionId } })
  }
}

// 处理文件选择（点击选择）
async function handleClickImport() {
  importError.value = null
  const result = await chatStore.importFile()
  if (!result.success && result.error && result.error !== '未选择文件') {
    importError.value = result.error
  } else if (result.success && chatStore.currentSessionId) {
    await navigateToSession(chatStore.currentSessionId)
  }
}

// 处理文件拖拽
async function handleFileDrop({ paths }: { files: File[]; paths: string[] }) {
  if (paths.length === 0) {
    importError.value = '无法读取文件路径'
    return
  }

  importError.value = null
  const result = await chatStore.importFileFromPath(paths[0])
  if (!result.success && result.error) {
    importError.value = result.error
  } else if (result.success && chatStore.currentSessionId) {
    await navigateToSession(chatStore.currentSessionId)
  }
}

// 教程 Accordion 数据
const tutorialItems = [
  {
    value: 'qq',
    label: 'QQ',
    icon: 'i-heroicons-chat-bubble-left-right',
    steps: [
      '使用 qq-chat-exporter 导出聊天记录（推荐最新版）',
      '导出完成后会得到 .json 文件',
      '将 .json 文件拖拽到上方导入区域',
    ],
    link: 'https://github.com/shuakami/qq-chat-exporter',
    hasExternalLink: true,
  },
  {
    value: 'other',
    label: '其他平台',
    icon: 'i-heroicons-device-phone-mobile',
    steps: ['使用任意工具导出聊天记录', '将导出文件转换为 ChatLab 通用格式', '将转换后的 .json 文件拖拽到上方导入区域'],
    hasExternalLink: false,
    showFormatButton: true,
  },
]

// 默认展开所有项
const tutorialDefaultValue = tutorialItems.map((item) => item.value)

function openTutorial() {
  showTutorialModal.value = true
}

// 复制格式示例
const formatExample = `{
  "chatlab": {
    "version": "1.0.0",
    "exportedAt": 1732924800,
    "generator": "Your Tool Name"
  },
  "meta": {
    "name": "群聊名称",
    "platform": "qq",
    "type": "group"
  },
  "members": [
    {
      "platformId": "123456789",
      "accountName": "用户昵称",
      "groupNickname": "群昵称（可选）"
    }
  ],
  "messages": [
    {
      "sender": "123456789",
      "accountName": "发送时昵称",
      "timestamp": 1732924800,
      "type": 0,
      "content": "消息内容"
    }
  ]
}`

function copyFormatExample() {
  window.electron.copyToClipboard(formatExample)
}

function getProgressText(): string {
  if (!importProgress.value) return ''
  switch (importProgress.value.stage) {
    case 'detecting':
      return '正在检测格式...'
    case 'reading':
      return '正在读取文件...'
    case 'parsing':
      return '正在解析消息...'
    case 'saving':
      return '正在写入数据库...'
    case 'done':
      return '导入完成'
    case 'error':
      return '导入中断'
    default:
      return ''
  }
}

function getProgressDetail(): string {
  if (!importProgress.value) return ''
  const { messagesProcessed, totalBytes, bytesRead } = importProgress.value

  if (messagesProcessed && messagesProcessed > 0) {
    return `已处理 ${messagesProcessed.toLocaleString()} 条消息`
  }

  if (totalBytes && bytesRead) {
    const percent = Math.round((bytesRead / totalBytes) * 100)
    const mbRead = (bytesRead / 1024 / 1024).toFixed(1)
    const mbTotal = (totalBytes / 1024 / 1024).toFixed(1)
    return `${mbRead} MB / ${mbTotal} MB (${percent}%)`
  }

  return importProgress.value.message || ''
}
</script>

<template>
  <div class="relative flex h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950">
    <!-- Animated Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-purple-200/30 blur-[120px] mix-blend-multiply animate-blob dark:bg-purple-900/20 dark:mix-blend-screen"
      ></div>
      <div
        class="absolute -top-[20%] -right-[10%] h-[70%] w-[70%] rounded-full bg-pink-200/30 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000 dark:bg-pink-900/20 dark:mix-blend-screen"
      ></div>
      <div
        class="absolute -bottom-[20%] left-[20%] h-[70%] w-[70%] rounded-full bg-blue-200/30 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000 dark:bg-blue-900/20 dark:mix-blend-screen"
      ></div>
    </div>

    <!-- Content Container -->
    <div class="relative h-full w-full overflow-y-auto">
      <div class="flex min-h-full w-full flex-col items-center justify-center px-4 py-12">
        <!-- Hero Section -->
        <div class="xl:mb-16 mb-8 text-center">
          <div class="relative inline-block">
            <h1
              class="mb-6 bg-linear-to-r from-pink-500 via-pink-500 to-violet-500 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-8xl drop-shadow-sm animate-gradient-x bg-size-[200%_auto]"
            >
              ChatLab
            </h1>
          </div>
          <p class="text-xl font-medium text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            你的本地聊天分析实验室
          </p>
        </div>

        <!-- Feature Cards -->
        <div class="xl:mb-16 mb-8 grid max-w-6xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 px-4">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="group relative overflow-hidden rounded-3xl border border-transparent p-4 transition-all duration-500"
          >
            <div class="relative">
              <div class="mb-3 flex items-center">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                >
                  <span class="text-xl filter drop-shadow-sm">{{ feature.icon }}</span>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ feature.title }}
                </h3>
              </div>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ feature.desc }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col items-center space-y-6">
          <!-- Import Drop Zone -->
          <FileDropZone
            :accept="['.json', '.txt']"
            :disabled="isImporting"
            class="w-full max-w-4xl"
            @files="handleFileDrop"
          >
            <template #default="{ isDragOver, openFileDialog }">
              <div
                class="group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-300/50 bg-white/50 px-8 py-8 backdrop-blur-sm transition-all duration-300 hover:border-pink-400 hover:bg-white/80 hover:shadow-lg hover:shadow-pink-500/10 focus:outline-none focus:ring-4 focus:ring-pink-500/20 sm:px-12 sm:py-12 dark:border-pink-700/50 dark:bg-gray-900/50 dark:hover:border-pink-500 dark:hover:bg-gray-900/80"
                :class="{
                  'border-pink-500 bg-pink-50/50 dark:border-pink-400 dark:bg-pink-900/20': isDragOver && !isImporting,
                  'cursor-not-allowed opacity-70': isImporting,
                  'hover:scale-[1.02]': !isImporting,
                }"
                @click="!isImporting && handleClickImport()"
              >
                <!-- Icon -->
                <div
                  class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-100 to-rose-100 transition-transform duration-300 dark:from-pink-900/30 dark:to-rose-900/30"
                  :class="{ 'scale-110': isDragOver && !isImporting, 'animate-pulse': isImporting }"
                >
                  <UIcon
                    v-if="!isImporting"
                    name="i-heroicons-arrow-up-tray"
                    class="h-8 w-8 text-pink-600 transition-transform group-hover:-translate-y-1 dark:text-pink-400"
                  />
                  <UIcon
                    v-else
                    name="i-heroicons-arrow-path"
                    class="h-8 w-8 animate-spin text-pink-600 dark:text-pink-400"
                  />
                </div>

                <!-- Text -->
                <div class="w-full text-center">
                  <template v-if="isImporting && importProgress">
                    <!-- 导入中显示进度 -->
                    <p class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{{ getProgressText() }}</p>
                    <div class="mx-auto w-full max-w-md">
                      <UProgress v-model="importProgress.progress" size="md" />
                    </div>
                    <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      {{ getProgressDetail() }}
                    </p>
                  </template>
                  <template v-else>
                    <!-- 默认状态 -->
                    <p class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ isDragOver ? '松开鼠标导入文件' : '点击选择或拖拽文件到这里' }}
                    </p>
                  </template>
                </div>
              </div>
            </template>
          </FileDropZone>

          <!-- Supported Formats Text -->
          <p class="text-sm text-gray-400 dark:text-gray-500">
            支持 QQ、微信、Discord、Snapchat、Reddit、TikTok 等聊天记录
          </p>

          <!-- Error Message -->
          <div
            v-if="importError"
            class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
          >
            <UIcon name="i-heroicons-exclamation-circle" class="h-5 w-5 shrink-0" />
            <span>{{ importError }}</span>
          </div>

          <UButton @click="openTutorial">查看聊天记录导入教程 →</UButton>
        </div>
      </div>
    </div>

    <!-- 通用格式说明弹窗（层级高于教程弹窗） -->
    <UModal v-model:open="showFormatModal" :ui="{ content: 'md:w-full max-w-3xl z-[60]', overlay: 'z-[60]' }">
      <template #content>
        <div class="p-6">
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
              >
                <UIcon name="i-heroicons-document-text" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">ChatLab 通用格式说明</h2>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="showFormatModal = false" />
          </div>

          <!-- 格式说明 -->
          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              ChatLab 支持通用的 JSON 格式。只需在 JSON 文件中包含
              <code class="rounded bg-gray-100 px-1.5 py-0.5 text-pink-600 dark:bg-gray-800 dark:text-pink-400">
                chatlab
              </code>
              对象即可被识别。
            </p>

            <!-- JSON 示例 -->
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">示例格式</span>
                <UButton variant="ghost" size="xs" icon="i-heroicons-clipboard-document" @click="copyFormatExample">
                  复制
                </UButton>
              </div>
              <pre class="overflow-x-auto text-xs leading-relaxed text-gray-700 dark:text-gray-300"><code>{
  "chatlab": {
    "version": "1.0.0",
    "exportedAt": 1732924800,
    "generator": "Your Tool Name"
  },
  "meta": {
    "name": "群聊名称",
    "platform": "qq",  // qq | wechat | telegram | discord 等
    "type": "group"    // group | private （群聊|私聊）
  },
  "members": [
    {
      "platformId": "123456789",
      "accountName": "用户昵称",
      "groupNickname": "群昵称（可选）"
    }
  ],
  "messages": [
    {
      "sender": "123456789",
      "accountName": "发送时昵称",
      "timestamp": 1732924800,  // 秒级时间戳
      "type": 0,  // 0=文本 1=图片 2=语音 3=视频
      "content": "消息内容"
    }
  ]
}</code></pre>
            </div>

            <!-- 字段说明 -->
            <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">消息类型说明</h3>
              <div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div class="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                  <span class="font-mono text-pink-600 dark:text-pink-400">0</span>
                  <span class="ml-2 text-gray-600 dark:text-gray-300">文本</span>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                  <span class="font-mono text-pink-600 dark:text-pink-400">1</span>
                  <span class="ml-2 text-gray-600 dark:text-gray-300">图片</span>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                  <span class="font-mono text-pink-600 dark:text-pink-400">2</span>
                  <span class="ml-2 text-gray-600 dark:text-gray-300">语音</span>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                  <span class="font-mono text-pink-600 dark:text-pink-400">3</span>
                  <span class="ml-2 text-gray-600 dark:text-gray-300">视频</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p class="text-sm text-blue-600 dark:text-blue-400">
              💡 文件名只需以
              <code class="rounded bg-blue-100 px-1 dark:bg-blue-800">.json</code>
              结尾，JSON 中包含
              <code class="rounded bg-blue-100 px-1 dark:bg-blue-800">chatlab</code>
              对象即可被识别。
            </p>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 导入教程弹窗 -->
    <UModal v-model:open="showTutorialModal" :ui="{ content: 'md:w-full max-w-2xl' }">
      <template #content>
        <div class="p-6">
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30"
              >
                <UIcon name="i-heroicons-book-open" class="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">聊天记录导入教程</h2>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="showTutorialModal = false" />
          </div>

          <!-- 教程内容 - 使用 Accordion -->
          <UAccordion type="multiple" :default-value="tutorialDefaultValue" :items="tutorialItems">
            <template #body="{ item }">
              <!-- 步骤列表 -->
              <ol class="mb-4 space-y-2">
                <li
                  v-for="(step, index) in item.steps"
                  :key="index"
                  class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-medium text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
                  >
                    {{ index + 1 }}
                  </span>
                  <span>{{ step }}</span>
                </li>
              </ol>

              <!-- 工具链接 / 格式说明按钮 -->
              <UButton
                v-if="item.hasExternalLink"
                variant="soft"
                size="sm"
                :trailing-icon="'i-heroicons-arrow-top-right-on-square'"
                @click="window.electron.openExternal(item.link)"
              >
                查看导出工具
              </UButton>
              <UButton
                v-if="item.showFormatButton"
                variant="soft"
                size="sm"
                :trailing-icon="'i-heroicons-document-text'"
                @click="showFormatModal = true"
              >
                查看通用格式说明
              </UButton>
            </template>
          </UAccordion>

          <!-- 底部提示 -->
          <div class="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              💡 提示：ChatLab 支持多种聊天记录格式，包括 QQ、微信、Discord
              等平台。将导出的文件直接拖拽到导入区域即可开始分析。
            </p>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
