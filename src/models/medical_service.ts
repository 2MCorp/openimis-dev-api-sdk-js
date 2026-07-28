export class MedicalServiceModel {
  constructor(
    public id: string,
    public code: string,
    public name: string,
    public uuid?: string,
    public status?: string,
    public validFrom?: string,
    public unitPrice?: number,
    public currency?: string,
    public frequencyDays?: number,
    public serviceType?: "P" | "C" | string,
    public level?: "S" | "V" | "D" | "H" | string,
    public category?: "S" | "C" | "D" | "A" | "O" | string,
    public careType?: "O" | "I" | "B" | string,
    public genders: ("male" | "female" | string)[] = [],
    public ages: ("adult" | "child" | string)[] = []
  ) {}
}
