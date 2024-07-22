import { paths as PrusaLink, components as PrusaLinkComponents } from "PrusaLinkAPI";
import DigestAuth from "authentication";


type GetRequests = {
    [K in keyof PrusaLink]: PrusaLink[K]["get"] extends { responses: {"200": {content: { "application/json": {} }}}} ? K : never;
};

// @ts-ignore
type GetReqDataType<T extends keyof GetRequests> = PrusaLink[T]["get"]["responses"]["200"]["content"]["application/json"];

export enum EApiState {
    INVALIDIP,
    NOTAVAILABLE,
    NORMAL
};


export default class PrusaAPI {
    protected _req :DigestAuth;
    protected _status :EApiState = EApiState.INVALIDIP;

    constructor(printerIp :string, username :string, password :string) {
        this._req = new DigestAuth(printerIp, username, password);
    }

    get ip() {
        return this._req.ip;
    }

    get APIStatus() {
        return this._status;
    }

    ping() {
        return this._req.get("").then(() => {
            return true;
        }).catch(() => {
            return false;
        });
    }

    async fetch() :Promise<{
        statusData: GetReqDataType<"/api/v1/status">,
        printerData: GetReqDataType<"/api/v1/info">,
        jobData?: PrusaLinkComponents["schemas"]["JobFilePrint"]
    }|null> {
        if (await this.ping()) {
            this._status = EApiState.NORMAL;
        } else {
            this._status = EApiState.NOTAVAILABLE;
            return Promise.resolve(null);
        }

        const statusData = await this.status();
        const printerData = await this.printerInfo();

        if (statusData.job?.id) {
            const jobData = await this.currentJob();
            return {
                statusData,
                printerData,
                jobData,
            };
        }
        return {
            statusData,
            printerData,
        };
    }

    private _makeRequest(endpoint :string) :any {
        return this._req.get(endpoint).then(info => {
             try {
                return JSON.parse(info.data.toRawString());
             } catch (e) {
                console.error(e);
                console.log(info.data.toRawString());
                this._status = EApiState.NOTAVAILABLE;
                return Promise.reject(e);
             }
        });
    }

    printerInfo() :Promise<GetReqDataType<"/api/v1/info">> {
        return this._makeRequest("/api/v1/info");
    }

    status() :Promise<GetReqDataType<"/api/v1/status">> {
        return this._makeRequest("/api/v1/status");
    }

    currentJob() :Promise<PrusaLinkComponents["schemas"]["JobFilePrint"]> {
        return this._makeRequest(`/api/v1/job`);
    }
}