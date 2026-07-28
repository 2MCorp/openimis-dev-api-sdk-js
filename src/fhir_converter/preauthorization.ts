/// <reference types="fhir" />

import { DiagnosisCode, PreauthorizationModel } from "../models/preauthorization";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getExtension,
  getExtensionString,
  getIdentifierValue,
  referenceId,
} from "./helpers";

function diagnosisFromExt(
  extensions: fhir4.Extension[] | undefined,
  suffix: string
): DiagnosisCode | undefined {
  const coding = getExtension(extensions, suffix)?.valueCodeableConcept
    ?.coding?.[0];
  if (!coding?.code) {
    return undefined;
  }
  return new DiagnosisCode(coding.code, coding.display);
}

class PreauthorizationFhirConverter extends BaseFhirConverter<
  PreauthorizationModel,
  fhir4.Claim
> {
  readonly resourceType = "Claim";

  fromFhir(resource: fhir4.Claim): PreauthorizationModel {
    assertResourceType(resource, "Claim");
    const hfFrom = getExtension(resource.extension, "ref-hf-from")
      ?.valueReference;
    const hfTo = getExtension(resource.extension, "ref-hf-to")?.valueReference;

    return new PreauthorizationModel(
      resource.id ?? "",
      resource.status ?? "",
      referenceId(resource.patient) ?? "",
      getIdentifierValue(resource.identifier, {
        systemIncludes: "preauthorization",
      }),
      resource.created,
      resource.patient?.display,
      referenceId(hfFrom),
      hfFrom?.display,
      referenceId(hfTo),
      hfTo?.display,
      diagnosisFromExt(resource.extension, "diagnosis-primary"),
      diagnosisFromExt(resource.extension, "diagnosis-secondary") ??
        diagnosisFromExt(resource.extension, "secicd"),
      diagnosisFromExt(resource.extension, "diagnosis-tertiary") ??
        diagnosisFromExt(resource.extension, "thicd"),
      diagnosisFromExt(resource.extension, "diagnosis-quaternary") ??
        diagnosisFromExt(resource.extension, "foticd"),
      diagnosisFromExt(resource.extension, "service"),
      diagnosisFromExt(resource.extension, "item"),
      getExtensionString(resource.extension, "rejection-reason"),
      getExtensionString(resource.extension, "explanation")
    );
  }

  toFhir(model: PreauthorizationModel): fhir4.Claim {
    const extensions: fhir4.Extension[] = [];
    const pushCc = (suffix: string, value?: DiagnosisCode) => {
      if (!value) return;
      extensions.push({
        url: `StructureDefinition/${suffix}`,
        valueCodeableConcept: {
          coding: [{ code: value.code, display: value.name }],
        },
      });
    };
    pushCc("diagnosis-primary", model.primaryDiagnosis);
    pushCc("diagnosis-secondary", model.secondaryDiagnosis);
    pushCc("diagnosis-tertiary", model.tertiaryDiagnosis);
    pushCc("diagnosis-quaternary", model.quaternaryDiagnosis);
    pushCc("service", model.service);
    pushCc("item", model.item);
    if (model.hfFromId) {
      extensions.push({
        url: "StructureDefinition/ref-hf-from",
        valueReference: {
          reference: `Organization/${model.hfFromId}`,
          display: model.hfFromDisplay,
        },
      });
    }
    if (model.hfToId) {
      extensions.push({
        url: "StructureDefinition/ref-hf-to",
        valueReference: {
          reference: `Organization/${model.hfToId}`,
          display: model.hfToDisplay,
        },
      });
    }
    if (model.rejectionReason) {
      extensions.push({
        url: "StructureDefinition/rejection-reason",
        valueString: model.rejectionReason,
      });
    }
    if (model.explanation) {
      extensions.push({
        url: "StructureDefinition/explanation",
        valueString: model.explanation,
      });
    }

    return {
      resourceType: "Claim",
      id: model.id || model.uuid,
      status: (model.status || "Entered") as fhir4.Claim["status"],
      use: "preauthorization",
      created: model.created ?? new Date().toISOString().slice(0, 10),
      type: { coding: [{ code: "professional" }] },
      priority: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/processpriority",
            code: "normal",
          },
        ],
      },
      patient: {
        reference: `Patient/${model.patientChfId}`,
        display: model.patientName,
      },
      provider: {
        reference: `Organization/${model.hfToId ?? model.hfFromId ?? "unknown"}`,
      },
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: { reference: "Coverage/unknown" },
        },
      ],
      identifier: model.uuid
        ? [
            {
              system: "http://openimis.org/identifiers/preauthorization",
              value: model.uuid,
            },
          ]
        : undefined,
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default PreauthorizationFhirConverter;
