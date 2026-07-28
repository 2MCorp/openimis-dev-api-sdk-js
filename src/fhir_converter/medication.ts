/// <reference types="fhir" />

import { MedicationItemModel } from "../models/medication";
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

class MedicationFhirConverter extends BaseFhirConverter<
  MedicationItemModel,
  fhir4.Medication
> {
  readonly resourceType = "Medication";

  fromFhir(resource: fhir4.Medication): MedicationItemModel {
    assertResourceType(resource, "Medication");
    const unitPriceExt = getExtension(resource.extension, "unit-price");
    const typeCode = getExtensionCodeableConcept(
      resource.extension,
      "medication-type"
    )?.code;
    const frequency = getExtension(resource.extension, "medication-frequency")
      ?.valueTiming?.repeat?.period;
    const level = getExtensionCodeableConcept(
      resource.extension,
      "medication-level"
    )?.code;

    const genders: string[] = [];
    const ages: string[] = [];
    let careType: string | undefined;
    const usage = getExtension(resource.extension, "medication-usage-context");
    for (const nested of usage?.extension ?? []) {
      const code = nested.valueUsageContext?.code?.code;
      const value = nested.valueUsageContext?.valueCodeableConcept?.coding?.[0]
        ?.code;
      if (!value) continue;
      if (code?.toLowerCase().includes("gender") || value === "male" || value === "female") {
        genders.push(value);
      } else if (value === "adult" || value === "child") {
        ages.push(value);
      } else if (value === "AMB") {
        careType = careType === "I" ? "B" : "O";
      } else if (value === "IMP") {
        careType = careType === "O" ? "B" : "I";
      }
    }

    return new MedicationItemModel(
      resource.id ?? "",
      getIdentifierValue(resource.identifier, {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        preferNonUuid: true,
      }) ??
        getIdentifierValue(resource.identifier, { preferNonUuid: true }) ??
        "",
      resource.code?.text ?? resource.code?.coding?.[0]?.display ?? "",
      getUuidIdentifier(resource.identifier, OPENIMIS_IDENTIFIER_SYSTEM) ??
        getUuidIdentifier(resource.identifier),
      resource.form?.text,
      resource.status,
      unitPriceExt?.valueMoney?.value ??
        getExtensionDecimal(resource.extension, "unit-price"),
      unitPriceExt?.valueMoney?.currency,
      typeCode,
      typeof frequency === "number" ? frequency : undefined,
      genders,
      ages,
      careType,
      level
    );
  }

  toFhir(model: MedicationItemModel): fhir4.Medication {
    const extensions: fhir4.Extension[] = [];
    if (model.unitPrice !== undefined) {
      extensions.push({
        url: "CodeSystem/unit-price",
        valueMoney: {
          value: model.unitPrice,
          currency: model.currency ?? "$",
        },
      });
    }
    if (model.itemType) {
      extensions.push({
        url: "StructureDefinition/medication-type",
        valueCodeableConcept: { coding: [{ code: model.itemType }] },
      });
    }
    if (model.frequencyDays !== undefined) {
      extensions.push({
        url: "StructureDefinition/medication-frequency",
        valueTiming: {
          repeat: { period: model.frequencyDays, periodUnit: "d" },
        },
      });
    }

    return {
      resourceType: "Medication",
      id: model.id || model.uuid || model.code,
      status: (model.status as fhir4.Medication["status"]) ?? "active",
      identifier: [
        ...(model.uuid
          ? [{ system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.uuid }]
          : []),
        { system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.code },
      ],
      code: { text: model.name },
      form: model.packageName ? { text: model.packageName } : undefined,
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default MedicationFhirConverter;
