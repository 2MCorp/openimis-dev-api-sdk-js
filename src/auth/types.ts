/**
 * Health Facility API key credentials for EMR / Api-Key flows.
 * `apiKey` is the full key string (`prefix.secret`).
 */
export class HealthFacilityApiKeyCredentials {
  constructor(
    public readonly apiKey: string,
    /** Optional; sent as `X-Claim-Admin-Code` on subsequent requests. */
    public readonly claimAdminCode?: string
  ) {}
}

/** Matches backend password-reset user_type choices. */
export enum UserType {
  Technical = 1,
  Interactive = 2,
  Officer = 3,
  Claim = 4,
}

export class LoginCredentials {
  constructor(
    public readonly username: string,
    public readonly password: string
  ) {}

  toJSON(): { username: string; password: string } {
    return {
      username: this.username,
      password: this.password,
    };
  }
}

export class AuthTokenResponse {
  constructor(
    public readonly token: string,
    public readonly expiry: string | null,
    public readonly user?: Record<string, unknown>
  ) {}

  static fromJSON(data: Record<string, unknown>): AuthTokenResponse {
    return new AuthTokenResponse(
      String(data.token ?? ""),
      data.expiry == null ? null : String(data.expiry),
      data.user && typeof data.user === "object"
        ? (data.user as Record<string, unknown>)
        : undefined
    );
  }
}

export class HealthFacilityInfo {
  constructor(
    public readonly id: number | string,
    public readonly name: string,
    public readonly code: string,
    public readonly accCode?: string,
    public readonly level?: string,
    public readonly subLevel?: string | null,
    public readonly address?: string,
    public readonly phone?: string,
    public readonly fax?: string,
    public readonly email?: string,
    public readonly offline?: boolean
  ) {}

  static fromJSON(data: Record<string, unknown>): HealthFacilityInfo {
    return new HealthFacilityInfo(
      data.id as number | string,
      String(data.name ?? ""),
      String(data.code ?? ""),
      data.acc_code != null ? String(data.acc_code) : undefined,
      data.level != null ? String(data.level) : undefined,
      data.sub_level != null ? String(data.sub_level) : null,
      data.address != null ? String(data.address) : undefined,
      data.phone != null ? String(data.phone) : undefined,
      data.fax != null ? String(data.fax) : undefined,
      data.email != null ? String(data.email) : undefined,
      typeof data.offline === "boolean" ? data.offline : undefined
    );
  }
}

export class PolicyHolderInfo {
  constructor(
    public readonly code: string,
    public readonly tradeName: string,
    public readonly email?: string
  ) {}

  static fromJSON(data: Record<string, unknown>): PolicyHolderInfo {
    return new PolicyHolderInfo(
      String(data.code ?? ""),
      String(data.trade_name ?? ""),
      data.email != null ? String(data.email) : undefined
    );
  }
}

export class UserInfo {
  constructor(
    public readonly id: number | string,
    public readonly username: string,
    public readonly email: string,
    public readonly lastName: string,
    public readonly otherNames: string,
    public readonly language: string,
    public readonly phone?: string,
    public readonly loginName?: string,
    public readonly lastLogin?: string | null,
    public readonly healthFacility?: HealthFacilityInfo,
    public readonly policyHolder?: PolicyHolderInfo,
    public readonly policyHolders?: PolicyHolderInfo[]
  ) {}

  static fromJSON(data: Record<string, unknown>): UserInfo {
    const healthFacility =
      data.health_facility &&
      typeof data.health_facility === "object" &&
      Object.keys(data.health_facility as object).length > 0
        ? HealthFacilityInfo.fromJSON(
            data.health_facility as Record<string, unknown>
          )
        : undefined;

    const policyHolder =
      data.policy_holder && typeof data.policy_holder === "object"
        ? PolicyHolderInfo.fromJSON(
            data.policy_holder as Record<string, unknown>
          )
        : undefined;

    const policyHolders = Array.isArray(data.policy_holders)
      ? data.policy_holders.map((item) =>
          PolicyHolderInfo.fromJSON(item as Record<string, unknown>)
        )
      : undefined;

    return new UserInfo(
      data.id as number | string,
      String(data.username ?? ""),
      String(data.email ?? ""),
      String(data.last_name ?? ""),
      String(data.other_names ?? ""),
      String(data.language ?? "en"),
      data.phone != null ? String(data.phone) : undefined,
      data.login_name != null ? String(data.login_name) : undefined,
      data.last_login != null ? String(data.last_login) : null,
      healthFacility,
      policyHolder,
      policyHolders
    );
  }
}

