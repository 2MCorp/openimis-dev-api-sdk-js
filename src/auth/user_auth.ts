import HttpClient, { ApiResponse, mapData, passData } from "../types";
import {
  AuthTokenResponse,
  LoginCredentials,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  RegisterPortalUserRequest,
  RegisterPortalUserResponse,
  ResendPortalVerificationRequest,
  ResendPortalVerificationResponse,
  UserInfo,
  VerifyOtpRequest,
  VerifyOtpResponse,
  VerifyPortalEmailRequest,
  VerifyPortalEmailResponse,
} from "./types";

const BASE_PATH = "/authentication/user-auth";

class UserAuthAPIClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Portal (HF/PH) self-registration. Does not persist a token —
   * caller should login after email verification.
   */
  async register(
    payload:
      | RegisterPortalUserRequest
      | { username: string; email: string; password: string }
  ): Promise<ApiResponse<RegisterPortalUserResponse>> {
    const body =
      payload instanceof RegisterPortalUserRequest
        ? payload.toJSON()
        : {
            username: payload.username,
            email: payload.email,
            password: payload.password,
          };
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/register/`,
      body,
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      RegisterPortalUserResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  async verify(
    payload: VerifyPortalEmailRequest | { email: string; otp: string }
  ): Promise<ApiResponse<VerifyPortalEmailResponse>> {
    const body =
      payload instanceof VerifyPortalEmailRequest
        ? payload.toJSON()
        : { email: payload.email, otp: payload.otp };
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/verify/`,
      body,
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      VerifyPortalEmailResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  async resendVerify(
    payload: ResendPortalVerificationRequest | { email: string }
  ): Promise<ApiResponse<ResendPortalVerificationResponse>> {
    const body =
      payload instanceof ResendPortalVerificationRequest
        ? payload.toJSON()
        : { email: payload.email };
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/verify/resend/`,
      body,
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      ResendPortalVerificationResponse.fromJSON(data as Record<string, unknown>)
    );
  }

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

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.httpClient.post<void>(`${BASE_PATH}/logout/`);
    if (response.success) {
      this.httpClient.setToken(undefined);
    }
    return passData<null>(response);
  }

  async logoutAll(): Promise<ApiResponse<null>> {
    const response = await this.httpClient.post<void>(`${BASE_PATH}/logout-all/`);
    if (response.success) {
      this.httpClient.setToken(undefined);
    }
    return passData<null>(response);
  }

  async getUser(): Promise<ApiResponse<UserInfo>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${BASE_PATH}/user/`
    );
    return mapData(response, (data) =>
      UserInfo.fromJSON(data as Record<string, unknown>)
    );
  }

  async requestPasswordReset(
    request: PasswordResetRequest
  ): Promise<ApiResponse<PasswordResetRequestResponse>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/password-reset/request/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      PasswordResetRequestResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  async verifyPasswordResetOtp(
    request: VerifyOtpRequest
  ): Promise<ApiResponse<VerifyOtpResponse>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/password-reset/verify/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      VerifyOtpResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  async confirmPasswordReset(
    request: PasswordResetConfirmRequest
  ): Promise<ApiResponse<PasswordResetConfirmResponse>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/password-reset/confirm/`,
      request.toJSON(),
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      PasswordResetConfirmResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  /**
   * Only available when the backend config has `refresh_token: true`.
   */
  async refreshToken(
    options: { persistToken?: boolean } = {}
  ): Promise<ApiResponse<AuthTokenResponse>> {
    const { persistToken = true } = options;
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${BASE_PATH}/refresh-token/`
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
}

export default UserAuthAPIClient;
