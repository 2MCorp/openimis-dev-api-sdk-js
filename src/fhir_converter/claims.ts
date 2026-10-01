/// <reference types="fhir" />

import {
  ClaimAttachmentModel,
  ClaimDiagnosisModel,
  ClaimItemModel,
  ClaimModel,
} from "../models/claim";
import BaseFhirConverter from "./base";
import { OPENIMIS_IDENTIFIER_SYSTEM } from "./constants";
import {
  assertResourceType,
  buildMoney,
  buildOpenImisIdentifier,
  buildReference,
  getIdentifierValue,
  getUuidIdentifier,
  isUuid,
  referenceId,
  getExtension,
  getExtensionDecimal,
} from "./helpers";

class ClaimFhirConverter extends BaseFhirConverter<ClaimModel, fhir4.Claim> {
  readonly resourceType = "Claim";

  fromFhir(resource: fhir4.Claim): ClaimModel {
    assertResourceType(resource, "Claim");

    const identifiers = resource.identifier;
    const uuid =
      getUuidIdentifier(identifiers, OPENIMIS_IDENTIFIER_SYSTEM) ??
      getUuidIdentifier(identifiers) ??
      (isUuid(resource.id) ? resource.id : undefined);
    // Backend may emit claim-code type as "MR" (R4 cfg) or "Code" (R5 default).
    const code =
      getIdentifierValue(identifiers, {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        preferNonUuid: true,
      }) ??
      getIdentifierValue(identifiers, { typeCode: "MR" }) ??
      getIdentifierValue(identifiers, { typeCode: "Code" }) ??
      getIdentifierValue(identifiers, { preferNonUuid: true }) ??
      (!isUuid(resource.id) ? resource.id : undefined) ??
      "";

    const diagnoses = (resource.diagnosis ?? []).map((diagnosis, index) => {
      const coding = diagnosis.diagnosisCodeableConcept?.coding?.[0];
      return new ClaimDiagnosisModel(
        diagnosis.sequence ?? index + 1,
        coding?.code ?? "",
        coding?.display
      );
    });

    const items = (resource.item ?? []).map((item, index) => {
      const reference = item.extension?.find((extension) =>
        extension.url.includes("claim-item-reference")
      )?.valueReference?.reference;

      const productCode =
        item.productOrService?.coding?.[0]?.code ??
        item.productOrService?.text ??
        "";
      const category =
        item.category?.text ??
        item.category?.coding?.[0]?.code ??
        item.category?.coding?.[0]?.display ??
        "";

      return new ClaimItemModel(
        item.sequence ?? index + 1,
        productCode,
        category,
        item.quantity?.value,
        item.unitPrice?.value,
        item.unitPrice?.currency,
        reference
      );
    });

    const attachments: ClaimAttachmentModel[] = [];
    let guaranteeId: string | undefined;
    let explanation: string | undefined;

    for (const info of resource.supportingInfo ?? []) {
      const category = info.category?.coding?.[0]?.code;
      if (category === "guarantee") {
        guaranteeId = info.valueString;
      } else if (category === "explanation") {
        explanation = info.valueString;
      } else if (category === "attachment") {
        attachments.push(
          new ClaimAttachmentModel(
            info.code?.coding?.[0]?.code,
            info.valueAttachment?.title,
            info.valueAttachment?.title,
            info.valueAttachment?.contentType,
            info.valueAttachment?.creation,
            info.valueAttachment?.data,
            "FILE",
            info.valueAttachment?.url
          )
        );
      }
    }

    // Prefer UUID as the resource id so list/submit/detail routes hit UUID retrieve.
    const model = new ClaimModel(
      uuid ?? (isUuid(resource.id) ? resource.id! : undefined) ?? code ?? resource.id ?? "",
      code,
      resource.status ?? "",
      referenceId(resource.patient) ?? "",
      resource.created,
      uuid,
      referenceId(resource.provider),
      referenceId(resource.enterer),
      resource.type?.coding?.[0]?.code,
      resource.billablePeriod?.start,
      resource.billablePeriod?.end,
      resource.total?.value,
      resource.total?.currency,
      guaranteeId,
      explanation,
      referenceId(resource.insurance?.[0]?.coverage),
      diagnoses,
      items,
      attachments
    );
    model.patientName = resource.patient?.display?.trim() || undefined;
    // Financial extensions from ClaimConverter.build_fhir_claim_financial_extensions.
    model.approvedAmount = getExtensionDecimal(resource.extension, "claim-approved-amount");
    model.valuatedAmount = getExtensionDecimal(resource.extension, "claim-valuated-amount");
    const processed = getExtension(resource.extension, "claim-date-processed");
    model.dateProcessed = processed?.valueDate ?? processed?.valueString ?? undefined;
    return model;
  }

