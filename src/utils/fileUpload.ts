import axios from 'axios';
import type { FileInfo} from '@/types/chat'

interface UploadResult {
  fileId: string;
  type: 'image' | 'file';
  fileName:string;
}
export async function uploadFile(file: FileInfo): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file.raw);
  formData.append('url', file.url||'');
  const response = await axios.post('http://localhost:3001/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return {
    fileId: response.data.fileId,
    type: response.data.type,
    fileName:response.data.fileName,
  };
}
