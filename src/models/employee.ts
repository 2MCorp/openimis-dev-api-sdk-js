export class EmployeeModel {
  constructor(
    public id: string,
    public lastName: string,
    public otherNames: string,
    public chfId: string,
    public employeeId?: string,
    public employeeUuid?: string,
    public insureeUuid?: string,
    public birthDate?: string,
    public maritalStatus?: string,
    public income?: number,
    public contributionPlanBundleDisplay?: string,
    public contributionPlanBundleId?: string,
    public contributionPlanBundleUuid?: string
  ) {}

  get fullName(): string {
    return `${this.otherNames} ${this.lastName}`.trim();
  }
}
