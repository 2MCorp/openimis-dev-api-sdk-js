/// <reference types="fhir" />

import { EmployeeModel } from "../models/employee";
import BaseFhirConverter from "./base";
import {
  CONTRIBUTION_PLAN_BUNDLE_SYSTEM,
  EMPLOYEE_CPB_EXTENSION,
  EMPLOYEE_IDENTIFIER_TYPE_SYSTEM,
  EMPLOYEE_INCOME_EXTENSION,
  EMPLOYEE_MR_SYSTEM,
  EMPLOYEE_PHCP_EXTENSION_SUFFIX,
  EMPLOYEE_UUID_SYSTEM,
  INSUREE_NUMBER_SYSTEM,
  INSUREE_UUID_SYSTEM,
} from "./constants";
import {
  assertResourceType,
  buildPersonName,
  getExtensionDecimal,
  getExtensionString,
  getIdentifierValue,
  getUsualOrOfficialName,
  isUuid,
} from "./helpers";

class EmployeeFhirConverter extends BaseFhirConverter<
  EmployeeModel,
  fhir4.Patient
> {
  readonly resourceType = "Patient";

  fromFhir(resource: fhir4.Patient): EmployeeModel {
    assertResourceType(resource, "Patient");
    const { family, given } = getUsualOrOfficialName(resource);
    const identifiers = resource.identifier;

    return new EmployeeModel(
      resource.id ?? "",
      family ?? "",
      given ?? "",
      getIdentifierValue(identifiers, { system: INSUREE_NUMBER_SYSTEM }) ??
        getIdentifierValue(identifiers, { typeCode: "INSNUM" }) ??
        "",
      getIdentifierValue(identifiers, { system: EMPLOYEE_MR_SYSTEM }) ??
        getIdentifierValue(identifiers, { typeCode: "MR" }),
      getIdentifierValue(identifiers, { system: EMPLOYEE_UUID_SYSTEM }) ??
        getIdentifierValue(identifiers, { typeCode: "EMP" }),
      getIdentifierValue(identifiers, { system: INSUREE_UUID_SYSTEM }) ??
        getIdentifierValue(identifiers, { typeCode: "INS" }),
      resource.birthDate,
      resource.maritalStatus?.coding?.[0]?.code,
      getExtensionDecimal(resource.extension, "employee-income"),
      getExtensionString(resource.extension, "contributionPlanBundleId"),
      getExtensionString(resource.extension, EMPLOYEE_PHCP_EXTENSION_SUFFIX),
      getIdentifierValue(identifiers, {
        system: CONTRIBUTION_PLAN_BUNDLE_SYSTEM,
      }) ?? getIdentifierValue(identifiers, { typeCode: "CPB" })
    );
  }

  /**
   * Builds the inbound-friendly Patient shape expected by EmployeeConverter.to_imis_obj:
   * first identifier resolves Insuree; income uses valueDecimal; PHCP uses valueString.
   */
  toFhir(model: EmployeeModel): fhir4.Patient {
    const identifiers: fhir4.Identifier[] = [];

    const insureeKey = model.insureeUuid ?? model.chfId;
    if (insureeKey) {
      identifiers.push({
        system: isUuid(insureeKey)
          ? INSUREE_UUID_SYSTEM
          : INSUREE_NUMBER_SYSTEM,
        value: insureeKey,
        type: {
          coding: [
            {
              system: EMPLOYEE_IDENTIFIER_TYPE_SYSTEM,
              code: isUuid(insureeKey) ? "INS" : "INSNUM",
            },
          ],
        },
      });
    }

    if (model.employeeId) {
      identifiers.push({
        system: EMPLOYEE_MR_SYSTEM,
        value: model.employeeId,
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR",
              display: "Employee ID",
            },
          ],
        },
      });
    }
    if (model.employeeUuid) {
      identifiers.push({
        system: EMPLOYEE_UUID_SYSTEM,
        value: model.employeeUuid,
        type: {
          coding: [
            {
              system: EMPLOYEE_IDENTIFIER_TYPE_SYSTEM,
              code: "EMP",
              display: "Employee UUID",
            },
          ],
        },
      });
    }
    if (model.contributionPlanBundleUuid) {
      identifiers.push({
        system: CONTRIBUTION_PLAN_BUNDLE_SYSTEM,
        value: model.contributionPlanBundleUuid,
        type: {
          coding: [
            {
              system: EMPLOYEE_IDENTIFIER_TYPE_SYSTEM,
              code: "CPB",
            },
          ],
        },
      });
    }

    const extensions: fhir4.Extension[] = [];
    if (model.income !== undefined) {
      extensions.push({
        url: EMPLOYEE_INCOME_EXTENSION,
        valueDecimal: model.income,
      });
    }
    if (model.contributionPlanBundleId) {
      extensions.push({
        url: `http://example.com/fhir/StructureDefinition/${EMPLOYEE_PHCP_EXTENSION_SUFFIX}`,
        valueString: model.contributionPlanBundleId,
      });
    }
    if (model.contributionPlanBundleDisplay) {
      extensions.push({
        url: EMPLOYEE_CPB_EXTENSION,
        valueCoding: {
          system: "http://example.com/fhir/contributionPlanBundle",
          code: "Policy Holder Contribution Plan Bundle",
          display: model.contributionPlanBundleDisplay,
        },
      });
    }

    return {
      resourceType: "Patient",
      id: model.id || model.employeeUuid || model.chfId,
      identifier: identifiers.length ? identifiers : undefined,
      name: [buildPersonName(model.lastName, model.otherNames, "official")],
      birthDate: model.birthDate,
      maritalStatus: model.maritalStatus
        ? {
            coding: [
              {
                system: "http://hl7.org/fhir/v3/MaritalStatus",
                code: model.maritalStatus,
              },
            ],
          }
        : undefined,
      extension: extensions.length ? extensions : undefined,
    };
  }
}

export default EmployeeFhirConverter;
