import HttpClient from "../types";
import {
  AuthTokenResponse,
  LoginCredentials,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  UserInfo,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "./types";

const BASE_PATH = "/authentication/user-auth";

class UserAuthAPIClient {
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

  async logout(): Promise<void> {
    await this.httpClient.post<void>(`${BASE_PATH}/logout/`);
    this.httpClient.setToken(undefined);
  }

  async logoutAll(): Promise<void> {
    await this.httpClient.post<void>(`${BASE_PATH}/logout-all/`);
    this.httpClient.setToken(undefined);
  }

  async getUser(): Promise<UserInfo> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${BASE_PATH}/user/`
    );
    return UserInfo.fromJSON(data);
  }

  async requestPasswordReset(
    request: PasswordResetRequest
  ): Promise<PasswordResetRequestResponse> {
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/password-reset/request/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return PasswordResetRequestResponse.fromJSON(data);
  }

  async verifyPasswordResetOtp(
    request: VerifyOtpRequest
  ): Promise<VerifyOtpResponse> {
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/password-reset/verify/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return VerifyOtpResponse.fromJSON(data);
  }

  async confirmPasswordReset(
    request: PasswordResetConfirmRequest
  ): Promise<PasswordResetConfirmResponse> {
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/password-reset/confirm/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return PasswordResetConfirmResponse.fromJSON(data);
  }

  /**
   * Only available when the backend config has `refresh_token: true`.
   */
  async refreshToken(
    options: { persistToken?: boolean } = {}
  ): Promise<AuthTokenResponse> {
    const { persistToken = true } = options;
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/refresh-token/`
    );

    const response = AuthTokenResponse.fromJSON(data);

    if (persistToken && response.token) {
      this.httpClient.setAuthScheme("Token");
      this.httpClient.setToken(response.token);
    }

    return response;
  }
}

export default UserAuthAPIClient;
