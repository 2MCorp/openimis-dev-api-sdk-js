export class MedicationItemModel {
  constructor(
    public id: string,
    public code: string,
    public name: string,
    public uuid?: string,
    public packageName?: string,
    public status?: string,
    public unitPrice?: number,
    public currency?: string,
    public itemType?: "D" | "M" | string,
    public frequencyDays?: number,
    public genders: ("male" | "female" | string)[] = [],
    public ages: ("adult" | "child" | string)[] = [],
    public careType?: "O" | "I" | "B" | string,
    public level?: string
  ) {}
}
