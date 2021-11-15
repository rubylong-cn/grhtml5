//{{BEGIN CODE}}
//报表显示器程序模块
(function (window, undefined) {
    "use strict";

    var grhelper = gr.helper,
        grcommon = gr.common,
        grenum = gr.enum_,
        grconst = gr.const_,

        penStyleText = grhelper.penStyleText, //viewer
        fontCSSText = grhelper.fontCSSText, //viewer
        pixelsToHtml = grhelper.pixelsToHtml, //dom viewer
        colorValue2Html = grhelper.colorValue2Html, //dom viewer

        assignObject = grhelper.assignObject, //dom viewer
        compareObject = grhelper.compareObject, //viewer

        parseXML = grhelper.parseXML, //dom/chart viewer
        xmlToReportDataJSON = grhelper.xmlToReportDataJSON, //viewer

        addEvent = grhelper.addEvent,

        HtmlStyles = grcommon.HtmlStyles; //dom viewer

    //var borderCompare = function (style, border) {
    //    return style.Styles === border.Styles && (!style.Styles || compareObject(style.Pen, border.Pen)) &&
    //        style.Shadow === border.Shadow && (!style.Shadow || (style.ShadowWidth === border.ShadowWidth && style.ShadowColor === border.ShadowColor));
    //};

    //var paddingCompare = function (style, object) {
    //    var padding = style.padding;
    //    return padding.Left === object.PaddingLeft &&
    //        padding.Right === object.PaddingRight &&
    //        padding.Top === object.PaddingTop &&
    //        padding.Bottom === object.PaddingBottom;
    //};

    var CellStyle = function (cell) {
        var self = this,
            padding,
            control;

        if (cell.FreeCell) { //只有非自由格才需考虑 TextFormat 与 padding
            if (cell.isSingleDockControl()) {
                control = cell.Controls.items[0];

                if (control.TextFormat) {
                    self.TextFormat = {};
                    self.TextFormat.ForeColor = control.ForeColor;
                    assignObject(self.TextFormat, control.TextFormat);
                }

                padding = self.padding = {};
                padding.Left = control.PaddingLeft;
                padding.Right = control.PaddingRight;
                padding.Top = control.PaddingTop;
                padding.Bottom = control.PaddingBottom;
            }
        }
        else {
            self.TextFormat = {};
            assignObject(self.TextFormat, cell.TextFormat);
            self.TextFormat.ForeColor = cell.ForeColor;

            padding = self.padding = {};
            padding.Left = cell.PaddingLeft;
            padding.Right = cell.PaddingRight;
            padding.Top = cell.PaddingTop;
            padding.Bottom = cell.PaddingBottom;
        }

        if (cell.BorderCustom) {
            self.border = {};
            assignObject(self.border, cell.Border);
        }
        else {
            self.ownerGrid = cell.getOwnerGrid();
        }

        self.toFillBack = cell.toFillBack();
        self.toFillBack && (self.BackColor = cell.BackColor);
    };

    CellStyle.prototype = {
        compare: function (cell) {
            var self = this,
                newStyle = new CellStyle(cell);

            return compareObject(self.padding, newStyle.padding) &&
                compareObject(self.TextFormat, newStyle.TextFormat) &&
                compareObject(self.border, newStyle.border) &&
                self.toFillBack === newStyle.toFillBack &&
                self.BackColor === newStyle.BackColor &&
                self.ownerGrid === newStyle.ownerGrid;
        },

        getStyleName: function () {
            return "-gr-cell" + this.index;
        },

        getStyles: function () {
            var self = this,
                htmlStyles = new HtmlStyles(),
                textformat = self.TextFormat;

            if (textformat) {
                htmlStyles.addTextFormat(textformat, 1);
                htmlStyles.addObjectPadding(self);
            }

            self.border ? htmlStyles.addBorder(self.border) : htmlStyles.addCellBorder(self.ownerGrid);

            self.toFillBack && htmlStyles.addBackColor(self.BackColor);

            return htmlStyles;
        },
    };

    var ControlStyle = function (control) {
        var self = this,
            padding = self.padding = {},
            usingFont = control.getUsingFont();

        self.asCell = !!control.cell;

        if (control.TextFormat) {
            self.TextFormat = {};
            self.TextFormat.ForeColor = control.ForeColor;
            assignObject(self.TextFormat, control.TextFormat);
        }

        padding.Left = control.PaddingLeft;
        padding.Right = control.PaddingRight;
        padding.Top = control.PaddingTop;
        padding.Bottom = control.PaddingBottom;

        self.border = {};
        assignObject(self.border, control.Border);

        self.toFillBack = control.toFillBack();
        self.toFillBack && (self.BackColor = control.BackColor);

        self.textdecoration = {
            Underline: usingFont.Underline,
            Strikethrough: usingFont.Strikethrough,
        };
    };
    ControlStyle.prototype = {
        //compare: function (control) {
        //    var self = this,
        //        usingFont = control.getUsingFont(),
        //        toFillBack = control.toFillBack(),
        //        asCell = !!control.cell;

        //    return ((control.TextFormat && self.TextFormat &&
        //        compareObject(control.TextFormat, self.TextFormat) &&
        //        self.TextFormat.ForeColor === control.ForeColor) ||
        //        (!control.TextFormat && !self.TextFormat)) &&

        //        paddingCompare(self, control) &&

        //        borderCompare(control.Border, self.border) &&

        //        self.toFillBack === toFillBack && (!toFillBack || self.BackColor === control.BackColor) &&

        //        self.asCell === asCell &&

        //        self.textdecoration.Underline === usingFont.Underline &&
        //        self.textdecoration.Strikethrough === usingFont.Strikethrough;
        //},
        compare: function (control) {
            var self = this,
                newStyle = new ControlStyle(control);

            return compareObject(self.padding, newStyle.padding) &&
                compareObject(self.TextFormat, newStyle.TextFormat) &&
                compareObject(self.border, newStyle.border) &&
                compareObject(self.textdecoration, newStyle.textdecoration) &&
                self.toFillBack === newStyle.toFillBack &&
                self.BackColor === newStyle.BackColor &&
                self.asCell === newStyle.asCell;
        },

        getStyleName: function () {
            return "-gr-ctrl" + this.index;
        },

        getStyles: function () {
            var self = this,
                htmlStyles = new HtmlStyles(),
                td = self.textdecoration;

            !self.asCell && htmlStyles.add('position', 'absolute');

            htmlStyles.addObjectPadding(self);
            htmlStyles.addBorder(self.border);
            self.TextFormat && htmlStyles.addTextFormat(self.TextFormat, self.asCell);
            self.toFillBack && htmlStyles.addBackColor(self.BackColor);

            //测试感觉下划线与删除线不能在上级元素上定义,只能在部件框上直接定义
            (td.Underline || td.Strikethrough) &&
                htmlStyles.add("text-decoration", (td.Underline ? "underline" : "") +
                    (td.Underline && td.Strikethrough ? " " : "") +
                    (td.Strikethrough ? "line-through" : ""));

            return htmlStyles;
        },
    };

    var PositionStyle = function (control) {
        var self = this;

        self.Left = control.pxRect.left;
        self.Top = control.pxRect.top;
        self.Width = control.getContentWidth();
        self.Height = control.getContentHeight();
    };
    PositionStyle.prototype = {
        compare: function (control) {
            var self = this;

            return self.Left === control.pxRect.left &&
                self.Top === control.pxRect.top &&
                self.Width === control.getContentWidth() &&
                self.Height === control.getContentHeight();
        },

        getStyleName: function () {
            return "-gr-pos" + this.index;
        },

        getStyles: function () {
            var self = this,
                htmlStyles = new HtmlStyles();

            htmlStyles.add("left", pixelsToHtml(self.Left));
            htmlStyles.add("top", pixelsToHtml(self.Top));
            htmlStyles.add("width", pixelsToHtml(self.Width));
            htmlStyles.add("height", pixelsToHtml(self.Height));

            return htmlStyles;
        },
    };

    //参数可能是 Section 类型,也有可能是tableRows元素(见buildTableLayout)
    //有cells属性，表示是tableRows的行
    var SectionStyle = function (section) {
        var self = this,
            sectionRow = section.cells ? section : 0;

        self.section = section;
        self.isLastRow = 1;
        self.Height = section.CanShrink ? 0 : section.pxHeight; //如果节是可收缩的，则不要设置 height 属性，这里也就记录Height
        if (sectionRow) {
            section = sectionRow.section;
            self.isLastRow = section.tableRows[section.tableRows.length - 1] === sectionRow;
        }

        if (section.Font.font) {
            self.Font = {};
            assignObject(self.Font, section.Font.font);
        }

        if (section.owner.Header) {
            self.detailgrid = section.owner.owner;
        }

        //对于表格行，报表头尾中的不需要填充背景色，而分组头尾则需要；定义了self.detailgrid表示是分组头尾中的行
        if (section.toFillBack() && (!sectionRow || self.detailgrid)) {
            self.BackColor = section.BackColor;
        }
    };
    SectionStyle.prototype = {
        compare: function (section) {
            var self = this,
                sectionRow = section.cells ? section : 0,
                height = section.CanShrink ? 0 : section.pxHeight,
                isLastRow = 1,
                toFillBack,
                sectionFont;

            if (sectionRow) {
                section = section.section;

                isLastRow = section.tableRows[section.tableRows.length - 1] === sectionRow;
            }

            toFillBack = section.toFillBack() && (!sectionRow || section.owner.Header);
            sectionFont = section.Font.font;

            return self.Height === height &&

                ((sectionFont && self.Font && compareObject(sectionFont, self.Font)) ||
                (!sectionFont && !self.Font)) &&

                ((toFillBack && self.BackColor && self.BackColor === section.BackColor) ||
                (!toFillBack && !self.BackColor)) &&

                ((section.owner.Header && section.owner.owner === self.detailgrid) ||
                (!section.owner.Header && !self.detailgrid)) &&

                self.isLastRow === isLastRow;
        },

        getStyleName: function () {
            return "-gr-section" + this.index;
        },

        getStyles: function () {
            var self = this,
                section = self.section,
                pctHeight = section.pctHeight,
                pxHeight = self.Height,
                htmlStyles = new HtmlStyles(),
                grid = self.detailgrid;

            //如果行是可收缩(CanShrink)的,则其 height 属性不应该定义
            (pctHeight || pxHeight) && htmlStyles.add('height', pctHeight ? pctHeight + "%" : pixelsToHtml(pxHeight));

            //pctHeight && htmlStyles.add('width', "100%");
            (pctHeight || (!section.cells && section.report.viewer.options.reportFitWidth)) && htmlStyles.add('width', "100%");

            self.Font && (htmlStyles.items = htmlStyles.items.concat(FontStyle.prototype.getStyles.call(self.Font).items));

            self.BackColor && htmlStyles.addBackColor(self.BackColor);

            self.isLastRow && grid && grid.ShowRowLine && htmlStyles.add("border-bottom", penStyleText(grid.ColLinePen));

            return htmlStyles;
        },
    };

    var FontStyle = function (font) {
        var self = this;

        self.Size = font.Size;
        self.Bold = font.Bold;
        self.Italic = font.Italic;
        //self.Underline = font.;
        //self.Strikethrough = font.;
        self.Name = font.Name;
    };
    FontStyle.prototype = {
        compare: function (font) {
            var self = this;

            return self.Size === font.Size &&
                self.Bold === font.Bold &&
                self.Italic === font.Italic &&
                //self.Underline = font.;
                //self.Strikethrough = font.;
                self.Name === font.Name;
        },

        getStyleName: function () {
            return "-gr-fs" + this.index;
        },

        getStyles: function () {
            var htmlStyles = new HtmlStyles();

            htmlStyles.add("font", fontCSSText(this));

            return htmlStyles;
        },
    };

    var CustomStyle = function (htmlStyles) {
        this.htmlStyles = htmlStyles;
    };
    CustomStyle.prototype = {
        getStyleName: function () {
            return "-gr-cs" + this.index;
        },

        getStyles: function () {
            return this.htmlStyles;
        },
    };

    var Styles = function (viewer, classStyle) {
        var self = this;

        self.items = [];
        self.viewer = viewer;
        self.classStyle = classStyle;
    };
    Styles.prototype = {
        toString: function () { //函数名为toString，是为了方便 arrayObj.join([separator]) 操作
            var self = this,
                items = self.items,
                index = items.length,
                item,
                text = "";

            while (index-- > 0) {
                item = items[index];
                text += "." + self.viewer._getCSSName(item) + "{" + item.getStyles().getText() + "}";

                if (DEBUG) { //仅测试用
                    text += "\r\n";
                }
            }
            return text;
        },

        select: function (object, defaultStyle) {
            var self = this;

            grhelper.GRASSERT(defaultStyle, "defaultStyle is undefined");

            return self.viewer._getCSSName(self.selectItem(object, defaultStyle));
        },

        selectItem: function (object, defaultStyle) {
            var self = this,
                i,
                len = self.items.length,
                item;

            if (defaultStyle && defaultStyle.compare(object)) {
                return defaultStyle;
            }

            for (i = 0; i < len; i++) {
                item = self.items[i];
                if (item.compare(object)) {
                    return item;
                }
            }

            item = new self.classStyle(object);
            item.index = len;
            self.items.push(item);
            return item;
        },
    };

    //此函数用于判断一个字符串为：URL，XML与JSON
    //var determineUXJ = function (str) {
    //    var index = 0,
    //        len = str.length,
    //        ch;

    //    if (typeof str != "string") {
    //        return undefined;
    //    }

    //    //首先找到第一个非空白字符
    //    while (index < len) {
    //        ch = str[index];
    //        if (!/\s/g.test(ch))
    //            break;
    //        index++;
    //    }

    //    if (index >= len) {
    //        return undefined;
    //    }
    //    if (ch == "{") {
    //        return "J";
    //    }
    //    if (ch == "<") {
    //        return "X";
    //    }
    //    return "U";
    //};
    var varIsURL = function (param) {
        var index = 0,
            len = param.length,
            ch;

        if (typeof param != "string") {
            return 0;
        }

        //首先找到第一个非空白字符
        while (index < len) {
            ch = param[index];
            if (!/\s/g.test(ch))
                break;
            index++;
        }

        return (index < len) && (ch !== "{") && (ch !== "<");
    };

    var reportIsURL = function (param) {
        if (typeof param == "string" && param.substr(0, 4) == "_WR_") {
            return 0;
        }
        return varIsURL(param);
    };

    //viewerNo：整数类型，报表显示器的序号，此值在insertReportViewer中自动产生，开发者无需了解此值。
    //
    //report 与 data 的数据类型可以是四种：
    //1.HTTP对象
    //2.URL文字串
    //3.JSON或XML文字串
    //4.JSON对象
    var Viewer = function (viewerNo, viewerHolderID, report, data, options) {
        var self = this;

        self.running = false;
        self.generated = false;
        self.events = {};

        self.viewerNo = viewerNo; //如果一个页面要展现多个报表，每个Viewer的No不一样，主要用于产生不同的CSS名称
        self.viewerHolderID = viewerHolderID;

        self.reportSource = report;
        self.dataSource = data;

        //RGBA 颜色值是这样规定的：rgba(red, green, blue, alpha)。alpha 参数是介于 0.0（完全透明）与 1.0（完全不透明）的数字。
        self.alpha = {
            background: 1, //TBD...???为了明细交替色背景不要叠加，不知这样搞的效果是否合理 0.5,
            border: 0.8,
            stroke: 0.8,
            pen: 0.8,
            text: 0.8,
            chartGraph: 0, //TBD... 0.5
            chartStroke: 1, //TBD... 0.8,
            //fillColor: "rgba(220,220,220,0.5)",
            //strokeColor: "rgba(220,220,220,0.8)",
            //highlightFill: "rgba(220,220,220,0.75)",
            //highlightStroke: "rgba(220,220,220,1)",
        };

        self.options = {
            controlPosition: gr.enum_.controlLayout.auto, //auto, absolute, table

            reportFitWidth: false,     //报表显示宽度适应显示容器
            reportFitHeight: false,    //报表显示高度适应显示容器
            detailgridResize: gr.enum_.detailgridResize.asDesign, //明细网格宽度适应显示容器的方式 asDesign fitWidth onlyGrow
            singleChartFill: true,    //单个图表充满显示容器

            fixedHeaderFooter: false, //指示是否锁定表头与表尾，表头包含所有报表头与明细网格表头，表尾包含所有的报表尾。此属性仅对含有明细网格的报表有效
            fixedFitTo: "window", //指示锁定表头与表尾时，表体部分的高度按那种方式伸缩适应，目前有效值：window、holder。如果为报表占位元素，则此元素必须设置高度属性

            selectionHighlight: true,
            selectionCell: false, //默认为不定义
            selectionTextColor: "rgba(255,255,255,1)",
            selectionBackColor: "rgba(20,20,127,1)",

            hoverEnabled: true,
            hoverBackColor: "#eee",
            hoverTextColor: "#000",
        };
        self.attachOptions(options);

        self.report = new gr.dom.Report(self);
    };
    Viewer.prototype = {
        attachOptions: function (options) {
            var self = this;

            self.stop();

            //将传递进来的参数覆盖默认值
            options && assignObject(self.options, options);
        },

        loadReport: function (data, autorun, dataSuccess) {
            var self = this,
                report = self.report,
                jsonData = data,
                errorType;

            autorun = autorun || (autorun === undefined);
            dataSuccess = dataSuccess || (dataSuccess === undefined);

            if (dataSuccess) {
                //VS2015调试js代码，如果用try catch捕获了异常，则程序不会中断在发生异常的代码处
                //代码中 try catch 语句在开发时注释掉，方便程序在调试时停止在出异常的地方
                //发布代码时，用代码合并程序自动将注释去掉，让异常代码生效
                //try 
                {
                    if (jsonData.responseText !== undefined) {
                        jsonData = jsonData.responseText;
                    }

                    self._rawReport = jsonData;

                    report.load(jsonData);

                    self.events.onReportLoaded && self.events.onReportLoaded(self);
                }
                //catch (e) {
                //    dataSuccess = 0;
                //    errorType = "解析报表模板";
                //}

                if (dataSuccess) {
                    self.reportPrepared = true;

                    autorun && !self.waitData && self.generate();
                }
            }
            else {
                errorType = "获取报表模板";
            }

            !dataSuccess && self.displayError(errorType, data, 1);
        },

        loadData: function (data, autorun, dataSuccess) {
            var self = this,
                jsonData = data,
                errorType;

            autorun = autorun || (autorun === undefined);
            dataSuccess = dataSuccess || (dataSuccess === undefined);

            if (dataSuccess) {
                //VS2015调试js代码，如果用try catch捕获了异常，则程序不会中断在发生异常的代码处
                //代码中 try catch 语句在开发时注释掉，方便程序在调试时停止在出异常的地方
                //发布代码时，用代码合并程序自动将注释去掉，让异常代码生效
                //try 
                {
                    if (jsonData.responseText !== undefined) {
                        jsonData = jsonData.responseText;
                    }

                    self._rawData = jsonData;

                    if (typeof jsonData === "string") {
                        if (jsonData === "") {
                            jsonData = {};
                        }
                        else if (jsonData.charAt(0) === "{") {
                            jsonData = JSON.parse(jsonData);
                        }
                        else {
                            //为了能顺利解析xml数据，要将数据中的回车换行字符去掉
                            jsonData = jsonData.replace(/\r\n/g, ""); //replace(/\s/g, "")这样不行，会把内容中的空格去掉

                            jsonData = parseXML(jsonData);
                            if (!jsonData) {
                                throw 0;
                            }

                            jsonData = xmlToReportDataJSON(jsonData);
                        }
                    }
                    self.tables = jsonData;
                }
                //catch (e) {
                //    dataSuccess = 0;
                //    errorType = "解析报表数据";
                //}

                if (dataSuccess) {
                    self.dataPrepared = true;

                    autorun && self.generate();
                }
            }
            else {
                errorType = "获取报表数据";
            }

            !dataSuccess && self.displayError(errorType, data, 0);
        },

        start: function () {
            var self = this;

            if (self.waitData) {
                self.waitData = 0;
            }

            if (!self.generated && !self.running) {
                self.running = true;
                self.events.onGenerateBegin && self.events.onGenerateBegin(self);

                self.reportPrepared = self.reportPrepared || !self._rs;
                self.dataPrepared = self.dataPrepared || !self._ds;

                if (self.reportPrepared && self.dataPrepared) {
                    self.events.onReportLoaded && self.events.onReportLoaded(self);

                    !self.waitData && self.generate();
                }
                else {
                    if (!self.reportPrepared) {
                        if (self._rs.url) {
                            window.rubylong.ajax(self._rs, function (xmlhttp, success) {
                                self.loadReport(xmlhttp, 1, success);
                            }, self);
                        }
                        else {
                            self.loadReport(self._rs);
                        }
                    }

                    if (!self.dataPrepared) {
                        if (self._ds.url) {
                            window.rubylong.ajax(self._ds, function (xmlhttp, success) {
                                self.loadData(xmlhttp, 1, success);
                            }, self);
                        }
                        else {
                            self.loadData(self._ds);
                        }
                    }
                }
            }
        },

        stop: function (keepReport, keepData) {
            var self = this,
                report = self.report,
                viewerHolder;

            //如果正在运行过程中,不允许停止运行
            if (self.running) {
                return false;
            }

            if (self.generated) {
                if (!keepReport) {
                    report.Clear();
                    self.reportPrepared = false;
                    self._rawReport = undefined;
                }

                if (!keepData) {
                    self.tables = undefined;
                    self.dataPrepared = false;
                    self._rawData = undefined;
                }

                if (self.viewerHolderID) {
                    viewerHolder = document.getElementById(self.viewerHolderID);
                    if (viewerHolder) {
                        viewerHolder.innerHTML = "";

                        if (DEBUG) { //仅测试用
                            if (document.getElementById("htmlText")) {
                                document.getElementById("htmlText").innerText = "htmlText";
                            }
                            if (document.getElementById("stylesText")) {
                                document.getElementById("stylesText").innerText = "stylesText";
                            }
                        }
                    }
                }

                report.unprepare();
                self.generated = false;
            }

            return true;
        },

        update: function () {
            var self = this;

            self.stop(1, 1);
            self.generate();
        },

        generate: function () {
            var self = this,
                report = self.report,
                fixedFitTo = self.options.fixedFitTo,
                viewerHolder = document.getElementById(self.viewerHolderID),
                elements,
                index;

            function createStyles() {
                self.fontStyles = new Styles(self, FontStyle);
                self.controlStyles = new Styles(self, ControlStyle);
                self.cellStyles = new Styles(self, CellStyle);
                self.sectionStyles = new Styles(self, SectionStyle);
                self.positionStyles = new Styles(self, PositionStyle);
                self.customStyles = new Styles(self, CustomStyle);
            };

            function fixedProcess() {
                var fixedDivs = viewerHolder.getElementsByClassName(self._getCSSName(self.fixedDivClass)),
                    bodyDiv = viewerHolder.getElementsByClassName(self._getCSSName(self.bodyDivClass))[0],
                    fixedDiv = fixedDivs[0],
                    fixedHeight = fixedDiv? fixedDiv.clientHeight : 0,
                    scrollbarWidth = fixedDiv.clientWidth - bodyDiv.clientWidth;

                grhelper.GRASSERT(fixedDivs.length <= 2, "fixed div count must less than 2.");

                //self.fixedDivClass 在grdom.js中通过代码 styles.add("padding-right", "17px"); 设置，默认scrollbar的宽度为17px
                //如果这里侦测到不是17px，进行调整
                if (scrollbarWidth != 17 && scrollbarWidth > 0) {
                    fixedDiv && fixedDiv.setAttribute("style", "padding-right:" + scrollbarWidth + "px");
                    fixedDiv = fixedDivs[1];
                    fixedDiv && fixedDiv.setAttribute("style", "padding-right:" + scrollbarWidth + "px");;
                    //fixedDiv = fixedDivs[0];
                }

                //求出表头与表尾的合计高度
                //fixedDiv && (fixedHeight = fixedDiv.clientHeight);
                fixedDiv = fixedDivs[1];
                fixedDiv && (fixedHeight += fixedDiv.clientHeight);

                //由 height 改为 max-height，这样可以避免数据量少时表体与表尾之间出现空白区域
                if (fixedFitTo == "holder") { //按照占位容器大小进行缩放
                    bodyDiv.setAttribute("style", "max-height:" + (viewerHolder.clientHeight - fixedHeight) + "px"); //height->max-height
                }
                else { //按照浏览器窗口大小进行缩放
                    function resizeDetailGridBody(evt) {
                        var windowMargin = window.innerWidth - document.body.clientWidth; //据此求出窗口的边距

                        //如果窗口的边距没有合理值，设置如下默认值
                        if (!windowMargin) {
                            windowMargin = 8 * 2;
                        }

                        bodyDiv.setAttribute("style", "max-height:" + (window.innerHeight - fixedHeight - windowMargin) + "px"); //height->max-height
                    }

                    addEvent(window, "resize", resizeDetailGridBody);

                    resizeDetailGridBody();
                }
            }

            if (self.reportPrepared && self.dataPrepared) {
                //VS2015调试js代码，如果用try catch捕获了异常，则程序不会中断在发生异常的代码处
                //代码中 try catch 语句在开发时注释掉，方便程序在调试时停止在出异常的地方
                //发布代码时，用代码合并程序自动将注释去掉，让异常代码生效
                //try 
                {
                    viewerHolder.innerHTML = "";

                    if (DEBUG) { //仅测试用
                        self.stylesText = "";
                    }

                    self._detailgrids = []; //detailgrids 成员记录下报表生成的全部明细网格，如果有子报表，一个报表中会有多个明细网格
                    self._domevents = [];

                    self.html = "";
                    createStyles();

                    viewerHolder.classList.add(self.selectFont2(report.Font.font));
                    (report.BackColor !== 0x00ffffff) && (viewerHolder.style.backgroundColor = colorValue2Html(report.BackColor));

                    self.html = report.generateHtml();

                    self.generateStyles();

                    viewerHolder.innerHTML = self.html;

                    if (report.toFillHolder) {
                        viewerHolder.style.height = "100%";
                    }
                    report.singleChart && (viewerHolder.style.backgroundColor = colorValue2Html(report.singleChart.BackColor));

                    if (report.canvasControls) {
                        report.prepareCanvas();

                        if (report.isDynamicSize) {
                            addEvent(window, "resize", function (evt) {
                                report.resizeCanvas();
                            });

                            report.resizeCanvas(); //要初始执行一次
                        }
                        else {
                            report.renderCanvas();
                        }
                    }

                    report.fixedHeaderFooter && fixedProcess(); //处理锁定报头表尾

                    self._detailgrids.forEach(function (detailgrid, index) {
                        var detailgridElement = document.getElementById(self._getDetailGridID(index));

                        addEvent(detailgridElement, "mousedown", function (evt) {
                            detailgrid.onmousedown(evt);
                        });

                        //addEvent(detailgridElement, "click", function (evt) {
                        //    detailgrid.onclick(evt);
                        //});
                    });

                    //为checkbox绑定事件响应函数
                    if (report._has_cb) {
                        elements = document.querySelectorAll("." + grconst.CSS_CB);
                        index = elements.length;
                        while (index-- > 0) {
                            addEvent(elements[index], "click", function (evt) {
                                report.onCheckBoxClick(evt);
                            });
                        };
                    }

                    //绑定报表交互事件到对应的HTML Element上
                    self._domevents.forEach(function (domevent, index) {
                        elements = document.querySelectorAll("." + self._getEventCSSName(index + 1)),
                        index = elements.length;

                        while (index-- > 0) {
                            switch (domevent.type) {
                                case grenum.elementEventType.click:
                                    addEvent(elements[index], "click", function (evt) {
                                        domevent.fun(evt, domevent.obj);
                                    });
                                    break;
                                default: //grenum.elementEventType.dblclick
                                    addEvent(elements[index], "dblclick", function (evt) {
                                        domevent.fun(evt, domevent.obj);
                                    });
                                    break;
                            }
                        }
                    });

                    if (DEBUG) { //仅测试用
                        //这里设置后,重新生成报表,IE浏览器就死掉了(长时间无响应)
                        if (document.getElementById("htmlText")) {
                            document.getElementById("htmlText").innerText = self.html;
                            //document.getElementById("htmlText").innerText += self.html;
                        }
                        if (document.getElementById("stylesText")) {
                            document.getElementById("stylesText").innerText = self.stylesText;
                            //document.getElementById("stylesText").innerText += self.stylesText;
                        }
                    }
                }
                //catch (e) {
                //    viewerHolder.innerHTML = "生成报表时发生异常错误!<br />Error Code: " + e.number + 
                //    "<br />Error Name: " + e.name +
                //    "<br />Error Message: " + e.message;
                //}

                self.running = false;
                self.generated = true;
                self.events.onGenerateEnd && self.events.onGenerateEnd(self);
            }
        },

        generateStyles: function () {
            var self = this,
                report = self.report,
                options = self.options,
                selectionHighlight = options.selectionHighlight,
                styleNodeName = grconst.ID_REPORT_STYLE + self.viewerNo,
                styleNode = document.getElementById(styleNodeName),
                styleRoot = report.toFillHolder ? "html,body{height:100%;}\n*{margin:0;padding:0;}" : "";

            if (!styleNode) {
                styleNode = document.createElement("STYLE");
                styleNode.id = styleNodeName;
                document.head.appendChild(styleNode);
            }

            //按需定义标识checkbox的CSS
            if (report._has_cb) {
                styleRoot += "." + grconst.CSS_CB + "{}\n";
            }

            styleRoot += "." + grconst.CSS_DG + "{table-layout:fixed;}\n"; //标识明细网格的CSS。table 必须按 fixed 方式布局，让表格按设计的宽度显示，而不是根据内容自动伸展列的宽度

            //定义选中高亮显示的css
            if (options.hoverEnabled) {
                //如果高亮选中(selectionHighlight)，则要加上not限定，在高亮选中行上不应用hover变色
                //如果单元格本身有背景色，则tr的hover颜色不会应用上
                //2020/02/11 加tbody>tr>td:hover，但这样仅当鼠标光标在单元格上时才有效
                function appendHoverStyle(isTd) {
                    var obj = ">tbody>tr";

                    isTd && (obj += ">td");
                    obj += ":hover";
                    styleRoot += "." + grconst.CSS_DG +
                        obj + (selectionHighlight ? ":not(." + grconst.CSS_SH + ")" : "") +
                        " {background-color:" + options.hoverBackColor +
                        ";color:" + options.hoverTextColor + ";}\n";
                }
                //styleRoot += "." + grconst.CSS_DG +
                //    ">tbody>tr>td:hover" + (selectionHighlight ? ":not(." + grconst.CSS_SH + ")" : "") +
                //    " {background-color:" + options.hoverBackColor +
                //    ";color:" + options.hoverTextColor + ";}\n";
                appendHoverStyle(0);
                appendHoverStyle(1);
            }

            if (selectionHighlight) {
                //.-gr-section0s { background-color: #204020; color: #ffff00; }
                styleRoot += "." + grconst.CSS_SH + "{ background-color:" +
                    options.selectionBackColor + ";color:" + options.selectionTextColor + ";}\n";
            }

            //2019/03/19 added，table 必须按 fixed 方式布局，让表格按设计的宽度显示，而不是根据内容自动伸展列的宽度
            //2019/11/14 注释掉，以免覆盖其它的 table 相关 css 定义。相关定义移入到 grconst.CSS_DG 中
            //styleRoot += "table { table-layout:fixed;}";

            //styleRoot必须放最后，这样选中高亮显示的css才会具有最高选择权
            styleNode.innerHTML = [self.fontStyles,
                self.positionStyles,
                self.sectionStyles,
                self.cellStyles,
                self.controlStyles,
                self.customStyles,
                self.getDomEventStyles(),
                styleRoot].join("");

            if (DEBUG) { //仅测试用
                self.stylesText = styleNode.innerHTML;
            }
        },
        getDomEventStyles: function () {
            var self = this,
                index = self._domevents.length,
                styles = "";

            while (index > 0) {
                styles += "." + self._getEventCSSName(index--) + "{}\n";
            }
            return styles;
        },
        addCustomStyle: function (htmlStyles) {
            var items = this.customStyles.items,
                customStyle = new CustomStyle(htmlStyles);

            customStyle.index = items.length;
            items.push(customStyle);

            return customStyle;
        },
        selectCell: function (cell) {
            return this.cellStyles.select(cell, cell.defaultStyle);
        },
        selectCellItem: function (cell) {
            return this.cellStyles.selectItem(cell);
        },

        selectControl: function (control) {
            return this.controlStyles.select(control, control.defaultStyle);
        },
        selectControlItem: function (control) {
            return this.controlStyles.selectItem(control);
        },

        selectSection: function (section) {
            return this.sectionStyles.select(section, section.defaultStyle);
        },
        selectSectionItem: function (section) {
            return this.sectionStyles.selectItem(section);
        },

        selectPosition: function (control) {
            return this.positionStyles.select(control, control.defaultPositionStyle);
        },
        selectPositionItem: function (control) {
            return this.positionStyles.selectItem(control);
        },

        selectFont: function (font, defaultStyle) {
            return this.fontStyles.select(font, defaultStyle);
        },
        selectFont2: function (font) {
            var self = this;

            return self._getCSSName(self.selectFontItem(font));
        },
        selectFontItem: function (font) {
            return this.fontStyles.selectItem(font);
        },

        //typeText: 出错的类型文字
        //dataText: 解析的数据，可以是HTPP响应、字符串数据或JSON对象之一
        //isReport: 真表示是解析报表模板，反之为报表数据
        displayError: function (typeText, data, isReport) {
            var self = this,
                isHttp = data.responseText !== undefined,
                httpRequest = isHttp ? (isReport ? self._rs : self._ds) : undefined,
                errorText,
                viewerHolder = document.getElementById(self.viewerHolderID);

            errorText = '<div style="background-color:#bbffbb"><h3>' + typeText + '失败，锐浪HTML5报表(' + grconst.VERSION + ')</h3>';
            if (httpRequest) {
                errorText += '<div>URL: <a href="' + httpRequest.url + '">' + httpRequest.url + '</a></div>';
            }
            if (isHttp) {
                errorText += '<div>HTTP Status: ' + data.status + '</div>' +
                '<div>HTTP Status Text: ' + data.statusText + '</div>';

                if (data.responseText) {
                    errorText += '<div>HTTP Response Text: <pre>' + data.responseText + '</pre></div>';
                }
            }
            else {
                if (typeof data === "string") {
                    errorText += '<div>Loaded Text: <pre>' + data + '</pre></div>';
                }
                else {
                    errorText += '<div>Loaded Json Object: <pre>' + JSON.stringify(data) + '</pre></div>';
                }
            }
            errorText += '</div>';

            viewerHolder.innerHTML = errorText;
        },

        _getEventCSSName: function (no) { //no从1开始
            var viewerNo = this.viewerNo,
                name = "_grec" + no;

            //viewerNo为0的报表不加后缀
            if (viewerNo) {
                name += "-" + viewerNo;
            }

            return name;
        },

        _getCSSName: function (cssItem) {
            var viewerNo = this.viewerNo,
                name = cssItem.getStyleName();

            //viewerNo为0的报表不加后缀
            if (viewerNo) {
                name += "-" + viewerNo;
            }

            return name;
        },

        _getDetailGridID: function (index) {
            var viewerNo = this.viewerNo,
                id = grconst.ID_DETAILGRID + index;

            if (viewerNo) {
                id += "-" + viewerNo;
            }

            return id;
        },

        get reportURL() {
            var args = this._rs;

            return args ? args.url : "";
        },
        set reportURL(val) {
            var self = this;

            self._rs = {};
            self._rs.url = val;
        },
        get dataURL() {
            var args = this._ds;

            return args ? args.url : "";
        },
        set dataURL(val) {
            var self = this;

            self._ds = {};
            self._ds.url = val;
        },

        get reportSource() {
            return this._rs;
        },
        set reportSource(val) {
            var self = this;

            if (val) {
                self._rs = {};
                if (reportIsURL(val)) {
                    self._rs.url = val;
                }
                else if (val.url) {
                    assignObject(self._rs, val);
                }
                else {
                    self._rs = val;
                }
            }
        },
        get dataSource() {
            return this._ds;
        },
        set dataSource(val) {
            var self = this;

            if (val) {
                self._ds = {};
                if (varIsURL(val)){
                    self._ds.url = val;
                }
                else if (val.url) {
                    assignObject(self._ds, val);
                }
                else {
                    self._ds = val;
                }
            }
        },

        get reportText() {
            var text = this._rawReport;

            if (typeof text != "string") {
                text = JSON.stringify(text);
            }
            return text;
        },

        get dataText() {
            var text = this._rawData;

            if (typeof text != "string") {
                text = JSON.stringify(text);
            }
            return text;
        },
    };

    window.rubylong = {
        grhtml5: {
            controlLayout: gr.enum_.controlLayout,   //公开出枚举
            detailgridResize: gr.enum_.detailgridResize, //公开出枚举

            barcodeURL: "/html5/General/Barcode.ashx",

            Viewer: Viewer,

            helper: grhelper,
            utility: gr.utility,

            holderIDs: [], //如果一个页面要展现多个报表，记录下各自的HolderID

            insertReportViewer: function (viewerHolderID, report, data, options) {
                var holderIDs = window.rubylong.grhtml5.holderIDs,
                    viewerNo = holderIDs.indexOf(viewerHolderID);

                if (viewerNo < 0) {
                    viewerNo = holderIDs.length;
                    holderIDs.push(viewerHolderID);
                }

                return new Viewer(viewerNo, viewerHolderID, report, data, options);
            },

            createReport: function () {
                return new gr.dom.Report();
            }
        },

        ajax: function (requestdata, callback, objThis, method) {
            var xmlhttp = new XMLHttpRequest(), //createXMLHttpRequest();
                headers;

            function urlMethod(url, method) {
                //如果没有设定method，则根据url自动判定HTTP的method，如果包含.grf .txt .xml .json 之一则为 GET
                return method ? method : (/.grf|.txt|.xml|.json/.test(url) ? "GET" : "POST");
            }

            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status > 0) {
                    callback.call(objThis, xmlhttp, xmlhttp.status == 200);
                }
            }

            xmlhttp.onerror = function () {
                callback.call(objThis, xmlhttp, 0);
            }

            if (typeof requestdata === "string") {
                requestdata = {
                    url: requestdata,
                };
            }
            if (!requestdata.method) {
                requestdata.method = urlMethod(requestdata.url, method); //自动获取method
            }

            //这里不宜再对 requestdata.url 进行 encodeURI 编码出，这样会把 URL 中参数的特殊字符消除掉
            //xmlhttp.open(requestdata.method, encodeURI(requestdata.url), true); //异步请求数据
            //xmlhttp.open(requestdata.method, encodeURIComponent(requestdata.url), true); //异步请求数据
            xmlhttp.open(requestdata.method, requestdata.url, true); //异步请求数据

            headers = requestdata.headers;
            if (headers && typeof headers == "object") {
                for (var key in headers) {
                    xmlhttp.setRequestHeader(key, headers[key]);
                }
            }

            xmlhttp.send(requestdata.data);  //POST 或 PUT 可以传递参数
        }
    }

    //IE10以前的版本兼容 Element.classList。如果以后不用支持IE10以前的版本，以下代码可以去掉
    //https://blog.csdn.net/abrahamcheng/article/details/11218319
    if (!("classList" in document.documentElement)) {
        Object.defineProperty(HTMLElement.prototype, 'classList', {
            get: function () {
                var self = this;
                function update(fn) {
                    return function (value) {
                        var classes = self.className.split(/\s+/g),
                            index = classes.indexOf(value);

                        fn(classes, index, value);
                        self.className = classes.join(" ");
                    }
                }

                return {
                    add: update(function (classes, index, value) {
                        if (!~index) classes.push(value);
                    }),

                    remove: update(function (classes, index) {
                        if (~index) classes.splice(index, 1);
                    }),

                    toggle: update(function (classes, index, value) {
                        if (~index)
                            classes.splice(index, 1);
                        else
                            classes.push(value);
                    }),

                    contains: function (value) {
                        return !!~self.className.split(/\s+/g).indexOf(value);
                    },

                    item: function (i) {
                        return self.className.split(/\s+/g)[i] || null;
                    }
                };
            }
        });
    }
})(window);
//{{END CODE}}
