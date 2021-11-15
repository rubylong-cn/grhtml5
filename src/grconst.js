//"use strict"; //定义在这里是影响全局的，不太合时

var gr = gr || {};

var DEBUG = 1;

//{{BEGIN CODE}}
//常数与枚举程序模块
(function () {
    "use strict";

    /////////////////////////////////////////////////////////////////////////
    gr.const_ = { //用 const_ 避免关键字 const  
        //TBD...优化，搜索 grconst.,将每个单元用到的常数全部定义为局部变量
        VERSION: "6.8.21.0901",

        ID_REPORT_STYLE: "_gridcss",
        ID_DETAILGRID: "_griddg",                 //明细网格的 id 前缀，后面还需补充一个序号    

        ATTR_CONTENT_RECNO: "_grRecNo",      //Attribute Name，内容行的记录号属性名
        ATTR_GROUPH_INDEX: "_grGHIndex",     //Attribute Name，分组头对应的分组序号
        ATTR_GROUPF_INDEX: "_grGFIndex",     //Attribute Name，分组头对应的分组序号
        ATTR_GROUP_RECNO: "_grGRecNo",       //Attribute Name，分组行对应的内部记录集的记录号
        ATTR_FIELD: "_grfld",               //Attribute Name

        CSS_DG: "_grdg", //标识明细网格的CSS
        CSS_SH: "_grcsssh",  //选中行的高亮CSS名称(Selection Highlight CSS)
        CSS_CB: "_grcsscb", //标识checkbox的CSS

        //??js代码是否也要这样 特别注意：源代码中不能出现常数汉字，不然英文版Windows下运行会出错，应该定义汉字的Unicode值
        BIG_AMT_NUMBER: "\u96F6\u58F9\u8D30\u53C1\u8086\u4F0D\u9646\u67D2\u634C\u7396", //_T("零壹贰叁肆伍陆柒捌玖");
        HZ_NUMBER: "\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u96F6", //_T("一二三四五六七八九十零");
        HZ_NEGATIVE: "\u8D1F", //_T("负");
        HZ_ZERO_YUAN: "\u96F6\u5143\u6574", //_T("零元整");
        HZ_AMT_STEP: "\u5143\u62FE\u4F70\u4EDF\u4E07\u62FE\u4F70\u4EDF\u4EBF\u62FE\u4F70\u4EDF", //_T("元拾佰仟万拾佰仟亿拾佰仟");
        HZ_AMT_UNIT: "\u6574\u89D2\u5206", //_T("整角分");
        HZ_DATETIME_UNIT: "\u5468\u65e5\u661f\u671f\u5929", //_T("周日星期天月");

        MILLISECONDS_DAY: 24 * 60 * 60 * 1000,

        TIMEZONE_OFFSET: new Date().getTimezoneOffset() * 60000, //以 milliseconds 为单位
    };

    /////////////////////////////////////////////////////////////////////////
    //枚举常数定义
    gr.enum_ = { //用 enum_ 避免关键字 enum
        //report enum
        PenStyle: {
            Solid: 0,
            Dash: 1,
            Dot: 2,
            DashDot: 3,
            DashDotDot: 4,
        },

        BorderStyle: {
            DrawLeft: 0x01,
            DrawTop: 0x02,
            DrawRight: 0x04,
            DrawBottom: 0x08,
        },

        BackStyle: {
            Normal: 1,
            Transparent: 2,
        },

        TextAlignBit: { //REMOVABLE
            LEFT: 0x1, //1
            CENTER: 0x2, //2
            RIGHT: 0x4, //4
            TOP: 0x10, //16
            MIDDLE: 0x20, //32
            BOTTOM: 0x40, //64
            JUSTIFY: 0x80 //128 水平两端分散对齐
        },

        TextAlign: {
            TopLeft: 17,
            TopCenter: 18,
            TopRight: 20,
            TopJustiy: 144,
            BottomLeft: 65,
            BottomCenter: 66,
            BottomRight: 68,
            BottomJustiy: 192,
            MiddleLeft: 33,
            MiddleCenter: 34,
            MiddleRight: 36,
            MiddleJustiy: 160
        },

        TextOrientationBit: { //REMOVABLE
            U2D: 0x1, //1
            D2U: 0x2, //2
            L2R: 0x4, //4
            R2L: 0x8, //8
            TEXTROTATION: 0x10, //16 
            FIRSTLR: 0x20 //32 首先从左到右或右到左
        },

        TextOrientation: {
            Default: 0,
            U2DL2R0: 5,
            D2UL2R1: 22,
            U2DR2L0: 9,
            U2DR2L1: 25,
            Invert: 58,
            L2RD2U0: 38,
            L2RD2U1: 54,
        },

        ParameterDataType: {
            String: 1,
            Integer: 2,
            Float: 3,
            Boolean: 5,
            DateTime: 6
        },

        FieldType: {
            String: 1,
            Integer: 2,
            Float: 3,
            Currency: 4,
            Boolean: 5,
            DateTime: 6,
            Binary: 7
        },

        ControlType: {
            StaticBox: 1,
            ShapeBox: 2,
            SystemVarBox: 3,
            FieldBox: 4,
            SummaryBox: 5,
            RichTextBox: 6,
            PictureBox: 7,
            MemoBox: 8,
            SubReport: 9,
            Line: 10,
            Chart: 11,
            Barcode: 12,
            FreeGrid: 13,
        },

        SummaryFun: {
            Sum: 1,		//求和
            Avg: 2,      //求平均
            Count: 3,	//计数
            Min: 4,      //最大值
            Max: 5,      //最小值

            Var: 6,			//方差
            VarP: 7,		//总体方差
            StdDev: 8,    //标准偏差
            StdDevP: 9,  //总体标准偏差
            AveDev: 10,   //平均偏差
            DevSq: 11,     //偏差平方和

            CountBlank: 12,      //空值个数
            CountA: 13,      //非空值个数
            Distinct: 14,      //非重复值个数
            AvgA: 15,      //非空值平均
            MinN: 16,      //第N个最小值
            MaxN: 17,      //第N个最大值

            StrMin: 18,      //文字最小值
            StrMax: 19,      //文字最大值

            VarA: 20,      //非空方差
            VarPA: 21,      //非空总体方差
            StdDevA: 22,      //非空标准偏差
            StdDevPA: 23,      //非空总体标准偏差
            AveDevA: 24,      //非空平均偏差
            DevSqA: 25,      //非空偏差平方和

            SumAbs: 26,		//绝对值合计
            SumAcc: 27,		//累计(全程从开始到当前的合计)
            GroupSumAcc: 28,		//组累计，在上级组内累计
        },

        MathFun: {
            round45: 1, //(double Value, int Decimals);
            round465: 2, //(double Value, int Decimals);
            abs: 5, //(number) Returns the absolute value of a number.
            acos: 6, //(number) Returns the arccosine of a number.
            asin: 7, //(number) Returns the arcsine of a number.
            atan: 8, //(number) Returns the arctangent of a number.
            atan2: 9, //(number) Returns the angle (in radians) from the X axis to a point (y,x).
            ceil: 15, //(number) Returns the smallest integer greater than or equal to its numeric argument.
            cos: 16, //(number) Returns the cosine of a number.
            exp: 17, //(number) Returns e (the base of natural logarithms) raised to a power.
            floor: 18, //(number) Returns the greatest integer less than or equal to its numeric argument.
            log: 19, //(number) Returns the natural logarithm of a number.
            maxArray: 20, //([number1[, number2[... [, numberN]]]]) Returns the greater of two supplied numeric expressions.
            minArray: 21, //([number1[, number2[... [, numberN]]]]) Returns the lesser of two supplied numbers.
            pow: 22, //(base, exponent) Returns the value of a base expression raised to a specified power.
            round: 23, //(number) Returns a specified numeric expression rounded to the nearest integer.
            sin: 24, //(number) Returns the sine of a number.
            sqrt: 25, //(number) Returns the square root of a number.
            tan: 26, //(number) Returns the tangent of a number.
        },

        SystemVarType: {
            CurrentDateTime: 1,
            //PageCount: 2, 没法支持
            //PageNumber: 3, 没法支持
            RecordNo: 4,
            RowNo: 8,
            RecordCount: 19,

            GroupNo: 20,			  //分组序号，某个分组的序号，与分组项个数关联，序号从1开始
            GroupCount: 21,	  //分组数，某个分组产生的分组项个数（全程变量，全程统一值）。
            GroupRowNo: 22,     //分组项行号，在一个分组内重启序号，序号从1开始
            GroupRowCount: 23,  //分组项行数，某个分组项包含的明细记录(行)数。
            //GroupPageNo: 24,   没法支持 //分组项页号
            //GroupPageCount: 25, 没法支持 //分组项页数
        },

        AnchorStyle: {
            Left: 0x01,
            Top: 0x02,
            Right: 0x04,
            Bottom: 0x08,
        },

        AlignColumnSideStyle: {
            Left: 1,
            Right: 2,
            Both: 3,
        },

        DockStyle: {
            None: 0,
            Left: 1,
            Top: 2,
            Right: 3,
            Bottom: 4,
            Fill: 5,
        },

        CenterStyle: {
            None: 0,
            Horizontal: 1,
            Vertical: 2,
            Both: 3,
        },

        ShiftMode: {
            Never: 0,
            Always: 1,
            WhenOverLapped: 2,
        },

        Unit: {
            Cm: 1,
            Inch: 2,
        },
        //StorageFormat
        //{
        //    grsfText: 1, 
        //    grsfBinary: 2, 
        //    grsfBinBase64: 3, 
        //    grsfXML: 4, 
        //    },

        //TextEncodeMode
        //{
        //    grtemAnsi: 1, 
        //    grtemUTF8: 2, 
        //    grtemUnicode: 3, 
        //    },
        //
        //DocType
        //{
        //    grdtObject: 1, 
        //    grdtJSON: 2, 
        //    //grdtXML: 3, 
        //    },
        //
        //ScriptType
        //{
        //    grstJScript: 1, 
        //    grstVBScript: 2, 
        //    },

        ShapeBoxType: {
            Circle: 1,
            Ellipse: 2,
            Rectangle: 3,
            RoundRect: 4,
            RoundSquare: 5,
            Square: 6,
            Line: 7,
        },

        //LineType: {
        //    grltTopLeftToBottomRight, 
        //    grltBottomLeftToTopRight, 
        //    grltTopLeftToTopRight, 
        //    grltMiddleLeftToMiddleRight, 
        //    grltBottomLeftToBottomRight, 
        //    grltTopLeftToBottomLeft, 
        //    grltTopCenterToBottomCenter, 
        //    grltTopRightToBottomRight, 
        //},

        //PictureType
        //{
        //    //保持与cxImage中的定义一致
        //    //CXIMAGE_FORMAT_BMP: 1,
        //    //CXIMAGE_FORMAT_GIF: 2,
        //    //CXIMAGE_FORMAT_JPG: 3,
        //    //CXIMAGE_FORMAT_PNG: 4,
        //    //CXIMAGE_FORMAT_ICO: 5,
        //    //CXIMAGE_FORMAT_TIF: 6,
        //    //CXIMAGE_FORMAT_TGA: 7,
        //    //CXIMAGE_FORMAT_PCX: 8,
        //    //CXIMAGE_FORMAT_WBMP: 9,
        //    //CXIMAGE_FORMAT_WMF: 10,
        //    //CXIMAGE_FORMAT_JP2: 11,
        //    //CXIMAGE_FORMAT_JPC: 12,
        //    //CXIMAGE_FORMAT_PGX: 13,
        //    //CXIMAGE_FORMAT_PNM: 14,
        //    //CXIMAGE_FORMAT_RAS: 15,
        //    //CXIMAGE_FORMAT_JBG: 16,
        //    //CXIMAGE_FORMAT_MNG: 17,
        //    //CXIMAGE_FORMAT_SKA: 18,
        //    //CXIMAGE_FORMAT_RAW: 19,
        //    //CXIMAGE_FORMAT_PSD: 20,
        //    grptUnknown : 0, 
        //    grptBMP : 1, 
        //    grptGIF : 2, 
        //    grptJPEG : 3, 
        //    grptPNG : 4, 
        //    grptICON : 5, 
        //    grptTIFF : 6, 
        //    grptWMF : 10, 
        //    grptEMF : -1,  //cxImage中无对应定义
        //    },

        PictureAlignment: {
            TopLeft: 1,
            TopRight: 2,
            Center: 3,
            BottomLeft: 4,
            BottomRight: 5,
        },

        PictureSizeMode: {
            Clip: 1,
            Stretch: 2,
            Zoom: 3,
            EnsureFullView: 4,
            Tile: 5,
        },

        PictureTransparentMode: {
            None: 0,
            Overlying: 1,
            Background: 2,
        },

        PictureRotateMode: {
            None: 0,
            Left: 1,
            Right: 2,
            Flip: 3,
            Mirror: 4,
        },

        ChartType: {
            BarChart: 1,		 //柱状图
            PieChart: 2,		 //饼图
            LineChart: 3,		 //连线图
            StackedBarChart: 4,  //叠加柱状图
            XYScatterChart: 5,   //散列点	 
            XYLineChart: 6,      //散列点连线图
            CurveLineChart: 7,	 //连曲线图
            XYCurveLineChart: 8, //散列点连曲线图
            Bubble: 9,           //气泡图

            StackedBar100Chart: 10,    //百分比柱状图
            ColumnChart: 11,           //横向柱状图
            StackedColumnChart: 12,    //横向叠加柱状图
            StackedColumn100Chart: 13, //横向百分比柱状图
        },

        ChartVarType: {
            XVal: 1,
            YVal: 2,
            ZVal: 3,
            YVal100ByGroup: 4,
            YVal100BySeries: 5,
            YValTotalByGroup: 6,
            YValTotalBySeries: 7,
            SeriesLabel: 8,
            GroupLabel: 9,
        },

        PointMarkerStyle: {
            None: -1,

            Square: 0,      //框
            SquareCheck: 1, //框加勾
            SquareCross: 2, //框加勾
            Circle: 3,      //圈
            CirclePoint: 4, //圈加点
            CircleCross: 5, //圈

            Dimond: 6,   //钻石
            Triangle: 7, //三角形
            Cross: 8,    //叉
            Cross4: 9,   //米字叉

            Star4: 10,	  //4角星
            Star5: 11,    //5角星
            Star6: 12,    //6角星
            Star10: 13,  //10角星 
        },

        BarcodeType: {
            Code25Intlv: 1,
            Code25Ind: 2,
            Code25Matrix: 3,
            Code39: 4,
            Code39X: 5,
            Code128A: 6,
            Code128B: 7,
            Code128C: 8,
            Code93: 9,
            Code93X: 10,
            CodeMSI: 11,
            CodePostNet: 12,
            CodeCodabar: 13,
            CodeEAN8: 14,
            CodeEAN13: 15,
            CodeUPC_A: 16,
            CodeUPC_E0: 17,
            CodeUPC_E1: 18,
            CodeUPC_Supp2: 19,    //{ UPC 2 digit supplemental }
            CodeUPC_Supp5: 20,    //UPC 5 digit supplemental }
            CodeEAN128A: 21,
            CodeEAN128B: 22,
            CodeEAN128C: 23,
            Code128Auto: 24,
            PDF417: 50,
            QRCode: 51,
            DataMatrix: 52,
            GS1DataMatrix: 53,
            GS1QRCode: 54,
        },

        BarcodeCaptionPosition: {
            None: 1,
            Above: 2,
            Below: 3,
        },

        BarcodeDirection: {
            LeftToRight: 1,
            RightToLeft: 2,
            TopToBottom: 3,
            BottomToTop: 4,
        },

        DtmxEncoding: {
            //grdtmxeAutoFast: 1,
            Auto: 2, //grdtmxeAutoBest
            Ascii: 3,
            C40: 4,
            Text: 5,
            X12: 6,
            Edifact: 7,
            Base256: 8
        },

        DtmxMatrixSize: {
            //grdtmxmsRectAuto: 1,
            Auto: 2,   //grdtmxmsSquareAuto
            //ShapeAuto,
            "10x10": 4,
            "12x12": 5,
            "14x14": 6,
            "16x16": 7,
            "18x18": 8,
            "20x20": 9,
            "22x22": 10,
            "24x24": 11,
            "26x26": 12,
            "32x32": 13,
            "36x36": 14,
            "40x40": 15,
            "44x44": 16,
            "48x48": 17,
            "52x52": 18,
            "64x64": 19,
            "72x72": 20,
            "80x80": 21,
            "88x88": 22,
            "96x96": 23,
            "104x104": 24,
            "120x120": 25,
            "132x132": 26,
            "144x144": 27,
            "8x18": 28,
            "8x32": 29,
            "12x26": 30,
            "12x36": 31,
            "16x36": 32,
            "16x48": 33
        },

        StringAlignment: {
            Near: 1,
            Center: 2,
            Far: 3,
        },

        //SectionType: {
        //    grstPageHeader: 1, 
        //    grstReportHeader: 2, 
        //    grstReportFooter: 3, 
        //    grstPageFooter: 4, 
        //    grstColumnTitle: 5, 
        //    grstColumnContent: 6, 
        //    grstGroupHeader: 7, 
        //    grstGroupFooter: 8, 
        //    },

        PeriodType: {
            None: 0,
            Day: 1,
            Week: 2,
            ThirdMonth: 3,
            HalfMonth: 4,
            Month: 5,
            Quarter: 6,
            HalfYear: 7,
            Year: 8,
            Calendar: 9,
        },

        OCGroupHeaderVAlign: {
            Top: 1,
            Bottom: 2,
            Middle: 3,
        },


        //[
        //  uuid(5C038FCC-BB3A-4f99-86AC-139D730A5C8C)
        //]
        //SystemImage
        //{
        //    grsiChecked		= -1,
        //    grsiUnchecked	= -2,
        //    grsi3DChecked	= -3,
        //    grsi3DUnchecked	= -4,
        //    grsiAffirm		= -5,
        //    grsiNegative		= -6,
        //    grsiArrowDown	= -7,
        //    grsiArrowUp		= -8,
        //    },

        //viewer enum
        controlLayout: {
            auto: 0,
            table: 1,
            absolute: 2,
        },

        detailgridResize: {
            asDesign: 0,
            fitWidth: 1,
            onlyGrow: 2,
            //TDD 折行
            //TDD 响应式多栏，自动按多栏显示，列宽保持不变
        },

        ExpVarType: { //REMOVABLE
            RecordsetField: 1,
            Parameter: 2,
            SystemVar: 3,
            Summary: 4,
            MathFun: 5,
            TextControl: 6,
        },

        CrossColumnKind: { //REMOVABLE
            List: 1,     //项目列
            Cross: 2,	   //交叉列
            SubTotal: 3, //小计列
            Total: 4,    //合计列
        },

        NumericFormatType: { //REMOVABLE
            Normal: 0,          //普通格式
            HZAmtNumeric: 1,	//表示仅汉字大写金额数字，不带位阶文字，如12.34显示为壹贰叁肆
            HZBigAmt: 2,		//表示汉字大写金额数字
            HZBigNumeric: 3,	//表示汉字大写数字，与sftHZBigAmt类似，但元去掉，小数不要角分
            IntEnum: 4	        //
        },

        dateTimeItemType: { //REMOVABLE
            year: 1,
            month: 2,
            day: 3,
            weekday: 4,

            hour12: 5,
            hour24: 6,
            minute: 7,
            second: 8,

            localedate: 10,
            localetime: 11,
            localedatetime: 12,

            text: 15,

            ampm: 20, //AM/PM 上午/下午
            datesep: 21,
            timesep: 22,
        },

        //grformat.dateTimeItemSubtype = {
        dateTimeItemSubtype: { //REMOVABLE
            numeric: 0, //必须固定为2, 便捷int Fixed调用
            digit2: 2, //必须固定为2
            digit4: 4, //必须固定为4
            short: 5,
            long: 6,
            //narrow: 7,
        },

        PaperOrientation: { //REMOVABLE
            Portrait: 1,
            Landscape: 2,
        },

        barcodeLineType: { //REMOVABLE
            white: 0,
            black: 1,
            black_half: 2,
            black_out: 3,
        },

        constVar: { //REMOVABLE
            GROUP_SUMACC_INSUP: -1, //累计函数在上一级分组中要定义对应统计项，此常数指定此特殊统计函数的类型值

            //以下常数值必须与C++程序中保持一致
            COL_W: 3,       //列的默认宽度3CM
            ROW_H: 0.58,    //行的默认高度0.58CM
            SEC_H: 3,       //普通报表节的默认高度3CM
            GS_H: 1.2,        //分组节的默认高度1.2CM
        },

        elementEventType: { //REMOVABLE
            click: 1,       //单击事件
            dblclick: 2,    //双击事件
        },
    }; //gr.enum_ end {枚举常数的结尾标志，必须保留}

    /////////////////////////////////////////////////////////////////////////
    //记录 locale 相关的参数, ???看能否从当前电脑中自动获取到
    gr.locale = {
        supportIntl: !!window.Intl,
        decimalSep: ".",
        thousandSep: ",",

        //暂时还没有好的办法获取到下面的参数
        //期望通过Intl.DateTimeFormat生成的文字获取如下参数,但每种浏览器都有自己的实现,获取的值不一样
        dateSep: "-", //???中文还不能解析出,只能从英文(en-US)中解析，未知每种浏览器是否一致，是否跟随控制面板中设置发生改变
        timeSep: ":", //???
        textAM: "上午", //???...从一个上午时间的显示文字中解析出
        textPM: "下午", //???...从一个下午时间的显示文字中解析出

        currencySymbol: "\uffe5", //￥===\uffe5 注意：宋体字无法显示双羊符号
    };

    //特别注意！！
    //eval 会影响 Uglifyjs，造成当前程序代码文件的优化大打折扣
    //gr.script 必须定义在 grconst.js 中，这样对 Uglifyjs 压缩优化代码的影响最小
    gr.script = {
        calcExp: function (expText) {
            var result = NaN;

            expText = "result=" + expText;
            try {
                eval(expText);
            }
            catch (e) {
                result = NaN;
            }

            return result;
        },

        //参数名称必须有 Report 与 Sender（名称固定），不然脚本中用 Report 与 Sender 就会出错
        execEvent: function (scriptText, scriptName, Sender, Report) {
            var globalScript = Report.GlobalScript;

            try {
                //对于全局脚本函数，目前只实验成功这样的处理方式
                if (globalScript) {
                    scriptText += "\n" + globalScript;
                }

                eval(scriptText);
            }
            catch (e) {
                if (!Sender.report.root._scriptFailed) {
                    alert("执行报表脚本 '" + scriptName + "' 失败" +
                        (Sender.Name ? "\n对象名称: " + Sender.Name : "") +
                        "\n错误信息: " + e.toString() +
                        "\n脚本代码:\n" + scriptText);

                    //root
                    Sender.report.root._scriptFailed = 1;
                }
            }
        },
    };

})();
//{{END CODE}}