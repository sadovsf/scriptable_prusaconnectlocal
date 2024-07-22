import PrusaAPI, { EApiState } from "api";


type PromiseType<T> = T extends Promise<infer U> ? U : T;

function secondsToTime(seconds :number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
    }
    return `${minutes}min`;
}

function generatedProgressPie(progressInPercentage :number, width :number){
	const OFFSET = 15;
	const STROKE_STRENGTH = 15;

	let drawingCanvas = new DrawContext();

	// transparency for Darkmode
	drawingCanvas.opaque = false;

	drawingCanvas.size = new Size(width, width);

	drawingCanvas.setLineWidth(STROKE_STRENGTH);
	drawingCanvas.setStrokeColor(PrinterWidget.STYLING.COLORS.IMAGE);
	drawingCanvas.setFillColor(PrinterWidget.STYLING.COLORS.IMAGE);

	let rectangleOutline = new Rect(0 + OFFSET, 0 + OFFSET, drawingCanvas.size.width - OFFSET*2, drawingCanvas.size.height - OFFSET*2);
	drawingCanvas.strokeEllipse(rectangleOutline);

	let partialCirclePathPoints = generatePointsOnCircleForAngle(
        Math.floor(drawingCanvas.size.width / 2),
        Math.floor(drawingCanvas.size.height / 2),
        Math.floor(rectangleOutline.size.width / 2),
        Math.round(360 / 100 * progressInPercentage)
    );

	let partialCirclePath = new Path();
	partialCirclePath.addLines(partialCirclePathPoints);
	drawingCanvas.addPath(partialCirclePath);
	drawingCanvas.fillPath();

	return drawingCanvas.getImage();
}

function generatePointsOnCircleForAngle(midX :number, midY :number, radius :number, angle :number){
    let pathPoints = [];
    pathPoints.push(new Point(midX, midY));

    for(let i = angle + 180; i >= 0 + 180; i--){
        let circlePointY = Math.round(midY + radius * Math.cos(calculateRadianForAngle(-i)));
      let circlePointX = Math.round(midX + radius * Math.sin(calculateRadianForAngle(-i)));
      pathPoints.push(new Point(circlePointX, circlePointY));
      }

    pathPoints.push(new Point(midX, midY));
    return pathPoints;
  }

  function calculateRadianForAngle(angle :number){
      return Math.PI * 2 * angle / 360;
  }



type APIFetchType = PromiseType<ReturnType<PrusaAPI["fetch"]>>;

export default class PrinterWidget {
    // Constants
    static STYLING = {
        FONTS: {
            HEADER: Font.heavyRoundedSystemFont(19),
            FOOTER: Font.regularRoundedSystemFont(13),

            CONTENT_TITLE_BOLD: Font.heavyRoundedSystemFont(17),
            CONTENT: Font.regularRoundedSystemFont(13),
            CONTENT_BOLD: Font.heavyRoundedSystemFont(13),
            CONTENT_HINT: Font.regularRoundedSystemFont(10),
        },

        COLORS: {
            PRUSA_ORANGE: new Color("#f58a42"),
            HINT_GREY: new Color("#999999"),
            IMAGE: Device.isUsingDarkAppearance() ? new Color("#03d3fc") : new Color("#0000ff"),
        },

        DYNAMIC_SPACER_SIZE: undefined,
    };

    static REFRESHRATE_IN_MINUTES = {
        PRINTING: 1,
        IDLE: 10,
        OFFLINE: 20,
    };

    // Members
    widget  :ListWidget;
    printer :PrusaAPI;

    stack :{
        header: WidgetStack,
        content: WidgetStack,
        footer: WidgetStack,
    };

    constructor(printer :PrusaAPI, rawData :APIFetchType) {
        this.printer = printer;
        this.widget = new ListWidget();
        this.widget.url = printer.ip;

        const header = this.widget.addStack();
        this.widget.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
        const content = this.widget.addStack();
        content.layoutVertically();
        this.widget.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
        const footer = this.widget.addStack();
        this.widget.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);

        this.stack = {
            header,
            content,
            footer
        };

        this.fillHeader(rawData?.printerData.name);
        this.fillContent(rawData);
        this.fillFooter();

