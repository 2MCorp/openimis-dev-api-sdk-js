/// <reference types="fhir" />

import {
  PaymentDetailModel,
  PaymentNoticeModel,
  PaymentReconciliationDetailModel,
  PaymentReconciliationModel,
} from "../models/payment";
import {
  assertResourceType,
  getIdentifierValue,
  getUuidIdentifier,
  referenceId,
  resourcesFromBundle,
} from "./helpers";


class PaymentNoticeFhirConverter {
  readonly resourceType = "PaymentNotice";

  fromFhir(resource: fhir4.PaymentNotice): PaymentNoticeModel {
    assertResourceType(resource, "PaymentNotice");

    const details: PaymentDetailModel[] = [];
    for (const extension of resource.extension ?? []) {
      if (!extension.url.includes("paymentDetail")) {
        continue;
      }
      const nested = extension.extension ?? [];
      details.push(
        new PaymentDetailModel(
          nested.find((entry) => entry.url.includes("productCode"))
            ?.valueString,
          nested.find((entry) => entry.url.includes("insuranceNumber"))
            ?.valueString,
          nested.find((entry) => entry.url.includes("amount"))?.valueDecimal,
          nested.find((entry) => entry.url.includes("policyStage"))
            ?.valueString
        )
      );
    }

    return new PaymentNoticeModel(
      resource.id ??
        getIdentifierValue(resource.identifier, {
          systemIncludes: "payments",
        }) ??
        "",
      resource.status,
      getUuidIdentifier(resource.identifier) ??
        getIdentifierValue(resource.identifier, {
          systemIncludes: "uuid",
        }),
      getIdentifierValue(resource.identifier, {
        systemIncludes: "payments",
      }),
      getIdentifierValue(resource.identifier, {
        systemIncludes: "transaction",
      }),
      resource.created,
      resource.paymentDate,
      resource.amount?.value,
      resource.amount?.currency,
      referenceId(
        (resource as fhir4.PaymentNotice & { reporter?: fhir4.Reference })
          .reporter
      ),
      details
    );
  }

  fromBundle(bundle: fhir4.Bundle): PaymentNoticeModel[] {
    return resourcesFromBundle<fhir4.PaymentNotice>(
      bundle,
      "PaymentNotice"
    ).map((resource) => this.fromFhir(resource));
  }

  toFhir(model: PaymentNoticeModel): fhir4.PaymentNotice {
    return {
      resourceType: "PaymentNotice",
      id: model.id || model.uuid,
      status: (model.status as fhir4.PaymentNotice["status"]) ?? "active",
      created: model.created ?? new Date().toISOString(),
      paymentDate: model.paymentDate,
      amount: {
        value: model.amount ?? 0,
        currency: model.currency ?? "$",
      },
      provider: model.officerCode
        ? { reference: `Practitioner/${model.officerCode}` }
        : undefined,
      identifier: [
        ...(model.uuid
          ? [
              {
                system: "urn:ietf:rfc:3986",
                value: `urn:uuid:${model.uuid}`,
              },
            ]
          : []),
        ...(model.paymentId
          ? [
              {
                system: "https://example.org/payments",
                value: model.paymentId,
              },
            ]
          : []),
        ...(model.transactionNo
          ? [
              {
                system: "https://example.org/transaction",
                value: model.transactionNo,
              },
            ]
          : []),
      ],
      extension: model.details.map((detail) => ({
        url: "http://openimis.org/fhir/StructureDefinition/paymentDetail",
        extension: [
          ...(detail.productCode
            ? [{ url: "productCode", valueString: detail.productCode }]
            : []),
          ...(detail.insuranceNumber
            ? [
                {
                  url: "insuranceNumber",
                  valueString: detail.insuranceNumber,
                },
              ]
            : []),
          ...(detail.amount !== undefined
            ? [{ url: "amount", valueDecimal: detail.amount }]
            : []),
          ...(detail.policyStage
            ? [{ url: "policyStage", valueString: detail.policyStage }]
            : []),
        ],
      })),
      // Required by fhir4.PaymentNotice typing.
      payment: { reference: `Payment/${model.paymentId ?? model.id}` },
      recipient: { reference: "Organization/openimis" },
    };
  }
}

class PaymentReconciliationFhirConverter {
  readonly resourceType = "PaymentReconciliation";

  fromFhir(resource: fhir4.PaymentReconciliation): PaymentReconciliationModel {
    assertResourceType(resource, "PaymentReconciliation");
    return new PaymentReconciliationModel(
      resource.id ?? "",
      resource.status,
      resource.created,
      resource.paymentDate,
      resource.paymentAmount?.value,
      resource.paymentAmount?.currency,
      getIdentifierValue(resource.identifier, {
        systemIncludes: "transaction",
      }),
      getIdentifierValue(resource.identifier, {
        systemIncludes: "receipt",
      }),
      resource.disposition,
      resource.processNote?.[0]?.text,
      (resource.detail ?? []).map(
        (detail) =>
          new PaymentReconciliationDetailModel(
            detail.identifier?.value,
            detail.type?.coding?.[0]?.code ?? detail.type?.text,
            detail.amount?.value,
            referenceId(detail.payee) ?? detail.payee?.display
          )
      )
    );
  }

  fromBundle(bundle: fhir4.Bundle): PaymentReconciliationModel[] {
    return resourcesFromBundle<fhir4.PaymentReconciliation>(
      bundle,
      "PaymentReconciliation"
    ).map((resource) => this.fromFhir(resource));
  }

  toFhir(model: PaymentReconciliationModel): fhir4.PaymentReconciliation {
    return {
      resourceType: "PaymentReconciliation",
      id: model.id,
      status:
        (model.status as fhir4.PaymentReconciliation["status"]) ?? "active",
      created: model.created ?? new Date().toISOString(),
      paymentDate:
        model.paymentDate ??
        model.created ??
        new Date().toISOString().slice(0, 10),
      disposition: model.disposition,
      paymentAmount: {
        value: model.amount ?? 0,
        currency: model.currency ?? "$",
      },
      processNote: model.contractCode
        ? [{ text: model.contractCode }]
        : undefined,
      detail: model.details.map((detail) => ({
        identifier: detail.id ? { value: detail.id } : undefined,
        type: detail.policyStage
          ? { text: detail.policyStage }
          : { text: "payment" },
        amount:
          detail.amount !== undefined
            ? { value: detail.amount, currency: model.currency }
            : undefined,
        payee: detail.payeeInsuranceNumber
          ? { display: detail.payeeInsuranceNumber }
          : undefined,
      })),
    };
  }
}

export { PaymentNoticeFhirConverter, PaymentReconciliationFhirConverter };
