import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

export interface RequestConfig extends AxiosRequestConfig {
  retry?: boolean;
  retryCount?: number;
  cache?: boolean;
  cacheTTL?: number;
}

function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RequestConfig | undefined;
      
      if (config?.retry && config.retryCount && config.retryCount < MAX_RETRIES) {
        config.retryCount = (config.retryCount || 0) + 1;
        const delay = RETRY_DELAY * Math.pow(2, config.retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return client.request(config);
      }

      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }

      const apiError: ApiError = {
        message: (error.response?.data as { message?: string })?.message || error.message || "An error occurred",
        code: (error.response?.data as { code?: string })?.code || "UNKNOWN_ERROR",
        status: error.response?.status || 500,
        details: (error.response?.data as { details?: Record<string, string[]> })?.details,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
}

const httpClient = createHttpClient();

async function request<T>(
  config: RequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await httpClient.request(config);
  return response.data;
}

export async function get<T>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  return request<T>({ ...config, method: "GET", url });
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  return request<T>({ ...config, method: "POST", url, data });
}

export async function put<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  return request<T>({ ...config, method: "PUT", url, data });
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  return request<T>({ ...config, method: "PATCH", url, data });
}

export async function del<T>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  return request<T>({ ...config, method: "DELETE", url });
}

export async function upload<T>(
  url: string,
  formData: FormData,
  config?: RequestConfig
): Promise<T> {
  return request<T>({
    ...config,
    method: "POST",
    url,
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      ...config?.headers,
    },
  });
}

export async function download(
  url: string,
  filename: string,
  config?: RequestConfig
): Promise<void> {
  const response = await httpClient.request({
    ...config,
    method: "GET",
    url,
    responseType: "blob",
  });

  const blob = new Blob([response.data as BlobPart]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

export function createAbortController(): AbortController {
  return new AbortController();
}

export function isCancelledError(error: unknown): boolean {
  return axios.isCancel(error);
}

export { httpClient };

export const api = {
  get,
  post,
  put,
  patch,
  del,
  upload,
  download,
};
