import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  breaks: true,
  gfm: true,
  pedantic: false,
});


// 判断是否是图片URL
const isImageUrl = (url: string) => {
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?[^#\s]*)?$/i.test(url);
};

// 安全过滤配置
const cleanHtmlWithSanitization = (html: string) => {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['img','button', 'pre', 'code',],
    ADD_ATTR: ['data-copy-btn','data-code', 'title', 'alt', 'src', 'class'],
    FORBID_ATTR: ['onclick'],
  });
};


const encodeCodeContent = (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return btoa(String.fromCharCode(data));
};

export const parseMarkdown = (content: string) => {

  console.log("content++++++",content);
  const preprocessedContent = content.replace(
    /(\[([^\]]+)\]\((?!\s*!)([^)]+)\))/g,
    (match, full, text, url) => {
      return isImageUrl(url) ? `![${text}](${url})` : full;
    }
  );


  let html = marked.parse(preprocessedContent) as string;
  html = html.replace(/<img/g, '<img class="streaming-image"');

  const container = document.createElement('div');
  container.innerHTML = cleanHtmlWithSanitization(html);

  container.querySelectorAll('pre').forEach(pre => {
    container.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
});
    if (!pre.querySelector('.copy-button')) {
      const code = pre.querySelector('code');
      const codeContent = code?.innerText || '';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-button';
      button.title = '复制代码';
      button.setAttribute('data-code', encodeCodeContent(codeContent));
      button.setAttribute('data-copy-btn', 'true');
      button.textContent = '复制';

      button.addEventListener('click', () => {
        const base64 = button.getAttribute('data-code');
        const decoded = atob(base64 || '');
        navigator.clipboard.writeText(decoded);
      });

      pre.prepend(button);
  }
  });
  return container.innerHTML;
};
