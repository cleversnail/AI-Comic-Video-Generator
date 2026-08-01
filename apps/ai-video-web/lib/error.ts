import axios from 'axios';

export interface ApiErrorResponse {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  path?: string;
  timestamp?: string;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    const msg = data?.message;
    if (msg) {
      return Array.isArray(msg) ? msg[0] : String(msg);
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return '请求超时，请稍后重试';
    }
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return '网络连接失败，请检查网络后重试';
    }
    return `请求失败 (${error.response.status})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '发生未知错误，请重试';
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.code;
  }
  return undefined;
}
