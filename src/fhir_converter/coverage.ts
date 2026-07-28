/// <reference types="fhir" />

import { CoverageModel } from "../models/coverage";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getExtensionString,
  getIdentifierValue,
  getUuidIdentifier,
  referenceId,
} from "./helpers";

class CoverageFhirConverter extends BaseFhirConverter<
  CoverageModel,
  fhir4.Coverage
> {
  readonly resourceType = "Coverage";

  fromFhir(resource: fhir4.Coverage): CoverageModel {
    assertResourceType(resource, "Coverage");
    const planClass = resource.class?.find(
      (entry) => entry.type?.coding?.[0]?.code === "plan" || entry.type?.text === "plan"
    );
    const groupClass = resource.class?.find(
      (entry) =>
        entry.type?.coding?.[0]?.code === "group" || entry.type?.text === "group"
    );

    return new CoverageModel(
      resource.id ?? "",
      resource.status,
      getUuidIdentifier(resource.identifier) ??
        getIdentifierValue(resource.identifier, {
          systemIncludes: "policy",
        }),
      getIdentifierValue(resource.identifier, { preferNonUuid: true }),
      resource.type?.text ?? resource.type?.coding?.[0]?.display,
      planClass?.value ?? planClass?.name,
      referenceId(resource.subscriber ?? resource.policyHolder),
      referenceId(resource.beneficiary),
      groupClass?.value ?? groupClass?.name,
      resource.period?.start,
      resource.period?.end,
      getExtensionString(resource.extension, "coverage-enrollment-date"),
      getExtensionString(resource.extension, "coverage-effective-date")
    );
  }

  toFhir(model: CoverageModel): fhir4.Coverage {
    return {
      resourceType: "Coverage",
      id: model.id,
      status: (model.status as fhir4.Coverage["status"]) ?? "active",
      beneficiary: {
        reference: `Patient/${model.beneficiaryId ?? model.id}`,
      },
      payor: [{ reference: "Organization/openimis-scheme" }],
      identifier: [
        ...(model.policyUuid
          ? [{ value: model.policyUuid }]
          : []),
        ...(model.policyCode ? [{ value: model.policyCode }] : []),
      ],
      period:
        model.periodStart || model.periodEnd
          ? { start: model.periodStart, end: model.periodEnd }
          : undefined,
      subscriber: model.subscriberId
        ? { reference: `Patient/${model.subscriberId}` }
        : undefined,
      class: [
        ...(model.productUuid
          ? [
              {
                type: { coding: [{ code: "plan" }] },
                value: model.productUuid,
                name: model.productName,
              },
            ]
          : []),
        ...(model.familyUuid
          ? [
              {
                type: { coding: [{ code: "group" }] },
                value: model.familyUuid,
              },
            ]
          : []),
      ],
      extension: [
        ...(model.enrollmentDate
          ? [
              {
                url: "StructureDefinition/coverage-enrollment-date",
                valueString: model.enrollmentDate,
              },
            ]
          : []),
        ...(model.effectiveDate
          ? [
              {
                url: "StructureDefinition/coverage-effective-date",
                valueString: model.effectiveDate,
              },
            ]
          : []),
      ],
    };
  }
}

export default CoverageFhirConverter;
