import { BaseFhirClientConverter } from ".";


export class EmployeeFhirConverter extends BaseFhirClientConverter {
    fromFhir(fhirEmployee: any): any {
        return JSON.stringify(fhirEmployee);
    }

    toFhir(employee: any): any {
        return JSON.stringify(employee);
    }
}