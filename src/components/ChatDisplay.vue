<template>
  <div class="chat-container">
    <!-- 消息列表 -->
    <div class="messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message', msg.role]"
      >
        <div class="role-tag">{{ msg.role === 'user' ? '用户' : '助手' }}</div>
        <div class="content" v-if="msg.role==='user'">
          <!-- <span>{{msg.contents}}</span> -->
          <div v-for="(item, index) in msg.contents" :key="index">
            <span v-if="item.type === 'text'">{{ item.text }}</span>
            <div v-else-if="item.type === 'image'">
              <img :src="item.file_id" alt="Image" class="message-image"/>
            </div>
            <div v-else-if="item.type === 'file'" class="message-image">
              <Document />
              <span class="file-name">{{ truncateFileName(item.name) }}</span>
            </div>
          </div>
        </div>
        <div class="content" v-else-if="msg.role==='assistant'">
          <span v-html="msg.parsedContent"></span>
        </div>
        <div v-if="msg.isStreaming" class="typing-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts" name="ChatDisplay">
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore';
import type{WSMessage} from '@/types/chat'
import {watch,ref,nextTick,onMounted,onUnmounted,computed} from 'vue'
import { Document} from '@element-plus/icons-vue'
import {parseMarkdown} from'@/utils/markdown3'

const props = defineProps<{
  message?: WSMessage
}>()

const chatStore = useChatStore();
const {chatHistory,activeChatId} = storeToRefs(chatStore);

const tempContent = ref('') ;
const renderTimers = new Map<string, number>();

const messages = computed(() => {
  const session = chatHistory.value.find(c => c.id === activeChatId.value)
  return session?.messages || []
})


// 缩短文件名显示
const truncateFileName = (name:string, maxLength = 12) => {
  if (name.length <= maxLength) return name
  return `${name.substring(0, maxLength / 2)}...${name.substring(name.length - maxLength / 2)}`
}


// 添加全局点击事件处理
const handleCopyClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (target?.closest('[data-copy-btn]')) {
    const button = target.closest('button');
    const code = button?.parentElement?.querySelector('code')?.innerText || '';

    navigator.clipboard.writeText(code).then(() => {
      if (button) {
        button.textContent = '已复制!';
        setTimeout(() => button.textContent = '复制', 1500);
      }
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      if (button) {
        button.textContent = '已复制 (降级)';
        setTimeout(() => button.textContent = '复制', 1500);
      }
    });
  }
};

// 防抖处理函数
const debouncedProcessBuffer = (conversationId: string, delay = 50) => {
  const existingTimer = renderTimers.get(conversationId);
  if (existingTimer) window.clearTimeout(existingTimer);

  renderTimers.set(
    conversationId,
    window.setTimeout(() => {
      processBuffer(conversationId);
      renderTimers.delete(conversationId);
    }, delay)
  );
};

const processBuffer = (conversationId: string) => {
    const targetMsg = messages.value.find(m =>
      m.conversationId === conversationId && m.role === 'assistant'
    );

    if (targetMsg) {
      targetMsg.backcontent = tempContent.value;
      // console.log("tempContent.value ----",tempContent.value );


      let processedContent = ''
      let unprocessedContent = targetMsg.backcontent

      // 使用正则表达式查找未闭合的链接
      const linkRegex = /(!?\[[^\]]*$|\[[^\]]*\]\([^)]*$)/;
      const matches = unprocessedContent.match(linkRegex);

      if (matches) {
        // 存在未闭合的链接，分割内容
        processedContent = unprocessedContent.slice(0, matches.index);
        unprocessedContent = matches[0];
      } else {
        processedContent = unprocessedContent;
        unprocessedContent = '';
      }
      // console.log("processedContent ****",processedContent );
      // console.log("unprocessedContent ****",unprocessedContent );

      const parsed = parseMarkdown(processedContent);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = parsed;
      console.log('parsed:::',parsed);

      targetMsg.parsedContent = tempDiv.innerHTML;
      // console.log(' targetMsg.parsedContent:::', targetMsg.parsedContent);
    }
  };

const scrollToBottom = () => {
  nextTick(() => {
    const container = document.querySelector('.chat-container') as HTMLElement;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
};

watch(
  () => props.message,
  (newMessage) => {
    if (!newMessage) return
    switch (newMessage.type) {
      case 'chunk':
        if (!newMessage.content) return;
        // console.log("chunk",newMessage.content);
        tempContent.value += newMessage.content;
        debouncedProcessBuffer(newMessage.conversationId);
        scrollToBottom();
        break;

      case 'complete':
        // console.log("complete",newMessage.fullContent);
        const targetMsg = messages.value.find(m =>
            m.conversationId === newMessage.conversationId && m.role === 'assistant'
          );

          if (targetMsg && newMessage.fullContent) {
            targetMsg.backcontent = newMessage.fullContent;
            // targetMsg.parsedContent = parseMarkdown(newMessage.fullContent);
            targetMsg.isStreaming = false;
            tempContent.value='';
            console.log("tempContent",newMessage.fullContent);
            // 延迟滚动确保DOM更新
            setTimeout(scrollToBottom, 100);
          }
        break
      case 'error':
        // console.log("chunk",newMessage.message);
        break;
    }
  }
)


onMounted(() => {
  document.addEventListener('click', handleCopyClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleCopyClick);
});
</script>
<style src="../css/display.css">
</style>
