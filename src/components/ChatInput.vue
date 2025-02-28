<template>
  <div class="chat-input-container">
    <!-- 文件预览区 -->
    <div class="file-preview" v-if="selectedFiles.length > 0">
      <div v-for="file in selectedFiles" :key="file.id" class="file-item">
        <img
          v-if="file.type === 'image'"
          :src="file.previewUrl"
          class="preview-image"
          alt="文件预览"
        />
        <div v-else class="preview-image">
            <Document />
          <span class="file-name">{{ truncateFileName(file.name) }}</span>
        </div>
        <el-button
          circle
          size="small"
          @click="removeFile(file.id)"
          class="remove-btn"
          :title="`删除 ${file.name}`"
        >
        x
        </el-button>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        :placeholder="placeholder"
        @keydown.enter.exact.prevent="sendMessage"
        class="message-input"
        style="color: black;"
      />

      <div class="toolbar">
        <el-upload
          v-if="enableFileUpload"
          action="#"
          :show-file-list="false"
          :before-upload="handleFileSelect"
          :multiple="true"
          :accept="props.acceptTypes"
          :limit="props.maxFiles"
        >
          <el-button class="link-button">
            <el-icon>
              <Link />
            </el-icon>
          </el-button>
        </el-upload>

        <el-button
          type="primary"
          :loading="isSending"
          @click="sendMessage"
          :disabled="isInputEmpty"
          class="send-button"
        >
        <el-icon><Position /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="ChatInput">
import { computed, watch,ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document,Link,Position} from '@element-plus/icons-vue'
import type{FileInfo,MessageContent,Message } from '@/types/chat'
import {generateId} from '@/utils/chatHelpers'
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore';

const inputText = ref('')
const selectedFiles = ref<FileInfo[]>([])
const isSending = ref(false)

const chatStore = useChatStore();
const {chatHistory,activeChatId,currentConversationId} = storeToRefs(chatStore);


const messages = computed(() => {
  const session = chatHistory.value.find(c => c.id === activeChatId.value)
  return session?.messages || []
})
const isInputEmpty = computed(() => {
  return !inputText.value.trim() && selectedFiles.value.length === 0
})


const props = withDefaults(defineProps<{
  placeholder?: string
  maxFileSize?: number // 单位MB
  maxFiles?: number // 最多文件上传数量
  enableFileUpload?: boolean // 是否启用文件上传功能
  acceptTypes?: string // 支持的文件类型，例如 'image/*,application/pdf'
}>(), {
  placeholder: '输入消息...',
  maxFileSize: 10,
  maxFiles: 5,
  enableFileUpload: true,
  acceptTypes: 'image/*,application/pdf',
})


const emit = defineEmits<{
  (e: 'send', payload: { text: string; files: FileInfo[] }): void
}>()


// 文件处理
const handleFileSelect = async (file: File) => {
  // 文件类型验证
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'

  if (!isImage && !isPDF) {
    ElMessage.error('仅支持图片和PDF文件')
    return false
  }

  // 文件大小验证
  if (file.size > props.maxFileSize * 1024 * 1024) {
    ElMessage.error(`文件大小不能超过 ${props.maxFileSize}MB`)
    return false
  }

  // 生成预览URL
  const previewUrl = isImage ? URL.createObjectURL(file) : ''

  console.log('previewUrl',previewUrl);

  selectedFiles.value.push({
    id: Date.now().toString() + Math.random(),
    name: file.name,
    type: isImage ? 'image' : 'file',
    previewUrl,
    raw: file
  })

  return false
}

// 删除文件
const removeFile = (fileId: string) => {
  const file = selectedFiles.value.find(f => f.id === fileId)
  if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
  selectedFiles.value = selectedFiles.value.filter(f => f.id !== fileId)
}

// 发送消息
const sendMessage = async () => {
  if (isInputEmpty.value) return

  isSending.value = true
  try {
    const contents=ref<MessageContent[]>([]);
    const back_contents: MessageContent[] = [];
    if (selectedFiles.value.length !== 0) {
        for (const file of selectedFiles.value) {
          contents.value.push({ type: file.type, file_id: file.previewUrl,name:file.name});
        }
      }
    if (inputText.value) {
      contents.value.push({ type: 'text', text: inputText.value.trim() });
    }
    currentConversationId.value = generateId();
    console.log('ConversationId_generateId',currentConversationId.value);

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      contents:contents.value,
      backcontent: '',
      parsedContent: '',
      timestamp: Date.now(),
      conversationId: currentConversationId.value,
    };
    messages.value.push(userMessage);
    const assistantMsg: Message = {
      id: generateId(),
      role: 'assistant',
      backcontent: '',
      parsedContent: '',
      contents: back_contents,
      timestamp: Date.now(),
      conversationId: currentConversationId.value,
    };
    messages.value.push(assistantMsg);
    console.log('messages',messages);


    emit('send', {
      text: inputText.value.trim(),
      files:selectedFiles.value
    })

    // 清空输入
    inputText.value = ''
    // selectedFiles.value.forEach(f => {
    //   if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    // })
    selectedFiles.value = []
    contents.value=[]
  } catch (error) {
    ElMessage.error('发送失败，请重试'+error)
  } finally {
    isSending.value = false
  }
}

const truncateFileName = (name: string, maxLength = 12) => {
  if (name.length <= maxLength) return name
  return `${name.substring(0, maxLength / 2)}...${name.substring(name.length - maxLength / 2)}`
}

watch(
  () => selectedFiles.value,
  (newVal, oldVal) => {
    const removedFiles = oldVal.filter(oldFile =>
      !newVal.some(newFile => newFile.id === oldFile.id)
    )
    removedFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
  },
  { deep: true }
)
</script>

<style  src="../css/input.css">
</style>
