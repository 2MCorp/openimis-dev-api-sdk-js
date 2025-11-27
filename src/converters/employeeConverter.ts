import { PatientModel, PatientFhirConverter } from './patientConverter';
import { BaseFhirConverter } from './base';
import { Employee, FHIRPatient } from '../types';
import { ValidationError } from '../errors';

/**
 * Employee domain model extending Patient
 */
export class EmployeeModel extends PatientModel implements Employee {
    income: number;
    currency: string;

    constructor(data: Employee) {
        super(data);
        this.income = data.income;
        this.currency = data.currency;
    }

    /**
     * Validate employee data (extends patient validation)
     */
    isValid(): boolean {
        return super.isValid() &&
            typeof this.income === 'number' &&
            this.income >= 0 &&
            !!this.currency?.trim();
    }

    /**
     * Format income with currency
     */
    get formattedIncome(): string {
        return `${this.income.toLocaleString()} ${this.currency}`;
    }

    /**
     * Check if employee has minimum income
     */
    hasMinimumIncome(minimumAmount: number): boolean {
        return this.income >= minimumAmount;
    }
}

/**
 * Enhanced FHIR Patient interface for Employee data
 */
interface EmployeeFHIRPatient extends FHIRPatient {
    extension?: Array<{
        url: string;
        valueDecimal?: number;
        valueString?: string;
    }>;
}

/**
 * Converter for Employee FHIR resources
 */
export class EmployeeFhirConverter extends BaseFhirConverter<EmployeeModel, EmployeeFHIRPatient> {
    private readonly patientConverter = new PatientFhirConverter();

    // FHIR extension URLs for employee-specific data
    private static readonly INCOME_EXTENSION_URL = 'https://openimis.org/fhir/employee-income';
    private static readonly CURRENCY_EXTENSION_URL = 'https://openimis.org/fhir/employee-currency';

    /**
     * Convert from FHIR Patient (with employee extensions) to Employee model
     */
    fromFhir(fhirEmployee: EmployeeFHIRPatient): EmployeeModel {
        try {
            // First convert as regular patient
            const patient = this.patientConverter.fromFhir(fhirEmployee);

            // Extract employee-specific data from extensions
            const incomeExtension = fhirEmployee.extension?.find(
                ext => ext.url === EmployeeFhirConverter.INCOME_EXTENSION_URL
            );
            const currencyExtension = fhirEmployee.extension?.find(
                ext => ext.url === EmployeeFhirConverter.CURRENCY_EXTENSION_URL
            );

            const income = incomeExtension?.valueDecimal || 0;
            const currency = currencyExtension?.valueString || 'USD';

            const employee = new EmployeeModel({
                ...patient,
                income,
                currency
            });

            if (!employee.isValid()) {
                throw new ValidationError('Invalid employee data after FHIR conversion', {
                    fhirEmployee,
                    convertedEmployee: employee
                });
            }

            return employee;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError('Failed to convert FHIR Patient to Employee model', {
                fhirEmployee,
                originalError: error
            });
        }
    }

    /**
     * Convert from Employee model to FHIR Patient (with employee extensions)
     */
    toFhir(employee: EmployeeModel): EmployeeFHIRPatient {
        if (!employee.isValid()) {
            throw new ValidationError('Invalid employee data for FHIR conversion', { employee });
        }

        // Convert base patient data
        const fhirPatient = this.patientConverter.toFhir(employee);

        // Add employee-specific extensions
        return {
            ...fhirPatient,
            extension: [
                ...(fhirPatient.extension || []),
                {
                    url: EmployeeFhirConverter.INCOME_EXTENSION_URL,
                    valueDecimal: employee.income
                },
                {
                    url: EmployeeFhirConverter.CURRENCY_EXTENSION_URL,
                    valueString: employee.currency
                }
            ]
        };
    }

    /**
     * Static factory method for convenience
     */
    static fromFhir(fhirEmployee: EmployeeFHIRPatient): EmployeeModel {
        return new EmployeeFhirConverter().fromFhir(fhirEmployee);
    }

    /**
     * Static factory method for convenience
     */
    static toFhir(employee: EmployeeModel): EmployeeFHIRPatient {
        return new EmployeeFhirConverter().toFhir(employee);
    }
}

// Legacy export for backward compatibility
export default EmployeeFhirConverter;