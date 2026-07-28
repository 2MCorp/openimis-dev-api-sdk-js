/// <reference types="fhir" />

import {
  EmployeeInsurancePlanModel,
  InsurancePlanDetailModel,
} from "../models/insurance_plan";
import BaseFhirConverter from "./base";
import {
  assertResourceType,
  getIdentifierValue,
} from "./helpers";

class EmployeeInsurancePlanFhirConverter extends BaseFhirConverter<
  EmployeeInsurancePlanModel,
  fhir4.InsurancePlan
> {
  readonly resourceType = "InsurancePlan";

  fromFhir(resource: fhir4.InsurancePlan): EmployeeInsurancePlanModel {
    assertResourceType(resource, "InsurancePlan");
    const plans = (resource.plan ?? []).map((plan) => {
      const planType = Array.isArray(plan.type) ? plan.type[0] : plan.type;
      return new InsurancePlanDetailModel(
        getIdentifierValue(plan.identifier, { systemIncludes: "CPBDID" }) ??
          getIdentifierValue(plan.identifier, { typeCode: "CPBDID" }),
        getIdentifierValue(plan.identifier, { systemIncludes: "CPID" }) ??
          getIdentifierValue(plan.identifier, { typeCode: "CPID" }),
        getIdentifierValue(plan.identifier, { systemIncludes: "CPCODE" }) ??
          planType?.coding?.[0]?.code,
        planType?.coding?.[0]?.display ?? planType?.text
      );
    });

    return new EmployeeInsurancePlanModel(
      String(resource.id ?? ""),
      resource.name ?? "",
      getIdentifierValue(resource.identifier, { systemIncludes: "PHCPID" }) ??
        String(resource.id ?? ""),
      getIdentifierValue(resource.identifier, { systemIncludes: "CPBUUID" }),
      getIdentifierValue(resource.identifier, { systemIncludes: "CPBID" }),
      getIdentifierValue(resource.identifier, { systemIncludes: "CPBCODE" }),
      plans
    );
  }

  toFhir(model: EmployeeInsurancePlanModel): fhir4.InsurancePlan {
    return {
      resourceType: "InsurancePlan",
      id: model.id,
      name: model.name,
      identifier: [
        {
          system: "http://example.com/fhir/PHCPID",
          value: model.policyHolderContributionPlanId ?? model.id,
        },
        ...(model.contributionPlanBundleUuid
          ? [
              {
                system: "http://example.com/fhir/CPBUUID",
                value: model.contributionPlanBundleUuid,
              },
            ]
          : []),
        ...(model.contributionPlanBundleId
          ? [
              {
                system: "http://example.com/fhir/CPBID",
                value: model.contributionPlanBundleId,
              },
            ]
          : []),
        ...(model.contributionPlanBundleCode
          ? [
              {
                system: "http://example.com/fhir/CPBCODE",
                value: model.contributionPlanBundleCode,
              },
            ]
          : []),
      ],
      plan: model.plans.map((plan) => ({
        identifier: [
          ...(plan.detailId
            ? [{ system: "http://example.com/fhir/CPBDID", value: plan.detailId }]
            : []),
          ...(plan.contributionPlanId
            ? [
                {
                  system: "http://example.com/fhir/CPID",
                  value: plan.contributionPlanId,
                },
              ]
            : []),
          ...(plan.code
            ? [{ system: "http://example.com/fhir/CPCODE", value: plan.code }]
            : []),
        ],
        type:
          plan.code || plan.name
            ? { coding: [{ code: plan.code, display: plan.name }] }
            : undefined,
      })),
    };
  }
}

export default EmployeeInsurancePlanFhirConverter;
