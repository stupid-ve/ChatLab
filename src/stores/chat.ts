import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AnalysisSession, ImportProgress, KeywordTemplate, PromptPreset, AIPromptSettings } from '@/types/chat'

// ==================== 内置提示词预设 ====================

/** 默认群聊预设ID */
export const DEFAULT_GROUP_PRESET_ID = 'builtin-group-default'
/** 默认私聊预设ID */
export const DEFAULT_PRIVATE_PRESET_ID = 'builtin-private-default'

/** 内置群聊预设 */
const BUILTIN_GROUP_PRESET: PromptPreset = {
  id: DEFAULT_GROUP_PRESET_ID,
  name: '默认群聊分析',
  chatType: 'group',
  roleDefinition: `你是一个专业的群聊记录分析助手。
你的任务是帮助用户理解和分析他们的群聊记录数据。`,
  responseRules: `1. 基于工具返回的数据回答，不要编造信息
2. 如果数据不足以回答问题，请说明
3. 回答要简洁明了，使用 Markdown 格式
4. 可以引用具体的发言作为证据
5. 对于统计数据，可以适当总结趋势和特点`,
  isBuiltIn: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/** 内置私聊预设 */
const BUILTIN_PRIVATE_PRESET: PromptPreset = {
  id: DEFAULT_PRIVATE_PRESET_ID,
  name: '默认私聊分析',
  chatType: 'private',
  roleDefinition: `你是一个专业的私聊记录分析助手。
你的任务是帮助用户理解和分析他们的私聊记录数据。

注意：这是一个私聊对话，只有两个人参与。你的分析应该关注：
- 两人之间的对话互动
- 谁更主动、谁回复更多
- 对话的主题和内容变化
- 不要使用"群"这个词，使用"对话"或"聊天"`,
  responseRules: `1. 基于工具返回的数据回答，不要编造信息
2. 如果数据不足以回答问题，请说明
3. 回答要简洁明了，使用 Markdown 格式
4. 可以引用具体的发言作为证据
5. 关注两人之间的互动模式和对话特点`,
  isBuiltIn: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/** 所有内置预设 */
export const BUILTIN_PRESETS: PromptPreset[] = [BUILTIN_GROUP_PRESET, BUILTIN_PRIVATE_PRESET]

export const useChatStore = defineStore(
  'chat',
  () => {
    // 会话列表
    const sessions = ref<AnalysisSession[]>([])
    // 当前选中的会话ID
    const currentSessionId = ref<string | null>(null)
    // 导入状态
    const isImporting = ref(false)
    const importProgress = ref<ImportProgress | null>(null)

    // 当前选中的会话
    const currentSession = computed(() => {
      if (!currentSessionId.value) return null
      return sessions.value.find((s) => s.id === currentSessionId.value) || null
    })

    // 是否已初始化
    const isInitialized = ref(false)

    /**
     * 从数据库加载会话列表
     */
    async function loadSessions() {
      try {
        const list = await window.chatApi.getSessions()
        sessions.value = list
        // 如果当前选中的会话不存在了，清除选中状态
        if (currentSessionId.value && !list.find((s) => s.id === currentSessionId.value)) {
          currentSessionId.value = null
        }
        isInitialized.value = true
      } catch (error) {
        console.error('加载会话列表失败:', error)
        isInitialized.value = true
      }
    }

    /**
     * 选择文件并导入
     */
    async function importFile(): Promise<{ success: boolean; error?: string }> {
      try {
        // 选择文件
        const result = await window.chatApi.selectFile()
        if (!result || !result.filePath) {
          return { success: false, error: '未选择文件' }
        }
        if (result.error) {
          return { success: false, error: result.error }
        }

        // 使用共享的导入逻辑
        return await importFileFromPath(result.filePath)
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    /**
     * 从文件路径直接导入（用于拖拽导入）
     */
    async function importFileFromPath(filePath: string): Promise<{ success: boolean; error?: string }> {
      try {
        // 开始导入
        isImporting.value = true

        // 初始化状态
        importProgress.value = {
          stage: 'detecting',
          progress: 0,
          message: '准备导入...',
        }

        // 进度队列控制
        const queue: ImportProgress[] = []
        let isProcessing = false
        let currentStage = 'reading'
        let lastStageTime = Date.now()
        const MIN_STAGE_TIME = 1000 // 每个阶段至少展示1秒

        const processQueue = async () => {
          if (isProcessing) return
          isProcessing = true

          while (queue.length > 0) {
            const next = queue[0]

            // 如果阶段发生变化，确保上一阶段展示了足够时间
            if (next.stage !== currentStage) {
              const elapsed = Date.now() - lastStageTime
              if (elapsed < MIN_STAGE_TIME) {
                await new Promise((resolve) => setTimeout(resolve, MIN_STAGE_TIME - elapsed))
              }
              currentStage = next.stage
              lastStageTime = Date.now()
            }

            // 更新状态
            importProgress.value = queue.shift()!
          }
          isProcessing = false
        }

        // 监听导入进度
        const unsubscribe = window.chatApi.onImportProgress((progress) => {
          // 跳过完成状态，直接跳转
          if (progress.stage === 'done') return
          queue.push(progress)
          processQueue()
        })

        // 执行导入
        const importResult = await window.chatApi.import(filePath)

        // 取消监听
        unsubscribe()

        // 等待队列处理完成
        while (queue.length > 0 || isProcessing) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        // 确保最后一个阶段也展示足够时间
        const elapsed = Date.now() - lastStageTime
        if (elapsed < MIN_STAGE_TIME) {
          await new Promise((resolve) => setTimeout(resolve, MIN_STAGE_TIME - elapsed))
        }

        // 确保进度条走完
        if (importProgress.value) {
          importProgress.value.progress = 100
        }

        // 给一点时间展示 100%
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (importResult.success && importResult.sessionId) {
          // 刷新会话列表
          await loadSessions()
          // 自动选中新导入的会话，进入分析页面
          currentSessionId.value = importResult.sessionId
          return { success: true }
        } else {
          return { success: false, error: importResult.error || '导入失败' }
        }
      } catch (error) {
        return { success: false, error: String(error) }
      } finally {
        isImporting.value = false
        // 延迟清除进度，让用户看到完成状态
        setTimeout(() => {
          importProgress.value = null
        }, 500)
      }
    }

    /**
     * 选择会话
     */
    function selectSession(id: string) {
      currentSessionId.value = id
    }

    /**
     * 删除会话
     */
    async function deleteSession(id: string): Promise<boolean> {
      try {
        const success = await window.chatApi.deleteSession(id)
        if (success) {
          // 从列表中移除
          const index = sessions.value.findIndex((s) => s.id === id)
          if (index !== -1) {
            sessions.value.splice(index, 1)
          }
          // 如果删除的是当前选中的会话，清除选中状态
          if (currentSessionId.value === id) {
            currentSessionId.value = null
          }
          // 强制从后端刷新会话列表，确保与文件系统同步
          await loadSessions()
        }
        return success
      } catch (error) {
        console.error('删除会话失败:', error)
        return false
      }
    }

    /**
     * 重命名会话
     */
    async function renameSession(id: string, newName: string): Promise<boolean> {
      try {
        const success = await window.chatApi.renameSession(id, newName)
        if (success) {
          // 更新本地列表中的名称
          const session = sessions.value.find((s) => s.id === id)
          if (session) {
            session.name = newName
          }
        }
        return success
      } catch (error) {
        console.error('重命名会话失败:', error)
        return false
      }
    }

    /**
     * 清除选中状态
     */
    function clearSelection() {
      currentSessionId.value = null
    }

    // 侧边栏状态
    const isSidebarCollapsed = ref(false)

    function toggleSidebar() {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }

    // 设置弹窗状态
    const showSettingModal = ref(false)

    // AI 配置更新计数器（用于触发其他组件刷新）
    const aiConfigVersion = ref(0)

    function notifyAIConfigChanged() {
      aiConfigVersion.value++
    }

    // AI 全局设置
    interface AIGlobalSettings {
      /** 每次发送给 AI 的最大消息条数 */
      maxMessagesPerRequest: number
    }

    const aiGlobalSettings = ref<AIGlobalSettings>({
      maxMessagesPerRequest: 200,
    })

    function updateAIGlobalSettings(settings: Partial<AIGlobalSettings>) {
      aiGlobalSettings.value = { ...aiGlobalSettings.value, ...settings }
      notifyAIConfigChanged()
    }

    // ==================== 自定义关键词模板 ====================
    const customKeywordTemplates = ref<KeywordTemplate[]>([])

    function addCustomKeywordTemplate(template: KeywordTemplate) {
      customKeywordTemplates.value.push(template)
    }

    function updateCustomKeywordTemplate(templateId: string, updates: Partial<Omit<KeywordTemplate, 'id'>>) {
      const index = customKeywordTemplates.value.findIndex((t) => t.id === templateId)
      if (index !== -1) {
        customKeywordTemplates.value[index] = {
          ...customKeywordTemplates.value[index],
          ...updates,
        }
      }
    }

    function removeCustomKeywordTemplate(templateId: string) {
      const index = customKeywordTemplates.value.findIndex((t) => t.id === templateId)
      if (index !== -1) {
        customKeywordTemplates.value.splice(index, 1)
      }
    }

    // ==================== 已删除的预设模板 ====================
    const deletedPresetTemplateIds = ref<string[]>([])

    // ==================== AI 提示词预设管理 ====================
    const customPromptPresets = ref<PromptPreset[]>([])
    const aiPromptSettings = ref<AIPromptSettings>({
      activeGroupPresetId: DEFAULT_GROUP_PRESET_ID,
      activePrivatePresetId: DEFAULT_PRIVATE_PRESET_ID,
    })

    /** 获取所有预设（内置 + 自定义） */
    const allPromptPresets = computed(() => [...BUILTIN_PRESETS, ...customPromptPresets.value])

    /** 获取群聊可用的预设 */
    const groupPresets = computed(() => allPromptPresets.value.filter((p) => p.chatType === 'group'))

    /** 获取私聊可用的预设 */
    const privatePresets = computed(() => allPromptPresets.value.filter((p) => p.chatType === 'private'))

    /** 获取当前群聊激活的预设 */
    const activeGroupPreset = computed(() => {
      const preset = allPromptPresets.value.find((p) => p.id === aiPromptSettings.value.activeGroupPresetId)
      return preset || BUILTIN_PRESETS.find((p) => p.id === DEFAULT_GROUP_PRESET_ID)!
    })

    /** 获取当前私聊激活的预设 */
    const activePrivatePreset = computed(() => {
      const preset = allPromptPresets.value.find((p) => p.id === aiPromptSettings.value.activePrivatePresetId)
      return preset || BUILTIN_PRESETS.find((p) => p.id === DEFAULT_PRIVATE_PRESET_ID)!
    })

    /** 添加自定义预设 */
    function addPromptPreset(preset: {
      name: string
      chatType: PromptPreset['chatType']
      roleDefinition: string
      responseRules: string
    }) {
      const newPreset: PromptPreset = {
        ...preset,
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      customPromptPresets.value.push(newPreset)
      return newPreset.id
    }

    /** 更新预设 */
    function updatePromptPreset(
      presetId: string,
      updates: { name?: string; chatType?: PromptPreset['chatType']; roleDefinition?: string; responseRules?: string }
    ) {
      const index = customPromptPresets.value.findIndex((p) => p.id === presetId)
      if (index !== -1) {
        customPromptPresets.value[index] = {
          ...customPromptPresets.value[index],
          ...updates,
          updatedAt: Date.now(),
        }
      }
    }

    /** 删除自定义预设 */
    function removePromptPreset(presetId: string) {
      const index = customPromptPresets.value.findIndex((p) => p.id === presetId)
      if (index !== -1) {
        customPromptPresets.value.splice(index, 1)
        // 如果删除的是激活的预设，切换到默认
        if (aiPromptSettings.value.activeGroupPresetId === presetId) {
          aiPromptSettings.value.activeGroupPresetId = DEFAULT_GROUP_PRESET_ID
        }
        if (aiPromptSettings.value.activePrivatePresetId === presetId) {
          aiPromptSettings.value.activePrivatePresetId = DEFAULT_PRIVATE_PRESET_ID
        }
      }
    }

    /** 复制预设 */
    function duplicatePromptPreset(presetId: string) {
      const source = allPromptPresets.value.find((p) => p.id === presetId)
      if (source) {
        return addPromptPreset({
          name: `${source.name} (副本)`,
          chatType: source.chatType,
          roleDefinition: source.roleDefinition,
          responseRules: source.responseRules,
        })
      }
      return null
    }

    /** 设置群聊激活的预设 */
    function setActiveGroupPreset(presetId: string) {
      const preset = allPromptPresets.value.find((p) => p.id === presetId)
      if (preset && preset.chatType === 'group') {
        aiPromptSettings.value.activeGroupPresetId = presetId
        notifyAIConfigChanged()
      }
    }

    /** 设置私聊激活的预设 */
    function setActivePrivatePreset(presetId: string) {
      const preset = allPromptPresets.value.find((p) => p.id === presetId)
      if (preset && preset.chatType === 'private') {
        aiPromptSettings.value.activePrivatePresetId = presetId
        notifyAIConfigChanged()
      }
    }

    /** 获取指定聊天类型的激活预设 */
    function getActivePresetForChatType(chatType: 'group' | 'private'): PromptPreset {
      return chatType === 'group' ? activeGroupPreset.value : activePrivatePreset.value
    }

    function addDeletedPresetTemplateId(id: string) {
      if (!deletedPresetTemplateIds.value.includes(id)) {
        deletedPresetTemplateIds.value.push(id)
      }
    }

    return {
      // State
      sessions,
      currentSessionId,
      isImporting,
      importProgress,
      isInitialized,
      isSidebarCollapsed,
      showSettingModal,
      aiConfigVersion,
      aiGlobalSettings,
      customKeywordTemplates,
      deletedPresetTemplateIds,
      customPromptPresets,
      aiPromptSettings,
      // Computed
      currentSession,
      allPromptPresets,
      groupPresets,
      privatePresets,
      activeGroupPreset,
      activePrivatePreset,
      // Actions
      loadSessions,
      importFile,
      importFileFromPath,
      selectSession,
      deleteSession,
      renameSession,
      clearSelection,
      toggleSidebar,
      notifyAIConfigChanged,
      updateAIGlobalSettings,
      addCustomKeywordTemplate,
      updateCustomKeywordTemplate,
      removeCustomKeywordTemplate,
      addDeletedPresetTemplateId,
      addPromptPreset,
      updatePromptPreset,
      removePromptPreset,
      duplicatePromptPreset,
      setActiveGroupPreset,
      setActivePrivatePreset,
      getActivePresetForChatType,
    }
  },
  {
    persist: [
      {
        // 会话状态：sessionStorage（页面刷新保留，应用重启清除）
        pick: ['currentSessionId', 'isSidebarCollapsed'],
        storage: sessionStorage,
      },
      {
        // 自定义模板、AI 全局设置和提示词预设：localStorage（持久保存）
        pick: [
          'customKeywordTemplates',
          'deletedPresetTemplateIds',
          'aiGlobalSettings',
          'customPromptPresets',
          'aiPromptSettings',
        ],
        storage: localStorage,
      },
    ],
  }
)
