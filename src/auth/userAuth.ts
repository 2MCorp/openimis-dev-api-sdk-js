import { postReq, type SdkResponse, FetchError } from '../utls';

class UserAuthDeveloperAPISDK {
  baseUrl: string;
  baseAuthUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.baseAuthUrl = `${baseUrl}/authentication/user-auth/`;
  }

  async login(username: string, password: string): Promise<SdkResponse> {
    try {
      const response = await postReq(`${this.baseAuthUrl}login/`, {
        username,
        password,
      });

      return {
        success: true,
        message: "Login successful",
        data: response.data,
      };
    } catch (error: unknown) {
      const err = error as FetchError;

      return {
        success: false,
        message: "failed to login",
        errorDetails: [
          err.response?.data?.detail ??
          err.response?.data?.message ??
          err.message
        ],
      };
    }
  }

  async getUserInfo(authToken: string): Promise<SdkResponse> {
    try {
      const response = await postReq(`${this.baseAuthUrl}user/`, {}, authToken);
      return {
        success: true,
        message: "User info retrieved successfully",
        data: response.data,
      };
    } catch (error) {
      const err = error as FetchError;

      return {
        success: false,
        message: "failed to retrieve user info",
        errorDetails: [
          err.response?.data?.detail ?? err.message,
        ],
      };
    }
  }

  async logout(authToken: string): Promise<SdkResponse> {
    try {
      const response = await postReq(`${this.baseAuthUrl}logout/`, {}, authToken);
      return {
        success: true,
        message: "Logout successful",
        data: response.data,
      };
    } catch (error) {
      const err = error as FetchError;

      return {
        success: false,
        message: "failed to logout",
        errorDetails: [
          err.response?.data?.detail ?? err.message,
        ],
      };
    }
  }

  async logoutAllSessions(authToken: string): Promise<SdkResponse> {
    try {
      const response = await postReq(`${this.baseAuthUrl}logout-all/`, {}, authToken);
      return {
        success: true,
        message: "Logout from all sessions successful",
        data: response.data,
      };
    } catch (error) {
      const err = error as FetchError;

      return {
        success: false,
        message: "failed to logout from all sessions",
        errorDetails: [
          err.response?.data?.detail ?? err.message,
        ],
      };
    }
  }
}

export default UserAuthDeveloperAPISDK;