export class PasswordResetRequest {
  constructor(
    public readonly email: string,
    public readonly userType: UserType
  ) {}

  toJSON(): { email: string; user_type: UserType } {
    return {
      email: this.email,
      user_type: this.userType,
    };
  }
}

export class PasswordResetRequestResponse {
  constructor(public readonly message: string) {}

  static fromJSON(data: Record<string, unknown>): PasswordResetRequestResponse {
    return new PasswordResetRequestResponse(String(data.message ?? ""));
  }
}

export class VerifyOtpRequest {
  constructor(
    public readonly email: string,
    public readonly otp: string
  ) {}

  toJSON(): { email: string; otp: string } {
    return {
      email: this.email,
      otp: this.otp,
    };
  }
}

export class VerifyOtpResponse {
  constructor(public readonly resetToken: string) {}

  static fromJSON(data: Record<string, unknown>): VerifyOtpResponse {
    return new VerifyOtpResponse(String(data.reset_token ?? ""));
  }
}

export class PasswordResetConfirmRequest {
  constructor(
    public readonly email: string,
    public readonly resetToken: string,
    public readonly newPassword: string,
    public readonly userType: UserType
  ) {}

  toJSON(): {
    email: string;
    reset_token: string;
    new_password: string;
    user_type: UserType;
  } {
    return {
      email: this.email,
      reset_token: this.resetToken,
      new_password: this.newPassword,
      user_type: this.userType,
    };
  }
}

export class PasswordResetConfirmResponse {
  constructor(public readonly message: string) {}

  static fromJSON(
    data: Record<string, unknown>
  ): PasswordResetConfirmResponse {
    return new PasswordResetConfirmResponse(String(data.message ?? ""));
  }
}

export class RegisterInsureeRequest {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly phoneNumber?: string,
    public readonly email?: string
  ) {}

  toJSON(): {
    username: string;
    password: string;
    phone_number?: string;
    email?: string;
  } {
    return {
      username: this.username,
      password: this.password,
      ...(this.phoneNumber !== undefined
        ? { phone_number: this.phoneNumber }
        : {}),
      ...(this.email !== undefined ? { email: this.email } : {}),
    };
  }
}

export class RegisterInsureeResponse {
  constructor(
    public readonly username: string,
    public readonly phoneNumber?: string | null,
    public readonly email?: string | null
  ) {}

  static fromJSON(data: Record<string, unknown>): RegisterInsureeResponse {
    return new RegisterInsureeResponse(
      String(data.username ?? ""),
      data.phone_number != null ? String(data.phone_number) : null,
      data.email != null ? String(data.email) : null
    );
  }
}

export class VerifyInsureeRequest {
  constructor(public readonly otp: string) {}

  toJSON(): { otp: string } {
    return { otp: this.otp };
  }
}

export class VerifyInsureeResponse {
  constructor(public readonly detail: string) {}

  static fromJSON(data: Record<string, unknown>): VerifyInsureeResponse {
    return new VerifyInsureeResponse(String(data.detail ?? ""));
  }
}

export class InsureeInfo {
  constructor(
    public readonly username: string,
    public readonly insureeId: string,
    public readonly insureeChfId: string,
    public readonly insureeName: string
  ) {}

  static fromJSON(data: Record<string, unknown>): InsureeInfo {
    return new InsureeInfo(
      String(data.username ?? ""),
      String(data.insuree_id ?? ""),
      String(data.insuree_chf_id ?? ""),
      String(data.insuree_name ?? "")
    );
  }
}
