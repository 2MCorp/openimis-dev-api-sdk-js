/// <reference types="fhir" />

import { ClaimChargeItemModel } from "../models/claim_charge_item";
import { ClaimAttachmentModel } from "../models/claim";
import { MedicalServiceModel } from "../models/medical_service";
import {
  getIdentifierValue,
  getUuidIdentifier,
  referenceId,
} from "../fhir_converter/helpers";

export function chargeItemFromFhir(
  resource: fhir4.ChargeItem,
  kind: "item" | "service" | string = "item"
): ClaimChargeItemModel {
  const code =
    resource.code?.coding?.[0]?.code ??
    resource.code?.text ??
    getIdentifierValue(resource.identifier, {
      systemIncludes: "claim-item-code",
    }) ??
    getIdentifierValue(resource.identifier, {
      systemIncludes: "claim-service-code",
    }) ??
    "";

  return new ClaimChargeItemModel(
    resource.id ?? "",
    code,
    resource.code?.coding?.[0]?.display ?? resource.code?.text,
    resource.status,
    referenceId(resource.subject),
    getIdentifierValue(resource.identifier, {
      systemIncludes: "claim-id",
    }) ?? getUuidIdentifier(resource.identifier),
    resource.quantity?.value,
    resource.priceOverride?.value,
    resource.priceOverride?.currency,
    resource.enteredDate,
    kind
  );
}

export function chargeItemToFhir(
  model: ClaimChargeItemModel
): fhir4.ChargeItem {
  return {
    resourceType: "ChargeItem",
    id: model.id || undefined,
    status: (model.status as fhir4.ChargeItem["status"]) ?? "active",
    code: {
      text: model.name ?? model.code,
      coding: [{ code: model.code, display: model.name }],
    },
    subject: model.patientChfId
      ? { reference: `Patient/${model.patientChfId}` }
      : { reference: "Patient/unknown" },
    quantity:
      model.quantity !== undefined ? { value: model.quantity } : undefined,
    priceOverride:
      model.unitPrice !== undefined
        ? {
            value: model.unitPrice,
            currency: model.currency ?? "$",
          }
        : undefined,
    identifier: model.claimUuid
      ? [
          {
            system: "Identifier/claim-id",
            value: model.claimUuid,
          },
        ]
      : undefined,
    enteredDate: model.enteredDate,
  };
}

export function documentReferenceFromFhir(
  resource: fhir4.DocumentReference
): ClaimAttachmentModel {
  const content = resource.content?.[0]?.attachment;
  const claimUuid = getIdentifierValue(resource.identifier, {
    systemIncludes: "claim-uuid",
  }) ??
    getIdentifierValue(resource.identifier, {
      systemIncludes: "claim-id",
    });

  return new ClaimAttachmentModel(
    resource.id,
    content?.title ?? resource.type?.text,
    content?.title,
    content?.contentType,
    content?.creation,
    content?.data,
    resource.type?.text,
    content?.url ?? claimUuid
  );
}

export function documentReferenceToFhir(
  model: ClaimAttachmentModel,
  claimUuid?: string
): fhir4.DocumentReference {
  return {
    resourceType: "DocumentReference",
    id: model.id,
    status: "current",
    identifier: claimUuid
      ? [
          {
            system: "Identifier/claim-uuid",
            value: claimUuid,
            type: { coding: [{ code: "claim-uuid" }] },
          },
        ]
      : undefined,
    type: model.kind ? { text: model.kind } : undefined,
    content: [
      {
        attachment: {
          title: model.title ?? model.filename,
          url: model.url,
          data: model.data,
          contentType: model.mime,
          creation: model.creation,
        },
      },
    ],
  };
}

/** HF /services returns ChargeItemDefinition (not ActivityDefinition). */
export function medicalServiceFromChargeItemDefinition(
  resource: fhir4.ChargeItemDefinition
): MedicalServiceModel {
  const coding = resource.code?.coding?.[0];
  let serviceType: string | undefined;
  for (const ctx of resource.useContext ?? []) {
    const value = ctx.valueCodeableConcept?.coding?.[0]?.code;
    if (value === "P" || value === "C") {
      serviceType = value;
    }
  }

  return new MedicalServiceModel(
    resource.id ?? coding?.code ?? "",
    coding?.code ?? "",
    resource.title ?? resource.code?.text ?? coding?.display ?? "",
    getIdentifierValue(resource.identifier, {
      systemIncludes: "service",
    }),
    resource.status,
    undefined,
    undefined,
    undefined,
    undefined,
    serviceType
  );
}
