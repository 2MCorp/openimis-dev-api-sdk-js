import axios from 'axios';
import { postReq, type SdkResponse } from '../utils';

class UserAuthDeveloperAPISDK {
  baseUrl: string;
  baseAuthUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.baseAuthUrl = `${baseUrl}authentication/user-auth/`;
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
        data: response.data as { token: string, expiry: string },
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: "failed to login",
          errorDetails: [
            error.response?.data?.detail ??
            error.response?.data?.message ??
            error.message
          ],
        };
      }

      return {
        success: false,
        message: "failed to login",
        errorDetails: [String(error)],
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
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: "failed to retrieve user info",
          errorDetails: [
            error.response?.data?.detail ?? error.message,
          ],
        };
      }

      return {
        success: false,
        message: "failed to retrieve user info",
        errorDetails: [String(error)],
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
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: "failed to logout",
          errorDetails: [
            error.response?.data?.detail ?? error.message,
          ],
        };
      }

      return {
        success: false,
        message: "failed to logout",
        errorDetails: [String(error)],
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
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: "failed to logout from all sessions",
          errorDetails: [
            error.response?.data?.detail ?? error.message,
          ],
        };
      }

      return {
        success: false,
        message: "failed to logout from all sessions",
        errorDetails: [String(error)],
      };
    }
  }
}

export default UserAuthDeveloperAPISDK;
