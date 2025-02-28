import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { CozeAPI, COZE_CN_BASE_URL, ChatEventType, RoleType  } from '@coze/api';
import path from 'path';
import fs from 'fs';


dotenv.config();


if (!process.env.Coze_PAT) throw new Error('Missing Coze_PAT in .env');
const PORT = parseInt(process.env.PORT || '3001');


const app = express() as unknown as expressWs.Application;
expressWs(app);


app.use(cors({
  origin: 'http://localhost:5174',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const cozeClient = new CozeAPI({
  token: process.env.Coze_PAT,
  baseURL: COZE_CN_BASE_URL
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');  // 保存到 'server/uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + ext;
    cb(null, filename);
  }
});

const upload = multer({ storage });


// REST API 路由
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('未上传文件');

    // console.log('接收到的文件地址：', req.file);

    const filePath = path.join(__dirname, '../uploads', req.file.filename);
    // console.log('__dirname', __dirname);
    // console.log('req.file.path', req.file.path);
    // console.log('临时放置', filePath);

    if (!fs.existsSync(filePath)) {
      console.log('文件未找到');
    }

    const fileBuffer = fs.createReadStream(filePath);
    // console.log('文件内容：', fileBuffer);

    const uploadedFile = await cozeClient.files.upload({
      file: fileBuffer,
    });

    console.log('client.files.upload', uploadedFile );

    res.json({
      fileId: uploadedFile.id,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 'file',
      fileName:uploadedFile.file_name,
      fileBytes:uploadedFile.bytes
    });
  } catch (error) {
    res.status(500).json({ error: error });
    console.log(error );
  }
});


// WebSocket 路由
app.ws('/ws', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`WebSocket连接建立: ${clientIp}`);

  ws.on('message', async (data: string) => {
    try {
      const payload = JSON.parse(data);
      console.log("收到的信息:",payload);

      if (!payload.conversationId) {
        throw new Error('无效的消息格式');
      }
      const stream = cozeClient.chat.stream({
        bot_id: '7468581637488689179',
        // conversation_id: payload.conversationId,
        additional_messages: [{
          role: RoleType.User,
          content: payload.contents,
          content_type: 'object_string'
        }]
      });
      const messageId = Date.now().toString();
      let fullContent = '';

      for await (const part of stream) {
        switch (part.event) {
          case ChatEventType.CONVERSATION_MESSAGE_DELTA:
            const chunk = part.data.content;
            // console.log("内容",part.data);
            console.log(chunk);
            fullContent += chunk;

            ws.send(JSON.stringify({
              type: 'chunk',
              messageId,
              content: chunk,
              conversationId: payload.conversationId
            }));
            break;

          case 'error':
            throw new Error(part.data.msg || 'Coze API 错误');
        }
      }
      ws.send(JSON.stringify({
        type: 'complete',
        messageId,
        conversationId: payload.conversationId,
        fullContent
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      ws.send(JSON.stringify({
        type: 'error',
        messageId: Date.now().toString(),
        error: errorMessage
      }));
      console.error(`[${clientIp}] 处理错误:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket连接关闭: ${clientIp}`);
  });
});

// ======================
// 启动服务
// ======================
const server = app.listen(PORT, () => {
  console.log(`
  服务已启动！
  HTTP端点:   http://localhost:${PORT}
  WebSocket端点: ws://localhost:${PORT}/ws
  `);
});


server.on('error', (error) => {
  console.error('服务启动失败:', error);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获异常:', error);
  process.exit(1);
});
