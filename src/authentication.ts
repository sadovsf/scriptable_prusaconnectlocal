import { MD5 } from 'crypto-es/lib/md5.js';


function hashString(vStr: string) {
    return MD5(vStr).toString();
}


export default class DigestAuth {
    private _ip: string;

    // Data:
    private _realm: string|undefined;
    private _nonce: string|undefined;
    private _username :string;
    private _password :string;


    constructor(ip :string, username :string, password :string) {
        this._ip = ip;
        this._username = username;
        this._password = password;
    }

    get ip() {
        return this._ip;
    }

    _authenticate(vReq :Request) {
        if (vReq.response.statusCode !== 401) {
            return;
        }

        this._log("Authentication challange data gathering");
        const vAuthHeader = vReq.response.headers["Www-Authenticate"];
        if (! vAuthHeader) {
            throw new Error("No authentication header found");
        }
        const vAuthParts = vAuthHeader.split(",") as Array<string>;
        const vRealm = vAuthParts.find(v => v.includes("realm"));
        if (! vRealm) {
            throw new Error("No realm found");
        }
        const vRealmData = vRealm.split("=");
        if (vRealmData.length < 2) {
            throw new Error("Invalid realm data");
        }
        this._realm = vRealmData[1]!.replace(/"/g, "");

        const vNonce = vAuthParts.find(v => v.includes("nonce"));
        if (! vNonce) {
            throw new Error("No nonce found");
        }
        const vNonceData = vNonce.split("=");
        if (vNonceData.length < 2) {
            throw new Error("Invalid nonce data");
        }
        this._nonce = vNonceData[1]!.replace(/"/g, "");
        // this._log(`Realm: "${this._realm}"`, `Nonce: "${this._nonce}"`, `Username: "${this._username}"`, `Password: "${this._password}"`);
    }

    addAuthorizationHeader(vReq: Request) {
        const vUrl = vReq.url.substring(`http://${this._ip}`.length);

        const A1 = `${this._username}:${this._realm}:${this._password}`;
        const HA1 = hashString(A1);

        const A2 = `${vReq.method}:${vUrl}`;
        const HA2 = hashString(A2);

        const vResponse = hashString(`${HA1}:${this._nonce}:${HA2}`);

        // this._log(`A1: ${A1}`, `A2: ${A2}`);

        const vFullHeader = `Digest username="${this._username}", realm="${this._realm}", nonce="${this._nonce}", uri="${vUrl}", response="${vResponse}"`;
        this._log(`Authorization: ${vFullHeader}`);
        vReq.headers = {
            Authorization: vFullHeader
        };
    }

    private _getInt(url :string, retries :number) :Promise<{request :Request, data :Data}> {
        this._log("Request attempt");

        const vReq = new Request(`http://${this._ip}${url}`);
        if (this._realm && this._nonce) {
            this.addAuthorizationHeader(vReq);
        }
        return vReq.load().then(data => {
            if (vReq.response.statusCode === 401) {
                if (retries > 0) {
                    return Promise.reject("Too many retries");
                }
                this._log("Request rejected on 401");
                this._authenticate(vReq);
                return this._getInt(url, retries + 1);
            }

            return {
                request: vReq,
                data: data
            };
        });
    }

    get(url :string) {
        this._log(`GET: ${this._ip}${url}`);
        return this._getInt(url, 0);
    }

    private _log(...args :Array<string>) {
        for (const f of args) {
            console.log(f);
        }
    }
}