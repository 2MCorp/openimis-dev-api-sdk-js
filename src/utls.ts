export interface SdkResponse {
  success: boolean;
  message: string;
  errorDetails?: string[];
  data?: unknown;
}

export type FetchError = {
  response?: {
    data?: any;
    status?: number;
  };
  message: string;
};

export async function postReq(
  url: string,
  body: any,
  authToken?: string
): Promise<{ data: any; status: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let data: any = null;

    try {
      data = await response.json();
    } catch { }

    const error: FetchError = Object.assign(new Error("Fetch error"), {
      response: {
        data,
        status: response.status,
      },
    });

    throw error;
  }

  const data = await response.json();
  return { data, status: response.status };
}

export async function getReq(
  url: string,
  authToken?: string
): Promise<{ data: any; status: number }> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
    },
  });

  if (!response.ok) {
    let data: any = null;

    try {
      data = await response.json();
    } catch { }

    const error: FetchError = Object.assign(new Error("Fetch error"), {
      response: {
        data,
        status: response.status,
      },
    });

    throw error;
  }

  const data = await response.json();
  return { data, status: response.status };
}
