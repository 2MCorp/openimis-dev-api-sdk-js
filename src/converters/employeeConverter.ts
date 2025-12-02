import { BaseFhirClientConverter } from ".";


export class EmployeeFhirConverter extends BaseFhirClientConverter {
    fromFhir(fhirEmployee: any): any {
        console.log(fhirEmployee);
        return ""
    }

    toFhir(employee: any): any {
        console.log(employee);
        return ""
    }
}