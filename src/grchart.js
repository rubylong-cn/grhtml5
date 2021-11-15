var gr = gr || {};

(function (undefined) {
    "use strict";

    var grenum = gr.enum_,
        grformat = gr.format,
        grexp = gr.exp,
        grhelper = gr.helper,

        NumericFormatter = grformat.NumericFormatter,

        Summary = grexp.Summary, //dom
        TextBuilder = grexp.TextBuilder,

        enumMemberValid = grhelper.enumMemberValid, //dom/chart/crosstab
        colorMemberValid = grhelper.colorMemberValid, //dom/chart

        fontString = grhelper.fontString, //dom/chart
        fontHeight = grhelper.fontHeight, //dom/chart

        rgba2color = grhelper.rgba2color, //dom/chart format
        color2rgba = grhelper.color2rgba, //dom/chart format
        colorAlpha = grhelper.colorAlpha, //dom/chart
        colorGradientLight = grhelper.colorGradientLight, //dom/chart
        colorGradientDark = grhelper.colorGradientDark, //dom/chart

        prototypeLinkExtend = grhelper.prototypeLinkExtend, //dom/chart
        prototypeCopyExtend = grhelper.prototypeCopyExtend, //dom/chart/crosstab expression

        createArray = grhelper.createArray, //dom/chart/crosstab

        parseXML = grhelper.parseXML, //dom/chart viewer

        getRelativePosition = grhelper.getRelativePosition, //dom/chart
        addEvent = grhelper.addEvent, //dom/chart
        bindEvents = grhelper.bindEvents, //dom/chart

        toDegree = grhelper.toDegree, //dom/chart
        toRadians = grhelper.toRadians; //dom/chart

    var grcommon = gr.common,
        Rect = grcommon.Rect, //dom/chart
        Pen = grcommon.Pen, //dom/chart
        Context = grcommon.Context; //dom/chart

    var grdom = gr.dom,

        uidCanvas = grdom.uidCanvas,

        FontWrapper = grdom.FontWrapper,
        HtmlElement = grdom.HtmlElement,

        Object = grdom.Object,
        CanvasBox = grdom.CanvasBox,
        Recordset = grdom.Recordset,

        Collection = grdom.Collection;

    //{{BEGIN CODE}}
    //图表程序模块
    var BubbleCircleCoverRatio = 0.25, //指定按正方形图形显示气泡图的覆盖率
        PixelsPerCm = 96.0 / 2.54,    //每厘米转换的像素点数，屏幕DPI一般为96

        ChartSeriesColorArray = [
	        0x339966, //01
	        0x0099FF, //02
	        0xFF66CC, //03
	        0x33CCCC, //04 0xFFFF66, 
	        0x99CC00, //05
	        0x66CCCC, //06 0xFFFFCC
	        0x9933FF, //07
	        0x33FF66, //08
	        0xFF6633, //09
	        0xCCCC00, //10 0x00FFFF
	        0x669999, //11
	        0xDDCC99, //12 0x99CCFF
	        0x330099, //13
	        0x88CC99, //14 0xCCFF99, 
	        0xCC0099, //15
	        0xDDCC99, //16 0xCCCCFF
	        0xCC6633, //17
	        0x99FF88, //18 0x99FFCC
	        0x999966, //19
	        0xDD99FF, //20 0xFFCCFF
        ],
        ChartSeriesColorCount = ChartSeriesColorArray.length,

        SCALELINE_WEIGHT = 4,
        BIG_GAP = 8,
        SMALL_GAP = 4;

    //求出合适的接近整数值, 2015/09/04改进,为小数时,根据小数精确的位数进行数据放大后在求
    var CalcNearestAlignInt = function (Val, Precision) {
        var i,
            IntDigits = 0,
            MulVal;

        if (Val >= 1.0) {
            Precision = 0;
        }
        for (i = 0; i < Precision; i++) {
            Val *= 10;
        }

        MulVal = Val;
        while (MulVal > 1) {
            ++IntDigits;
            MulVal /= 10;
        }

        //ATLASSERT(MulVal>0 && MulVal<1);
        if (MulVal < 0.15)
            MulVal = 0.1;
        else if (MulVal < 0.3)
            MulVal = 0.2;
        else if (MulVal < 0.75)
            MulVal = 0.5;
        else
            MulVal = 1;

        if (Precision > 0) {
            IntDigits -= Precision;
        }
        if (IntDigits > 0) {
            for (i = 0; i < IntDigits; i++) {
                MulVal *= 10;
            }
        }
        else {
            for (i = IntDigits; i < 0; i++) {
                MulVal /= 10;
            }
        }

        return MulVal;
    };
    function CalcPointMarkerRect(xPos, yPos, r) {
        return new Rect(xPos - r, yPos - r, xPos + r, yPos + r);
    }

    var ChartSeriesCollection = function (owner) {
        Collection.call(this, owner);
    };
    prototypeLinkExtend(ChartSeriesCollection, Collection);
    ChartSeriesCollection.prototype._createItem = function () {
        return new ChartSeries(this.owner);
    };

    var ChartShape = function (seriesIndex, groupIndex) {
        var self = this;

        self.series = seriesIndex;
        self.group = groupIndex;
    };
    var ChartRect = function (seriesIndex, groupIndex, rect) {
        var self = this;

        ChartShape.call(self, seriesIndex, groupIndex);

        self.rect = rect;
    };
    ChartRect.prototype = {
        inRange: function (x, y) {
            var rect = this.rect,
                w = rect.Width(),
                h = rect.Height();

            if (w<4 || h<4) {
                rect = rect.clone();
                if (w < 4) {
                    rect.left -= 2;
                    rect.right += 2;
                }
                if (h < 4) {
                    rect.top -= 2;
                    rect.bottom += 2;
                }
            }
            return rect.PtInRect(x, y);
        },
        tooltipPos: function () {
            var r = this.rect;

            return {
                x: (r.left + r.right) / 2,
                y: (r.top + r.bottom) / 2
            };
        },
    }
    var ChartPie = function (seriesIndex, groupIndex, x, y, r, beginAngle, endAngle) { //beginAngle 与 endAngle 以度为单位
        var self = this;

        ChartShape.call(self, seriesIndex, groupIndex);

        self.x = x;
        self.y = y;
        self.r = r;
        self.beginAngle = beginAngle;
        self.endAngle = endAngle;
    };
    ChartPie.prototype = {
        inRange: function (x, y) {
            var self = this,
                pointRelativePosition = getAngleFromPoint();

            function getAngleFromPoint() {
                var distanceFromXCenter = x - self.x,
                    distanceFromYCenter = y - self.y,
                    radialDistanceFromCenter = Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter),
                    angle = Math.atan2(distanceFromYCenter, distanceFromXCenter);

                if (distanceFromYCenter < 0) {
                    angle += Math.PI * 2;
                }

                return {
                    angle: 360 - toDegree(angle),
                    distance: radialDistanceFromCenter
                };
            };

            return self.beginAngle <= pointRelativePosition.angle && pointRelativePosition.angle < self.endAngle &&
                pointRelativePosition.distance < self.r;
        },
        tooltipPos: function () {
            var self = this,
                midRadius = -toRadians(self.beginAngle + self.endAngle) / 2,
                r = self.r / 2;

            return {
                x: self.x + Math.cos(midRadius) * r,
                y: self.y + Math.sin(midRadius) * r
            };
        },
    }
    var ChartPoint = function (seriesIndex, groupIndex, x, y, r) {
        var self = this;

        ChartShape.call(self, seriesIndex, groupIndex);

        self.x = x;
        self.y = y;
        self.r = r;
    };
    ChartPoint.prototype = {
        inRange: function (x, y) {
            var self = this,
                distanceFromXCenter = x - self.x,
                distanceFromYCenter = y - self.y;

            return Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter) <= self.r;
        },
        tooltipPos: function () {
            var self = this;
            return {
                x: self.x + 4,
                y: self.y - 4 - Chart.prototype.options.tooltipFontSize
            };
        },
    }

    var ChartAxis = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.LinePen = new Pen();
        self.CoordLinePen = new Pen();

        self.Label = ""
        self.Max = 0;
        self.Min = 0;
        self.Space = 0;

        self.TextAngle = 0;
        self.TextVisible = true;
        self.TextFormat = "0.##";
        self.LineVisible = true;
        self.CoordLineVisible = false;

        self.MarginBeginWeight = 25;
        self.MarginEndWeight = 25;

        self.Scales = [];
        self.CustomCoordLines = [];
    };
    ChartAxis.prototype = {
        children: ["LinePen", "CoordLinePen"],

        afterLoad: function (objJson) {
            var self = this,
                chartStroke = self.report.viewer.alpha.chartStroke,
                isWR = self.report.isWR;

            self.LinePen.loadFromJSON(objJson.LinePen, chartStroke, isWR);
            self.CoordLinePen.loadFromJSON(objJson.CoordLinePen, chartStroke, isWR);
        },

        CalcLabelHeight: function () {
            var self = this;

            return self.Used && self.Label ? self.owner.fontHeight + SMALL_GAP / 2 : 0;
        },
        CalcHorzAxisHeight: function (IsEstimate) {
            return this.DoCalcAxisSize(true, IsEstimate);
        },
        CalcVertAxisWidth: function () {
            return this.DoCalcAxisSize(false, false);
        },
        //对于横向轴，计算其需要的最大显示高度；对于纵向轴，计算其需要的最大显示宽度
        DoCalcAxisSize: function (IsHorzAxis, IsEstimate) {
            var self = this,
                chart = self.owner,
                AxisTexts = [],
                //Text,
                i,
                textHeight = self.owner.fontHeight,
                Ret = 0;

            if (self.Used) {
                if (self.TextVisible && (!IsHorzAxis || !chart.IsDrawNegativeGraph())) { //有正有负图的横轴不占据高度
                    //calculate scale Text and PosVal, save to CChartAxisScales
                    if (IsEstimate) {
                        AxisTexts.push("1Agf");
                    }
                    else {
                        if (self.IsValueAxis) {
                            if (self.Scales.length) {
                                self.Scales.forEach(function (scale) {
                                    AxisTexts.push(scale.Text);
                                });
                            }
                            else {
                                for (i = self.DrawMin; i < self.DrawMax + self.GetScaleTiny() ; i += self.DrawSpace) {
                                    AxisTexts.push(self.ScaleFormatParser.format(i));
                                }
                            }
                        }
                        else {
                            for (i = 0; i < chart.GroupCount; i++) {
                                AxisTexts.push(chart.GroupLabels[i]);
                            }
                        }
                    }

                    //int FinalMax = 0;
                    //CSize NewSize;
                    if (self.TextAngle === -270) { //如果是-270度，文字不要卧倒，而是一个个垂直输出
                        //for (vector<CString>::iterator it=AxisTexts.begin(); it!=AxisTexts.end(); ++it)
                        AxisTexts.forEach(function (AxisText) {
                            Ret = Math.max(Ret, AxisText.length);
                        });
                        Ret *= textHeight;
                    }
                    else {
                        //CSize MaxSize(0, 0);
                        //for (vector<CString>::iterator it=AxisTexts.begin(); it!=AxisTexts.end(); ++it)
                        AxisTexts.forEach(function (AxisText) {
                            Ret = Math.max(Ret, chart.context.measureTextWidth(AxisText));
                        });
                        if (IsHorzAxis) {
                            Ret = Math.abs((Math.sin(toRadians(self.TextAngle)) * Ret)) + 1 + textHeight;
                        }
                    }

                    //Ret += FinalMax;
                }

                if (chart.Chart3DReal && chart.IsHorzGraph() && chart.YAxis === self) {
                    Ret += chart.yView3DDepth;
                }
                if (self.LineVisible) {
                    Ret += SCALELINE_WEIGHT;
                }

                if (Ret) {
                    Ret += SMALL_GAP;
                }
            }

            return Ret;
        },

        //EndPos不包含柱状图之间留下的空白
        //如果无柱图，则为连线图，在组范围起点处输出标记点(Marker)与组刻度
        CalcGroupPos: function (AxisLength, GroupIndex) { //int &BeginPos, int &EndPos, int &LabelMiddlePos
            var self = this,
                chart = self.owner,
                BarCount = chart.IsHorzGraph() ? chart.CalcColumnBarCount() : chart.CalcBarCount(),
                TotalWeight = self.MarginBeginWeight + self.MarginEndWeight + (chart.GroupCount - 1) * 100 + (BarCount > 0 ? chart.BarWidthPercent : 0),

                BeginMargin = TotalWeight ? (AxisLength * self.MarginBeginWeight) / TotalWeight : 0,
                EndMargin = TotalWeight ? (AxisLength * self.MarginEndWeight) / TotalWeight : 0,

                GraphTotalWidth = AxisLength - BeginMargin - EndMargin,
                OneGroupGraphWeight = (BarCount > 0) ? chart.BarWidthPercent : 0,

                TheGroupBeginWeight = GroupIndex * 100,
                TheGroupEndWeight = TheGroupBeginWeight + OneGroupGraphWeight,

                ret = {};

            TotalWeight -= (self.MarginBeginWeight + self.MarginEndWeight);

            ret.BeginPos = BeginMargin;
            ret.EndPos = BeginMargin;
            if (TotalWeight > 0) {
                ret.BeginPos += (GraphTotalWidth * TheGroupBeginWeight) / TotalWeight;
                ret.EndPos += (GraphTotalWidth * TheGroupEndWeight) / TotalWeight;
            }
            ret.LabelMiddlePos = (ret.BeginPos + ret.EndPos) / 2;

            return ret;
        },

        DrawHorzAxisLabel: function (DrawRect) {
            var self = this,
                context = self.owner.context;

            if (!DrawRect.IsRectEmpty() && self.Label) {
                context.drawText(self.Label, (DrawRect.left + DrawRect.right - context.measureTextWidth(self.Label)) / 2, (DrawRect.top + DrawRect.bottom - self.owner.fontHeight) / 2);
            }
        },

        DrawVertAxisLabel: function (DrawRect) {
            var self = this,
                context = self.owner.context;

            if (!DrawRect.IsRectEmpty() && self.Label) {
                context.drawTextRotate(self.Label, (DrawRect.left + DrawRect.right - self.owner.fontHeight) / 2, (DrawRect.top + DrawRect.bottom + context.measureTextWidth(self.Label)) / 2, 90);
            }
        },

        //calculate scale Text and PosVal, save to CChartAxisScales
        DrawAxisTextsPrepare: function (AxisLength) {
            var self = this,
                chart = self.owner,
                i,
                AxisTexts = [];

            if (self.IsValueAxis) {
                if (self.Scales.length) {
                    self.Scales.forEach(function (scale) {
                        AxisTexts.push({
                            Text: scale.Text,
                            PosVal: self.CalcValuePos(scale.PosVal, AxisLength),
                        });
                    });
                }
                else {
                    for (i = self.DrawMin; i < self.DrawMax + self.GetScaleTiny() ; i += self.DrawSpace) {
                        AxisTexts.push({
                            Text: self.ScaleFormatParser.format(i),
                            PosVal: self.CalcValuePos(i, AxisLength),
                        });
                    }
                }
            }
            else {
                for (i = 0; i < chart.GroupCount; i++) {
                    AxisTexts.push({
                        Text: chart.GroupLabels[i] || "",
                        PosVal: self.CalcGroupPos(AxisLength, i).LabelMiddlePos,
                    });
                }
            }

            return AxisTexts;
        },

        DrawHorzAxis: function (DrawRect, GraphDrawRect, TopSideAxis) {
            var self = this,
                chart = self.owner,
                context = chart.context,
                AxisLength = DrawRect.Width() - chart.xView3DDepth,
                DrawNegativeGraph = chart.IsDrawNegativeGraph(),
                ForbidFirstCoordLine = self.IsValueAxis,

                AxisTexts,
                linePen = self.LinePen,
                scaleLinePen = linePen.clone(),
                scalePen3D = linePen.clone(),

                xStart,
                xStart2,
                xEnd,
                xEnd2,
                y,
                y2,
                y3;

            function DrawHorzAxisText(DrawRect, xPos, Text, TopSideAxis, ValuePostive) {
                var context = self.owner.context,
                    x,
                    y,
                    i,
                    textWidth,
                    textLen = Text.length,
                    fontHeight = self.owner.fontHeight;

                if (TopSideAxis) {
                    y = DrawRect.bottom - 1;
                    if (self.LineVisible) {
                        y -= SCALELINE_WEIGHT;
                    }
                    if (chart.Chart3DReal) {
                        y -= chart.yView3DDepth;
                    }
                    xPos += chart.xView3DDepth;
                }
                else {
                    y = DrawRect.top + 1;
                    if (self.LineVisible) {
                        y += SCALELINE_WEIGHT;
                    }
                }

                if (self.TextAngle === -270) {
                    textWidth = context.measureTextWidth("A");
                    x = DrawRect.left + xPos - textWidth;
                    if (TopSideAxis) {
                        y -= (fontHeight * textLen);
                    }

                    for (i = 0; i < textLen; i++) {
                        context.drawText(Text.charAt(i), x, y);
                        y += fontHeight;
                    }
                }
                else {
                    textWidth = context.measureTextWidth(Text);
                    x = DrawRect.left + xPos - Math.abs((textWidth / 2) * Math.cos(toRadians(self.TextAngle))) + Math.abs((fontHeight / 2) * Math.sin(toRadians(self.TextAngle)));
                    if (TopSideAxis) {
                        y -= fontHeight;
                    }
                    if (!ValuePostive) {
                        y -= fontHeight + (2 * SCALELINE_WEIGHT) - 1;
                    }
                    context.drawTextRotate(Text, x, y, self.TextAngle);
                }
            }

            if (self.Used && !DrawRect.IsRectEmpty()) {
                scaleLinePen.Width = 0.5;
                scalePen3D.Width = 0.5;
                scalePen3D.Color = colorGradientLight(linePen.Color);

                if (self.LineVisible) {  //Draw axis line
                    context.selectPen(linePen);

                    xStart = DrawRect.left;
                    xStart2 = xStart + chart.xView3DDepth;
                    xEnd = xStart + AxisLength;
                    xEnd2 = xEnd + chart.xView3DDepth;
                    y = TopSideAxis ? DrawRect.bottom : DrawRect.top;
                    y2 = y - chart.yView3DDepth;
                    y3 = TopSideAxis ? GraphDrawRect.bottom - chart.yView3DDepth * 2 : GraphDrawRect.top;

                    context.DrawHorzLine(y, xStart, xEnd);

                    if (chart.Chart3DReal) {
                        if (!chart.YAxis.Used && chart.Y2Axis.Used && !chart.IsHorzGraph()) {
                            context.drawPolyLine([xEnd2, y2, xStart2, y2, xStart, y], 0);
                            context.drawPolyLine([xEnd2, y3, xStart2, y3, xStart2, y2], 0);
                        }
                        else {
                            context.drawPolyLine([xEnd, y, xEnd2, y2, xStart2, y2], 0);
                            context.drawPolyLine([xEnd2, y2, xEnd2, y3, xStart2, y3], 0);
                        }
                    }

                    context.restorePen();
                }

                AxisTexts = self.DrawAxisTextsPrepare(AxisLength);

                context.selectPen(scaleLinePen);
                AxisTexts.forEach(function (AxisText, groupIndex) {
                    var ValuePostive = chart.IsScatterGraph() || !DrawNegativeGraph ||
                        (self.IsValueAxis ? (AxisText.PosVal >= 0) : (chart.Value(0, groupIndex) >= 0)),
                        x = DrawRect.left + AxisText.PosVal,
                        yBegin,
                        yEnd;

                    //Draw scale line
                    if (self.LineVisible) {
                        if (TopSideAxis) {
                            //yEnd = DrawRect.bottom - 1;
                            //yBegin = yEnd - SCALELINE_WEIGHT;
                            x += chart.xView3DDepth;
                            yEnd = DrawRect.bottom - chart.yView3DDepth;
                            yBegin = yEnd - SCALELINE_WEIGHT;
                        }
                        else {
                            yBegin = DrawRect.top + 1;
                            if (ValuePostive) {
                                yEnd = DrawRect.top + 1 + SCALELINE_WEIGHT;
                            }
                            else {
                                yEnd = DrawRect.top + 1 - SCALELINE_WEIGHT;
                            }
                        }
                        context.DrawVertLine(x, yBegin, yEnd);

                        if (chart.Chart3DReal && !ForbidFirstCoordLine) {
                            //画前后Y轴之间的刻度线
                            if (TopSideAxis) {
                                x -= chart.xView3DDepth;
                                yBegin += chart.yView3DDepth + SCALELINE_WEIGHT;
                            }
                            context.selectPen(scalePen3D);
                            context.drawLine(x, yBegin, x + chart.xView3DDepth, yBegin - chart.yView3DDepth);
                            context.restorePen();
                        }
                    }

                    //Draw Text
                    self.TextVisible && DrawHorzAxisText(DrawRect, AxisText.PosVal, AxisText.Text, TopSideAxis, ValuePostive);

                    //Draw coord line
                    if (self.CoordLineVisible && !ForbidFirstCoordLine && self.IsValueAxis) {
                        context.selectPen(self.CoordLinePen);
                        //context.DrawVertLine(DrawRect.left + AxisText.PosVal, GraphDrawRect.top + 1, GraphDrawRect.bottom);
                        yBegin = GraphDrawRect.top + 1;
                        yEnd = GraphDrawRect.bottom - chart.yView3DDepth;
                        if (TopSideAxis) {
                            yBegin -= chart.yView3DDepth;
                            yEnd -= chart.yView3DDepth;
                        }
                        context.DrawVertLine(x + chart.xView3DDepth, yBegin, yEnd);
                        context.restorePen();
                    }
                    ForbidFirstCoordLine = false;
                });
                context.restorePen();

                //Draw custom coord line
                self.CustomCoordLines.forEach(function (CustomCoordLine) {
                    var xPos = self.CalcValuePos(CustomCoordLine.PosVal, AxisLength);

                    //Draw Text
                    CustomCoordLine.Text && DrawHorzAxisText(DrawRect, xPos, CustomCoordLine.Text, TopSideAxis, true);

                    context.selectPen(CustomCoordLine.LinePen);
                    context.DrawVertLine(DrawRect.left + xPos, GraphDrawRect.top + 1, GraphDrawRect.bottom); //CustomCoordLine.LinePen);
                    context.restorePen();
                });
            }
        },

        DrawVertAxis: function (DrawRect, GraphDrawRect, RightSideAxis, LinkTopSideAxis) {
            var self = this,
                chart = self.owner,
                context = chart.context,
                AxisLength = DrawRect.Height() - chart.yView3DDepth,
                x1,
                y1,
                yBegin,
                x2,
                y2,
                AxisTexts,
                linePen = self.LinePen,
                scaleLinePen = linePen.clone(),
                scalePen3D = linePen.clone();

            function DrawVertAxisText(DrawRect, yPos, Text, RightSideAxis) {
                var context = self.owner.context;

                context.drawText(Text,
                    RightSideAxis ? DrawRect.left + (self.LineVisible ? SCALELINE_WEIGHT : 0) : DrawRect.right - context.measureTextWidth(Text) - (self.LineVisible ? SCALELINE_WEIGHT : 0),
                    yPos - self.owner.fontHeight / 2);
            }

            if (!DrawRect.IsRectEmpty() && self.Used) {
                scaleLinePen.Width = 0.5;
                scalePen3D.Width = 0.5;
                scalePen3D.Color = colorGradientLight(linePen.Color);

                if (self.LineVisible) { //Draw axis line
                    context.selectPen(linePen);

                    x1 = RightSideAxis ? DrawRect.left - chart.xView3DDepth : DrawRect.right;
                    y1 = DrawRect.bottom;
                    if (LinkTopSideAxis) {
                        y1 -= chart.yView3DDepth;
                    }
                    yBegin = y1 - AxisLength;
                    context.DrawVertLine(x1, yBegin, y1 + 1); //多加一个像素点，为了和横轴接上

                    if (chart.Chart3DReal) {
                        x2 = x1 + chart.xView3DDepth;
                        y2 = y1 - chart.yView3DDepth;

                        context.drawPolyLine([
                            x1, y1,
                            x2, y2,
                            x2, y2 - AxisLength,
                            x1, yBegin,
                        ], 0);
                    }

                    context.restorePen();
                }

                context.selectPen(scaleLinePen);
                AxisTexts = self.DrawAxisTextsPrepare(AxisLength);
                AxisTexts.forEach(function (AxisText, groupIndex) {
                    var yPos = self.IsValueAxis ? (DrawRect.bottom - AxisText.PosVal) : (DrawRect.top + AxisText.PosVal + (LinkTopSideAxis ? 0 : chart.yView3DDepth)),
                        y = yPos,
                        xBegin,
                        xEnd;

                    //Draw scale line
                    if (self.LineVisible && (AxisText.PosVal != self.DrawMin)) {
                        xBegin = DrawRect.right - SCALELINE_WEIGHT;
                        xEnd = DrawRect.right;
                        if (RightSideAxis) {
                            xBegin = DrawRect.left;
                            xEnd = DrawRect.left + SCALELINE_WEIGHT;
                        }
                        context.DrawHorzLine(y, xBegin, xEnd);

                        if (chart.Chart3DReal) {
                            //画前后Y轴之间的刻度线
                            context.selectPen(scalePen3D);
                            if (RightSideAxis) {
                                xBegin = DrawRect.left - chart.xView3DDepth;
                                y += chart.yView3DDepth;
                            }
                            else {
                                xBegin = DrawRect.right;
                            }
                            context.drawLine(xBegin, y, xBegin + chart.xView3DDepth, y - chart.yView3DDepth);

                            context.restorePen();
                        }
                    }

                    //Draw Text
                    self.TextVisible && DrawVertAxisText(DrawRect, yPos, AxisText.Text, RightSideAxis);

                    //Draw coord line
                    if (self.CoordLineVisible && self.IsValueAxis) {
                        context.selectPen(self.CoordLinePen);
                        y -= chart.yView3DDepth;
                        context.DrawHorzLine(y, GraphDrawRect.left + chart.xView3DDepth + linePen.Width, GraphDrawRect.right);
                        context.restorePen();
                    }
                });
                context.restorePen();

                //Draw custom coord line
                self.CustomCoordLines.forEach(function (CustomCoordLine) {
                    var yPos = DrawRect.bottom - self.CalcValuePos(CustomCoordLine.PosVal, AxisLength);

                    //Draw Text
                    CustomCoordLine.Text && DrawVertAxisText(DrawRect, yPos, CustomCoordLine.Text, RightSideAxis);

                    context.selectPen(CustomCoordLine.LinePen);
                    context.DrawHorzLine(yPos - chart.yView3DDepth, GraphDrawRect.left + chart.xView3DDepth + linePen.Width, GraphDrawRect.right);
                    context.restorePen();
                });
            }
        },

        PrepareDraw: function () {
            var self = this;

            self.Used = false;
            self.IsValueAxis = false;

            self.DrawMax = -Number.MAX_VALUE;  //Number.MIN_VALUE; //GR_FLOAT_MIN;
            self.DrawMin = Number.MAX_VALUE; //GR_FLOAT_MAX;
            self.DrawSpace = 0;

            self.ScaleFormatParser = new NumericFormatter(self.TextFormat);
        },

        PrepareDrawRange: function () {
            var self = this;

            if (self.Max) {
                self.DrawMax = self.Max;
            }
            else {
                self.Scales.forEach(function (Scale) {
                    self.DrawMax = Math.max(self.DrawMax, Scale.PosVal);
                });
            }

            if (self.Min) {
                self.DrawMin = self.Min;
            }
            else {
                if (self.DrawMin > 0 && self.DrawMax > 0) { //自动计算出来的最小值如果大于0，则把最小值设置为0
                    self.DrawMin = 0;
                }
                else if (self.DrawMin < 0 && self.DrawMax < 0) {
                    self.DrawMax = 0;
                }
                else if (self.owner.NegativeAsZero) {
                    self.DrawMin = 0;
                }
            }

            if (self.DrawMax <= self.DrawMin) {
                self.DrawMin = 0;
                self.DrawMax = 100.0;
            }
        },

        PrepareDrawSpace: function (AxisLength, fontHeightTimes, IsStackedPercentGraph) {
            var self = this,
                PerScalePixels;

            if (self.Space) {
                self.DrawSpace = self.Space;
            }
            else {
                PerScalePixels = self.owner.fontHeight * fontHeightTimes;
                self.DrawSpace = (self.DrawMax - self.DrawMin) * PerScalePixels / AxisLength;
                self.DrawSpace = CalcNearestAlignInt(self.DrawSpace, self.ScaleFormatParser.positiveAnalyser.precision);
            }

            //Ensure m_DrawMax > m_DrawMin &&  m_DrawSpace >= GetScaleTiny()*2
            if (self.DrawMax <= self.DrawMin) {
                self.DrawMax = self.DrawMin + 1;
                self.DrawSpace = 0.2;
            }
            if (self.DrawSpace < self.GetScaleTiny() * 2) {
                self.DrawSpace = self.GetScaleTiny() * 2;
            }

            //如果为自动设定的Y轴最大值，设其为刻度的倍数
            if (!self.Max && !self.Min && !IsStackedPercentGraph) {
                if (self.DrawMax > 0) {
                    self.DrawMax = self.DrawSpace * Math.ceil(self.DrawMax / self.DrawSpace);
                }
                if (self.DrawMin < 0) {
                    self.DrawMin = self.DrawSpace * Math.floor(self.DrawMin / self.DrawSpace);
                }
            }
        },

        GetScaleTiny: function () {
            var self = this;

            return (self.DrawMax - self.DrawMin) / 10000;
        },

        CalcValuePos: function (Val, AxisLength) {
            var self = this;

            return (Val - self.DrawMin) * AxisLength / (self.DrawMax - self.DrawMin);
        },

        //com interface
        get ScaleCount() {
            return this.Scales.length;
        },

        AddCustomScale: function (PosVal, Text) {
            this.Scales.push({
                PosVal: PosVal,
                Text: Text
            });
        },
        EmptyCustomScale: function () {
            this.Scales = [];
        },

        GetScaleText: function (Index) {
            return this.Scales[Index].Text;
        },
        GetScaleValue: function (Index) {
            return this.Scales[Index].PosVal;
        },

        AddCustomCoordLine: function (PosVal, Text, LineWidth, LineColor, LineStyle) {
            var LinePen = new Pen();
            LinePen.Width = LineWidth;
            LinePen.Style = LineStyle;
            LinePen.Color = LineColor;

            this.CustomCoordLines.push({
                PosVal: PosVal,
                Text: Text,
                LinePen: LinePen
            });
        },
        EmptyCustomCoordLine: function () {
            this.CustomCoordLines = [];
        },
    };
    prototypeCopyExtend(ChartAxis, Object);

    var ChartSeries = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.ChartType = grenum.ChartType.BarChart;
        self.ByY2Axis = false;
        self.SeriesName = "";

        self.XValueField = "";
        self.YValueField = "";
        self.ZValueField = "";

        self.FillColor = 0;
        self.FillColorAuto = true;

        self.LabelText = "";
        self.LabelAsGroup = false;
        self.LabelInBar = false;
        self.LabelTextAngle = 0;
        self.TooltipText = "";
        self.ValueFormat = "0.##";

        self.MarkerStyle = grenum.PointMarkerStyle.Circle;
        self.MarkerSize = 4;
        self.MarkerColor = 0x00ffffff;
        self.MarkerColorAuto = true;
        self.MarkerLegendShow = true;

        self.BorderPen = new Pen();
        self.MarkerPen = new Pen();
    };
    ChartSeries.prototype = {
        afterLoad: function (objJson) {
            var self = this,
                alpha = self.report.viewer.alpha,
                chartGraph = alpha.chartGraph,
                chartStroke = alpha.chartStroke,
                isWR = self.report.isWR;

            if (self.ChartType === "StepBarChart") {
                self.ChartType = grenum.ChartType.StackedBarChart;
            }
            else {
                enumMemberValid(self, "ChartType", grenum.ChartType);
            }
            enumMemberValid(self, "MarkerStyle", grenum.PointMarkerStyle);
            colorMemberValid(self, "FillColor", chartGraph);
            colorMemberValid(self, "MarkerColor", chartGraph);

            self.BorderPen.loadFromJSON(objJson.BorderPen, chartStroke, isWR);
            self.MarkerPen.loadFromJSON(objJson.MarkerPen, chartStroke, isWR);
        },

        PrepareDraw: function () { //CChartBaseImpl *pChart)
            var self = this;

            self.ValueFormatParser = new NumericFormatter(self.ValueFormat);
        },


        IsHorzGraph: function () { //是否为横向图表
            var self = this;

            return (self.ChartType === grenum.ChartType.ColumnChart)
                || (self.ChartType === grenum.ChartType.StackedColumnChart)
                || (self.ChartType === grenum.ChartType.StackedColumn100Chart);
        },

        IsPercent100Graph: function () {
            var self = this;

            return (self.ChartType === grenum.ChartType.PieChart)
                || (self.ChartType === grenum.ChartType.StackedBar100Chart)
                || (self.ChartType === grenum.ChartType.StackedColumn100Chart);
        },

        IsBarChart: function () {
            var self = this;

            return (self.ChartType === grenum.ChartType.BarChart)
                || (self.ChartType === grenum.ChartType.StackedBarChart)
                || (self.ChartType === grenum.ChartType.StackedBar100Chart)
                || (self.ChartType === grenum.ChartType.ColumnChart)
                || (self.ChartType === grenum.ChartType.StackedColumnChart)
                || (self.ChartType === grenum.ChartType.StackedColumn100Chart);
        },

        IsScatterGraph: function () {
            var self = this;

            return (self.ChartType === grenum.ChartType.XYScatterChart)
                || (self.ChartType === grenum.ChartType.XYLineChart)
                || (self.ChartType === grenum.ChartType.XYCurveLineChart)
                || (self.ChartType === grenum.ChartType.Bubble);
        },

        CanGroupLabelChart: function () {
            var self = this;

            return (self.ChartType === grenum.ChartType.BarChart)
                || (self.ChartType === grenum.ChartType.ColumnChart);
        },

        HasPointMarker: function () {
            var self = this;

            return (self.ChartType === grenum.ChartType.LineChart)
                || (self.ChartType === grenum.ChartType.CurveLineChart)
                || (self.ChartType === grenum.ChartType.XYScatterChart)
                || (self.ChartType === grenum.ChartType.XYLineChart)
                || (self.ChartType === grenum.ChartType.XYCurveLineChart)
                || (self.ChartType === grenum.ChartType.Bubble);
        },

        Support3D: function () {
            var self = this;

            return (self.ChartType === grenum.ChartType.BarChart)
                || (self.ChartType === grenum.ChartType.StackedBarChart)
                || (self.ChartType === grenum.ChartType.StackedBar100Chart)

			    || (self.ChartType === grenum.ChartType.ColumnChart)
                || (self.ChartType === grenum.ChartType.StackedColumnChart)
                || (self.ChartType === grenum.ChartType.StackedColumn100Chart)

                || (self.ChartType === grenum.ChartType.PieChart);
        },
    };
    prototypeCopyExtend(ChartSeries, Object);

    var Chart = function (owner) {
        var self = this;

        CanvasBox.call(self, owner);

        self.XAxis = new ChartAxis(self);
        self.YAxis = new ChartAxis(self);
        self.Y2Axis = new ChartAxis(self);
        self.Series = new ChartSeriesCollection(self);
        self.Recordset = new Recordset(self);

        self.TitleFont = new FontWrapper(self.Font);
        self.ValueFont = new FontWrapper(self.Font);

        self.Title = "";
        self.Chart3D = false;
        self.Chart3DViewAngle = 35;

        self.LegendVisible = true;
        self.LegendValueVisible = false;
        self.LegendShowSum = false;
        self.LegendAtBottom = false;
        self.LegendColumnCount = 0;
        self.LegendSumLabel = "";

        self.SeriesField = "";
        self.SeriesAuto = true;
        self.GroupField = "";
        self.GroupAuto = true;
        self.GroupCount = 5;
        self.SeriesCount = 2;
        self.AbsNegativeValue = false;
        self.NegativeBarColor = 0x000000ff;

        self.BarWidthPercent = 70;
        self.NegativeAsZero = false;
        self.SingleSeriesColored = true;
        self.Bar3DAxisDepth = 25;

        self.Pie3DHeightDepth = 25;

        self.BubbleScalePerCm = 0;

        self.SeriesLabels = [];
        self.GroupLabels = [];

        self.values = [];
    };
    Chart.prototype = {
        ControlType: grenum.ControlType.Chart,

        children: ["Border", "XAxis", "YAxis", "Y2Axis", "Series"], //"TitleFont", 

        options: {
            tooltipBoxColor: "rgba(0,0,0,.8)",
            tooltipBoxCorner: 4,

            tooltipFontSize: 14, // Number - Tooltip label font size in pixels
            tooltipFontStyle: "normal", // String - Tooltip font weight style
            tooltipTitleFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", // String - Tooltip title font declaration for the scale label
            tooltipFontColor: "#fff",  // String - Tooltip label font colour
        },

        afterLoad: function (objJson) {
            var self = this,
                alpha = self.report.viewer.alpha,
                chartGraph = alpha.chartGraph,
                chartStroke = alpha.chartStroke,
                isWR = self.report.isWR,
                temp,
                i;

            CanvasBox.prototype.afterLoad.call(self, objJson);

            colorMemberValid(self, "NegativeBarColor", chartGraph);

            self.XAxis.loadFromJSON(objJson.XAxis, chartStroke);
            self.YAxis.loadFromJSON(objJson.YAxis, chartStroke);
            self.Y2Axis.loadFromJSON(objJson.Y2Axis, chartStroke);

            self.Series.loadFromJSON(objJson.ChartSeries);
            self.Recordset.loadFromJSON(objJson.Recordset);
            self.TitleFont.loadFromJSON(objJson.TitleFont, isWR);
            self.ValueFont.loadFromJSON(objJson.ValueFont, isWR);

            self.prepareValues();
            temp = objJson[self.getJsonMember("GroupLabel")];
            if (temp) {
                self.GroupLabels = temp.split("\r");
            }
            temp = objJson[self.getJsonMember("SeriesLabel")];
            if (temp) {
                self.SeriesLabels = temp.split("\r");
            }
            temp = objJson[self.getJsonMember("Value")];
            if (temp) {
                temp = temp.split(",");
                i = temp.length;
                while (i-- > 0) {
                    temp[i] = +temp[i];
                }
                self.values = [];
                i = 0;
                while (i < self.SeriesCount) {
                    self.values.push(temp.slice(i++ * self.GroupCount, i * self.GroupCount));
                }
            }
        },

        assign: function (from) {
            var self = this;

            CanvasBox.prototype.assign.call(self, from);

            self.TitleFont.assign(from.TitleFont);
            self.ValueFont.assign(from.ValueFont);
        },

        attachData: function () {
            var self = this,
                recordset = self.Recordset;

            recordset.prepare();

            self.oSeriesField = recordset.FieldByName(self.SeriesField);
            self.oGroupField = recordset.FieldByName(self.GroupField);

            self.Series.forEach(function (series) {
                series.oYValueField = recordset.FieldByName(series.YValueField);
                if (series.IsScatterGraph()) {
                    series.oXValueField = recordset.FieldByName(series.XValueField);
                    if (series.ChartType === grenum.ChartType.Bubble) {
                        series.oZValueField = recordset.FieldByName(series.ZValueField);
                    }
                }
            });

            //if (CurDrawingIndex() <= 0) //(CurDrawingIndex() <= 0)表示是非明细网格中的图表
            //    LoadDrawingData();
            self.loadDrawingData();
        },

        unprepare: function () {
            var self = this;

            CanvasBox.prototype.unprepare.call(self);

            self.Recordset.unprepare();
        },

        loadDrawingData: function () {
            var self = this,
                isFromRecordset = isDataFromRecordset();

            //self.DataLoaded = false;

            function isDataFromRecordset() {
                return self.Series.items.every(function (series) {
                    return series.oYValueField &&
                        (!series.IsScatterGraph() || (series.oXValueField &&
                        (series.ChartType !== grenum.ChartType.Bubble || series.oZValueField)));
                });
            };

            //int DrawingIndex = CurDrawingIndex();
            //if (DrawingIndex > 0)
            //{
            //    PrepareSnapShot();

            //    if ( IsFromRecordset ) //2015/04/16 changed, added (DrawingIndex > 0) //if ( IsFromRecordset )
            //    {
            //        static_cast<CGRRecordset *> (self.Recordset.p)->CloseRun();
            //        //static_cast<CGRRecordset *> (self.Recordset.p)->OpenRun();
            //    }
            //}
            //if ( IsFromRecordset )
            //    static_cast<CGRRecordset *> (self.Recordset.p)->OpenRun(false);

            //static_cast<CGRReport *>(Report())->_Fire_ChartRequestData( this );

            if (isFromRecordset) {
                //if ((static_cast<CGRRecordset *> (self.Recordset.p)->RecordStore()->RecordCount() > 0))
                //    self.DataLoaded = true;

                //if ( !self.DataLoaded )
                //    static_cast<CGRRecordset *> (self.Recordset.p)->FetchDataForChart();

                self.applyDataFromRecordset();
            }
            else if (!self.values) {
                self.EmptyValues(); //目的是把 self.values 属性准备好，为后面顺利生成做准备
            }

            //if (DrawingIndex > 0)
            //    SnapShot();
        },

        applyDataFromRecordset: function () {
            var self = this,
                recordset = self.Recordset,
                seriesItems = self.Series.items,
                isScatter = seriesItems[0].IsScatterGraph(),
                SeriesIndex,
                SeriesLabel,
                GroupIndex,
                GroupLabel,
                val,
                oldval;

            //??? 清除旧数据，如果序列或组簇无关联字段，则默认为一个序列或组簇 TDD。。。测试这点
            if (self.SeriesAuto && self.oSeriesField) {
                self.SeriesCount = 0; //self.SeriesCount = self.pSeriesField? 0 : 1;
                self.SeriesLabels = [];
            }
            if (!isScatter && self.GroupAuto && self.oGroupField) {
                self.GroupCount = 0; //self.GroupCount = self.pGroupField? 0 : 1;
                self.GroupLabels = [];
            }

            self.EmptyValues();

            //ChartSeriesCol::CGRChartSeriess *Seriess = static_cast<ChartSeriesCol::CGRChartSeriess *>(self.pChartSeriess.p);

            recordset.First();
            while (!recordset.Eof()) {
                SeriesIndex = 0;
                if (self.oSeriesField) {
                    SeriesLabel = self.oSeriesField.DisplayText;
                    SeriesIndex = self.GetSeriesIndexByLabel(SeriesLabel, false);
                    if (SeriesIndex < 0 && self.SeriesAuto) {
                        SeriesIndex = self.SeriesCount;
                        self.SeriesLabels.push(SeriesLabel);
                        ++self.SeriesCount;
                    }
                }

                GroupIndex = 0;
                if (self.oGroupField && !isScatter) {
                    GroupLabel = self.oGroupField.DisplayText;
                    GroupIndex = self.GetGroupIndexByLabel(GroupLabel, false);
                    if (GroupIndex < 0 && self.GroupAuto) {
                        GroupIndex = self.GroupCount;
                        self.GroupLabels.push(GroupLabel);
                        ++self.GroupCount;
                    }
                }

                seriesItems.forEach(function (series, index) {
                    //第一个序列为默认序列, 后续序列其序列号由其定义顺序确定
                    if (index) {
                        SeriesIndex = index;
                    }

                    if (isScatter) {
                        self.AddXYZValue(SeriesIndex, series.oXValueField.AsFloat, series.oYValueField.AsFloat, series.oZValueField ? series.oZValueField.AsFloat : undefined);
                    }
                    else {
                        val = series.oYValueField.AsFloat;
                        oldval = self.Value(SeriesIndex, GroupIndex);
                        if (oldval) {
                            val += oldval;
                        }
                        self.SetValue(SeriesIndex, GroupIndex, val);
                    }
                });

                recordset.Next();
            }
        },

        showTooltip: function (activeShape, pos) {
            var self = this,
                options = self.options,
                context = self.context;

            if (!activeShape) {
                activeShape = undefined;
            }

            if (self.activeShape !== activeShape) {
                self.activeShape = activeShape;

                //仅测试用
                //document.getElementById("stylesText").innerText = (self.activeShape ? ("prior: series=" + self.activeShape.series + ",group=" + self.activeShape.group) : "") + (activeShape ? (" current: series=" + activeShape.series + ",group=" + activeShape.group) : "") + "x:" + pos.x + "y:" + pos.y;

                context.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

                self.draw();

                if (activeShape) {
                    //draw tooltip
                    var series = self.graphSerieses[activeShape.series];
                    if (series.TooltipTextBuilder) {
                        var oldFont = context.ctx.font,
                            tooltipText = series.TooltipTextBuilder.generateChartDisplayText(activeShape.series, activeShape.group),
                            shapeTooltipPos = activeShape.tooltipPos(),
                            tooltipTextLines,
                            lineHeight = options.tooltipFontSize + 2,
                            maxTextWidth = 0;

                        context.ctx.font = fontString(options.tooltipFontSize, options.tooltipFontStyle, options.tooltipTitleFontFamily);

                        if (series.tooltipLines > 1) {
                            tooltipTextLines = [];
                            var start = 0,
                                end,
                                lineText;

                            while ((end = tooltipText.indexOf("\n", start)) >= 0) {
                                lineText = tooltipText.substring(start, end - (tooltipText.charAt(end - 1) === "\r" ? 1 : 0));
                                tooltipTextLines.push(lineText);
                                maxTextWidth = Math.max(maxTextWidth, context.measureTextWidth(lineText));
                                start = end + 1;
                            }
                            lineText = tooltipText.substr(start);
                            tooltipTextLines.push(lineText);
                            maxTextWidth = Math.max(maxTextWidth, context.measureTextWidth(lineText));
                        }
                        else {
                            maxTextWidth = context.measureTextWidth(tooltipText);
                        }

                        var tooltipRect = new Rect(shapeTooltipPos.x, shapeTooltipPos.y, shapeTooltipPos.x + maxTextWidth, shapeTooltipPos.y + lineHeight * series.tooltipLines - 2);

                        tooltipRect.InflateRect(options.tooltipBoxCorner, options.tooltipBoxCorner);
                        tooltipRect.OffsetRect(Math.min(self.canvas.width - tooltipRect.right, 0), Math.min(self.canvas.height - tooltipRect.bottom, 0)); //保证不越过右下边界

                        context.selectFillStyle(options.tooltipBoxColor);
                        context.roundRectangle(tooltipRect.left, tooltipRect.top, tooltipRect.Width(), tooltipRect.Height(), options.tooltipBoxCorner, options.tooltipBoxCorner, 1);
                        context.restoreFillStyle();

                        context.selectFillStyle(options.tooltipFontColor);
                        if (tooltipTextLines) {
                            var x = tooltipRect.left + options.tooltipBoxCorner,
                                y = tooltipRect.top + options.tooltipBoxCorner;
                            tooltipTextLines.forEach(function (text) {
                                context.drawText(text, x, y);
                                y += lineHeight;
                            });
                        }
                        else {
                            context.drawTextCenter(tooltipText, (tooltipRect.left + tooltipRect.right) / 2, (tooltipRect.top + tooltipRect.bottom - options.tooltipFontSize) / 2);
                        }
                        context.restoreFillStyle();

                        context.ctx.font = oldFont;
                    }
                }
            }
        },

        //？？如果是明细网格中的图表，同一图表会多次调用 prepareCanvas，
        //则PrepareTextBuilder, Bar3DCalcViewDepth多次执行是没必要的
        //而 PrepareGraphs 没有为不同的批次数据存储不同的数据
        prepareCanvas: function () {
            var self = this,
                onclickGraph = self.onclickGraph,
                onclickLegend = self.onclickLegend,
                ondblclickGraph = self.ondblclickGraph,
                ondblclickLegend = self.ondblclickLegend,
                hasTooltip = 0;

            function PrepareTextBuilder() {
                var seriesItems = self.Series.items,
                    seriesLen = seriesItems.length,
                    i,
                    seriesItem;

                for (i = 0; i < seriesLen; i++) {
                    seriesItem = seriesItems[i];

                    if (seriesItem.LabelText) {
                        seriesItem.LabelTextBuilder = new TextBuilder(self, seriesItem.LabelText);
                    }

                    if (seriesItem.TooltipText) {
                        seriesItem.TooltipTextBuilder = new TextBuilder(self, seriesItem.TooltipText);
                        seriesItem.tooltipLines = 1;
                        var start = 0;
                        while ((start = seriesItem.TooltipText.indexOf("\n", start)) >= 0) {
                            ++start
                            ++seriesItem.tooltipLines;
                        }

                        hasTooltip = 1;
                    }
                }
            }

            function Bar3DCalcViewDepth() {
                var radian = toRadians(self.Chart3DViewAngle);
                self.xView3DDepth = Math.cos(radian) * self.Bar3DAxisDepth;
                self.yView3DDepth = Math.sin(radian) * self.Bar3DAxisDepth;
            }

            function PrepareGraphs() { //将序列按类型归类整理
                var seriesItems = self.Series.items,
                    graphs = self.graphs = [],     //通常为一个，如果是混和图表，则包含多个对象
                    graphSerieses = self.graphSerieses = [], //引用 this.Series 中的对象，一组 Series 数据对应一条 graphSeries
                    seriesIndex,
                    graphSeries;

                //应该根据 SeriesCount 确定各个序列对应使用的图形,并进行归类
                for (seriesIndex = 0; seriesIndex < self.SeriesCount; seriesIndex++) {
                    graphSeries = (seriesIndex < seriesItems.length) ? seriesItems[seriesIndex] : seriesItems[0];
                    graphSerieses.push(graphSeries);

                    for (var i = 0; i < graphs.length; i++) {
                        if (graphSeries.ChartType === graphSerieses[graphs[i][0]].ChartType) {
                            graphs[i].push(seriesIndex);
                            break;
                        }
                    }
                    if (i === graphs.length) {
                        graphs.push([seriesIndex]);
                    }
                }
            }

            function graphByPos(eventPosition) {
                var len = self.shapes.length,
                    i,
                    shape;

                //如果有多个不同序列的图形,矩形图形占据区域大(会重叠其它图形),应该先判断其它图形
                if (self.graphs.length > 1) {
                    for (i = 0; i < len; i++) {
                        shape = self.shapes[i];
                        if (!shape.rect && shape.inRange(eventPosition.x, eventPosition.y)) {
                            return shape;
                        }
                    }
                }

                for (i = 0; i < len; i++) {
                    shape = self.shapes[i];
                    if (shape.inRange(eventPosition.x, eventPosition.y)) {
                        return shape;
                    }
                }

                return 0;
            }

            function legendByPos(eventPosition) {
                var i = self.shapesL.length,
                    shape;

                while (i-- > 0) {
                    shape = self.shapesL[i];
                    if (shape.inRange(eventPosition.x, eventPosition.y)) {
                        return shape;
                    }
                }

                return 0;
            }

            self.Chart3DReal = self.Chart3D && self.Support3D();
            self.xView3DDepth = 0;
            self.yView3DDepth = 0;
            self.Chart3DReal && Bar3DCalcViewDepth();
            PrepareTextBuilder();
            PrepareGraphs();

            //Set up tooltip events on the chart
            if (hasTooltip) {
                bindEvents(self, ["mousemove", "touchstart", "touchmove", "mouseout"], function (evt) {
                    var eventPosition,
                        activeShape;
                    //var activeBars = (evt.type !== 'mouseout') ? this.getBarsAtEvent(evt) : [];

                    //this.eachBars(function(bar){
                    //    bar.restore(['fillColor', 'strokeColor']);
                    //});
                    //helpers.each(activeBars, function(activeBar){
                    //    activeBar.fillColor = activeBar.highlightFill;
                    //    activeBar.strokeColor = activeBar.highlightStroke;
                    //});
                    //this.showTooltip(activeBars);

                    if (evt.type !== 'mouseout') {
                        eventPosition = getRelativePosition(evt);
                        activeShape = graphByPos(eventPosition);
                    }

                    //this.eachBars(function(bar){
                    //    bar.restore(['fillColor', 'strokeColor']);
                    //});
                    //helpers.each(activeBars, function(activeBar){
                    //    activeBar.fillColor = activeBar.highlightFill;
                    //    activeBar.strokeColor = activeBar.highlightStroke;
                    //});
                    self.showTooltip(activeShape, eventPosition);

                    ////仅测试用
                    //if (activeShape) {
                    //    document.getElementById("htmlText").innerText = evt.type + "x=" + eventPosition.x + ", y=" + eventPosition.y +
                    //        ", series=" + activeShape.series + ", group=" + activeShape.group;
                    //}
                    //else {
                    //    document.getElementById("htmlText").innerText = evt.type;
                    //}
                });
            }

            //TDD...事件没起作用，resize事件好像只能在window对象上生效
            //if (self.report.fitToHolder) {
            //    addEvent(self.canvas, "resize", function (evt) {
            //        alert("chart resize");
            //    });
            //}

            if (onclickGraph || onclickLegend) {
                addEvent(self.canvas, "click", function (evt) {
                    var eventPosition = getRelativePosition(evt),
                        shape;

                    if (onclickGraph) {
                        shape = graphByPos(eventPosition);
                        shape && onclickGraph(evt, self, shape.series, shape.group);
                    }

                    if (onclickLegend) {
                        shape = legendByPos(eventPosition);
                        shape && onclickLegend(evt, self, shape.series, shape.group);
                    }
                });
            }

            if (ondblclickGraph || ondblclickLegend) {
                addEvent(self.canvas, "dblclick", function (evt) {
                    var eventPosition = getRelativePosition(evt),
                        shape;

                    if (ondblclickGraph) {
                        shape = graphByPos(eventPosition);
                        shape && ondblclickGraph(evt, self, shape.series, shape.group);
                    }

                    if (ondblclickLegend) {
                        shape = legendByPos(eventPosition);
                        shape && ondblclickLegend(evt, self, shape.series, shape.group);
                    }
                });
            }
        },

        //cloneCanvas: function () {
        //    var self = this,
        //        newCanvasBox = new Chart(self.owner);

        //    newCanvasBox.assign(self);
        //    return newCanvasBox;
        //},

        //draw: function (ctx, width, height) {
        draw: function (toUpdateShapes) { //toUpdateShapes指示是否要重建图形shapes，初次绘制，或数据或绘制区域大小改变时需要重建shapes
            var self = this,

                canvas = self.canvas,
                width = canvas.width,
                height = canvas.height,
                context = self.context = new Context(canvas.getContext("2d")),

                DrawRect = new Rect(0, 0, width, height),

                graphs = self.graphs,
                graphSerieses = self.graphSerieses,
                xAxis = self.XAxis,
                yAxis = self.YAxis,
                y2Axis = self.Y2Axis,

                i,
                len,
                DrawTitleHeight = 0,
                ShowMaxValue;

            function PrepareDraw() {
                var isScatterGraph = self.IsScatterGraph(),
                    seriesItems = self.Series.items,
                    chartType = seriesItems[0].ChartType,
                    IsStackedPercentGraph = chartType === grenum.ChartType.StackedBar100Chart || chartType === grenum.ChartType.StackedColumn100Chart,
                    ZShowMaxValue = 0,
                    ZValueTotal = 0,
                    YAxisLength,
                    XAxisLength;

                xAxis.PrepareDraw();
                yAxis.PrepareDraw();
                y2Axis.PrepareDraw();

                len = seriesItems.length;
                for (i = 0; i < len; i++) {
                    seriesItems[i].PrepareDraw(this);
                }

                xAxis.Used = true;
                xAxis.IsValueAxis = false;
                yAxis.IsValueAxis = true;
                y2Axis.IsValueAxis = true;

                //计算出标题需要占据的高度
                if (self.Title) {
                    DrawTitleHeight = fontHeight(self.getUsingTitleFont()) + BIG_GAP;
                }

                //calculate out m_DrawMaximumValueIndex & m_DrawMinimumValueIndex
                if (isScatterGraph) {
                    xAxis.IsValueAxis = true;

                    graphs.forEach(function (graph) {
                        graph.forEach(function (seriesIndex) {
                            var seriesData = self.values[seriesIndex],
                                seriesDataLen = seriesData ? seriesData.length : 0,
                                dataItem,
                                UsedXAxis = xAxis,
                                UsedYAxis = self.YAxisOfSeries(graphSerieses[seriesIndex]);

                            UsedYAxis.Used = true;

                            for (i = 0; i < seriesDataLen; i++) {
                                dataItem = seriesData[i];

                                if (dataItem.y < UsedYAxis.DrawMin)
                                    UsedYAxis.DrawMin = dataItem.y;
                                if (dataItem.y > UsedYAxis.DrawMax)
                                    UsedYAxis.DrawMax = dataItem.y;

                                if (dataItem.x < UsedXAxis.DrawMin)
                                    UsedXAxis.DrawMin = dataItem.x;
                                if (dataItem.x > UsedXAxis.DrawMax)
                                    UsedXAxis.DrawMax = dataItem.x;

                                if (ZShowMaxValue < dataItem.z)
                                    ZShowMaxValue = dataItem.z;
                                ZValueTotal += dataItem.z;
                            }
                        });
                    });

                    xAxis.PrepareDrawRange();
                }
                else { //if ( IsScatterGraph() )
                    graphs.forEach(function (graph) {
                        var chartType = graphSerieses[graph[0]].ChartType,
                            IsStackedGraph = (chartType === grenum.ChartType.StackedBarChart) || (chartType === grenum.ChartType.StackedBar100Chart) || (chartType === grenum.ChartType.StackedColumnChart) || (chartType === grenum.ChartType.StackedColumn100Chart),
                            groupIndex,
                            groupTotalValue; //CChartBaseImpl::IsStackedGraph((*itGraph)->ChartType());

                        for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                            groupTotalValue = 0;
                            graph.forEach(function (seriesIndex) {
                                var Value = self.Value(seriesIndex, groupIndex),
                                    UsedYAxis = self.YAxisOfSeries(graphSerieses[seriesIndex]);

                                if (IsStackedGraph) {
                                    groupTotalValue += Value;
                                }
                                else {
                                    UsedYAxis.Used = true;
                                    if (self.AbsNegativeValue) {
                                        Value = Math.abs(Value);
                                    }
                                    if (Value < UsedYAxis.DrawMin) {
                                        UsedYAxis.DrawMin = Value;
                                    }
                                    if (Value > UsedYAxis.DrawMax)
                                        UsedYAxis.DrawMax = Value;
                                }
                            });
                            if (IsStackedGraph) {
                                var graphFirstSeries = graphSerieses[graph[0]],
                                    UsedYAxis = self.YAxisOfSeries(graphFirstSeries);

                                UsedYAxis.Used = true;

                                if (IsStackedPercentGraph) {
                                    //堆积百分比图的轴值范围始终为 0 - 100
                                    UsedYAxis.DrawMin = 0;
                                    UsedYAxis.DrawMax = 100;
                                }
                                else {
                                    if (groupTotalValue < UsedYAxis.DrawMin) {
                                        UsedYAxis.DrawMin = groupTotalValue;
                                    }
                                    if (groupTotalValue > UsedYAxis.DrawMax) {
                                        UsedYAxis.DrawMax = groupTotalValue;
                                    }
                                }
                            }
                        }
                    });
                }

                if (!yAxis.Used && !y2Axis.Used) {
                    yAxis.Used = true;
                }
                if (yAxis.Used) {
                    ShowMaxValue = yAxis.DrawMax;
                }
                if (y2Axis.Used && (ShowMaxValue < y2Axis.DrawMax)) {
                    ShowMaxValue = y2Axis.DrawMax;
                }

                yAxis.PrepareDrawRange();
                y2Axis.PrepareDrawRange();

                YAxisLength = height - DrawTitleHeight - xAxis.CalcLabelHeight() - xAxis.CalcHorzAxisHeight(true);
                YAxisLength = Math.max(YAxisLength, 1);

                //calculate Y/Y2 Axis.m_DrawSpace;
                yAxis.PrepareDrawSpace(YAxisLength, 3, IsStackedPercentGraph);
                y2Axis.PrepareDrawSpace(YAxisLength, 3, IsStackedPercentGraph);

                //<<---------------------
                if (isScatterGraph) {
                    XAxisLength = width - yAxis.CalcLabelHeight() - yAxis.CalcVertAxisWidth() - y2Axis.CalcLabelHeight() - y2Axis.CalcVertAxisWidth();
                    XAxisLength = Math.max(XAxisLength, 1);

                    //calculate XAxis.DrawSpace;
                    //if (xAxis.Space != 0) {
                    //    xAxis.DrawSpace = xAxis.Space;
                    //}
                    //else {
                    //    //PerScalePixels = fontHeight( self.getUsingFont() ) * 6; //GetFontPoint() * 6; 
                    //    xAxis.DrawSpace = CalcNearestAlignInt((xAxis.DrawMax - xAxis.DrawMin) * fontHeight(self.getUsingFont()) * 6 /
                    //        XAxisLength, xAxis.ScaleFormatParser.positiveAnalyser.precision);
                    //}

                    ////Ensure XAxis.DrawMax > XAxis.DrawMin &&  XAxis.DrawSpace >= XAxis().GetScaleTiny*2
                    //if (xAxis.DrawMax <= xAxis.DrawMin) {
                    //    xAxis.DrawMax = xAxis.DrawMin + 1;
                    //    xAxis.DrawSpace = 0.2;
                    //}
                    //if (xAxis.DrawSpace < xAxis.GetScaleTiny() * 2) {
                    //    xAxis.DrawSpace = xAxis().GetScaleTiny() * 2;
                    //}
                    ////如果为自动设定的X轴最大值，设其为刻度的倍数
                    //if (xAxis.Max === 0) {
                    //    xAxis.DrawMax = Math.ceil((xAxis.DrawMax - 0.1) / xAxis.DrawSpace) * xAxis.DrawSpace;
                    //}
                    xAxis.PrepareDrawSpace(XAxisLength, 6, false);

                    YAxisLength = height - DrawTitleHeight - xAxis.CalcLabelHeight() - xAxis.CalcHorzAxisHeight(false);
                    YAxisLength = Math.max(YAxisLength, 1);

                    //根据需要自动求 m_DrawBubbleScalePerCm 如果生成不合理，请参考5.8版中的做法
                    (seriesItems[0].ChartType === grenum.ChartType.Bubble) && prepareBubbleDraw();
                }
                //>>---------------------

                function prepareBubbleDraw() {
                    var GraphDrawArea,
                        CmSquare,
                        BubbleMaxSquareBorderLen;


                    self.DrawBubbleScalePerCm = self.BubbleScalePerCm;
                    if (self.DrawBubbleScalePerCm <= 0) {
                        //图形按正方形计算，求出1平方cm表示的值
                        GraphDrawArea = XAxisLength * YAxisLength * BubbleCircleCoverRatio; //所有图形的显示区域像素点数(面积)
                        CmSquare = GraphDrawArea / (PixelsPerCm * PixelsPerCm); //多少平方CM
                        self.DrawBubbleScalePerCm = ZValueTotal / CmSquare; //一个平方CM 表示 多少的Z值
                    }

                    //预留画图形空间，增大最大值
                    BubbleMaxSquareBorderLen = Math.sqrt(ZShowMaxValue / self.DrawBubbleScalePerCm) * PixelsPerCm; //最大值的显示正方形的边长，以Pixel为单位
                    if (yAxis.Max === 0) {
                        //double AddVal = (yAxis.DrawMax - yAxis.DrawMin) * (BubbleMaxSquareBorderLen/2) / YAxisLength;
                        yAxis.DrawMax += (yAxis.DrawMax - yAxis.DrawMin) * (BubbleMaxSquareBorderLen / 2) / YAxisLength;
                    }
                    if (xAxis.Max == 0) {
                        //double AddVal = (xAxis.DrawMax - xAxis.DrawMin) * (BubbleMaxSquareBorderLen/2) / XAxisLength;
                        xAxis.DrawMax += (xAxis.DrawMax - xAxis.DrawMin) * (BubbleMaxSquareBorderLen / 2) / XAxisLength;
                    }
                }
            }; //end of PrepareDraw

            function drawLegend(chart) {
                var LegendSize;

                function LegendIsGroup() {
                    var //self = this,
                        firstSeriesType = chart.Series.items[0].ChartType;

                    return (chart.SeriesCount === 1) && chart.SingleSeriesColored
                        && ((firstSeriesType === grenum.ChartType.BarChart)
                        || (firstSeriesType === grenum.ChartType.LineChart)
                        || (firstSeriesType === grenum.ChartType.CurveLineChart)

                        || (firstSeriesType === grenum.ChartType.ColumnChart));
                }
                function LegendRealShowValue() {
                    //var self = this;

                    return chart.LegendValueVisible && (!chart.IsScatterGraph() || chart.Series.items[0].ChartType === grenum.ChartType.Bubble);
                }
                function LegendRealShowSum() {
                    //var self = this;

                    return chart.LegendShowSum && LegendRealShowValue();
                }
                function LegendItemCount() {
                    //var chart = this;

                    return (LegendIsGroup() ? chart.GroupCount : chart.SeriesCount) + (LegendRealShowSum() ? 1 : 0);
                }
                function LegendIsSumItem(SeriesIndex) {
                    //var self = this;
                    return LegendIsGroup() ? (SeriesIndex === chart.GroupCount) : (SeriesIndex === chart.SeriesCount);
                }
                function LegendItemLabel(SeriesIndex) {
                    //var self = this;

                    function LegendSumLabelShow() {
                        return chart.LegendSumLabel || "合计";
                    }

                    return LegendIsSumItem(SeriesIndex) ? LegendSumLabelShow() :
                        (LegendIsGroup() ? chart.GroupLabels[SeriesIndex] : chart.getSeriesShowLabel(SeriesIndex));
                }
                function LegendItemValueText(legendIndex) {
                    var //self = this,
                        LegendItemValue,
                        series = chart.graphSerieses[0];

                    if (LegendIsSumItem(legendIndex)) {
                        LegendItemValue = chart.GetTotalValue();
                    }
                    else if (LegendIsGroup()) {
                        LegendItemValue = chart.Value(0, legendIndex);
                    }
                    else {
                        LegendItemValue = chart.GetSeriesTotalValue(legendIndex);
                        series = chart.graphSerieses[legendIndex];
                    }
                    return LegendItemValue === undefined ? "" : series.ValueFormatParser.format(LegendItemValue);
                }
                function LegendGetSeriesGroup(legendIndex) {
                    var ret = {
                        series: -1,
                        group: -1
                    };

                    if (!LegendIsSumItem(legendIndex)) {
                        if (LegendIsGroup()) {
                            ret.group = legendIndex;
                        }
                        else {
                            ret.series = legendIndex;
                        }
                    }

                    return ret;
                }
                function LegendDrawGraph(LegendIndex, GraphRect) {
                    var //self = this,
                        context = chart.context,
                        IsDrawPointMarker,
                        FillColor = chart.GetGraphFillColor(LegendIndex),
                        series;

                    //ATLASSERT( !LegendIsSumItem(LegendIndex) );

                    if (!LegendIsGroup()) {
                        series = chart.graphSerieses[LegendIndex];
                        IsDrawPointMarker = series.HasPointMarker() && series.MarkerLegendShow;
                        IsDrawPointMarker && context.DrawPointMarker(GraphRect, series.MarkerStyle, series.MarkerPen, FillColor);
                    }
                    if (!IsDrawPointMarker) {
                        context.selectFillColor(FillColor);
                        context.rectangle2(GraphRect, 1);
                        context.restoreFillStyle();
                    }
                }

                //由 LegendColumnCount 确定一行最多显示的个数，如果为0，则一行尽量多显示
                //记录下每行总宽度，让内容居中显示
                function DrawHorzSideLegend(DrawRect) {
                    //ATLASSERT(m_SeriesCount > 0);
                    var //self = this,
                        context = chart.context,
                        ShowValue = LegendRealShowValue(),
                        LegendColumnCount = chart.LegendColumnCount,
                        RowMaxItemCount = (LegendColumnCount > 0) ? LegendColumnCount : 999,

                        MaxRowWidth = DrawRect.Width(),
                        RowHeight = chart.fontHeight * 2,
                        BoxWeight = RowHeight * 3 / 4,
                        LengendItemCount = LegendItemCount(),
                        TheRowSplusWidth = MaxRowWidth,
                        TheLengendItemWidth,

                        i,
                        j,

                        RowWidths = [],
                        RowInfo = { Count: 0, Width: 0 },
                        LegendHeight,
                        ItemRect,
                        ColorBoxRect,
                        textTop,
                        text;

                    for (i = 0; i < LengendItemCount; ++i) {
                        //计算出一个项目需要的显示总宽度 BIG_GAP + ColorBox + SMALL_GAP + Label + [SMALL_GAP + Value]
                        TheLengendItemWidth = BIG_GAP + BoxWeight + SMALL_GAP;
                        TheLengendItemWidth += context.measureTextWidth(LegendItemLabel(i));
                        if (ShowValue) {
                            TheLengendItemWidth += SMALL_GAP + context.measureTextWidth(LegendItemValueText(i));
                        }

                        if (((TheRowSplusWidth < TheLengendItemWidth) || (RowInfo.Count >= RowMaxItemCount)) && (RowInfo.Width > 0)) {
                            RowWidths.push(RowInfo);

                            RowInfo = { Count: 0, Width: 0 };
                            TheRowSplusWidth = MaxRowWidth;
                        }
                        RowInfo.Count++;
                        RowInfo.Width += TheLengendItemWidth;
                        TheRowSplusWidth -= TheLengendItemWidth;
                    }
                    if (RowInfo.Count > 0) {
                        RowWidths.push(RowInfo);
                    }

                    LegendHeight = SMALL_GAP + RowWidths.length * RowHeight;

                    j = 0;
                    RowInfo = RowWidths[j];
                    i = DrawRect.bottom - LegendHeight + SMALL_GAP;
                    ItemRect = new Rect((DrawRect.left + DrawRect.right - RowInfo.Width) / 2, DrawRect.bottom - LegendHeight + SMALL_GAP, 0, i + RowHeight);
                    for (i = 0; i < LengendItemCount; ++i) {
                        if (RowInfo.Count <= 0) {
                            j++;
                            RowInfo = RowWidths[j];

                            ItemRect.left = (DrawRect.left + DrawRect.right - RowInfo.Width) / 2;
                            ItemRect.top = ItemRect.bottom;
                            ItemRect.bottom += RowHeight;
                        }
                        RowInfo.Count--;

                        //ColorBox
                        ItemRect.left += BIG_GAP;
                        MaxRowWidth = ItemRect.left; //记录本项最左边的位置
                        if (i < LengendItemCount - 1 || !LegendIsSumItem(i)) {
                            TheLengendItemWidth = (ItemRect.top + ItemRect.bottom - BoxWeight) / 2;
                            ColorBoxRect = new Rect(ItemRect.left, TheLengendItemWidth, ItemRect.left + BoxWeight, TheLengendItemWidth + BoxWeight);
                            LegendDrawGraph(i, ColorBoxRect);
                        }
                        ItemRect.left += BoxWeight;

                        textTop = (ItemRect.top + ItemRect.bottom - chart.fontHeight) / 2;

                        //Label
                        text = LegendItemLabel(i);
                        ItemRect.left += SMALL_GAP;
                        ItemRect.right = ItemRect.left + context.measureTextWidth(text);
                        context.drawText(text, ItemRect.left, textTop);
                        ItemRect.left = ItemRect.right;

                        //Value
                        if (ShowValue) {
                            text = LegendItemValueText(i);

                            ItemRect.left += SMALL_GAP;
                            ItemRect.right = ItemRect.left + context.measureTextWidth(text);
                            context.drawText(text, ItemRect.left, textTop); //不能完整显示的文字用省略号
                            ItemRect.left = ItemRect.right;
                        }

                        //记录绘制位置信息
                        if (chart.toUpdateShapes) {
                            RowMaxItemCount = LegendGetSeriesGroup(i);
                            chart.shapesL.push(new ChartRect(RowMaxItemCount.series, RowMaxItemCount.group,
                                new Rect(MaxRowWidth, ItemRect.top, ItemRect.right, ItemRect.bottom)));
                        }
                    }

                    return LegendHeight;
                }

                function DrawVertSideLegend(DrawRect) {
                    //ATLASSERT(m_SeriesCount > 0);
                    var //self = this,
                        context = chart.context,
                        ShowValue = LegendRealShowValue(),
                        ShowSum = LegendRealShowSum(),
                        LengendItemCount = LegendItemCount(),
                        ColumnCount = chart.LegendColumnCount,

                        RowHeight = chart.fontHeight * 2,
                        BoxWeight = RowHeight * 3 / 4,

                        MaxLegendRowHeight = DrawRect.Height() - 2 * SMALL_GAP,
                        MaxLabelWidth = 0,
                        MaxValueWidth = 0,
                        MaxWidth,

                        LegendHeight = SMALL_GAP * 2,
                        RowHeights = [],
                        EndEllipsis,
                        IsSumRow,

                        i,
                        j,
                        x,
                        y,
                        z,

                        RowsPerColumn = [], //记录每栏的行数

                        OneColumnWidth,
                        LegendWidth,
                        LegendRect,
                        ColorBoxRect,
                        LabelTextRect,
                        ValueTextRect;

                    for (i = 0; i < LengendItemCount; ++i) {
                        //CString Label = LegendItemLabel(i);
                        //TextSize = MeasureDevice()->MeasureTextSize(Label, Label.GetLength(), TRUE, AllowMaxLabelTextWidth); //TextSize = GRReuse::GetTextSize(MemDC(), Label, Label.GetLength(), TRUE, FALSE, AllowMaxLabelTextWidth);
                        x = context.measureTextWidth(LegendItemLabel(i));
                        //TextSize.cy += 2;
                        if (MaxLabelWidth < x) {
                            MaxLabelWidth = x;
                        }
                        y = RowHeight; //TheRowHeight = max(RowHeight, TextSize.cy);
                        LegendHeight += y;
                        RowHeights.push(y);

                        if (ShowValue) {
                            x = context.measureTextWidth(LegendItemValueText(i));
                            if (MaxValueWidth < x) {
                                MaxValueWidth = x;
                            }
                        }
                    }

                    MaxWidth = MaxLabelWidth + SMALL_GAP;
                    if (MaxValueWidth > 0) {
                        MaxWidth += (MaxValueWidth + SMALL_GAP);
                    }
                    //int BoxWeight = RowHeight * 3 / 4;

                    //<<-------------------------------------------------------------------------
                    //计算栏数，栏高等。 考虑多栏显示
                    if (ColumnCount <= 0) {
                        ColumnCount = 1;
                        if (LegendHeight > DrawRect.Height()) {
                            x = 0;
                            for (i = 0; i < LengendItemCount; ++i) {
                                //TotalHeight += RowHeights[i];
                                if (x > MaxLegendRowHeight) {
                                    ColumnCount++;
                                    x = RowHeights[i];
                                }
                            }
                        }
                    }

                    //如果项目太多，舍弃掉不能显示的项目行，显示"... ..."行，最后的合计行肯定也要显示
                    //vector<int>::iterator itRowHeight = RowHeights.begin();
                    //int MaxLegendRowHeight = DrawRect.Height() - 2*SMALL_GAP;
                    if (MaxLegendRowHeight < RowHeights[0]) { //如果高度太小，则不进行输出
                        return 0;
                    }
                    i = 0;
                    for (x = 0; x < ColumnCount; x++) {                 //for (int Column=0; Column<ColumnCount; ++Column)
                        y = MaxLegendRowHeight; //int SplusHeight = MaxLegendRowHeight;
                        while (i < LengendItemCount && y > RowHeights[i]) {
                            //if (itRowHeight == RowHeights.end())
                            //    break;
                            y -= RowHeights[i++];

                            //++itRowHeight;
                            //2014/09/11 added
                            //if (itRowHeight == RowHeights.end())
                            //    break;
                        }
                    }
                    EndEllipsis = (i < LengendItemCount);
                    if (EndEllipsis) {
                        x = LengendItemCount; //vector<int>::iterator itRowHeightEnd = RowHeights.end();
                        if (ShowSum) {
                            i--;
                            x--;
                        }
                        RowHeights.splice(i, x - i); //RowHeights.erase(itRowHeight, itRowHeightEnd);
                    }

                    //根据栏数确定每栏显示的行数，并确定最大栏高度
                    x = RowHeights.length;
                    y = ColumnCount;
                    z = Math.ceil(x / ColumnCount); //(x-1) / ColumnCount + 1;
                    RowsPerColumn = createArray(ColumnCount, 0); //vector<int> RowsPerColumn(ColumnCount); //记录每栏的行数
                    if (ShowSum) { //如果有合计，最后一栏显示较多的行
                        RowsPerColumn[ColumnCount - 1] = z;
                        x -= z;
                        y--;
                        if (y > 0) {
                            z = Math.ceil(x / y); //(x-1)/y + 1;
                        }
                    }
                    for (i = 0; i < y; i++) {
                        RowsPerColumn[i] = Math.min(z, x);
                        x -= RowsPerColumn[i];
                    }

                    y = 0; //int ColumnMaxHeight = 0;
                    i = 0; //itRowHeight = RowHeights.begin();
                    for (x = 0; x < ColumnCount; x++) {
                        z = 0;
                        for (j = 0; j < RowsPerColumn[x]; j++) {
                            z += RowHeights[i++];
                        }
                        if (y < z) {
                            y = z;
                        }
                    }
                    LegendHeight = Math.min(DrawRect.Height(), y + 2 * SMALL_GAP);

                    //总宽度不超过整个宽度的2/3，这样需要缩小每列的宽度，标签文字可能显示不全
                    OneColumnWidth = SMALL_GAP + BoxWeight + SMALL_GAP + MaxWidth;
                    LegendWidth = OneColumnWidth * ColumnCount + SMALL_GAP;
                    if (LegendWidth > DrawRect.Width() * 2 / 3) {
                        LegendWidth = DrawRect.Width() * 2 / 3;
                        y = OneColumnWidth;
                        OneColumnWidth = (LegendWidth - SMALL_GAP) / ColumnCount;
                        MaxLabelWidth -= (y - OneColumnWidth);
                    }
                    //ATLASSERT(LegendWidth <= DrawRect.Width());

                    x = DrawRect.right - LegendWidth;
                    y = (DrawRect.top + DrawRect.bottom - LegendHeight) / 2;
                    LegendRect = new Rect(x, y, x + LegendWidth, y + LegendHeight);
                    //>>-------------------------------------------------------------------------

                    context.rectangle2(LegendRect);

                    x = LegendRect.left + SMALL_GAP;
                    y = OneColumnWidth - SMALL_GAP;

                    ColorBoxRect = new Rect(x, 0, x + BoxWeight, 0);
                    x += (ColorBoxRect.Width() + SMALL_GAP);
                    y -= (ColorBoxRect.Width() + SMALL_GAP);

                    LabelTextRect = new Rect(x, LegendRect.top + SMALL_GAP, x + Math.min(y, MaxLabelWidth + SMALL_GAP), 0);
                    x += (LabelTextRect.Width() + SMALL_GAP);
                    y -= (LabelTextRect.Width() + SMALL_GAP);

                    ValueTextRect = new Rect(x, 0, x + y, 0);

                    //均匀分配每栏输出数
                    x = RowHeights.length - 1;
                    if (ShowSum) {
                        x--;
                    }
                    y = 0; //itRowHeight = RowHeights.begin();
                    for (i = 0; i < ColumnCount; i++) {
                        LabelTextRect.top = LegendRect.top + SMALL_GAP;
                        for (j = 0; j < RowsPerColumn[i]; ++j) {
                            LabelTextRect.bottom = LabelTextRect.top + RowHeights[y];

                            z = (LabelTextRect.top + LabelTextRect.bottom - chart.fontHeight) / 2; //text top position

                            //输出省略号表示行
                            if (EndEllipsis && x === y) {
                                context.drawText("... ...", ColorBoxRect.left, z); //不能完整显示的文字用省略号
                            }
                            else {
                                ColorBoxRect.top = (LabelTextRect.top + LabelTextRect.bottom - BoxWeight) / 2;
                                ColorBoxRect.bottom = ColorBoxRect.top + BoxWeight;

                                IsSumRow = ShowSum && (y === RowHeights.length - 1);
                                if (IsSumRow) {
                                    y = LengendItemCount - 1;
                                }
                                else {
                                    LegendDrawGraph(y, ColorBoxRect);
                                }

                                context.drawText(LegendItemLabel(y), LabelTextRect.left, z); //不能完整显示的文字用省略号

                                ShowValue && context.drawTextAlign(LegendItemValueText(y), ValueTextRect.left, z, ValueTextRect.Width(), chart.fontHeight, grenum.TextAlign.TopRight);

                                if (IsSumRow) {
                                    context.selectPen(new Pen(0.5, 0x0, grenum.PenStyle.Solid)); //width, color, style
                                    context.DrawHorzLine(LabelTextRect.top, ColorBoxRect.left, ValueTextRect.right);
                                    context.restorePen();
                                }
                            }

                            //记录绘制位置信息
                            if (chart.toUpdateShapes) {
                                MaxLabelWidth = LegendGetSeriesGroup(y);
                                chart.shapesL.push(new ChartRect(MaxLabelWidth.series, MaxLabelWidth.group,
                                    new Rect(ColorBoxRect.left, ColorBoxRect.top, ValueTextRect.right, ColorBoxRect.bottom)));
                            }

                            LabelTextRect.top += RowHeights[y++];
                        }

                        //另起新栏进行输出
                        ColorBoxRect.left += OneColumnWidth;
                        ColorBoxRect.right += OneColumnWidth;
                        LabelTextRect.left += OneColumnWidth;
                        LabelTextRect.right += OneColumnWidth;
                        ValueTextRect.left += OneColumnWidth;
                        ValueTextRect.right += OneColumnWidth;
                    }

                    return LegendWidth;
                }

                if (chart.LegendAtBottom) {
                    //绘出并计算出显示Legend需要的高度
                    LegendSize = DrawHorzSideLegend(DrawRect);
                    DrawRect.bottom -= (LegendSize + BIG_GAP);
                }
                else {
                    //绘出并计算出显示Legend需要的宽度
                    LegendSize = DrawVertSideLegend(DrawRect);
                    DrawRect.right -= (LegendSize + BIG_GAP);
                }
            };

            function DrawTitle() {
                context.selectFont(self.getUsingTitleFont());
                context.drawTextCenter(self.Title, (DrawRect.left + DrawRect.right) / 2, DrawRect.top + BIG_GAP / 2);
                context.restoreFont();
            };

            function DrawXYAxisChart(rect) {
                var seriesItems = self.Series.items,
                    XAxisLabelHeight = xAxis.CalcLabelHeight(),
                    XAxisHeight = xAxis.CalcHorzAxisHeight(false),
                    YAxisLabelWidth = yAxis.CalcLabelHeight(),
                    YAxisWidth = yAxis.CalcVertAxisWidth(),
                    Y2AxisLabelWidth = y2Axis.CalcLabelHeight(),
                    Y2AxisWidth = y2Axis.CalcVertAxisWidth(),

                    i,
                    len,
                    item,
                    chartType,

                    GraphDrawRect,
                    XRect,
                    YRect,
                    Y2Rect,

                    ValueTextHeight = 0,
                    NegativeValueTextHeight = 0,
                    HasValueVisible = false;

                len = seriesItems.length;
                for (i = 0; i < len; i++) {
                    item = seriesItems[i];
                    if (item.LabelTextBuilder && !item.LabelInBar) {
                        HasValueVisible = true;
                        break;
                    }
                }

                //如果显示值, 必须留出显示文字的高度。如果不显示标题，上面也要留出一半高度，以便最顶端Y轴刻度文字完整显示出来
                //item = self.Series.items[i];
                if (HasValueVisible || !self.Title) {
                    ValueTextHeight = fontHeight(self.getUsingValueFont()) / (item.LabelTextBuilder ? 1 : 2);
                    if (self.IsDrawNegativeGraph()) {
                        NegativeValueTextHeight = ValueTextHeight;
                    }

                    //如果文字有角度旋转显示，计算出最大值需要的显示高度
                    if (item.LabelTextAngle) {
                        context.selectFont(self.getUsingValueFont());
                        ValueTextHeight = Math.max(Math.abs(context.measureTextWidth(item.ValueFormatParser.format(ShowMaxValue)) * Math.sin(toRadians(item.LabelTextAngle))), ValueTextHeight);
                        context.restoreFont();
                    }
                }

                GraphDrawRect = new Rect(rect.left + YAxisLabelWidth + YAxisWidth,
                    rect.top + ValueTextHeight,
                    rect.right - Y2AxisLabelWidth - Y2AxisWidth,
                    rect.bottom - XAxisLabelHeight - XAxisHeight - NegativeValueTextHeight);

                //Label Y Axis
                YRect = new Rect(rect.left, rect.top + ValueTextHeight, rect.left + YAxisLabelWidth, rect.bottom - XAxisLabelHeight - XAxisHeight - NegativeValueTextHeight);
                yAxis.DrawVertAxisLabel(YRect);

                //Label Y2 Axis
                Y2Rect = new Rect(rect.right - Y2AxisLabelWidth, YRect.top, rect.right, YRect.bottom);
                y2Axis.DrawVertAxisLabel(Y2Rect);

                //Y Axis
                YRect.left = YRect.right;
                YRect.right += YAxisWidth;
                yAxis.DrawVertAxis(YRect, GraphDrawRect, false);

                //Y2 Axis
                Y2Rect.right = Y2Rect.left;
                Y2Rect.left -= Y2AxisWidth;
                y2Axis.DrawVertAxis(Y2Rect, GraphDrawRect, true);

                //Label X Axis
                XRect = new Rect(rect.left + YAxisLabelWidth + YAxisWidth,
                    rect.bottom - XAxisLabelHeight,
                    rect.right - Y2AxisLabelWidth - Y2AxisWidth,
                    rect.bottom);
                xAxis.DrawHorzAxisLabel(XRect);

                //文字应该后输出，以免被盖住
                if (self.IsDrawNegativeGraph()) {
                    XRect.top = YRect.bottom - yAxis.CalcValuePos(0, YRect.Height());
                    XRect.bottom = XRect.top + XAxisHeight;
                }
                else {
                    XRect.top = GraphDrawRect.bottom;
                    XRect.bottom = XRect.top + XAxisHeight;
                }
                if (self.Chart3D) {
                    xAxis.DrawHorzAxis(XRect, GraphDrawRect, false);
                }

                if (!GraphDrawRect.IsRectEmpty() && (self.IsScatterGraph() || self.GroupCount)) {
                    context.selectFont(self.getUsingValueFont());

                    len = graphs.length;
                    for (i = 0; i < len; i++) {
                        item = graphs[i];
                        chartType = graphSerieses[item[0]].ChartType;
                        switch (chartType) {
                            case grenum.ChartType.BarChart:
                                self.DrawBar(item, GraphDrawRect);
                                break;
                            case grenum.ChartType.StackedBarChart:
                            case grenum.ChartType.StackedBar100Chart:
                                self.DrawStackedBar(item, chartType, GraphDrawRect);
                                break;
                            case grenum.ChartType.LineChart:
                            case grenum.ChartType.CurveLineChart:
                                self.DrawLine(item, chartType, GraphDrawRect);
                                break;
                            case grenum.ChartType.Bubble:
                                self.DrawBubble(item, GraphDrawRect);
                                break;
                            default:
                                self.DrawXYScatterGraph(item, chartType, GraphDrawRect);
                                break;
                        };
                    }

                    context.restoreFont();
                }

                !self.Chart3D && xAxis.DrawHorzAxis(XRect, GraphDrawRect, false);
            }; //end of DrawXYAxisChart

            function DrawHorzXYAxisChart(rect) {
                var seriesItems = self.Series.items,
                    XAxisLabelWidth = xAxis.CalcLabelHeight(),
                    XAxisWidth = xAxis.CalcVertAxisWidth(),
                    YAxisLabelHeight = yAxis.CalcLabelHeight(),
                    YAxisHeight = yAxis.CalcHorzAxisHeight(false),
                    Y2AxisLabelHeight = y2Axis.CalcLabelHeight(),
                    Y2AxisHeight = y2Axis.CalcHorzAxisHeight(false),

                    i,
                    len,
                    item,
                    chartType,

                    GraphDrawRect,
                    XRect,
                    YRect,
                    Y2Rect,

                    ValueTextWidth = 0,
                    NegativeValueTextWidth = 0,
                    HasValueVisible = false;

                len = seriesItems.length;
                for (i = 0; i < len; i++) {
                    item = seriesItems[i];
                    if (item.LabelTextBuilder && !item.LabelInBar) {
                        HasValueVisible = true;
                        break;
                    }
                }

                //如果显示值, 必须留出显示文字的高度。如果不显示标题，上面也要留出一半高度，以便最顶端Y轴刻度文字完整显示出来
                //item = self.Series.items[i];
                if (HasValueVisible) {
                    context.selectFont(self.getUsingValueFont());
                    ValueTextWidth = context.measureTextWidth(item.ValueFormatParser.format(ShowMaxValue));
                    if (self.IsDrawNegativeGraph()) {
                        NegativeValueTextWidth = ValueTextWidth;
                    }
                    context.restoreFont();
                }

                GraphDrawRect = new Rect(rect.left + XAxisLabelWidth + XAxisWidth + NegativeValueTextWidth,
                    rect.top + YAxisLabelHeight + YAxisHeight,
                    rect.right - ValueTextWidth,
                    rect.bottom - Y2AxisLabelHeight - Y2AxisHeight);

                //Label Y Axis
                YRect = new Rect(GraphDrawRect.left, rect.top, GraphDrawRect.right, rect.top + YAxisLabelHeight);
                yAxis.DrawHorzAxisLabel(YRect);

                //Label Y2 Axis
                Y2Rect = new Rect(YRect.left, rect.bottom - Y2AxisLabelHeight, YRect.right, rect.bottom);
                y2Axis.DrawHorzAxisLabel(Y2Rect);

                //Y Axis
                YRect.top = YRect.bottom;
                YRect.bottom += YAxisHeight;
                yAxis.DrawHorzAxis(YRect, GraphDrawRect, true);

                //Y2 Axis
                Y2Rect.bottom = Y2Rect.top;
                Y2Rect.top -= Y2AxisHeight;
                y2Axis.DrawHorzAxis(Y2Rect, GraphDrawRect, false);

                XRect = new Rect(rect.left,
                    GraphDrawRect.top,
                    rect.left + XAxisLabelWidth,
                    GraphDrawRect.bottom);
                xAxis.DrawVertAxisLabel(XRect);

                XRect.left = XRect.right;
                XRect.right += XAxisWidth;

                self.Chart3D && xAxis.DrawVertAxis(XRect, GraphDrawRect, false, yAxis.Used); //(YAxisHeight > 0));

                if (!GraphDrawRect.IsRectEmpty() && self.GroupCount) {
                    context.selectFont(self.getUsingValueFont());

                    len = graphs.length;
                    for (i = 0; i < len; i++) {
                        item = graphs[i];
                        chartType = graphSerieses[item[0]].ChartType;
                        switch (chartType) {
                            case grenum.ChartType.ColumnChart:
                                self.DrawColumnBar(item, GraphDrawRect);
                                break;
                            case grenum.ChartType.StackedColumnChart:
                            case grenum.ChartType.StackedColumn100Chart:
                                self.DrawStackedColumnBar(item, chartType, GraphDrawRect);
                                break;
                        };
                    }

                    context.restoreFont();
                }

                !self.Chart3D && xAxis.DrawVertAxis(XRect, GraphDrawRect, false);
            }; //end of DrawHorzXYAxisChart

            self.fontHeight = fontHeight(self.getUsingFont());
            self.valueFontHeight = fontHeight(self.getUsingValueFont());

            context.selectFont(self.getUsingFont());
            context.selectFillColor(self.ForeColor);

            if (self.report.singleChart) {
                DrawRect.left += self.PaddingLeft;
                DrawRect.top += self.PaddingTop;
                DrawRect.right -= self.PaddingRight;
                DrawRect.bottom -= self.PaddingBottom;
            }

            self.toUpdateShapes = toUpdateShapes;
            if (toUpdateShapes) {
                self.shapes = [];  //存储图形元素的绘制信息
                self.shapesL = []; //存储图例元素的绘制信息
            }

            PrepareDraw();

            //绘出Legend
            self.LegendVisible && self.SeriesCount && drawLegend(self);

            //绘出Title
            self.Title && DrawTitle();

            //绘出图形
            DrawRect.top += DrawTitleHeight;
            if (!DrawRect.IsRectEmpty()) {
                //如果不是饼图，则绘出XY轴
                if (self.Series.items[0].ChartType === grenum.ChartType.PieChart) {
                    self.DrawPie(DrawRect); //m_ChartGraphs.front()->DrawPie(DrawRect);
                }
                else if (self.IsHorzGraph()) {
                    DrawHorzXYAxisChart(DrawRect);
                }
                else {
                    DrawXYAxisChart(DrawRect);
                }
            }

            context.restoreFillStyle();
            context.restoreFont();
        },

        DrawPie: function (PieRect) {
            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.empty());
            //ATLASSERT((int)m_SeriesItems.size() == self.m_SeriesCount);

            //if ( self.MemoryAreasInfo() )
            //{
            //    for (long Group=0; Group<self.m_GroupCount; ++Group)
            //    {
            //        for (long Series=0; Series<self.m_SeriesCount; ++Series)
            //        {
            //            CRect TrickAreaRect(0, 0, 0, 0);
            //            CChartBaseImpl::CAreaItem AreaItem(Series, Group, TrickAreaRect);
            //            self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
            //        }
            //    }
            //}
            var self = this,
                context = self.context,
                ValueTextMaxWidth = 0,
                GroupLabelTextMaxWidth = 0,
                AreaHeight = PieRect.Height(),
                AreaWidth = PieRect.Width(),
                AreaSize = AreaWidth * AreaHeight,
                Diff = Number.MAX_VALUE,
                PieCols = -1,
                PieRows = -1,
                i,
                j,
                k,
                ThePieRect;

            for (i = 0; i < self.GroupCount; i++) {
                for (j = 0; j < self.SeriesCount; j++) {
                    context.selectFont(self.getUsingValueFont());
                    if (self.graphSerieses[j].LabelTextBuilder) {
                        ValueTextMaxWidth = Math.max(ValueTextMaxWidth, context.measureTextWidth(self.GetDrawValueText(j, i)));
                    }
                    context.restoreFont();
                }

                GroupLabelTextMaxWidth = Math.max(GroupLabelTextMaxWidth, context.measureTextWidth(self.GroupLabel(i)));
            }

            //Calculate pie col and row
            for (i = 1; i <= self.GroupCount; i++) { //Row
                j = Math.floor((self.GroupCount + i - 1) / i); //Col
                k = Math.min(AreaWidth / j, AreaHeight / i);
                k = AreaSize - k * k * self.GroupCount; //总面积减去各个正方形格的面积和
                if (k < Diff) {
                    Diff = k;
                    PieCols = j;
                    PieRows = i;
                }
            }
            //ATLASSERT(PieCols >= 1 && PieRows >= 1);

            //Draw every pie
            context.selectFont(self.getUsingValueFont());
            for (k = 0; k < self.GroupCount; k++) { //Group
                i = Math.floor(k / PieCols); //Row
                j = k % PieCols; //Col
                ThePieRect = new Rect(PieRect.left + (AreaWidth * j / PieCols),
                    PieRect.top + (AreaHeight * i / PieRows),
                    PieRect.left + (AreaWidth * (j + 1) / PieCols),
                    PieRect.top + (AreaHeight * (i + 1) / PieRows));

                //Draw One Pie
                if (self.Chart3DReal) {
                    //CGRPei3D Pei3D;
                    //Pei3D.Draw(this, k, ThePieRect, ValueTextMaxSize, GroupLabelTextMaxSize);
                    context.drawTextCenter("三维饼图暂不支持!!!", (ThePieRect.left + ThePieRect.right) / 2, (ThePieRect.top + ThePieRect.bottom - 16) / 2);
                }
                else {
                    self.DrawOne2DPie(k, ThePieRect, ValueTextMaxWidth, GroupLabelTextMaxWidth);
                }
            }
            context.restoreFont();

            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.size() == (size_t)self.m_SeriesCount*self.m_GroupCount);
        },

        //void CChartGraph::DrawOne2DPie(long Group, CRect &ThePieRect, CSize &ValueTextMaxWidth, CSize &GroupLabelTextMaxSize)
        DrawOne2DPie: function (Group, ThePieRect, ValueTextMaxWidth) { //GroupLabelTextMaxSize) { //graph, DrawRect) {
            var self = this,
                context = self.context,
                fontHeight = self.fontHeight,
                valueFontHeight = self.valueFontHeight,

                ValueVisible = false,
                i,
                len = self.SeriesCount, //graphSerieses.length,
                TotalVal = 0,

                r,
                x,
                y,
                BeginAngle,
                EndAngle,
                MiddleAngles = [];

            //Calculate the group total value
            for (i = 0; i < len; i++) {
                TotalVal += self.Value(i, Group);
                if (self.graphSerieses[i].LabelTextBuilder) {
                    ValueVisible = true;
                }
            }
            if (TotalVal <= 0) {
                return;
            }

            //要保证中间画饼图的区域为正方形
            x = ThePieRect.Width() - ValueTextMaxWidth * 2 - SMALL_GAP * 2;
            y = ThePieRect.Height() - fontHeight - valueFontHeight * 2 - SMALL_GAP * 2;
            if (x <= 0 || y <= 0) {
                return;
            }

            r = Math.min(x, y) / 2;
            if (ValueVisible) {
                ThePieRect.InflateRect(-SMALL_GAP, -SMALL_GAP);
            }
            else {
                ThePieRect.InflateRect(r - x / 2, r - y / 2);
            }
            ThePieRect.bottom -= fontHeight;
            if (ThePieRect.IsRectEmpty()) {
                return;
            }

            //Draw series label text
            self.DrawLabelText(self.GroupLabel(Group), (ThePieRect.left + ThePieRect.right) / 2, ThePieRect.bottom);

            //尽量做到饼的文字不要重叠，文字输出按四个不同坐标区间分别考虑
            //根据输出区域Width与Height大小关系确定位置重叠后的偏移调整方向（这点没实现）
            //首先将每个饼的中间角度记下来
            x = (ThePieRect.left + ThePieRect.right) / 2;
            y = (ThePieRect.top + ThePieRect.bottom) / 2;
            BeginAngle = 0;
            for (i = 0; i < len; i++) {
                EndAngle = BeginAngle + (360 * self.Value(i, Group) / TotalVal);

                self.toUpdateShapes && self.shapes.push(new ChartPie(i, Group, x, y, r, BeginAngle, EndAngle));

                //当角度太小时，不要画出饼形，因为这样会画出整个圆形。但文字值要输出
                context.selectFillColor(self.GetGraphFillColor(i));
                context.pie(x, y, r, BeginAngle, EndAngle, 1);
                context.restoreFillStyle();

                //if ( self.MemoryAreasInfo() )
                //{
                //    int Index = Group*self.m_SeriesCount + it->SeriesIndex;
                //    CRect TrickAreaRect(x, y, int(BeginAngle*10) | int(EndAngle*10)<<16, r);
                //    self.m_DrawAreas.back()->ItemGraphAreas[Index].Rect = TrickAreaRect;
                //    ATLASSERT((self.m_DrawAreas.back()->ItemGraphAreas[Index].GroupIndex == Group) && (self.m_DrawAreas.back()->ItemGraphAreas[Index].SeriesIndex == it->SeriesIndex));
                //}

                ValueVisible && MiddleAngles.push((BeginAngle + EndAngle) / 2);

                BeginAngle = EndAngle;
            }

            //输出值文字
            ValueVisible && drawValueText();

            function drawValueText() {
                var valueFont = self.getUsingValueFont(),
                    ItalicExpand = valueFont.Italic ? fontHeight(valueFont) : 0, //让斜体字可以完整显示
                    PriorTextRect = new Rect(0, 0, 0, 0),
                    TextRect,
                    xPosText,
                    yPosText,
                    Offset,
                    TextSize,
                    ValueText;

                EndAngle = 0; //这里代表正在绘制的坐标区域(1,2,3,4)

                //输出[0-90)度，顺时针输出
                for (i = 0; i < len; i++) {
                    BeginAngle = toRadians(MiddleAngles[i]); //MiddleAngleRadian
                    xPosText = x + Math.cos(BeginAngle) * r;
                    yPosText = y - Math.sin(BeginAngle) * r;
                    ValueText = self.GetDrawValueText(i, Group);
                    TextSize = context.measureTextWidth(ValueText) + ItalicExpand;
                    TextRect = new Rect(xPosText, yPosText, xPosText + TextSize, yPosText + valueFontHeight);

                    if (BeginAngle < Math.PI / 2) {
                        TextRect.OffsetRect(2, -valueFontHeight); //水平多偏移两个像素点，不让靠圆圈太近

                        //尽力保证与前一个矩形不相交重叠
                        if (EndAngle === 1 && TextRect.top < PriorTextRect.bottom) {
                            //首先尽力向右平移，但不能超出ThePieRect
                            Offset = PriorTextRect.right - TextRect.left + 2;
                            if (TextRect.right + Offset < ThePieRect.right) {
                                TextRect.OffsetRect(Offset, 0);
                            }
                            else {
                                TextRect.OffsetRect(0, PriorTextRect.bottom - TextRect.top);
                            }

                            context.drawLine(xPosText, yPosText, TextRect.left, TextRect.bottom - TextSize.cy / 3);
                        }

                        EndAngle = 1;
                    }
                    else if (BeginAngle < Math.PI) { //输出[90-180)度，逆时针输出
                        TextRect.OffsetRect(-TextSize - 2, -valueFontHeight); //水平多偏移两个像素点，不让靠圆圈太近

                        //尽力保证与前一个矩形不相交重叠
                        if (EndAngle === 2 && TextRect.top < PriorTextRect.bottom) {
                            //首先尽力向左平移，但不能超出ThePieRect
                            Offset = TextRect.right - PriorTextRect.left + 2;
                            if (TextRect.left - Offset > ThePieRect.left) {
                                TextRect.OffsetRect(-Offset, 0);
                            }
                            else {
                                TextRect.OffsetRect(0, PriorTextRect.bottom - TextRect.top);
                            }

                            context.drawLine(xPosText, yPosText, TextRect.right, TextRect.bottom - TextSize.cy / 3);
                        }

                        EndAngle = 2;
                    }
                    else if (BeginAngle < Math.PI * 1.5) { //输出[180-270)度，顺时针输出
                        TextRect.OffsetRect(-TextSize - 2, 0); //水平多偏移两个像素点，不让靠圆圈太近

                        //尽力保证与前一个矩形不相交重叠
                        if (EndAngle === 3 && TextRect.bottom > PriorTextRect.top) {
                            //首先尽力向左平移，但不能超出ThePieRect
                            Offset = TextRect.right - PriorTextRect.left + 2;
                            if (TextRect.left - Offset > ThePieRect.left) {
                                TextRect.OffsetRect(-Offset, 0);
                            }
                            else {
                                TextRect.OffsetRect(0, TextRect.bottom - PriorTextRect.top);
                            }

                            context.drawLine(xPosText, yPosText, TextRect.right, TextRect.top + TextSize.cy / 3);
                        }

                        EndAngle = 3;
                    }
                    else { //输出[270-360)度，逆时针输出
                        TextRect.OffsetRect(2, 0); //水平多偏移两个像素点，不让靠圆圈太近

                        //尽力保证与前一个矩形不相交重叠
                        if (EndAngle === 4 && TextRect.bottom > PriorTextRect.top) {
                            //首先尽力向左平移，但不能超出ThePieRect
                            Offset = PriorTextRect.right - TextRect.left + 2;
                            if (TextRect.right - Offset < ThePieRect.right) {
                                TextRect.OffsetRect(Offset, 0);
                            }
                            else {
                                TextRect.OffsetRect(0, TextRect.bottom - PriorTextRect.top);
                            }

                            context.drawLine(xPosText, yPosText, TextRect.left, TextRect.top + TextSize.cy / 3);
                        }

                        EndAngle = 4;
                    }

                    self.DrawLabelText(ValueText, (TextRect.left + TextRect.right) / 2, TextRect.top);
                    PriorTextRect = TextRect;
                }
            }
        },

        DrawColumnBar: function (graph, DrawRect) {
            var self = this,
                context = self.context,
                graphSerieses = self.graphSerieses,
                BarCount = self.CalcColumnBarCount(),
                FirstBarIndex = self.CalcFirtColumnBarIndex(graph),
                yAxisLength = DrawRect.Width() - self.xView3DDepth,
                xAxisLength = DrawRect.Height() - self.yView3DDepth,
                BaseXPos = self.IsDrawNegativeGraph() ? self.YAxis.CalcValuePos(0, yAxisLength) : DrawRect.left + 1,
                BaseYPos,

                len = graph.length,
                i,
                val,
                groupIndex,
                seriesIndex,
                series,
                ValueText,
                GroupPos,
                GroupGraphWidth,
                TheAbsNegativeValue,
                IsDrawNegativeGraph = self.IsDrawNegativeGraph(),
                TheBarColor,

                BarHeight,
                FillRect,
                FillRects = [];

            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.empty() );

            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                GroupPos = self.XAxis.CalcGroupPos(xAxisLength, groupIndex);
                GroupGraphWidth = (GroupPos.EndPos - GroupPos.BeginPos);

                BaseYPos = DrawRect.top + GroupPos.BeginPos;
                if (self.Y2Axis.Used)
                    BaseYPos += self.yView3DDepth;

                //for (i = 0; i < len; i++) {
                //要先输出一组下面的，这样3D图才正确
                i = len;
                while (i-- > 0) {
                    seriesIndex = graph[i];
                    series = graphSerieses[seriesIndex];

                    val = self.Value(seriesIndex, groupIndex);
                    TheAbsNegativeValue = (self.AbsNegativeValue && val < 0);
                    if (TheAbsNegativeValue) {
                        val = -val;
                    }

                    FillRect = new Rect(0,
                        BaseYPos + (GroupGraphWidth * (FirstBarIndex + i) / BarCount),
                        0,
                        BaseYPos + (GroupGraphWidth * (FirstBarIndex + i + 1) / BarCount));
                    BarHeight = self.YAxisOfSeries(series).CalcValuePos(val, yAxisLength);
                    if (IsDrawNegativeGraph) {
                        FillRect.left = DrawRect.left + BaseXPos;
                        FillRect.right = Math.min(DrawRect.left + BarHeight, DrawRect.right);
                        if (BaseXPos > BarHeight) { //swap left and right
                            BarHeight = FillRect.left;
                            FillRect.left = FillRect.right;
                            FillRect.right = BarHeight;
                        }
                    }
                    else {
                        FillRect.left = DrawRect.left;
                        FillRect.right = Math.min(DrawRect.left + Math.max(0, BarHeight), DrawRect.right);
                    }
                    FillRects.push(FillRect);
                    self.toUpdateShapes && self.shapes.push(new ChartRect(seriesIndex, groupIndex, FillRect));

                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, Group, FillRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}

                    TheBarColor = TheAbsNegativeValue ? self.NegativeBarColor : self.GetGraphFillColor(self.IsColorSingleBar() ? groupIndex : seriesIndex);

                    self.DrawRectBar(FillRect, TheBarColor, series.BorderPen, true, true, (val >= 0));
                    //context.drawBar(FillRect, series.BorderPen, TheBarColor, IsDrawNegativeGraph ? 3 : 1);
                }
            }
            //值文字要后输出，以免被图形盖住
            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                series = graphSerieses[graph[0]];
                if (series.LabelAsGroup) {
                    ValueText = self.GetDrawValueText(graph[0], groupIndex);

                    BarHeight = -9999; //max right position
                    for (i = 0; i < len; i++) {
                        FillRect = FillRects[groupIndex * len + i];
                        if (BarHeight < FillRect.right) {
                            BarHeight = FillRect.right;
                        }
                    }
                    self.DrawValueText(series, ValueText,
                        BarHeight + SMALL_GAP + context.measureTextWidth(ValueText) / 2,
                        (FillRects[groupIndex * len].top + FillRects[groupIndex * len + len - 1].bottom + self.valueFontHeight) / 2);
                }
                else {
                    for (i = 0; i < len; i++) {
                        seriesIndex = graph[i];
                        series = graphSerieses[seriesIndex];
                        if (series.LabelTextBuilder) {
                            ValueText = self.GetDrawValueText(seriesIndex, groupIndex);
                            FillRect = FillRects[groupIndex * len + i];

                            if (series.LabelInBar) {
                                self.DrawHorzBarText(ValueText, FillRect);
                            }
                            else {
                                self.DrawValueText(series, ValueText, FillRect.right + SMALL_GAP + context.measureTextWidth(ValueText) / 2, (FillRect.top + FillRect.bottom + self.valueFontHeight) / 2);
                            }
                        }
                    }
                }
            }

            //ATLASSERT(!self.MemoryAreasInfo() || (self.m_DrawAreas.back()->ItemGraphAreas.size() == (size_t)self.m_GroupCount*m_SeriesItems.size()));
        },

        DrawStackedColumnBar: function (graph, chartType, DrawRect) {
            var self = this,
                context = self.context,
                graphSerieses = self.graphSerieses,
                BarCount = self.CalcColumnBarCount(),
                FirstBarIndex = self.CalcFirtColumnBarIndex(graph),
                yAxisLength = DrawRect.Width() - self.xView3DDepth,
                xAxisLength = DrawRect.Height() - self.yView3DDepth,

                len = graph.length,
                i,
                val,
                groupIndex,
                seriesIndex,
                series,
                GroupPos,
                GroupGraphWidth,
                TheBarColor,

                BaseYPos,
                TheBarLeft,
                BarHeight,
                BarTop,
                BarBottom,
                FillRect,
                FillRects = [];
            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.empty() );

            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                GroupPos = self.XAxis.CalcGroupPos(xAxisLength, groupIndex);
                GroupGraphWidth = GroupPos.EndPos - GroupPos.BeginPos;

                BaseYPos = DrawRect.top + GroupPos.BeginPos;
                if (self.Y2Axis.Used) {
                    BaseYPos += self.yView3DDepth;
                }

                BarTop = BaseYPos + (GroupGraphWidth * FirstBarIndex / BarCount);
                BarBottom = BaseYPos + (GroupGraphWidth * (FirstBarIndex + 1) / BarCount);

                TheBarLeft = DrawRect.left;
                for (i = 0; i < len; i++) {
                    seriesIndex = graph[i];
                    series = graphSerieses[seriesIndex];

                    val = self.Value(seriesIndex, groupIndex);
                    if (chartType === grenum.ChartType.StackedColumn100Chart) {
                        val *= 100 / self.CalcGroupTotalValue(graph, groupIndex);
                    }

                    BarHeight = Math.max(0, self.YAxisOfSeries(series).CalcValuePos(val, yAxisLength));

                    FillRect = new Rect(TheBarLeft, BarTop, Math.min(DrawRect.right, TheBarLeft + BarHeight), BarBottom);
                    FillRects.push(FillRect);
                    self.toUpdateShapes && self.shapes.push(new ChartRect(seriesIndex, groupIndex, FillRect));

                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, Group, FillRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}

                    TheBarColor = self.GetGraphFillColor(seriesIndex);

                    //context.drawBar(FillRect, self.graphSerieses[seriesIndex].BorderPen, TheBarColor, 1);
                    self.DrawRectBar(FillRect, TheBarColor, series.BorderPen, true, (i === len - 1), true);

                    TheBarLeft += BarHeight;
                }

                if (series.LabelInBar) {
                    for (i = 0; i < len; i++) {
                        seriesIndex = graph[i];
                        series = graphSerieses[seriesIndex];
                        series.LabelTextBuilder && self.DrawHorzBarText(self.GetDrawValueText(seriesIndex, groupIndex), FillRects[groupIndex * len + i]);
                    }
                }
                else {
                    seriesIndex = graph[0];
                    series = graphSerieses[seriesIndex];
                    val = self.GetDrawValueText(seriesIndex, groupIndex);
                    self.DrawValueText(series, val, TheBarLeft + SMALL_GAP + context.measureTextWidth(val) / 2, (BarTop + BarBottom + self.valueFontHeight) / 2);
                }
            }
            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.size() == (size_t)self.m_GroupCount*self.m_SeriesCount  );
        },

        DrawBar: function (graph, DrawRect) {
            var self = this,
                //context = self.context,
                graphSerieses = self.graphSerieses,
                BarCount = self.CalcBarCount(),
                FirstBarIndex = self.CalcFirtBarIndex(graph),
                IsDrawNegativeGraph = self.IsDrawNegativeGraph(),
                yAxisLength = DrawRect.Height() - self.yView3DDepth,
                BaseYPos = IsDrawNegativeGraph ? self.YAxis.CalcValuePos(0, yAxisLength) : DrawRect.bottom + 1,

                len = graph.length,
                i,
                val,
                BarIndex,
                groupIndex,
                seriesIndex,
                series,
                ValueText,
                GroupPos,
                GroupGraphWidth,
                TheAbsNegativeValue,
                TheBarColor,

                BarHeight,
                FillRect,
                FillRects = [];

            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.empty() );

            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                GroupPos = self.XAxis.CalcGroupPos(DrawRect.Width() - self.xView3DDepth, groupIndex);
                GroupGraphWidth = (GroupPos.EndPos - GroupPos.BeginPos);

                BarIndex = FirstBarIndex;
                for (i = 0; i < len; i++) {
                    seriesIndex = graph[i];
                    series = graphSerieses[seriesIndex];

                    val = self.Value(seriesIndex, groupIndex);
                    TheAbsNegativeValue = (self.AbsNegativeValue && val < 0);
                    if (TheAbsNegativeValue) {
                        val = -val;
                    }

                    FillRect = new Rect(DrawRect.left + GroupPos.BeginPos + (GroupGraphWidth * BarIndex / BarCount),
                        0,
                        DrawRect.left + GroupPos.BeginPos + (GroupGraphWidth * (BarIndex + 1) / BarCount),
                        0);
                    BarHeight = self.YAxisOfSeries(series).CalcValuePos(val, yAxisLength);
                    //IsDrawNegativeGraph = IsDrawNegativeGraph && val < 0;
                    if (IsDrawNegativeGraph) {
                        FillRect.top = Math.max(DrawRect.bottom - BarHeight, DrawRect.top);
                        FillRect.bottom = DrawRect.bottom - BaseYPos;
                        if (BaseYPos > BarHeight) { //swap BarTop and BarBottom
                            BarHeight = FillRect.top; //BarHeight temp used for swap
                            FillRect.top = FillRect.bottom;
                            FillRect.bottom = BarHeight;
                        }
                        //FillRect.top = DrawRect.bottom - BaseYPos; ;
                        //FillRect.bottom = DrawRect.bottom - BarHeight;
                    }
                    else {
                        FillRect.top = DrawRect.bottom - BarHeight; //Math.min(Math.max(DrawRect.bottom - BarHeight, DrawRect.top), DrawRect.bottom + 1);
                        FillRect.bottom = DrawRect.bottom;
                    }

                    FillRects.push(FillRect);
                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, groupIndex, FillRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}
                    self.toUpdateShapes && self.shapes.push(new ChartRect(seriesIndex, groupIndex, FillRect));

                    TheBarColor = TheAbsNegativeValue ? self.NegativeBarColor : self.GetGraphFillColor(self.IsColorSingleBar() ? groupIndex : seriesIndex);

                    //context.drawBar(FillRect, self.graphSerieses[seriesIndex].BorderPen, TheBarColor, IsDrawNegativeGraph && val < 0 ? 2 : 0);
                    self.DrawRectBar(FillRect, TheBarColor, series.BorderPen, false, true, (val >= 0));

                    ++BarIndex;
                }
            }

            //值文字要后输出，以免被图形盖住
            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                seriesIndex = graph[0];
                series = graphSerieses[seriesIndex];
                if (series.LabelAsGroup) {
                    ValueText = self.GetDrawValueText(seriesIndex, groupIndex);

                    BarHeight = 9999; //max top position
                    for (i = 0; i < len; i++) {
                        FillRect = FillRects[groupIndex * len + i];
                        if (BarHeight > FillRect.top) {
                            BarHeight = FillRect.top;
                        }
                    }
                    self.DrawValueText(series, ValueText,
                        (FillRects[groupIndex * len].left + FillRects[groupIndex * len + len - 1].right + self.xView3DDepth) / 2,
                        BarHeight - SMALL_GAP / 2 - self.yView3DDepth);
                }
                else {
                    for (i = 0; i < len; i++) {
                        seriesIndex = graph[i];
                        series = graphSerieses[seriesIndex];
                        if (series.LabelTextBuilder) {
                            ValueText = self.GetDrawValueText(seriesIndex, groupIndex);
                            FillRect = FillRects[groupIndex * len + i];

                            if (series.LabelInBar) {
                                self.DrawVertBarText(ValueText, FillRect);
                            }
                            else {
                                BarHeight = FillRect.top - SMALL_GAP / 2 - self.yView3DDepth; //输出文字的底部位置
                                if (self.IsDrawNegativeGraph() && (DrawRect.bottom - BaseYPos < FillRect.bottom)) {
                                    BarHeight = FillRect.bottom + self.valueFontHeight;
                                }
                                self.DrawValueText(series, ValueText, (FillRect.left + FillRect.right + self.xView3DDepth) / 2, BarHeight);
                            }
                        }
                    }
                }
            }

            //ATLASSERT(!self.MemoryAreasInfo() || (self.m_DrawAreas.back()->ItemGraphAreas.size() == (size_t)self.m_GroupCount*m_SeriesItems.size()));
        },

        DrawStackedBar: function (graph, chartType, DrawRect) {
            var self = this,
                //context = self.context,
                graphSerieses = self.graphSerieses,
                BarCount = self.CalcBarCount(),
                FirstBarIndex = self.CalcFirtBarIndex(graph),
                xAxisLength = DrawRect.Width() - self.xView3DDepth,
                yAxisLength = DrawRect.Height() - self.yView3DDepth,

                len = graph.length,
                i,
                val,
                groupIndex,
                seriesIndex,
                series,
                GroupPos,
                GroupGraphWidth,
                TheBarColor,

                BarHeight,
                BarLeft,
                BarRight,
                BarBottom,
                FillRect,
                FillRects = [];

            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.empty() );

            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                GroupPos = self.XAxis.CalcGroupPos(xAxisLength, groupIndex);
                GroupGraphWidth = GroupPos.EndPos - GroupPos.BeginPos;

                BarLeft = DrawRect.left + GroupPos.BeginPos + (GroupGraphWidth * FirstBarIndex / BarCount);
                BarRight = DrawRect.left + GroupPos.BeginPos + (GroupGraphWidth * (FirstBarIndex + 1) / BarCount);
                BarBottom = DrawRect.bottom;
                for (i = 0; i < len; i++) {
                    seriesIndex = graph[i];
                    series = graphSerieses[seriesIndex];

                    val = self.Value(seriesIndex, groupIndex);
                    if (chartType === grenum.ChartType.StackedBar100Chart) {
                        val *= 100 / self.CalcGroupTotalValue(graph, groupIndex);
                    }

                    BarHeight = self.YAxisOfSeries(series).CalcValuePos(val, yAxisLength);

                    FillRect = new Rect(BarLeft,
                        Math.min(Math.max(BarBottom - BarHeight, DrawRect.top), BarBottom),
                        BarRight,
                        BarBottom);
                    FillRects.push(FillRect);
                    self.toUpdateShapes && self.shapes.push(new ChartRect(seriesIndex, groupIndex, FillRect));
                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, groupIndex, FillRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}

                    TheBarColor = self.GetGraphFillColor(seriesIndex);

                    self.DrawRectBar(FillRect, TheBarColor, series.BorderPen, false, (i === len - 1), true);

                    BarBottom -= BarHeight;
                }

                if (series.LabelInBar) {
                    for (i = 0; i < len; i++) {
                        seriesIndex = graph[i];
                        series = graphSerieses[seriesIndex];
                        if (series.LabelTextBuilder) {
                            self.DrawVertBarText(self.GetDrawValueText(seriesIndex, groupIndex), FillRects[groupIndex * len + i]);
                        }
                    }
                }
                else {
                    seriesIndex = graph[0];
                    series = graphSerieses[seriesIndex];
                    self.DrawValueText(series, self.GetDrawValueText(seriesIndex, groupIndex),
                        (BarLeft + BarRight + self.xView3DDepth) / 2,
                        BarBottom - SMALL_GAP / 2 - self.yView3DDepth);
                }
            }

            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.size() == (size_t)self.m_GroupCount*self.m_SeriesCount  );
        },

        DrawRectBar: function (FillRect, TheBarColor, BarBorderPen, IsColumnBar, IsTopmost, IsPositive) {
            var self = this,
                context = self.context,
                TheBarColorLight = colorGradientLight(TheBarColor),
                TheBarColorDark = colorGradientDark(TheBarColor),
                pts = [];

            function DrawQuadrangleFace(Color, pts) {
                grhelper.GRASSERT(pts.length === 8, "pts's length isn't 8");

                context.selectFillColor(Color);
                context.selectPen(new Pen(1, Color, 1));

                context.drawPolyLine(pts, 1, 1);

                context.restorePen();
                context.restoreFillStyle();
            }

            if (self.Chart3DReal) {
                pts.length = 8;

                //上顶面
                pts[0] = FillRect.right - 1;
                pts[1] = FillRect.top;
                pts[2] = pts[0] + self.xView3DDepth;
                pts[3] = pts[1] - self.yView3DDepth;
                if (IsTopmost || IsColumnBar) {
                    pts[4] = pts[2] - FillRect.Width();
                    pts[5] = pts[3];
                    pts[6] = FillRect.left;
                    pts[7] = pts[1];
                    DrawQuadrangleFace(TheBarColorLight, pts);
                }

                //侧面边
                if (IsTopmost || !IsColumnBar) {
                    pts[4] = pts[2];
                    pts[5] = FillRect.bottom - self.yView3DDepth;
                    pts[6] = FillRect.right - 1;
                    pts[7] = FillRect.bottom;
                    DrawQuadrangleFace(TheBarColorDark, pts);
                }
            }

            if (self.Chart3DReal) {
                context.selectFillColor(TheBarColor);
                context.rectangle2(FillRect, 1);
                context.restoreFillStyle();
            }
            else {
                context.drawBar(FillRect, BarBorderPen, TheBarColor, IsColumnBar ? (IsPositive ? 1 : 3) : (IsPositive ? 0 : 2));  //direction: 0-上,2-下,1-右,3-左
            }
        },

        DrawLine: function (graph, chartType, DrawRect) {
            var self = this,
                context = self.context,

                len = graph.length,
                i,
                groupIndex,
                seriesIndex,
                series,
                valueText,
                valueTextWidth,

                x,
                y,
                LinePoints = []; //二维数组

            for (i = 0; i < len; i++) {
                LinePoints.push([]);
            }

            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                x = DrawRect.left + self.XAxis.CalcGroupPos(DrawRect.Width() - self.xView3DDepth, groupIndex).LabelMiddlePos;

                for (i = 0; i < len; i++) {
                    seriesIndex = graph[i];
                    series = self.graphSerieses[seriesIndex];

                    var pt = {
                        x: x,
                        y: DrawRect.bottom - self.YAxisOfSeries(series).CalcValuePos(self.Value(seriesIndex, groupIndex), DrawRect.Height())
                    };
                    LinePoints[i].push(pt);
                    self.toUpdateShapes && self.shapes.push(new ChartPoint(seriesIndex, groupIndex, pt.x, pt.y, series.MarkerSize));

                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CRect MarkerRect = CChartSeriesImpl::CalcPointMarkerRect(xPos, yPos, it->pSeries.MarkerSize);
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, Group, MarkerRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}
                }
            }

            for (i = 0; i < len; i++) {
                //chartType === grenum.ChartType.CurveLineChart ? self.DrawCurveLine(LinePoints[i], graph[i]) : DrawPolyLine(LinePoints[i], graph[i]);
                (chartType === grenum.ChartType.CurveLineChart ? self.DrawCurveLine : self.DrawPolyLine).call(self, LinePoints[i], graph[i]);
            }

            for (i = 0; i < len; i++) {
                self.DrawPointsMarker(LinePoints[i], graph[i]);
            }

            //值文字要后输出，以免被图形盖住
            for (groupIndex = 0; groupIndex < self.GroupCount; groupIndex++) {
                for (i = 0; i < len; i++) {
                    seriesIndex = graph[i];
                    series = self.graphSerieses[seriesIndex];
                    if (series.LabelTextBuilder) {
                        y = DrawRect.bottom - self.YAxisOfSeries(series).CalcValuePos(self.Value(seriesIndex, groupIndex), DrawRect.Height());
                        if (series.MarkerStyle !== grenum.PointMarkerStyle.None) {
                            y -= series.MarkerSize / 2;
                        }

                        valueText = self.GetDrawValueText(seriesIndex, groupIndex);

                        valueTextWidth = context.measureTextWidth(valueText); //x is text width
                        x = LinePoints[i][groupIndex].x + valueTextWidth / 2;
                        if (self.GroupCount > 1) {
                            x -= valueTextWidth * groupIndex / (self.GroupCount - 1);
                        }
                        self.DrawValueText(series, valueText, x, y);
                    }
                }
            }

            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.size() == (size_t)self.m_SeriesCount*self.m_GroupCount);
        },

        DrawBubble: function (graph, DrawRect) {
            var self = this,
                //context = self.context,

                len = graph.length,
                i,
                val,
                groupIndex,
                seriesIndex,
                series,

                r,
                DataCount,
                thePoints,
                theRadiuss,
                Points = [],
                Radiuss = [];

            for (i = 0; i < len; i++) {
                seriesIndex = graph[i];
                series = self.graphSerieses[seriesIndex];
                thePoints = [],
                theRadiuss = [],
                Points.push(thePoints);
                Radiuss.push(theRadiuss);

                DataCount = self.ValueCount(seriesIndex);
                for (groupIndex = 0; groupIndex < DataCount; groupIndex++) {
                    val = self.Value(seriesIndex, groupIndex);

                    //xPos = DrawRect.left + self.XAxis.CalcValuePos(val.x, DrawRect.Width());
                    //yPos = DrawRect.bottom - self.YAxisOfSeries(series).CalcValuePos(val.y, DrawRect.Height());
                    r = Math.sqrt(val.z / self.DrawBubbleScalePerCm) * PixelsPerCm / 2;

                    //CRect MarkerRect = CChartSeriesImpl::CalcPointMarkerRect(xPos, yPos, r);
                    var pt = {
                        x: DrawRect.left + self.XAxis.CalcValuePos(val.x, DrawRect.Width()),
                        y: DrawRect.bottom - self.YAxisOfSeries(series).CalcValuePos(val.y, DrawRect.Height())
                    };
                    thePoints.push(pt);
                    theRadiuss.push(r);
                    self.toUpdateShapes && self.shapes.push(new ChartPoint(seriesIndex, groupIndex, pt.x, pt.y, r));

                    series.LabelTextBuilder && self.DrawValueText(series, self.GetDrawValueText(seriesIndex, groupIndex), pt.x, pt.y - r); //MarkerRect.top);

                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, j, MarkerRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}
                }
            }

            for (i = 0; i < len; i++) {
                seriesIndex = graph[i];
                self.DrawPointsMarker(Points[seriesIndex], seriesIndex, Radiuss[seriesIndex]);
            }
        },

        DrawXYScatterGraph: function (graph, chartType, DrawRect) {
            var self = this,
                //context = self.context,

                len = graph.length,
                i,
                val,
                groupIndex,
                seriesIndex,
                series,

                //xPos,
                //yPos,
                //r,
                DataCount,
                thePoints,
                //MarkerRect,
                Points = [];
            //ATLASSERT(!self.MemoryAreasInfo() || self.m_DrawAreas.back()->ItemGraphAreas.empty() );

            for (i = 0; i < len; i++) {
                seriesIndex = graph[i];
                series = self.graphSerieses[seriesIndex];
                thePoints = [],
                Points.push(thePoints);

                DataCount = self.ValueCount(seriesIndex);
                for (groupIndex = 0; groupIndex < DataCount; groupIndex++) {
                    val = self.Value(seriesIndex, groupIndex);

                    //xPos = DrawRect.left + self.XAxis.CalcValuePos(val.x, DrawRect.Width());
                    //yPos = DrawRect.bottom - self.YAxisOfSeries(series).CalcValuePos(val.y, DrawRect.Height());

                    //MarkerRect = CalcPointMarkerRect(xPos, yPos, series.MarkerSize);
                    var pt = {
                        x: DrawRect.left + self.XAxis.CalcValuePos(val.x, DrawRect.Width()),
                        y: DrawRect.bottom - self.YAxisOfSeries(series).CalcValuePos(val.y, DrawRect.Height())
                    };
                    thePoints.push(pt);
                    self.toUpdateShapes && self.shapes.push(new ChartPoint(seriesIndex, groupIndex, pt.x, pt.y, series.MarkerSize));

                    series.LabelTextBuilder && self.DrawValueText(series, self.GetDrawValueText(seriesIndex, groupIndex), pt.x, pt.y - series.MarkerSize); //MarkerRect.top);

                    //if ( self.MemoryAreasInfo() )
                    //{
                    //    CChartBaseImpl::CAreaItem AreaItem(it->SeriesIndex, j, MarkerRect);
                    //    self.m_DrawAreas.back()->ItemGraphAreas.push_back( AreaItem );
                    //}
                }
            }

            if ((chartType === grenum.ChartType.XYLineChart) || (chartType === grenum.ChartType.XYCurveLineChart)) {
                for (i = 0; i < len; i++) {
                    seriesIndex = graph[i];
                    series = self.graphSerieses[seriesIndex];
                    (chartType === grenum.ChartType.XYCurveLineChart ? self.DrawCurveLine : self.DrawPolyLine).call(self, Points[seriesIndex], seriesIndex);
                }
            }

            for (i = 0; i < len; i++) {
                seriesIndex = graph[i];
                self.DrawPointsMarker(Points[seriesIndex], seriesIndex);
            }
        },

        DrawPolyLine: function (ApexPoints, seriesIndex) {
            var self = this,
                context = self.context,

                len = ApexPoints.length,
                i,
                pen,
                pts = [];

            for (i = 0; i < len; i++) {
                pts.push(ApexPoints[i].x, ApexPoints[i].y);
            }

            pen = self.graphSerieses[seriesIndex].BorderPen.clone();
            pen.Color = self.GetGraphFillColor(seriesIndex);

            context.selectPen(pen);
            context.drawPolyLine(pts);
            context.restorePen();

            //context.selectPen(Pen);

            //int nCount = ApexPoints.size();
            //if ( nCount > 0 ) 
            //{
            //    CPoint pt = ApexPoints[0];
            //    for (int i = 1; i < nCount; i++ )
            //    {
            //        context.MoveTo(pt.x, pt.y);
            //        context.LineTo(ApexPoints[i].x, ApexPoints[i].y);
            //        pt = ApexPoints[i];
            //    }
            //}

            //context.restorePen();
        },

        DrawCurveLine: function (ApexPoints, seriesIndex) {
            var self = this,
                context = self.context,

                len = ApexPoints.length,
                i,
                pen,
                pt,
                cpt,
                pts = [];

            function CalcCurveControlPoints(FirstPoint, MiddlePoint, AfterPoint) {
                var Tension = 0.4,
                    d1 = Math.sqrt(Math.pow(MiddlePoint.x - FirstPoint.x, 2) + Math.pow(MiddlePoint.y - FirstPoint.y, 2)),
                    d2 = Math.sqrt(Math.pow(AfterPoint.x - MiddlePoint.x, 2) + Math.pow(AfterPoint.y - MiddlePoint.y, 2)),
                    d12 = d1 + d2,
                    fa = d12 > 0 ? Tension * d1 / d12 : 1,
                    fb = d12 > 0 ? Tension * d2 / d12 : 1;

                return {
                    inner: {
                        x: MiddlePoint.x - fa * (AfterPoint.x - FirstPoint.x),
                        y: MiddlePoint.y - fa * (AfterPoint.y - FirstPoint.y)
                    },
                    outer: {
                        x: MiddlePoint.x + fb * (AfterPoint.x - FirstPoint.x),
                        y: MiddlePoint.y + fb * (AfterPoint.y - FirstPoint.y)
                    }
                };
            }

            if (len > 1) {
                pt = ApexPoints[0];
                cpt = CalcCurveControlPoints(pt, pt, ApexPoints[1]);
                pts.push(pt, cpt.outer);
                for (i = 1; i < len - 1; i++) {
                    pt = ApexPoints[i];
                    cpt = CalcCurveControlPoints(ApexPoints[i - 1], pt, ApexPoints[i + 1]);
                    pts.push(cpt.inner, pt, cpt.outer);
                }
                pt = ApexPoints[i];
                cpt = CalcCurveControlPoints(ApexPoints[i - 1], pt, pt);
                pts.push(cpt.inner, pt);

                pen = self.graphSerieses[seriesIndex].BorderPen.clone();
                pen.Color = self.GetGraphFillColor(seriesIndex);
                context.selectPen(pen);
                context.polyBezier(pts);
                context.restorePen();
            }
        },

        DrawPointsMarker: function (ApexPoints, seriesIndex, Radiuss) {
            var self = this,
                context = self.context,
                series = self.graphSerieses[seriesIndex],
                len = ApexPoints.length,
                i;

            if (series.MarkerStyle !== grenum.PointMarkerStyle.None) {
                for (i = 0; i < len; i++) {
                    context.DrawPointMarker(
                        CalcPointMarkerRect(ApexPoints[i].x, ApexPoints[i].y, Radiuss ? Radiuss[i] : series.MarkerSize),
                        series.MarkerStyle, series.MarkerPen,
                        series.MarkerColorAuto ? self.GetGraphFillColor(seriesIndex) : series.MarkerColor);
                }
            }
        },

        //xCenter: 文字输出的水平中间位置
        //yBottom: 文字输出的垂直底部位置
        DrawValueText: function (Series, ValueText, xCenter, yBottom) {
            var self = this,
                context = self.context,
                textHeight = self.valueFontHeight,
                textAngle;

            if (!Series.LabelTextAngle) {
                context.drawTextCenter(ValueText, xCenter, yBottom - textHeight);
            }
            else {
                textAngle = toRadians(Series.LabelTextAngle);
                xCenter -= (context.measureTextWidth(ValueText) * Math.cos(textAngle) + Math.abs(textHeight * Math.sin(textAngle))) / 2;
                yBottom -= Math.abs(textHeight * Math.cos(textAngle));
                context.drawTextRotate(ValueText, xCenter, yBottom, Series.LabelTextAngle);
            }
        },
        DrawLabelText: function (ValueText, xCenter, yTop) {
            var context = this.context;

            context.drawTextCenter(ValueText, xCenter, yTop);
        },

        DrawVertBarText: function (ValueText, BarRect) {
            var self = this,
                context = self.context;

            context.drawTextRotate(ValueText, (BarRect.left + BarRect.right - self.fontHeight) / 2,
                (BarRect.top + BarRect.bottom + context.measureTextWidth(ValueText)) / 2, 90);
        },

        DrawHorzBarText: function (ValueText, BarRect) {
            //CTextFormatData TextFormat;
            ////TextFormat.m_TextOrientation = grtoD2UL2R1;
            //TextFormat.m_TextAlign = grtaMiddleCenter;
            //context.DrawFormatText(ValueText, ValueText.GetLength(), BarRect, TextFormat);
            var self = this,
                context = self.context,
                textWidth = context.measureTextWidth(ValueText),
                textHeight = self.fontHeight,
                ox = (BarRect.left + BarRect.right - textWidth) / 2,
                oy = (BarRect.top + BarRect.bottom - textHeight) / 2;

            context.drawText(ValueText, ox, oy);
        },

        CalcBarCount: function () {
            //ATLASSERT( !IsHorzGraph() );
            var self = this,
                i,
                graph,
                chartType,
                len = self.graphs.length,
                BarCount = 0; //整个图表中柱的个数，叠加柱图一个Graph算一个柱

            for (i = 0; i < len; i++) {
                graph = self.graphs[i];
                chartType = self.graphSerieses[graph[0]].ChartType;

                if (chartType === grenum.ChartType.BarChart) {
                    BarCount += graph.length;
                }
                else if (chartType === grenum.ChartType.StackedBarChart || chartType === grenum.ChartType.StackedBar100Chart) {
                    BarCount++;
                }
            }

            return BarCount;
        },

        CalcColumnBarCount: function () {
            //ATLASSERT( IsHorzGraph() );
            var self = this,
                i,
                graph,
                chartType,
                len = self.graphs.length,
                BarCount = 0; //整个图表中柱的个数，叠加柱图一个Graph算一个柱

            for (i = 0; i < len; i++) {
                graph = self.graphs[i];
                chartType = self.graphSerieses[graph[0]].ChartType;

                if (chartType === grenum.ChartType.ColumnChart) {
                    BarCount += graph.length;
                }
                else if (chartType === grenum.ChartType.StackedColumnChart || chartType === grenum.ChartType.StackedColumn100Chart) {
                    BarCount++;
                }
            }

            return BarCount;
        },
        CalcFirtBarIndex: function (thisGraph) {
            //ATLASSERT( !self.IsHorzGraph() );

            var self = this,
                graphs = self.graphs,
                len = graphs.length,
                i,
                graph,
                chartType,
                FirstBarIndex = 0; //本Graph第一个柱的开始序号，从0开始

            for (i = 0; i < len; i++) {
                graph = graphs[i];
                if (graph === thisGraph) {
                    break;
                }

                chartType = self.graphSerieses[graph[0]].ChartType;
                if (chartType === grenum.ChartType.BarChart) {
                    FirstBarIndex += graph.length;
                }
                else if (chartType === grenum.ChartType.StackedBarChart || chartType === grenum.ChartType.StackedBar100Chart) {
                    ++FirstBarIndex;
                }
            }
            return FirstBarIndex;
        },
        CalcFirtColumnBarIndex: function (thisGraph) {
            //ATLASSERT( self.IsHorzGraph() );
            var self = this,
                graphs = self.graphs,
                len = graphs.length,
                i,
                graph,
                chartType,
                FirstBarIndex = 0; //本Graph第一个柱的开始序号，从0开始

            for (i = 0; i < len; i++) {
                graph = graphs[i];
                if (graph === thisGraph) {
                    break;
                }


                chartType = self.graphSerieses[graph[0]].ChartType;
                if (chartType === grenum.ChartType.ColumnChart) {
                    FirstBarIndex += graph.length;
                }
                else if (chartType === grenum.ChartType.StackedColumnChart || chartType === grenum.ChartType.StackedColumn100Chart) {
                    ++FirstBarIndex;
                }
            }
            return FirstBarIndex;
        },
        CalcGroupTotalValue: function (thisGraph, GroupIndex) {
            var self = this,
                len = thisGraph.length,
                i,
                Total = 0;

            for (i = 0; i < len; i++) {
                Total += self.Value(thisGraph[i], GroupIndex);
            }

            return Total;
        },

        IsScatterGraph: function () {
            return this.Series.items[0].IsScatterGraph();
        },
        IsHorzGraph: function () { //是否为横向图表，横向图表不能与其它非横向图表混和
            return this.Series.items[0].IsHorzGraph();
        },
        IsColorSingleBar: function () {
            var self = this;

            return (self.SeriesCount == 1) && self.SingleSeriesColored;
        },
        IsDrawNegativeGraph: function () { //是否要输出负数值的图形，X轴在0的位置
            var self = this;

            //没有使用 Y2Axis
            return !self.Series.items.some(function (SeriesItem) {
                return SeriesItem.ByY2Axis;
            }) && (self.YAxis.DrawMax >= 0) && (self.YAxis.DrawMin < 0) && !self.AbsNegativeValue;
        },

        Support3D: function () {
            return this.Series.items.every(function (series) {
                return series.Support3D();
            });
        },

        YAxisOfSeries: function (series) {
            var self = this;

            return series.ByY2Axis ? self.Y2Axis : self.YAxis;
        },

        getSeriesShowLabel: function (seriesIndex) {
            var self = this;

            //return self.SeriesLabels ? self.SeriesLabels[seriesIndex] : (self.graphSerieses[seriesIndex] ? self.graphSerieses[seriesIndex].SeriesName : "");
            return self.SeriesLabels[seriesIndex] || (self.graphSerieses[seriesIndex] ? self.graphSerieses[seriesIndex].SeriesName : "");
        },
        getUsingTitleFont: function () {
            return this.TitleFont.UsingFont();
        },
        getUsingValueFont: function () {
            return this.ValueFont.UsingFont();
        },

        GetGraphFillColor: function (SeriesIndex) {
            var self = this,
                seriesItem = self.graphSerieses[SeriesIndex],
                len = self.FillColors ? self.FillColors.length : ChartSeriesColorCount,
                Step,
                Index,
                Color,
                colorRGB;
            //ATLASSERT((0<=SeriesIndex && SeriesIndex<(int)m_SeriesVector.size()) || IsColorSingleBar());

            if (self.IsColorSingleBar() || seriesItem.FillColorAuto) {
                Step = Math.floor(SeriesIndex / len);
                Index = SeriesIndex % len;
                Color = self.FillColors ? self.FillColors[Index] : colorAlpha(ChartSeriesColorArray[Index], self.report.viewer.alpha.chartGraph);

                if (Step > 0) {
                    colorRGB = color2rgba(Color);
                    Color = rgba2color(
                        (colorRGB.r + 73 * Index + 196 * Step) % 255,
                        (colorRGB.g + 197 * Index + 120 * Step) % 255,
                        (colorRGB.b + 117 * Index + 90 * Step) % 255,
                        colorRGB.a
                        );
                }
                return Color;
            }
            else {
                return seriesItem.FillColor;
            }
        },
        GetSeriesIndexByLabel: function (LabelText, ToTryIndex) {
            var self = this,
                index = self.SeriesLabels.indexOf(LabelText);

            if (index < 0 && ToTryIndex) {
                index = +LabelText;
                if (!isNaN(index) || index >= self.SeriesCount) {
                    index = -1;
                }
            }
            return index;
        },
        GetGroupIndexByLabel: function (LabelText, ToTryIndex) {
            var self = this,
                index = self.GroupLabels.indexOf(LabelText);

            if (index < 0 && ToTryIndex) {
                index = +LabelText;
                if (!isNaN(index) || index >= self.GroupCount) {
                    index = -1;
                }
            }
            return index;
        },
        GetDrawValueText: function (SeriesIndex, GroupIndex) {
            var series = this.graphSerieses[SeriesIndex];

            //ATLASSERT( m_SeriesVector[SeriesIndex].pLabelTextBuilder.get() );
            if (series.LabelTextBuilder) {
                return series.LabelTextBuilder.generateChartDisplayText(SeriesIndex, GroupIndex);
            }
            return "";
        },
        GetGroupTotalValue: function (Graph, GroupIndex) {
            var self = this,
                i,
                len = Graph.length,
                Total = 0;

            if (!self.IsScatterGraph()) { //散列点图形无组簇的概念
                for (i = 0; i < len; i++) { //只能统计出同类图形的数据
                    //double Value = GetDrawValue(it->SeriesIndex, GroupIndex);
                    Total += self.Value(Graph[i], GroupIndex);
                }
            }
            return Total;
        },
        GetSeriesTotalValue: function (SeriesIndex) {
            var self = this,
                i,
                len,
                Total = 0;

            if (self.IsScatterGraph()) {
                len = self.ValueCount(SeriesIndex); //RequestDrawXYZValueCount(SeriesIndex);
                for (i = 0; i < len; i++) {
                    //double XVal;
                    //double YVal;
                    //double ZVal;
                    //RequestDrawXYZValue(SeriesIndex, j, XVal, YVal, ZVal);

                    Total += self.Value(SeriesIndex, i).z;
                }
            }
            else {
                for (i = 0; i < self.GroupCount; i++) {
                    //double Value = GetDrawValue(SeriesIndex, GroupIndex);
                    Total += self.Value(SeriesIndex, i);
                }
            }
            return Total;
        },
        GetTotalValue: function () {
            var self = this,
                i,
                Total = 0;

            for (i = 0; i < self.SeriesCount; i++) {
                Total += self.GetSeriesTotalValue(i);
            }
            return Total;
        },

        prepareValues: function () {
            var self = this,
                i = self.values.length;

            while (i++ < self.SeriesCount) {
                self.values.push([]);
            }
        },

        //com interface
        get AsChart() {
            return this;
        },
        //[propget, id(160), helpstring("property GroupLabel")] HRESULT GroupLabel([in] LONG groupindex, [out, retval] BSTR* pVal);
        //[propput, id(160), helpstring("property GroupLabel")] HRESULT GroupLabel([in] LONG groupindex, [in] BSTR newVal);
        //[propget, id(161), helpstring("property SeriesLabel")] HRESULT SeriesLabel([in] LONG SeriesIndex, [out, retval] BSTR* pVal);
        //[propput, id(161), helpstring("property SeriesLabel")] HRESULT SeriesLabel([in] LONG SeriesIndex, [in] BSTR newVal);
        //[propget, id(162), helpstring("property Value")] HRESULT Value([in] LONG SeriesIndex, [in] LONG groupindex, [out, retval] DOUBLE* pVal);
        //[propput, id(162), helpstring("property Value")] HRESULT Value([in] LONG SeriesIndex, [in] LONG groupindex, [in] DOUBLE newVal);
        //[propget, id(163), helpstring("property ValueCount")] HRESULT ValueCount([in] LONG SeriesIndex, [out, retval] LONG* pVal);
        GroupLabel: function (groupIndex) {
            return this.GroupLabels[groupIndex];
        },
        SetGroupLabel: function (groupIndex, newVal) {
            this.GroupLabels[groupIndex] = newVal;
        },
        SeriesLabel: function (seriesIndex) {
            return this.SeriesLabels[seriesIndex];
        },
        SetSeriesLabel: function (seriesIndex, newVal) {
            this.SeriesLabels[seriesIndex] = newVal;
        },
        Value: function (seriesIndex, groupIndex) {
            var self = this,
                val;

            self.prepareValues();
            val = self.values[seriesIndex][groupIndex];
            if (val === undefined) {
                val = 0;
            }
            return val;
        },
        SetValue: function (seriesIndex, groupIndex, newVal) {
            //if ( IsSnapShotting() )
            //    {
            //	m_pCurrentSnapShot->SetValue(SeriesIndex, GroupIndex, newVal);
            //}
            //else
            //{
            //	m_Values[CChartValueIndex(SeriesIndex, GroupIndex)] = newVal;
            //}
            //m_DataLoaded = true;
            var self = this;

            self.prepareValues();
            self.values[seriesIndex][groupIndex] = newVal;
        },
        ValueCount: function (seriesIndex) {
            //if ( IsSnapShotting() )
            //{
            //    *pVal = m_pCurrentSnapShot->GetXYZValueCount(SeriesIndex);
            //}
            //else
            //{
            //    *pVal = CChartBaseImpl::GetXYZValueCount(SeriesIndex);
            //}
            //return Ret;
            var self = this;

            self.prepareValues();
            return self.values[seriesIndex].length;
        },

        //[propget, id(165), helpstring("property FillColorCount")] HRESULT FillColorCount([out, retval] LONG* pVal);
        get FillColorCount() {
            var self = this;

            return self.FillColors ? self.FillColors.length : 0
        },
        //[propget, id(166), helpstring("property FillColor")] HRESULT FillColor([in] LONG Index, [out, retval] OLE_COLOR* pVal);
        getFillColor: function (index) {
            var self = this;

            return self.FillColors ? self.FillColors[index] : undefined;
        },
        //[id(167), helpstring("method AddFillColor")] HRESULT AddFillColor([in] OLE_COLOR FillColor);
        AddFillColor: function (FillColor) {
            var self = this;

            if (!self.FillColors) {
                self.FillColors = [];
            }
            self.FillColors.push(FillColor);
        },
        //[id(168), helpstring("method EmptyFillColors")] HRESULT EmptyFillColors(void);
        EmptyFillColors: function () {
            delete self.FillColors;
        },

        //[id(180), helpstring("method PrepareSnapShot")] HRESULT PrepareSnapShot(void);
        //[id(181), helpstring("method SnapShot")] HRESULT SnapShot(void);
        //[id(183), helpstring("method LoadDataFromXML")] HRESULT LoadDataFromXML([in] BSTR XML, [in] VARIANT_BOOL FirstSeries, [in] VARIANT_BOOL AutoSeries, [in] VARIANT_BOOL AutoGroup, [out, retval] VARIANT_BOOL* pSuccess);
        LoadDataFromXML: function (XMLText, FirstSeries, AutoSeries, AutoGroup) { //, * pSuccess)
            var self = this,
                Success = 1,
                xml = parseXML(XMLText),
                node,
                node2,
                isNodeText,
                ValueText,
                SeriesIndex,
                GroupIndex;

            function getNodeText() {
                return isNodeText ? node2.text : node2.textContent;
            }

            if (!dom) {
                return 0;
            }

            //清除旧数据
            if (AutoGroup) {
                self.GroupCount = 0;
                self.GroupLabels = [];
            }
            if (AutoSeries) {
                self.SeriesCount = 0;
                self.SeriesLabels = [];
            }
            self.values = []; //EmptyValues();

            node = xml.childNodes[0].firstChild;
            nodeText = node.hasOwnProperty("text");
            while (node) {
                node2 = node.firstChild;

                if (FirstSeries) {
                    ValueText = getNodeText();
                    node2 = node2.nextSibling;
                    SeriesIndex = self.GetSeriesIndexByLabel(ValueText, !AutoSeries);
                    if (SeriesIndex < 0 && AutoSeries) {
                        SeriesIndex = self.SeriesCount;
                        self.SeriesCount++;
                        self.SeriesLabels.push(ValueText);
                    }
                    if (SeriesIndex < 0) {
                        throw 0;
                    }
                }

                ValueText = getNodeText();
                node2 = node2.nextSibling;
                GroupIndex = self.GetGroupIndexByLabel(ValueText, !AutoGroup);
                if (GroupIndex < 0 && AutoGroup) {
                    GroupIndex = self.GroupCount;
                    self.GroupCount++;
                    self.GroupLabels.push(ValueText);
                }
                if (GroupIndex < 0) {
                    throw 0;
                }

                if (FirstSeries) {
                    self.SetValue(SeriesIndex, GroupIndex, +getNodeText() + self.Value(SeriesIndex, GroupIndex));
                }
                else {
                    SeriesIndex = 0;
                    while (node2) {
                        self.SetValue(SeriesIndex, GroupIndex, +getNodeText() + self.Value(SeriesIndex, GroupIndex));

                        SeriesIndex++;
                        node2 = node2.nextSibling;
                    }
                }

                node = node.nextSibling;
            }

            return Success;
        },
        DoLoadXYZDataFromXML: function (XMLText, AutoSeries, OnlyXY) {
            var self = this,
                Success = 1,
                xml = parseXML(XMLText),
                node,
                node2,
                isNodeText,
                ValueText,
                x,
                y,
                z,
                SeriesIndex;
            //GroupIndex;

            function getNodeText() {
                return isNodeText ? node2.text : node2.textContent;
            }

            if (!dom) {
                return 0;
            }

            //清除旧数据
            if (AutoSeries) {
                self.SeriesCount = 0;
                self.SeriesLabels = [];
            }
            self.values = []; //EmptyValues();

            node = xml.childNodes[0].firstChild;
            nodeText = node.hasOwnProperty("text");
            while (node) {
                node2 = node.firstChild;

                if (FirstSeries) {
                    ValueText = getNodeText();
                    //IsNodeData? DOM_GetNodeValueText(pFieldChildList, FieldIndex++, &ValueText) : DOM_GetAttrValueText(pFieldAttrs, FieldIndex++, &ValueText);
                    SeriesIndex = self.GetSeriesIndexByLabel(ValueText, !AutoSeries);
                    if (SeriesIndex < 0 && AutoSeries) {
                        SeriesIndex = m_SeriesCount;
                        ++m_SeriesCount;
                        m_SeriesLabels[SeriesIndex] = ValueText;
                    }
                    node2 = node2.nextSibling;
                }
                else {
                    SeriesIndex = 0;
                    //if (m_SeriesCount <= 0)
                    //    m_SeriesCount = 1;
                }
                if (SeriesIndex < 0) {
                    throw 0;
                }

                x = +getNodeText();
                node2 = node2.nextSibling;
                y = +getNodeText();
                if (!OnlyXY) {
                    node2 = node2.nextSibling;
                    z = +getNodeText();
                }
                self.AddXYZValue(SeriesIndex, x, y, z);

                node = node.nextSibling;
            }

            return Success;
        },
        //[id(184), helpstring("method LoadXYDataFromXML")] HRESULT LoadXYDataFromXML([in] BSTR XML, [in] VARIANT_BOOL AutoSeries, [out, retval] VARIANT_BOOL* pSuccess);
        //[id(185), helpstring("method LoadXYZDataFromXML")] HRESULT LoadXYZDataFromXML([in] BSTR XML, [in] VARIANT_BOOL AutoSeries, [out, retval] VARIANT_BOOL* pSuccess);
        LoadXYDataFromXML: function (XML, AutoSeries) {
            return this.DoLoadXYZDataFromXML(XML, AutoSeries, 1);
        },
        LoadXYZDataFromXML: function (XML, AutoSeries) {
            return DoLoadXYZDataFromXML(XML, AutoSeries, 0);
        },
        //[id(190), helpstring("method AddXYValue")] HRESULT AddXYValue([in] LONG SeriesIndex, [in] DOUBLE XVal, [in] DOUBLE YVal);
        //[id(191), helpstring("method AddXYZValue")] HRESULT AddXYZValue([in] LONG SeriesIndex, [in] DOUBLE XVal, [in] DOUBLE YVal, [in] DOUBLE ZVal);
        AddXYZValue: function (seriesIndex, XVal, YVal, ZVal) {
            var self = this;

            self.prepareValues();
            self.values[seriesIndex].push({
                x: XVal,
                y: YVal,
                z: ZVal
            });
        },
        //[id(192), helpstring("method EmptyValues")] HRESULT EmptyValues(void);  //合并 EmptyXYValues 与 EmptyXYZValues
        EmptyValues: function () {
            var self = this;

            //	if ( IsSnapShotting() )
            //    {
            //		if (IsScatterGraph() )
            //			m_pCurrentSnapShot->EmptyXYZValue();
            //else
            //			m_pCurrentSnapShot->EmptyValues(); 
            //}
            //else
            //{
            //		if (IsScatterGraph() )
            //			CChartBaseImpl::EmptyXYZValue();
            //else
            //			CChartBaseImpl::EmptyValues(); 
            //}
            //var self = this,
            //    i = self.SeriesCount;

            self.values = [];
            //while (i-- > 0) {
            //    self.values.push([]);
            //}
            self.prepareValues();
        },
        //[id(193), helpstring("method GetXYValue")] HRESULT GetXYValue([in] LONG SeriesIndex, [in] LONG Index, [out] DOUBLE* pXVal, [out] DOUBLE* pYVal);
        //[id(194), helpstring("method GetXYZValue")] HRESULT GetXYZValue([in] LONG SeriesIndex, [in] LONG Index, [out] DOUBLE* pXVal, [out] DOUBLE* pYVal, [out] DOUBLE* pZVal);
        //[id(195), helpstring("method GetValueText")] HRESULT GetValueText([in] LONG SeriesIndex, [in] LONG groupindex, [out, retval] BSTR* pValueText);
        //[id(196), helpstring("method SetValueText")] HRESULT SetValueText([in] LONG SeriesIndex, [in] LONG groupindex, [in] BSTR ValueText);
        //[id(197), helpstring("method MapToRecordset")] HRESULT MapToRecordset([in] LONG SeriesIndex, [in] LONG groupindex); //根据数据项索引同步记录集记录
    };
    prototypeCopyExtend(Chart, CanvasBox);

    //gr.dom.Chart = Chart;
    //{{END CODE}}

    window.Chart = Chart;
})();