  toFhir(model: ClaimModel): fhir4.Claim {
    const identifiers: fhir4.Identifier[] = [];
    if (model.uuid) {
      identifiers.push(buildOpenImisIdentifier(model.uuid));
    }
    if (model.code) {
      identifiers.push({
        ...buildOpenImisIdentifier(model.code),
        type: {
          coding: [{ code: "MR", display: "Medical record number" }],
        },
      });
    }

    const supportingInfo: fhir4.ClaimSupportingInfo[] = [];
    let sequence = 1;
    if (model.guaranteeId) {
      supportingInfo.push({
        sequence: sequence++,
        category: { coding: [{ code: "guarantee" }] },
        valueString: model.guaranteeId,
      });
    }
    if (model.explanation) {
      supportingInfo.push({
        sequence: sequence++,
        category: { coding: [{ code: "explanation" }] },
        valueString: model.explanation,
      });
    }
    for (const attachment of model.attachments) {
      supportingInfo.push({
        sequence: sequence++,
        category: { coding: [{ code: "attachment" }] },
        code: attachment.id
          ? {
              coding: [
                { code: attachment.id, display: "Attachment ID" },
              ],
            }
          : undefined,
        valueAttachment: {
          title: attachment.title ?? attachment.filename,
          contentType: attachment.mime,
          creation: attachment.creation,
          data: attachment.data,
          url: attachment.url,
        },
      });
    }

    const resourceId = [model.id, model.uuid, model.code]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .find((v) => v.length > 0);

    return {
      resourceType: "Claim",
      ...(resourceId ? { id: resourceId } : {}),
      status: (model.status || "ENTERED") as fhir4.Claim["status"],
      use: "claim",
      created: model.created ?? new Date().toISOString().slice(0, 10),
      identifier: identifiers.length ? identifiers : undefined,
      patient: buildReference(
        "Patient",
        model.patientChfId,
        model.patientName ?? model.patientChfId
      ),
      type: { coding: [{ code: model.visitType ?? "O" }] },
      priority: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/processpriority",
            code: "normal",
            display: "Normal",
          },
        ],
      },
      provider: buildReference(
        "Organization",
        model.providerId ?? "unknown"
      ),
      enterer: model.entererCode
        ? buildReference("Practitioner", model.entererCode)
        : undefined,
      billablePeriod:
        model.dateFrom || model.dateTo
          ? {
              start: model.dateFrom,
              end: model.dateTo ?? model.dateFrom,
            }
          : undefined,
      diagnosis: model.diagnoses.map((diagnosis) => ({
        sequence: diagnosis.sequence,
        diagnosisCodeableConcept: {
          coding: [
            { code: diagnosis.code, display: diagnosis.display },
          ],
        },
      })),
      item: model.items.map((item) => ({
        sequence: item.sequence,
        productOrService: { text: item.code },
        category: { text: item.category },
        quantity:
          item.quantity !== undefined ? { value: item.quantity } : undefined,
        unitPrice:
          item.unitPrice !== undefined
            ? buildMoney(item.unitPrice, item.currency)
            : undefined,
        extension: item.reference
          ? [
              {
                url: "StructureDefinition/claim-item-reference",
                valueReference: { reference: item.reference },
              },
            ]
          : undefined,
      })),
      total:
        model.total !== undefined
          ? buildMoney(model.total, model.currency)
          : undefined,
      supportingInfo: supportingInfo.length ? supportingInfo : undefined,
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: buildReference(
            "Coverage",
            model.coverageId ?? "unknown"
          ),
        },
      ],
    };
  }
}

export default ClaimFhirConverter;
