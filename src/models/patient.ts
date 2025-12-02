import { GroupModel } from "./group";

export class PatientModel {
    lastName: string;
    firstName: string;
    chfId?: string;
    uuid: string;
    isHead?: boolean = false;
    hasCardIssues?: boolean = false;
    family?: GroupModel;

    constructor(data: PatientModel) {
        this.lastName = data.lastName || '';
        this.firstName = data.firstName || '';
        this.chfId = data.chfId;
        this.uuid = data.uuid;
        this.isHead = data.isHead || false;
        this.hasCardIssues = data.hasCardIssues || false;
        this.family = data.family;
    }
}