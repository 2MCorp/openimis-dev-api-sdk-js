

export class GroupModel {

    uuid: String;
    name: String;

    constructor(data: GroupModel) {
        this.uuid = data.uuid || '';
        this.name = data.name || '';
    }
}