export class FhirSearchPage<T> {
  constructor(
    public readonly total: number,
    public readonly items: T[],
    public readonly selfUrl?: string,
    public readonly nextUrl?: string,
    public readonly previousUrl?: string
  ) {}

  get hasNext(): boolean {
    return !!this.nextUrl;
  }

  get hasPrevious(): boolean {
    return !!this.previousUrl;
  }
}
