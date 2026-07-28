/// <reference types="fhir" />

import { HealthFacilityModel } from "../models/health_facility";
import BaseFhirConverter from "./base";
import { OPENIMIS_IDENTIFIER_SYSTEM } from "./constants";
import {
  assertResourceType,
  getExtension,
  getExtensionCodeableConcept,
  getExtensionString,
  getIdentifierValue,
  getTelecom,
  getUuidIdentifier,
  referenceId,
} from "./helpers";

const LEVEL_MAP: Record<string, string> = {
  C: "health-center",
  D: "dispensary",
  H: "hospital",
  "health-center": "C",
  dispensary: "D",
  hospital: "H",
};

const CARE_TYPE_OUT: Record<string, string> = {
  I: "inpatient",
  O: "outpatient",
  B: "both",
};

class HealthFacilityFhirConverter extends BaseFhirConverter<
  HealthFacilityModel,
  fhir4.Location
> {
  readonly resourceType = "Location";

  fromFhir(resource: fhir4.Location): HealthFacilityModel {
    assertResourceType(resource, "Location");
    const identifiers = resource.identifier;
    const levelCode =
      resource.type?.[0]?.coding?.[0]?.code ??
      resource.physicalType?.coding?.[0]?.code;
    const careType = getExtensionCodeableConcept(
      resource.extension,
      "health-facility-care-type"
    )?.code;
    const qa = getExtensionCodeableConcept(
      resource.extension,
      "quality-assurance"
    )?.code;
    const accreditation = getExtensionCodeableConcept(
      resource.extension,
      "accreditation"
    )?.code;
    const subLevel = getExtensionCodeableConcept(
      resource.extension,
      "health-facility-sub-level"
    );
    const contract = getExtension(resource.extension, "contract-dates")
      ?.valuePeriod;

    return new HealthFacilityModel(
      resource.id ?? "",
      getIdentifierValue(identifiers, {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        preferNonUuid: true,
      }) ??
        getIdentifierValue(identifiers, { typeCode: "HF" }) ??
        "",
      resource.name ?? "",
      getUuidIdentifier(identifiers, OPENIMIS_IDENTIFIER_SYSTEM) ??
        getUuidIdentifier(identifiers),
      resource.status,
      LEVEL_MAP[levelCode ?? ""] ?? levelCode,
      getTelecom(resource.telecom, "phone"),
      getTelecom(resource.telecom, "fax"),
      getTelecom(resource.telecom, "email"),
      resource.address?.line?.[0] ?? resource.address?.text,
      resource.address?.district,
      resource.address?.state,
      referenceId(resource.partOf),
      resource.partOf?.display,
      subLevel?.code,
      subLevel?.display ?? getExtensionString(resource.extension, "health-facility-sub-level"),
      CARE_TYPE_OUT[careType ?? ""] ?? careType,
      qa,
      accreditation,
      contract?.start,
      contract?.end
    );
  }

  toFhir(model: HealthFacilityModel): fhir4.Location {
    const levelCode =
      LEVEL_MAP[model.level ?? ""] ??
      (model.level === "health-center"
        ? "C"
        : model.level === "dispensary"
          ? "D"
          : model.level === "hospital"
            ? "H"
            : model.level);

    const extensions: fhir4.Extension[] = [];
    if (model.careType) {
      const code =
        model.careType === "inpatient"
          ? "I"
          : model.careType === "outpatient"
            ? "O"
            : model.careType === "both"
              ? "B"
              : model.careType;
      extensions.push({
        url: "StructureDefinition/health-facility-care-type",
        valueCodeableConcept: { coding: [{ code }] },
      });
    }
    if (model.subLevelId || model.subLevelLabel) {
      extensions.push({
        url: "StructureDefinition/health-facility-sub-level",
        valueCodeableConcept: {
          coding: [{ code: model.subLevelId }],
          text: model.subLevelLabel,
        },
      });
    }
    if (model.contractStart || model.contractEnd) {
      extensions.push({
        url: "StructureDefinition/contract-dates",
        valuePeriod: {
          start: model.contractStart,
          end: model.contractEnd,
        },
      });
    }

    const telecom: fhir4.ContactPoint[] = [];
    if (model.phone) telecom.push({ system: "phone", value: model.phone });
    if (model.fax) telecom.push({ system: "fax", value: model.fax });
    if (model.email) telecom.push({ system: "email", value: model.email });

    return {
      resourceType: "Location",
      id: model.id || model.uuid || model.code,
      status: (model.status as fhir4.Location["status"]) ?? "active",
      name: model.name,
      mode: "instance",
      identifier: [
        ...(model.uuid
          ? [{ system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.uuid }]
          : []),
        {
          system: OPENIMIS_IDENTIFIER_SYSTEM,
          value: model.code,
          type: { coding: [{ code: "HF" }] },
        },
      ],
      type: levelCode
        ? [
            {
              coding: [
                {
                  system:
                    "http://terminology.hl7.org/CodeSystem/location-physical-type",
                  code: levelCode,
                  display: model.level,
                },
              ],
            },
          ]
        : undefined,
      telecom: telecom.length ? telecom : undefined,
      address: model.address
        ? {
            line: [model.address],
            district: model.districtName,
            state: model.stateName,
          }
        : undefined,
      partOf: model.parentLocationId
        ? {
            reference: `Location/${model.parentLocationId}`,
            display: model.parentLocationName,
          }
        : undefined,
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default HealthFacilityFhirConverter;
