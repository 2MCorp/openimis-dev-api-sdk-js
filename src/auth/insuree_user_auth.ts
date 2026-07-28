import HttpClient, { ApiResponse, mapData } from "../types";
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
  ): Promise<ApiResponse<AuthTokenResponse>> {
    const { persistToken = true } = options;
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/login/`,
      credentials.toJSON(),
      { skipAuth: true }
    );

    const mapped = mapData(response, (data) =>
      AuthTokenResponse.fromJSON(data as Record<string, unknown>)
    );

    if (mapped.success && persistToken && mapped.data?.token) {
      this.httpClient.setAuthScheme("Token");
      this.httpClient.setToken(mapped.data.token);
    }

    return mapped;
  }

  async register(
    request: RegisterInsureeRequest
  ): Promise<ApiResponse<RegisterInsureeResponse>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/register/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      RegisterInsureeResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  /**
   * Requires an insuree auth token on the HttpClient
   * (typically after register → login).
   */
  async verify(
    request: VerifyInsureeRequest
  ): Promise<ApiResponse<VerifyInsureeResponse>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/verify/`,
      request.toJSON()
    );
    return mapData(response, (data) =>
      VerifyInsureeResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  async getInfo(): Promise<ApiResponse<InsureeInfo>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${BASE_PATH}/info/`
    );
    return mapData(response, (data) =>
      InsureeInfo.fromJSON(data as Record<string, unknown>)
    );
  }

  clearSession(): void {
    this.httpClient.setToken(undefined);
  }
}

export default InsureeUserAuthAPIClient;
