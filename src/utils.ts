import axios, { AxiosError } from 'axios';

export interface SdkResponse {
  success: boolean;
  message: string;
  errorDetails?: string[];
  data?: unknown;
}

export type AxiosErrorType = AxiosError;
export type FetchError = AxiosError;

export async function postReq(
  url: string,
  body: any,
  authToken?: string
): Promise<{ data: any; status: number }> {
  try {
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
      },
    });

    return { data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error(`Request failed: ${error}`);
  }
}

export async function getReq(
  url: string,
  authToken?: string
): Promise<{ data: any; status: number }> {
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
      },
    });

    return { data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error(`Request failed: ${error}`);
  }
}
