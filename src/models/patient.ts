import { GroupModel } from "./group";

export class PatientModel {
    lastName: string;
    firstName: string;
    chfId?: string;
    uuid: string;
    isHead?: boolean = false;
    hasCardIssued?: boolean = false;
    family?: GroupModel;
    contained?: any;

    constructor(data: PatientModel) {
        this.lastName = data.lastName || '';
        this.firstName = data.firstName || '';
        this.chfId = data.chfId;
        this.uuid = data.uuid;
        this.isHead = data.isHead || false;
        this.hasCardIssued = data.hasCardIssued || false;
        this.family = data.family;
        this.contained = data.contained;
    }
}