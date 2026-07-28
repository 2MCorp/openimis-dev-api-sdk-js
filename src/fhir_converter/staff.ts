/// <reference types="fhir" />

import { StaffModel } from "../models/staff";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getIdentifierValue,
  getUuidIdentifier,
} from "./helpers";

class StaffFhirConverter extends BaseFhirConverter<
  StaffModel,
  fhir4.OrganizationAffiliation
> {
  readonly resourceType = "OrganizationAffiliation";

  fromFhir(resource: fhir4.OrganizationAffiliation): StaffModel {
    assertResourceType(resource, "OrganizationAffiliation");
    return new StaffModel(
      getIdentifierValue(resource.identifier, {
        systemIncludes: "policyholderusers",
      }) ??
        resource.id ??
        "",
      getUuidIdentifier(resource.identifier) ??
        getIdentifierValue(resource.identifier, {
          systemIncludes: "3986",
        }) ??
        resource.id ??
        "",
      resource.active
    );
  }

  toFhir(model: StaffModel): fhir4.OrganizationAffiliation {
    return {
      resourceType: "OrganizationAffiliation",
      id: model.uuid || model.id,
      active: model.active ?? true,
      identifier: [
        {
          system: "urn:ietf:rfc:3986",
          value: model.uuid,
        },
        {
          system: "https://example.org/policyholderusers",
          value: model.id,
        },
      ],
      organization: { reference: "Organization/policy-holder" },
      participatingOrganization: {
        reference: "Organization/policy-holder",
      },
    };
  }
}

export default StaffFhirConverter;
