/// <reference types="fhir" />

import BinaryFhirConverter from "./binary";
import ClaimFhirConverter from "./claims";
import ContractFhirConverter from "./contract";
import CoverageFhirConverter from "./coverage";
import DiagnosisFhirConverter from "./diagnosis";
import EmployeeFhirConverter from "./employee";
import {
  EmployeeGroupFhirConverter,
  FamilyGroupFhirConverter,
} from "./group";
import HealthFacilityFhirConverter from "./health_facility";
import EmployeeInsurancePlanFhirConverter from "./insurance_plan";
import LocationFhirConverter from "./location";
import MedicalServiceFhirConverter from "./medical_service";
import MedicationFhirConverter from "./medication";
import PatientFhirConverter from "./patient";
import {
  PaymentNoticeFhirConverter,
  PaymentReconciliationFhirConverter,
} from "./payment";
import PreauthorizationFhirConverter from "./preauthorization";
import StaffFhirConverter from "./staff";
import HfStaffFhirConverter from "./hf_staff";
import { resourcesFromBundle } from "./helpers";
import {
  EMPLOYEE_UUID_SYSTEM,
  INSUREE_NUMBER_SYSTEM,
} from "./constants";
import type { PatientModel } from "../models/patient";
import type { ClaimModel } from "../models/claim";
import type { EmployeeModel } from "../models/employee";

/**
 * Facade over OpenIMIS developer_api_fhir converters.
 * Converts FHIR JSON ↔ UI-friendly model classes.
 */
class FhirConverter {
  public readonly patient = new PatientFhirConverter();
  public readonly claim = new ClaimFhirConverter();
  public readonly employee = new EmployeeFhirConverter();
  public readonly healthFacility = new HealthFacilityFhirConverter();
  public readonly location = new LocationFhirConverter();
  public readonly medication = new MedicationFhirConverter();
  public readonly medicalService = new MedicalServiceFhirConverter();
  public readonly diagnosis = new DiagnosisFhirConverter();
  public readonly preauthorization = new PreauthorizationFhirConverter();
  public readonly contract = new ContractFhirConverter();
  public readonly familyGroup = new FamilyGroupFhirConverter();
  public readonly employeeGroup = new EmployeeGroupFhirConverter();
  public readonly employeeInsurancePlan =
    new EmployeeInsurancePlanFhirConverter();
  public readonly paymentNotice = new PaymentNoticeFhirConverter();
  public readonly paymentReconciliation =
    new PaymentReconciliationFhirConverter();
  public readonly coverage = new CoverageFhirConverter();
  /** Policy-holder staff (OrganizationAffiliation). */
  public readonly staff = new StaffFhirConverter();
  /** Health-facility portal staff (PractitionerRole). */
  public readonly hfStaff = new HfStaffFhirConverter();
  public readonly binary = new BinaryFhirConverter();

  fromUnknownResource(
    resource: fhir4.FhirResource
  ): PatientModel | ClaimModel | EmployeeModel | unknown {
    switch (resource.resourceType) {
      case "Patient":
        if (isEmployeePatient(resource as fhir4.Patient)) {
          return this.employee.fromFhir(resource as fhir4.Patient);
        }
        return this.patient.fromFhir(resource as fhir4.Patient);
      case "Claim": {
        const claim = resource as fhir4.Claim;
        if (claim.use === "preauthorization") {
          return this.preauthorization.fromFhir(claim);
        }
        return this.claim.fromFhir(claim);
      }
      case "Location":
        return this.healthFacility.fromFhir(resource as fhir4.Location);
      case "Medication":
        return this.medication.fromFhir(resource as fhir4.Medication);
      case "ActivityDefinition":
        return this.medicalService.fromFhir(
          resource as fhir4.ActivityDefinition
        );
      case "Contract":
        return this.contract.fromFhir(resource as fhir4.Contract);
      case "Group":
        return this.familyGroup.fromFhir(resource as fhir4.Group);
      case "InsurancePlan":
        return this.employeeInsurancePlan.fromFhir(
          resource as fhir4.InsurancePlan
        );
      case "PaymentNotice":
        return this.paymentNotice.fromFhir(resource as fhir4.PaymentNotice);
      case "PaymentReconciliation":
        return this.paymentReconciliation.fromFhir(
          resource as fhir4.PaymentReconciliation
        );
      case "Coverage":
        return this.coverage.fromFhir(resource as fhir4.Coverage);
      case "OrganizationAffiliation":
        return this.staff.fromFhir(resource as fhir4.OrganizationAffiliation);
      case "PractitionerRole":
        return this.hfStaff.fromFhir(resource as fhir4.PractitionerRole);
      case "Binary":
        return this.binary.fromFhir(resource as fhir4.Binary);
      case "CodeSystem":
        return this.diagnosis.fromFhir(resource as fhir4.CodeSystem);
      default:
        throw new Error(
          `Unsupported FHIR resourceType "${resource.resourceType}"`
        );
    }
  }

  patientsFromBundle(bundle: fhir4.Bundle): PatientModel[] {
    return this.patient.fromBundle(bundle);
  }

  claimsFromBundle(bundle: fhir4.Bundle): ClaimModel[] {
    return this.claim.fromBundle(bundle);
  }

  employeesFromBundle(bundle: fhir4.Bundle): EmployeeModel[] {
    return this.employee.fromBundle(bundle);
  }

  bundleResources(bundle: fhir4.Bundle): fhir4.FhirResource[] {
    return resourcesFromBundle(bundle);
  }
}

function isEmployeePatient(patient: fhir4.Patient): boolean {
  return (
    patient.identifier?.some(
      (identifier) =>
        identifier.system === EMPLOYEE_UUID_SYSTEM ||
        identifier.system === INSUREE_NUMBER_SYSTEM ||
        identifier.type?.coding?.some(
          (coding) => coding.code === "EMP" || coding.code === "INSNUM"
        )
    ) ?? false
  );
}

export default FhirConverter;
export { PatientFhirConverter, ClaimFhirConverter, EmployeeFhirConverter };
export { HealthFacilityFhirConverter };
export { LocationFhirConverter };
export { MedicationFhirConverter };
export { MedicalServiceFhirConverter };
export { DiagnosisFhirConverter };
export { PreauthorizationFhirConverter };
export { ContractFhirConverter };
export { FamilyGroupFhirConverter, EmployeeGroupFhirConverter };
export { EmployeeInsurancePlanFhirConverter };
export { PaymentNoticeFhirConverter, PaymentReconciliationFhirConverter };
export { CoverageFhirConverter };
export { StaffFhirConverter };
export { HfStaffFhirConverter };
export { BinaryFhirConverter };
export { default as BaseFhirConverter } from "./base";
export * from "./constants";
export * from "./helpers";
