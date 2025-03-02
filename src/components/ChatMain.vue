<template>
  <div class="main-container">
    <!-- 侧边栏 -->
    <el-aside
      class="sidebar"
      :width="isCollapse ? '58px' : '260px'"
      :class="{ 'collapsed': isCollapse }"
    >
      <div class="sidebar-header">
        <h1 v-show="!isCollapse">LLM对话组件</h1>
        <button @click="isCollapse = !isCollapse" class="sidebar_open">
          <el-icon>
            <component :is="isCollapse ? Expand : Fold" />
          </el-icon>
        </button>
      </div>
      <el-input
        v-model="searchText"
        placeholder="请输入问题"
        class="collapse-input"
        @click="handleInputClick"
        :prefix-icon="Search"
      />
      <el-dialog
      v-model="dialogVisible"
      width="600px"
      class="expanded-dialog"
    >
      <div >
        <ChatInput
          @send = handleSend
          placeholder="请输入您的消息..."
          send-button-text="发送消息"
          :max-file-size="2" style=""/>
      </div>
      <div>
        <ChatDisplay :message="props.message"/>
      </div>
      </el-dialog>

      <el-button
        type="primary"
        class="new-chat-btn"
        @click="startNewChat"
      >
        <el-icon><Plus /></el-icon>
        <span v-show="!isCollapse">开启新对话</span>
      </el-button>

      <el-menu
        :default-active="activeChatId"
        :collapse="isCollapse"
        class="chat-history"
      >
        <el-menu-item
          v-for="chat in chatHistory"
          :key="chat.id"
          :index="chat.id"
          @click="switchChat(chat.id)"
        >
          <span v-show="!isCollapse">{{ chat.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主聊天区域 -->
    <el-main class="chat-main">
      <ChatDisplay :message="props.message"/>
      <div style="margin: 0 18%;height: 22%;">
        <ChatInput
          @send = handleSend
          placeholder="请输入您的消息..."
          send-button-text="发送消息"
          :max-file-size="2"/>
      </div>
    </el-main>

  </div>
</template>

<script setup lang="ts">
import { onMounted,ref} from 'vue'
import ChatInput from './ChatInput.vue'
import ChatDisplay from './ChatDisplay.vue'
import {useChatStore} from '@/stores/chatStore'
import {Fold,Expand,Plus,Search} from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import type{  FileInfo,WSMessage} from '@/types/chat';


const props = defineProps<{
  message?: WSMessage
}>()

const emit = defineEmits(['send'])

const chatStore = useChatStore();
const {chatHistory} = chatStore;
const {activeChatId} =storeToRefs(chatStore);

const isCollapse = ref(false);
const searchText = ref('')
const dialogVisible = ref(false)


const handleSend = (payload: { text: string; files: FileInfo[] }) => {
  emit('send', payload)
}

const handleInputClick = () => {
  dialogVisible.value = true;
  startNewChat();
}

const startNewChat = () => {
  const newChat = {
    id: Date.now().toString(),
    title: `Chat ${chatHistory.length + 1}`,
    messages: []
  }
  chatHistory.unshift(newChat)
  activeChatId.value = newChat.id
}

const switchChat = (id: string) => {
  activeChatId.value = id
}


onMounted(() => {
  startNewChat();
});

</script>

<style  src="../css/main.css" >

</style>
