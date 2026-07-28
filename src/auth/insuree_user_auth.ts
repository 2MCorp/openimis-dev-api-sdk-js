import HttpClient from "../types";
import {
  AuthTokenResponse,
  InsureeInfo,
  LoginCredentials,
  RegisterInsureeRequest,
  RegisterInsureeResponse,
  VerifyInsureeRequest,
  VerifyInsureeResponse,
} from "./types";

const BASE_PATH = "/authentication/insuree-auth";

class InsureeUserAuthAPIClient {
  constructor(private readonly httpClient: HttpClient) {}

  async login(
    credentials: LoginCredentials,
    options: { persistToken?: boolean } = {}
  ): Promise<AuthTokenResponse> {
    const { persistToken = true } = options;
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/login/`,
      credentials.toJSON(),
      { skipAuth: true }
    );

    const response = AuthTokenResponse.fromJSON(data);

    if (persistToken && response.token) {
      this.httpClient.setAuthScheme("Token");
      this.httpClient.setToken(response.token);
    }

    return response;
  }

  async register(
    request: RegisterInsureeRequest
  ): Promise<RegisterInsureeResponse> {
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/register/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return RegisterInsureeResponse.fromJSON(data);
  }

  /**
   * Requires an insuree auth token on the HttpClient
   * (typically after register → login).
   */
  async verify(request: VerifyInsureeRequest): Promise<VerifyInsureeResponse> {
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/verify/`,
      request.toJSON()
    );
    return VerifyInsureeResponse.fromJSON(data);
  }

  async getInfo(): Promise<InsureeInfo> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${BASE_PATH}/info/`
    );
    return InsureeInfo.fromJSON(data);
  }

  clearSession(): void {
    this.httpClient.setToken(undefined);
  }
}

export default InsureeUserAuthAPIClient;
