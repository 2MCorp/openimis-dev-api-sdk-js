

export class HttpClient {
    constructor(
        private readonly baseUrl: string,
        private readonly token?: string
    ) { }


    private async request<T>(
        method: string,
        path: string,
        body?: unknown
    ): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(this.token && {
                    Authorization: `Bearer ${this.token}`,
                }),
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<T>;
    }
}