export class GeoLocationModel {
  constructor(
    public id: string,
    public code: string,
    public name: string,
    public type?: "R" | "D" | "W" | "V" | string,
    public uuid?: string,
    public parentId?: string,
    public status?: "active" | "inactive" | string
  ) {}
}
