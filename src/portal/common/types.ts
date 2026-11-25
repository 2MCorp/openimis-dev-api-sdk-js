/** Paged list returned by portal search/list routes. */
export type SearchPageDto<T> = {
  total: number;
  items: T[];
  hasNext: boolean;
  hasPrevious: boolean;
};

/** FHIR-style address as flattened for the browser (insuree / patient). */
export type AddressDto = {
  text?: string;
  city?: string;
  district?: string;
  state?: string;
  municipality?: string;
  use?: string;
};

export type MoneyClientConfigDto = {
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  currencySymbolPosition: "left" | "right" | string;
  currencyDecimalPlaces: number;
  currencyName: string;
};
