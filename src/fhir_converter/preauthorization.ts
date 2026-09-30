/// <reference types="fhir" />

import { DiagnosisCode, PreauthorizationModel } from "../models/preauthorization";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getExtension,
  getExtensionString,
  getIdentifierValue,
  getUuidIdentifier,
  isUuid,
  referenceId,
} from "./helpers";

const EXT_BASE = "http://openimis.org/fhir/StructureDefinition";

function diagnosisFromExt(
  extensions: fhir4.Extension[] | undefined,
  suffix: string
): DiagnosisCode | undefined {
  const ext = getExtension(extensions, suffix);
  if (!ext) return undefined;

  const coding = ext.valueCodeableConcept?.coding?.[0];
  if (coding?.code) {
    return new DiagnosisCode(coding.code, coding.display);
  }
  if (ext.valueString) {
    return new DiagnosisCode(ext.valueString);
  }
  return undefined;
}

function hfIdFromExt(
  extensions: fhir4.Extension[] | undefined,
  suffix: string
): { id?: string; display?: string } {
  const ext = getExtension(extensions, suffix);
  if (!ext) return {};
  if (ext.valueString) {
    return { id: ext.valueString, display: ext.valueReference?.display };
  }
  const ref = ext.valueReference;
  return { id: referenceId(ref), display: ref?.display };
}

class PreauthorizationFhirConverter extends BaseFhirConverter<
  PreauthorizationModel,
  fhir4.Claim
> {
  readonly resourceType = "Claim";

  fromFhir(resource: fhir4.Claim): PreauthorizationModel {
    assertResourceType(resource, "Claim");
    const hfFrom = hfIdFromExt(resource.extension, "ref-hf-from");
    const hfTo = hfIdFromExt(resource.extension, "ref-hf-to");

    const code =
      getIdentifierValue(resource.identifier, { typeCode: "code" }) ??
      getIdentifierValue(resource.identifier, {
        systemIncludes: "preauthorization-code",
        preferNonUuid: true,
      }) ??
      (resource.id && !isUuid(resource.id) ? resource.id : undefined);

    const uuid =
      getIdentifierValue(resource.identifier, { typeCode: "uuid" }) ??
      getUuidIdentifier(resource.identifier) ??
      (resource.id && isUuid(resource.id) ? resource.id : undefined);

    return new PreauthorizationModel(
      code ?? resource.id ?? "",
      resource.status ?? "",
      referenceId(resource.patient) ?? "",
      uuid,
      resource.created,
      resource.patient?.display,
      hfFrom.id,
      hfFrom.display,
      hfTo.id,
      hfTo.display,
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
      getExtensionString(resource.extension, "explanation"),
      (() => {
        const linked = getExtension(resource.extension, "linked-claim");
        return (
          referenceId(linked?.valueReference) ||
          linked?.valueString ||
          undefined
        );
      })(),
      (() => {
        const linked = getExtension(resource.extension, "linked-claim");
        return linked?.valueReference?.display || undefined;
      })()
    );
  }

  toFhir(model: PreauthorizationModel): fhir4.Claim {
    const extensions: fhir4.Extension[] = [];

    const pushString = (suffix: string, value?: string) => {
      if (!value) return;
      extensions.push({
        url: `${EXT_BASE}/${suffix}`,
        valueString: value,
      });
    };

    pushString("diagnosis-primary", model.primaryDiagnosis?.code);
    pushString("diagnosis-secondary", model.secondaryDiagnosis?.code);
    pushString("diagnosis-tertiary", model.tertiaryDiagnosis?.code);
    pushString("diagnosis-quaternary", model.quaternaryDiagnosis?.code);
    pushString("service", model.service?.code);
    pushString("item", model.item?.code);
    pushString("ref-hf-from", model.hfFromId);
    pushString("ref-hf-to", model.hfToId);
    pushString("rejection-reason", model.rejectionReason);
    pushString("explanation", model.explanation?.trim() || undefined);

    if (model.claimId) {
      extensions.push({
        url: `${EXT_BASE}/linked-claim`,
        valueReference: {
          reference: `Claim/${model.claimId}`,
          display: model.claimCode,
        },
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
      identifier: (() => {
        const ids: fhir4.Identifier[] = [];
        if (model.id && !isUuid(model.id)) {
          ids.push({
            system: "http://openimis.org/identifiers/preauthorization-code",
            value: model.id,
          });
        }
        if (model.uuid) {
          ids.push({
            system: "http://openimis.org/identifiers/preauthorization",
            value: model.uuid,
          });
        }
        return ids.length ? ids : undefined;
      })(),
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default PreauthorizationFhirConverter;
