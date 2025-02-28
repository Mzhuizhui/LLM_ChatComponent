import { nextTick } from 'vue';

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export const scrollToBottom = () => {
    nextTick(() => {
      const container = document.querySelector('.messages') as HTMLElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  };
