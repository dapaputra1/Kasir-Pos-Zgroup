import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<any>) => {
    // If backend returns formatted API error, extract message
    if (error.response?.data?.error?.message) {
      const customError = new Error(error.response.data.error.message);
      (customError as any).details = error.response.data.error.details;
      (customError as any).code = error.response.data.error.code;
      (customError as any).status = error.response.status;
      return Promise.reject(customError);
    }
    return Promise.reject(error);
  }
);
