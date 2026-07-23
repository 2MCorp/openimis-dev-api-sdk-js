import AuthAPIClient from "./auth";


class OpenIMISDevApiSdk {
    public readonly auth: AuthAPIClient;


    constructor() {
        this.auth = new AuthAPIClient();
    }


}

export default OpenIMISDevApiSdk;