        this.widget.presentMedium();
    }

    fillHeader(printerName? :string) {
        let headerText =
            "Prusa Connect local" + (printerName ? ` - ${printerName}` : "");
        let headerTextWidget = this.stack.header.addText(headerText);
        headerTextWidget.font = PrinterWidget.STYLING.FONTS.HEADER;
        headerTextWidget.textColor = new Color("#f58a42");
    }

    fillContent(data :APIFetchType) {
        switch(this.printer.APIStatus) {
            case EApiState.INVALIDIP:
                this._fillContentForInvalidIP();
                break;
            case EApiState.NOTAVAILABLE:
                this._fillContentForOffline();
                break;
            case EApiState.NORMAL:
                this._fillContentForNormal(data);
                break;
            default:
                throw new Error("Enexpected API state");
        }
    }

    fillFooter() {
        const vNow = new Date();

        const footerTextWidget = this.stack.footer.addText(`Last update: ${vNow.toLocaleDateString()} ${vNow.toLocaleTimeString()}`);
        footerTextWidget.font = PrinterWidget.STYLING.FONTS.FOOTER;
    }

    addingTemperatureData(stack :WidgetStack, status :PromiseType<ReturnType<PrusaAPI["status"]>>) {
        const tempAndMaterialText =
            "Nozzle: " +
            status.printer.temp_nozzle +
            "° - Bed: " +
            status.printer.temp_bed +
            "°";

        const tempAndMaterialTextWidget = stack.addText(tempAndMaterialText);
        tempAndMaterialTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT;
    }

    setWidgetRefreshTimeInMinutes(minutes :number) {
        const refreshDate = new Date();
        refreshDate.setMinutes(refreshDate.getMinutes() + minutes);
        this.widget.refreshAfterDate = refreshDate;
    }





    private _fillContentForInvalidIP() {
        this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE_IN_MINUTES.OFFLINE);

        const ipAddressInvalidText = "Invalid IP address";
        const offlineExplanationText = "provide IP address as Parameter";

        const ipAddressInvalidTextWidget = this.stack.content.addText(ipAddressInvalidText);
        const offlineExplanationTextWidget = this.stack.content.addText(offlineExplanationText);

        ipAddressInvalidTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
        offlineExplanationTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_HINT;
        offlineExplanationTextWidget.textColor = PrinterWidget.STYLING.COLORS.HINT_GREY;
    }

    private _fillContentForOffline() {
        this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE_IN_MINUTES.OFFLINE);

        const printerNotAvailableText = "Printer is OFFLINE";
        const offlineExplanationText = "turn on printer, check for local network or check IP address";

        const printerNotAvailableTextWidget = this.stack.content.addText(printerNotAvailableText);
        const offlineExplanationTextWidget = this.stack.content.addText(offlineExplanationText);

        printerNotAvailableTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
        offlineExplanationTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_HINT;
        offlineExplanationTextWidget.textColor = PrinterWidget.STYLING.COLORS.HINT_GREY;
    }

    private _fillContentForNormal(data :APIFetchType) {
        if (! data) throw new Error("Printer data expected");

        if (data.statusData.printer.state === "IDLE") {
            this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE_IN_MINUTES.IDLE);

            this.stack.content.layoutVertically();

            const printerIdleText = "Printer is IDLE";
            const printerIdleTextWidget = this.stack.content.addText(printerIdleText);
            printerIdleTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;

            this.addingTemperatureData(this.stack.content, data.statusData);
        } else if (data.statusData.printer.state === "PRINTING" && data.jobData && data.statusData.job) {
            if (!data.jobData.file) {
                this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE_IN_MINUTES.OFFLINE);
                return;
            }

            this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE_IN_MINUTES.PRINTING);
            this.stack.content.layoutVertically();


            const printingTitleText = "Printing: " + (data.jobData.file.display_name ?? "Unknown file").substring(20) + "...";
            const printingTitleTextWidget = this.stack.content.addText(printingTitleText);
            printingTitleTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;

            this.stack.content.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);

            const detailStack = this.stack.content.addStack();

            const pictureStack = detailStack.addStack();
            detailStack.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
            const printingStateStack = detailStack.addStack();
            printingStateStack.layoutVertically();

            pictureStack.addImage(generatedProgressPie(data.statusData.job.progress ?? 0, 300));

            const printingProgressText = `${data.statusData.job.progress}% - remain: ${secondsToTime(data.statusData.job.time_remaining ?? 0)}`;

            const printingProgressTextWidget = printingStateStack.addText(printingProgressText);
            printingProgressTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT;
            this.addingTemperatureData(printingStateStack, data.statusData);

            let estimatedFinishText = "Est. Finish: ";
            if (! data.statusData.job.time_remaining) {
                estimatedFinishText += "Unknown";
            } else {
                const vDate = new Date();
                vDate.setSeconds(vDate.getSeconds() + data.statusData.job.time_remaining);
                estimatedFinishText += vDate.toLocaleTimeString();
            }
            const estimatedFinishTextWidget = printingStateStack.addText(estimatedFinishText);
            estimatedFinishTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
        }
    }
}
