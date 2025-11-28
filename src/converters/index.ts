export { BaseFhirConverter, type FHIRConverter } from "./base";

export { AddressModel, AddressFhirConverter } from "./address";

export { PatientModel, PatientFhirConverter } from "./patientConverter";

export { EmployeeModel, EmployeeFhirConverter } from "./employeeConverter";

export { BaseFhirConverter as BaseFhirClientConverter } from "./base";
export { default as AddressFhirClientConverter } from "./address";
export { default as PatientFhirClientConverter } from "./patientConverter";
export { default as EmployeeFhirClientConverter } from "./employeeConverter";
