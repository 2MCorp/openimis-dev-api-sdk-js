/// <reference types="fhir" />

import { HfStaffModel } from "../models/staff";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getIdentifierValue,
  getTelecom,
  getUuidIdentifier,
  referenceId,
} from "./helpers";
import { staffTelecom } from "./staff_contact";

const HF_STAFF_IDENTIFIER_SYSTEM =
  "https://openimis.org/CodeSystem/health-facility-staff";
const USERNAME_IDENTIFIER_SYSTEM =
  "https://openimis.org/CodeSystem/username";

/**
 * HF portal staff ↔ FHIR PractitionerRole.
 * Distinct from formal-sector OrganizationAffiliation staff converter.
 */
class HfStaffFhirConverter extends BaseFhirConverter<
  HfStaffModel,
  fhir4.PractitionerRole
> {
  readonly resourceType = "PractitionerRole";

  fromFhir(resource: fhir4.PractitionerRole): HfStaffModel {
    assertResourceType(resource, "PractitionerRole");
    const id =
      getIdentifierValue(resource.identifier, {
        system: HF_STAFF_IDENTIFIER_SYSTEM,
      }) ??
      resource.id ??
      "";
    const uuid =
      getUuidIdentifier(resource.identifier) ??
      getIdentifierValue(resource.identifier, {
        systemIncludes: "3986",
      }) ??
      resource.id ??
      id;
    const role =
      resource.code?.[0]?.coding?.[0]?.code ?? resource.code?.[0]?.text;
    return new HfStaffModel(
      id,
      uuid,
      resource.active,
      getIdentifierValue(resource.identifier, {
        system: USERNAME_IDENTIFIER_SYSTEM,
      }),
      resource.practitioner?.display,
      role,
      staffTelecom(resource as never, "email") ?? getTelecom(resource.telecom, "email"),
      staffTelecom(resource as never, "phone") ?? getTelecom(resource.telecom, "phone"),
      referenceId(resource.organization)
    );
  }

  toFhir(model: HfStaffModel): fhir4.PractitionerRole {
    const identifiers: fhir4.Identifier[] = [
      {
        system: "urn:ietf:rfc:3986",
        value: model.uuid || model.id,
      },
      {
        system: HF_STAFF_IDENTIFIER_SYSTEM,
        value: model.id,
      },
    ];
    if (model.username) {
      identifiers.push({
        system: USERNAME_IDENTIFIER_SYSTEM,
        value: model.username,
      });
    }

    const role = model.role || "STAFF";
    return {
      resourceType: "PractitionerRole",
      id: model.uuid || model.id,
      active: model.active ?? true,
      identifier: identifiers,
      practitioner: model.displayName
        ? {
            type: "Practitioner",
            display: model.displayName,
          }
        : undefined,
      organization: model.organizationId
        ? {
            type: "Organization",
            reference: `Organization/${model.organizationId}`,
          }
        : undefined,
      code: [
        {
          coding: [
            {
              system:
                "https://openimis.org/CodeSystem/health-facility-staff-role",
              code: role,
              display:
                role === "ADMIN"
                  ? "Health Facility Admin"
                  : "Health Facility Staff",
            },
          ],
          text:
            role === "ADMIN"
              ? "Health Facility Admin"
              : "Health Facility Staff",
        },
      ],
      telecom: [
        ...(model.phone
          ? [{ system: "phone" as const, value: model.phone }]
          : []),
        ...(model.email
          ? [{ system: "email" as const, value: model.email }]
          : []),
      ],
    };
  }
}

export default HfStaffFhirConverter;
export { HF_STAFF_IDENTIFIER_SYSTEM, USERNAME_IDENTIFIER_SYSTEM };
