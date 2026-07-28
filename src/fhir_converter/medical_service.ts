/// <reference types="fhir" />

import { MedicalServiceModel } from "../models/medical_service";
import BaseFhirConverter from "./base";
import { OPENIMIS_IDENTIFIER_SYSTEM } from "./constants";
import {
  assertResourceType,
  getExtension,
  getExtensionCodeableConcept,
  getExtensionDecimal,
  getIdentifierValue,
  getUuidIdentifier,
} from "./helpers";

class MedicalServiceFhirConverter extends BaseFhirConverter<
  MedicalServiceModel,
  fhir4.ActivityDefinition
> {
  readonly resourceType = "ActivityDefinition";

  fromFhir(resource: fhir4.ActivityDefinition): MedicalServiceModel {
    assertResourceType(resource, "ActivityDefinition");

    const unitPriceExt = getExtension(resource.extension, "unit-price");
    const level = getExtensionCodeableConcept(
      resource.extension,
      "activity-definition-level"
    )?.code;
    const serviceType = resource.topic?.[0]?.coding?.[0]?.code;
    const frequency = resource.timingTiming?.repeat?.period;

    const genders: string[] = [];
    const ages: string[] = [];
    let category: string | undefined;
    let careType: string | undefined;

    for (const ctx of resource.useContext ?? []) {
      const code = ctx.code?.code ?? ctx.code?.system;
      const value = ctx.valueCodeableConcept?.coding?.[0]?.code;
      if (!value) continue;
      if (value === "male" || value === "female") genders.push(value);
      else if (value === "adult" || value === "child") ages.push(value);
      else if (value === "AMB") careType = careType === "I" ? "B" : "O";
      else if (value === "IMP") careType = careType === "O" ? "B" : "I";
      else if (code?.includes("workflow") || ["S", "C", "D", "A", "O"].includes(value)) {
        category = value;
      }
    }

    return new MedicalServiceModel(
      resource.id ?? "",
      getIdentifierValue(resource.identifier, {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        preferNonUuid: true,
      }) ??
        resource.name ??
        "",
      resource.title ?? resource.name ?? "",
      getUuidIdentifier(resource.identifier, OPENIMIS_IDENTIFIER_SYSTEM) ??
        getUuidIdentifier(resource.identifier),
      resource.status,
      resource.date,
      unitPriceExt?.valueMoney?.value ??
        getExtensionDecimal(resource.extension, "unit-price"),
      unitPriceExt?.valueMoney?.currency,
      typeof frequency === "number" ? frequency : undefined,
      serviceType === "Preventive"
        ? "P"
        : serviceType === "Curative"
          ? "C"
          : serviceType,
      level,
      category,
      careType,
      genders,
      ages
    );
  }

  toFhir(model: MedicalServiceModel): fhir4.ActivityDefinition {
    const extensions: fhir4.Extension[] = [];
    if (model.unitPrice !== undefined) {
      extensions.push({
        url: "StructureDefinition/unit-price",
        valueMoney: {
          value: model.unitPrice,
          currency: model.currency ?? "$",
        },
      });
    }
    if (model.level) {
      extensions.push({
        url: "StructureDefinition/activity-definition-level",
        valueCodeableConcept: { coding: [{ code: model.level }] },
      });
    }

    return {
      resourceType: "ActivityDefinition",
      id: model.id || model.uuid || model.code,
      status: (model.status as fhir4.ActivityDefinition["status"]) ?? "active",
      name: model.code,
      title: model.name,
      date: model.validFrom,
      identifier: [
        ...(model.uuid
          ? [{ system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.uuid }]
          : []),
        { system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.code },
      ],
      timingTiming:
        model.frequencyDays !== undefined
          ? { repeat: { period: model.frequencyDays, periodUnit: "d" } }
          : undefined,
      topic: model.serviceType
        ? [
            {
              coding: [
                {
                  code:
                    model.serviceType === "P"
                      ? "Preventive"
                      : model.serviceType === "C"
                        ? "Curative"
                        : model.serviceType,
                },
              ],
            },
          ]
        : undefined,
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default MedicalServiceFhirConverter;
