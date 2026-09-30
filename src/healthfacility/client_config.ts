import HttpClient, { ApiResponse, mapData } from "../types";
import { HF_BASE_PATH } from "./types";

export type HfClaimFormConfig = {
  fixedPricesAtEnter: boolean;
  fixedPricesAtReview: boolean;
};

export type HfMoneyConfig = {
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  currencySymbolPosition: "left" | "right" | string;
  currencyDecimalPlaces: number;
  currencyName: string;
};

export type HfClientConfig = {
  claimForm: HfClaimFormConfig;
  money: HfMoneyConfig;
};

const DEFAULT_MONEY: HfMoneyConfig = {
  currency: "NGN",
  currencyCode: "NGN",
  currencySymbol: "₦",
  currencySymbolPosition: "left",
  currencyDecimalPlaces: 2,
  currencyName: "Nigerian Naira",
};

function normalizeMoney(raw: Partial<HfMoneyConfig> | undefined): HfMoneyConfig {
  const position = String(
    raw?.currencySymbolPosition ?? DEFAULT_MONEY.currencySymbolPosition
  ).toLowerCase();
  return {
    currency: String(raw?.currency || DEFAULT_MONEY.currency),
    currencyCode: String(raw?.currencyCode || raw?.currency || DEFAULT_MONEY.currencyCode),
    currencySymbol: String(raw?.currencySymbol || DEFAULT_MONEY.currencySymbol),
    currencySymbolPosition: position === "right" ? "right" : "left",
    currencyDecimalPlaces: Number.isFinite(Number(raw?.currencyDecimalPlaces))
      ? Number(raw?.currencyDecimalPlaces)
      : DEFAULT_MONEY.currencyDecimalPlaces,
    currencyName: String(raw?.currencyName || DEFAULT_MONEY.currencyName),
  };
}

class HealthFacilityClientConfigClient {
  constructor(private readonly httpClient: HttpClient) {}

  async get(): Promise<ApiResponse<HfClientConfig>> {
    const response = await this.httpClient.get<HfClientConfig>(
      `${HF_BASE_PATH}/client-config/`
    );
    return mapData(response, (raw) => {
      const data = (raw ?? {}) as Partial<HfClientConfig>;
      return {
        claimForm: {
          fixedPricesAtEnter: Boolean(data.claimForm?.fixedPricesAtEnter),
          fixedPricesAtReview: Boolean(data.claimForm?.fixedPricesAtReview),
        },
        money: normalizeMoney(data.money),
      };
    });
  }
}

export default HealthFacilityClientConfigClient;
