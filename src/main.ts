import PrinterWidget from "widget";
import PrusaAPI from "./api";

/// DEBUG ///
const G_DEFAULT_API_IP = "";
const G_DEFAULT_USERNAME = "";
const G_DEFAULT_PASS = "";
/// DEBUG ///

(async function() {
    const vParamsStr :string = args.widgetParameter?.toString() || "";
    const vParams = vParamsStr.split(",");

    let vIp = G_DEFAULT_API_IP;
    let vUsername = G_DEFAULT_USERNAME;
    let vPassword = G_DEFAULT_PASS;
    if (vParams.length >= 3) {
        vIp = vParams[0]!.trim();
        vUsername = vParams[1]!.trim();
        vPassword = vParams.slice(2).join(",").trim();
    }

    const api = new PrusaAPI(vIp, vUsername, vPassword);
    let vFetchedData = null;
    if (vParams.length >= 3) {
        vFetchedData = await api.fetch();
    }

    const printerWidget = new PrinterWidget(api, vFetchedData);
    console.log("===== Widget READY =====");

    Script.setWidget(printerWidget.widget);
    Script.complete();
})().catch(e => {
    console.error(e);
});