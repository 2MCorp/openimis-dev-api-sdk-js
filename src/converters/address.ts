import { BaseFhirConverter } from "./base";
import { Address, FHIRAddress } from "../types";

export class AddressModel implements Address {
  name: string;
  city: string;
  district: string;
  state: string;
  type?: string;

  constructor(data: Address) {
    this.name = data.name;
    this.city = data.city;
    this.district = data.district;
    this.state = data.state;
    this.type = data.type;
  }

  isValid(): boolean {
    return !!(
      this.name?.trim() &&
      this.city?.trim() &&
      this.district?.trim() &&
      this.state?.trim()
    );
  }
}

export class AddressFhirConverter extends BaseFhirConverter<
  AddressModel,
  FHIRAddress
> {
  fromFhir(fhirAddress: FHIRAddress): AddressModel {
    return new AddressModel({
      name: this.safeExtract(fhirAddress, "line.0", "") || "",
      city: fhirAddress.city || "",
      district: fhirAddress.district || "",
      state: fhirAddress.state || "",
      type: fhirAddress.type || fhirAddress.use,
    });
  }

  toFhir(address: AddressModel): FHIRAddress {
    return {
      use: (address.type as any) || "home",
      type: "both",
      line: address.name ? [address.name] : undefined,
      city: address.city,
      district: address.district,
      state: address.state,
    };
  }

  static fromFhir(fhirAddress: FHIRAddress): AddressModel {
    return new AddressFhirConverter().fromFhir(fhirAddress);
  }

  static toFhir(address: AddressModel): FHIRAddress {
    return new AddressFhirConverter().toFhir(address);
  }
}

// Legacy export for backward compatibility
export default AddressFhirConverter;
