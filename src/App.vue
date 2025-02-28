<template>
  <div>
  <ChatMain
    :message="latestMessage"
    @send="handleSend"
  />

  </div>
</template>


<script setup lang="ts">
import ChatMain from './components/ChatMain.vue';
import {ref,onMounted,onBeforeUnmount} from 'vue'
import { useWebSocket } from '@/utils/webscoket';
import { ElMessage } from 'element-plus';
import { uploadFile } from '@/utils/fileUpload';
import type{  FileInfo,WSMessage,MessageContent} from '@/types/chat';
import {useChatStore} from '@/stores/chatStore'

const chatStore = useChatStore();
const latestMessage = ref<WSMessage>()


function handleSocketMessage(event: MessageEvent) {
  const data: WSMessage = JSON.parse(event.data);
  // console.log("data:::",data);
  latestMessage.value = data;
  // console.log("latestMessage:::",latestMessage);
}

// WebSocket相关
const { connect, send: wsSend, isConnected, socket } = useWebSocket({
    url: 'ws://localhost:3001/ws',
    onMessage: handleSocketMessage,
    onError: () => ElMessage.error('连接发生错误')
  });

const handleSend = async (payload: { text: string; files: FileInfo[] }) => {
  const { text, files } = payload;
  console.log('text',text);
  console.log('files',files);
  const currentConversationId = chatStore.currentConversationId;

  try {
    const contents = ref<MessageContent[]>([]);
    if (files.length !== 0) {
        for (const file of files) {
          const fileResult = await uploadFile(file);
          contents.value.push({ type: fileResult.type, file_id: fileResult.fileId ,name:fileResult.fileName});
        }
      }
    if (text) {
      contents.value.push({ type: 'text', text: text });
    }
    console.log('contents',contents);
    console.log('currentConversationId',currentConversationId);
    wsSend({
        contents:contents.value,
        conversationId: currentConversationId
      });
  } catch (error) {
    console.error('发送失败:', error)
  }
}

// 生命周期
onMounted(() => {
  connect();
});

onBeforeUnmount(() => {
  if (isConnected.value && socket.value) {
      socket.value.close();
    }
});

</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
