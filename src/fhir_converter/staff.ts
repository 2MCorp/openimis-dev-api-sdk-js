/// <reference types="fhir" />

import { StaffModel } from "../models/staff";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getIdentifierValue,
  getUuidIdentifier,
} from "./helpers";
import { staffContactName, staffTelecom } from "./staff_contact";

const USERNAME_IDENTIFIER_SYSTEM = "https://openimis.org/CodeSystem/username";

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
      resource.active,
      getIdentifierValue(resource.identifier, { system: USERNAME_IDENTIFIER_SYSTEM }),
      staffContactName(resource as never) ??
        getIdentifierValue(resource.identifier, { system: USERNAME_IDENTIFIER_SYSTEM }),
      resource.code?.[0]?.coding?.[0]?.code ?? resource.code?.[0]?.text,
      staffTelecom(resource as never, "email"),
      staffTelecom(resource as never, "phone")
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
