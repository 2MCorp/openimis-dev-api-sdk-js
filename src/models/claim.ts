
export class PatientReferenceModel {
    chfid: string;

    constructor(data: PatientReferenceModel) {
        this.chfid = data.chfid;
    }
}

export class ClaimDocumentModel {
    id: string;
    createdAt: string;

    constructor(data: ClaimDocumentModel) {
        this.id = data.id;
        this.createdAt = data.createdAt;
    }
}

export class ClaimDiagnosisModel {
    id: string;
    code: string;
    name: string;

    constructor(data: ClaimDiagnosisModel) {
        this.code = data.code;
        this.name = data.name;
        this.id = data.id;
    }
}

export class ClaimItemModel {
    code: string;
    name: string;
    price: string;
    currency: string;
    quantity: number;

    constructor(data: ClaimItemModel) {
        this.code = data.code;
        this.price = data.price;
        this.currency = data.currency;
        this.quantity = data.quantity;
        this.name = data.name;
    }
}

export class ClaimModel {
    id: string;
    code: string;
    status: string;
    type: string;
    patient: PatientReferenceModel;
    createdAt: string;
    endedAt?: string;
    priority?: string;
    diagnosis: ClaimDiagnosisModel[];
    documents: ClaimDocumentModel[];
    items: ClaimItemModel[];
    total: {
        currency: string;
        amount: string;
    }

    constructor(data: ClaimModel) {
        this.id = data.id;
        this.code = data.code;
        this.status = data.status;
        this.type = data.type;
        this.patient = new PatientReferenceModel(data.patient);
        this.createdAt = data.createdAt;
        this.endedAt = data.endedAt;
        this.priority = data.priority;
        this.diagnosis = data.diagnosis.map(diag => new ClaimDiagnosisModel(diag));
        this.documents = data.documents.map(doc => new ClaimDocumentModel(doc));
        this.items = data.items.map(item => new ClaimItemModel(item));
        this.total = data.total;
    }
}