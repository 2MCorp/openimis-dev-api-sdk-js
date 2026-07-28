/// <reference types="fhir" />

import {
  ContractModel,
  ContractSubjectModel,
  ContractTermModel,
} from "../models/contract";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getExtensionDecimal,
  getExtensionString,
  getIdentifierValue,
  referenceId,
} from "./helpers";

class ContractFhirConverter extends BaseFhirConverter<
  ContractModel,
  fhir4.Contract
> {
  readonly resourceType = "Contract";

  fromFhir(resource: fhir4.Contract): ContractModel {
    assertResourceType(resource, "Contract");

    const subjects = (resource.subject ?? []).map(
      (subject) =>
        new ContractSubjectModel(
          referenceId(subject) ?? "",
          subject.display
        )
    );

    const terms = (resource.term ?? []).map((term) => {
      const valued = term.asset?.[0]?.valuedItem?.[0];
      return new ContractTermModel(
        referenceId(term.topicReference),
        term.topicReference?.display ?? term.offer?.text,
        valued?.net?.value,
        valued?.net?.currency
      );
    });

    return new ContractModel(
      resource.id ??
        getIdentifierValue(resource.identifier, {
          systemIncludes: "contract-uuid",
        }) ??
        "",
      getIdentifierValue(resource.identifier, {
        systemIncludes: "contract-code",
      }) ??
        getIdentifierValue(resource.identifier, { preferNonUuid: true }) ??
        "",
      resource.status ?? resource.legalState?.coding?.[0]?.code,
      resource.issued,
      resource.applies?.end,
      resource.applies?.start,
      resource.applies?.end,
      referenceId(resource.authority?.[0]),
      resource.authority?.[0]?.display,
      subjects,
      terms,
      getExtensionDecimal(resource.extension, "amountNotified"),
      getExtensionDecimal(resource.extension, "amountRectified"),
      getExtensionString(resource.extension, "paymentReference"),
      getExtensionString(resource.extension, "amendment")
    );
  }

  toFhir(model: ContractModel): fhir4.Contract {
    const extensions: fhir4.Extension[] = [];
    if (model.amountNotified !== undefined) {
      extensions.push({
        url: "http://openimis.org/fhir/StructureDefinition/amountNotified",
        valueDecimal: model.amountNotified,
      });
    }
    if (model.amountRectified !== undefined) {
      extensions.push({
        url: "http://openimis.org/fhir/StructureDefinition/amountRectified",
        valueDecimal: model.amountRectified,
      });
    }
    if (model.paymentReference) {
      extensions.push({
        url: "http://openimis.org/fhir/StructureDefinition/paymentReference",
        valueString: model.paymentReference,
      });
    }
    if (model.amendment) {
      extensions.push({
        url: "http://openimis.org/fhir/StructureDefinition/amendment",
        valueString: model.amendment,
      });
    }

    return {
      resourceType: "Contract",
      id: model.id,
      status: model.status as fhir4.Contract["status"],
      issued: model.issued,
      identifier: [
        {
          system: "http://openimis.org/contract-uuid",
          value: model.id,
        },
        {
          system: "http://openimis.org/contract-code",
          value: model.code,
        },
      ],
      applies:
        model.dateValidFrom || model.dateValidTo || model.paymentDue
          ? {
              start: model.dateValidFrom,
              end: model.dateValidTo ?? model.paymentDue,
            }
          : undefined,
      authority: model.policyHolderId
        ? [
            {
              reference: `Organization/${model.policyHolderId}`,
              display: model.policyHolderName,
            },
          ]
        : undefined,
      subject: model.subjects.map((subject) => ({
        reference: `Patient/${subject.chfId}`,
        display: subject.display,
      })),
      term: model.terms.map((term) => ({
        offer: { text: term.insurancePlanName ?? model.code },
        topicReference: term.insurancePlanId
          ? {
              reference: `InsurancePlan/${term.insurancePlanId}`,
              display: term.insurancePlanName,
            }
          : undefined,
        asset:
          term.amountDue !== undefined
            ? [
                {
                  valuedItem: [
                    {
                      net: {
                        value: term.amountDue,
                        currency: term.currency ?? "USD",
                      },
                    },
                  ],
                },
              ]
            : undefined,
      })),
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default ContractFhirConverter;
