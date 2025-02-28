import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {ChatSession } from '@/types/chat';

export const useChatStore = defineStore('chat', () => {

  //对话列表
  const chatHistory = ref<ChatSession[]>([])
  //当前活跃ChatId
  const activeChatId  =ref<string>('');
  //当前交流的id
  const currentConversationId = ref<string>();

  return {
    chatHistory,
    activeChatId,
    currentConversationId,
  };
});
