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
        identifierByType(plan.identifier, "CPBDID"),
        identifierByType(plan.identifier, "CPID"),
        identifierByType(plan.identifier, "CPCODE") ?? planType?.coding?.[0]?.code,
        planType?.coding?.[0]?.display ?? planType?.text
      );
    });

    return new EmployeeInsurancePlanModel(
      String(resource.id ?? ""),
      resource.name ?? "",
      identifierByType(resource.identifier, "PHCPID") ?? String(resource.id ?? ""),
      identifierByType(resource.identifier, "CPBUUID"),
      identifierByType(resource.identifier, "CPBID"),
      identifierByType(resource.identifier, "CPBCODE"),
      plans
    );
  }

  /** Same shape as the backend `EmployeeInsurancePlanConverter` (read-only resource). */
  toFhir(model: EmployeeInsurancePlanModel): fhir4.InsurancePlan {
    const typed = (system: string, value: string | undefined, code: string) =>
      value ? [{ system, value, type: { coding: [{ system: IDENTIFIER_TYPE_SYSTEM, code }] } }] : [];
    return {
      resourceType: "InsurancePlan",
      id: model.id,
      name: model.name,
      identifier: [
        ...typed(`${EXAMPLE}/identifier`, model.policyHolderContributionPlanId ?? model.id, "PHCPID"),
        ...typed(`${EXAMPLE}/contributionplanbundle-identifier`, model.contributionPlanBundleUuid, "CPBUUID"),
        ...typed(`${EXAMPLE}/contributionplanbundle-identifier`, model.contributionPlanBundleId, "CPBID"),
        ...typed(`${EXAMPLE}/contributionplanbundle-code`, model.contributionPlanBundleCode, "CPBCODE"),
      ],
      plan: model.plans.map((plan) => ({
        identifier: [
          ...typed(`${EXAMPLE}/identifier`, plan.detailId, "CPBDID"),
          ...typed(`${EXAMPLE}/contributionplan-identifier`, plan.contributionPlanId, "CPID"),
          ...typed(`${EXAMPLE}/contributionplan-code`, plan.code, "CPCODE"),
        ],
        type: {
          coding: [{ system: `${EXAMPLE}/contributionplan-code`, code: plan.code, display: plan.name }],
        },
      })),
    };
  }
}

const EXAMPLE = "http://example.com/fhir";
const IDENTIFIER_TYPE_SYSTEM = `${EXAMPLE}/identifier-type`;

/**
 * The backend tags each identifier with a type code (PHCPID, CPBUUID, CPBID, CPBCODE,
 * CPBDID, CPID, CPCODE) under shared systems — match on the type code, falling back
 * to a system containing the code for older emitters.
 */
function identifierByType(
  identifiers: fhir4.Identifier[] | undefined,
  code: string
): string | undefined {
  return (
    getIdentifierValue(identifiers, { typeCode: code }) ??
    getIdentifierValue(identifiers, { systemIncludes: code })
  );
}

export default EmployeeInsurancePlanFhirConverter;
