import { PatientModel, PatientFhirConverter } from "./patientConverter";
import { BaseFhirConverter } from "./base";
import { Employee, FHIRPatient } from "../types";
import { ValidationError } from "../errors";

export class EmployeeModel extends PatientModel implements Employee {
  income: number;
  currency: string;

  constructor(data: Employee) {
    super(data);
    this.income = data.income;
    this.currency = data.currency;
  }

  isValid(): boolean {
    return (
      super.isValid() &&
      typeof this.income === "number" &&
      this.income >= 0 &&
      !!this.currency?.trim()
    );
  }

  get formattedIncome(): string {
    return `${this.income.toLocaleString()} ${this.currency}`;
  }

  hasMinimumIncome(minimumAmount: number): boolean {
    return this.income >= minimumAmount;
  }
}

interface EmployeeFHIRPatient extends FHIRPatient {
  extension?: Array<{
    url: string;
    valueDecimal?: number;
    valueString?: string;
  }>;
}

export class EmployeeFhirConverter extends BaseFhirConverter<
  EmployeeModel,
  EmployeeFHIRPatient
> {
  private readonly patientConverter = new PatientFhirConverter();

  private static readonly INCOME_EXTENSION_URL =
    "https://openimis.org/fhir/employee-income";
  private static readonly CURRENCY_EXTENSION_URL =
    "https://openimis.org/fhir/employee-currency";
  fromFhir(fhirEmployee: EmployeeFHIRPatient): EmployeeModel {
    try {
      const patient = this.patientConverter.fromFhir(fhirEmployee);

      const incomeExtension = fhirEmployee.extension?.find(
        (ext) => ext.url === EmployeeFhirConverter.INCOME_EXTENSION_URL,
      );
      const currencyExtension = fhirEmployee.extension?.find(
        (ext) => ext.url === EmployeeFhirConverter.CURRENCY_EXTENSION_URL,
      );

      const income = incomeExtension?.valueDecimal || 0;
      const currency = currencyExtension?.valueString || "USD";

      const employee = new EmployeeModel({
        ...patient,
        income,
        currency,
      });

      if (!employee.isValid()) {
        throw new ValidationError(
          "Invalid employee data after FHIR conversion",
          {
            fhirEmployee,
            convertedEmployee: employee,
          },
        );
      }

      return employee;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        "Failed to convert FHIR Patient to Employee model",
        {
          fhirEmployee,
          originalError: error,
        },
      );
    }
  }

  toFhir(employee: EmployeeModel): EmployeeFHIRPatient {
    if (!employee.isValid()) {
      throw new ValidationError("Invalid employee data for FHIR conversion", {
        employee,
      });
    }

    const fhirPatient = this.patientConverter.toFhir(employee);

    return {
      ...fhirPatient,
      extension: [
        ...(fhirPatient.extension || []),
        {
          url: EmployeeFhirConverter.INCOME_EXTENSION_URL,
          valueDecimal: employee.income,
        },
        {
          url: EmployeeFhirConverter.CURRENCY_EXTENSION_URL,
          valueString: employee.currency,
        },
      ],
    };
  }

  static fromFhir(fhirEmployee: EmployeeFHIRPatient): EmployeeModel {
    return new EmployeeFhirConverter().fromFhir(fhirEmployee);
  }

  static toFhir(employee: EmployeeModel): EmployeeFHIRPatient {
    return new EmployeeFhirConverter().toFhir(employee);
  }
}

export default EmployeeFhirConverter;
