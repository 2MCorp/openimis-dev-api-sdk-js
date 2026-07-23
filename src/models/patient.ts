

export class PatientModel {

    public id: string;
    public lastName: string;
    public otherNames: string;
    public chfId: string;


    constructor(id: string, lastName: string, otherNames: string, chfId: string) {
        this.id = id;
        this.lastName = lastName;
        this.otherNames = otherNames;
        this.chfId = chfId;
    }
}