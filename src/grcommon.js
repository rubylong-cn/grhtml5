var gr = gr || {};

//{{BEGIN CODE}}
//共用或工具函数程序模块
(function (undefined) {
    "use strict";

    /**
     * 通用函数 namespace.
     * @namespace grhelper
     */

    var
    grenum = gr.enum_,
    grconst = gr.const_,

    grhelper = gr.helper = {},
    grcommon = gr.common = {},

    MILLISECONDS_DAY = grconst.MILLISECONDS_DAY,
    TIMEZONE_OFFSET = grconst.TIMEZONE_OFFSET,

    GRASSERT = grhelper.GRASSERT = function (condtion, msg) { //此函数在代码制作为发布版本时将被移除掉，调用此函数一定不能书写多行
        if (DEBUG) {
            if (!condtion) {
                console.log("Assert error: " + msg);
                debugger;
            }
        }
    },

    /** 
     * 
     * @function grhelper.assignJSONMembers
     * @param {object} objDom
     * @param {object} objJson
     */
    assignJSONMembers = grhelper.assignJSONMembers = function (objDom, objJson, isWR) {
        var val,
            member,
            memberDom,
            wrPropNameDecode;

        grhelper.GRASSERT(objDom.report !== undefined || isWR !== undefined, "");

        if (isWR === undefined) {
            isWR = objDom.report.isWR;
        }

        isWR && (wrPropNameDecode = gr.wr.wrPropNameDecode);

        for (member in objJson) {
            val = objJson[member];

            if (typeof val !== "object") {
                if (isWR) {
                    member = wrPropNameDecode(member);
                }
                if (objDom.hasOwnProperty(member)) {
                    objDom[member] = val;
                }
            }
        }
    },
    /** 
     * 确保枚举属性值在载入后为整数
     * @function grhelper.enumMemberValid
     * @param {object} obj
     * @param {string} member
     * @param {object} enumobj
     */
    enumMemberValid = grhelper.enumMemberValid = function (obj, member, enumobj) {
        if (typeof obj[member] !== "number") {
            obj[member] = enumName2Value(enumobj, obj[member]);
        }
    },
    /** 
     * 确保枚举位属性值在载入后为整数
     * @function grhelper.enumBitMemberValid
     * @param {object} obj
     * @param {string} member
     * @param {object} enumobj
     */
    enumBitMemberValid = grhelper.enumBitMemberValid = function (obj, member, enumobj) {
        if (typeof obj[member] !== "number") {
            obj[member] = enumBitText2Value(enumobj, obj[member]);
        }
    },
    /** 
     * 确保颜色属性值在载入后为整数
     * @function grhelper.colorMemberValid
     * @param {object} obj
     * @param {string} member
     * @param {integer} defaultAlpha - 颜色 alpha 值，表示透明度
     */
    colorMemberValid = grhelper.colorMemberValid = function (obj, member, defaultAlpha) {
        if (typeof obj[member] !== "number") {
            obj[member] = parseInt("0x" + obj[member], 16) | (Math.max(0, Math.min(Math.round(defaultAlpha * 255), 255)) << 24);
        }
    },

    /** 
     * 
     * @function grhelper.penStyleText
     * @param {Pen} pen
     * @returns {string} - 画笔的 css style 值
     */
    penStyleText = grhelper.penStyleText = function (pen) {
        var penStyleHtml = {
            Solid: "solid",
            Dash: "dashed",
            Dot: "dotted",
            DashDot: "dashed",
            DashDotDot: "dotted",
        };

        return pixelsToHtml(pen.Width) + " " +
        penStyleHtml[enumValue2Name(grenum.PenStyle, pen.Style)] + " " +
        colorValue2Html(pen.Color);
    },

    fontHeight = grhelper.fontHeight = function (font) {
        return font.Size * 4 / 30000; //??实践证明4:3(96:72)是合适的转换比例 成熟后应该定义为一个函数
    },
    /** 
     * 
     * @function grhelper.fontString
     * @param {numeric} pixelSize
     * @param {string} fontStyle
     * @param {string} fontFamily
     * @returns {string} - 字体的 css style 值
     */
	fontString = grhelper.fontString = function (pixelSize, fontStyle, fontFamily) {
	    return fontStyle + " " + pixelsToHtml(pixelSize) + " " + fontFamily;
	},
    /** 
     * 
     * @function grhelper.fontCSSText
     */
    fontCSSText = grhelper.fontCSSText = function (font) {
        var text = "",
            values = [];

        font.Italic && values.push("italic"); //italic : normal
        font.Bold && values.push("bold");
        values.push(pixelsToHtml(fontHeight(font)), font.Name);

        values.forEach(function (value) {
            if (text) {
                text += ' ';
            }
            text += value;
        });

        return text;
    },

    /** 
     * 将整数格式化为指定的位数，如超出则舍弃高位，如不足则在高位用0补齐 
     * @function grhelper.intFixed
     */
    intFixed = grhelper.intFixed = function (val, digits) {
        var t = val + "",
            paddings;
        if (digits > 0) {
            paddings = digits - t.length;
            if (paddings < 0) {
                t = t.substr(-paddings);
            }
            else {
                while (paddings-- > 0) {
                    t = '0' + t;
                }
            }
        }
        return t;
    },
    /** 
     * 将数字值转换为html中表示的文本，最多保留2位
     * @function grhelper.numericToHtml
     */
    numericToHtml = function (val) {
        var text = val.toFixed(2),
            index = text.length - 1;

        if (text.charAt(index) === '0') {
            if (text.charAt(index - 1) === '0') {
                index -= 2;
            }
            text = text.substr(0, index);
        }
        return text;
    },
    /** 
     * 
     * @function grhelper.pixelsToHtml
     */
    pixelsToHtml = grhelper.pixelsToHtml = function (val) {
        return numericToHtml(val) + "px";
    },
    /** 
     * 
     * @function grhelper.percentToHtml
     */
    percentToHtml = grhelper.percentToHtml = function (val) {
        return numericToHtml(val) + "%";
    },
    /** 
     * 
     * @function grhelper.cloneDate
     */
    cloneDate = grhelper.cloneDate = function (val) {
        //确保 val 是日期类型的
        grhelper.GRASSERT(Date.prototype.isPrototypeOf(val), "val isn't a Date Object");
        return new Date(val);
    },
    //将参数转换为 Date 类型，如果本身为 Date 对象，则返回参数自己
    /** 
     * 
     * @function grhelper.confirmDateValue
     */
    confirmDateValue = grhelper.confirmDateValue = function (val) {
        function valid() {
            var dval;

            function parseCustomString() {
                var temp = val.indexOf(":"),
                    dateAtTail = temp > 0 && temp < 8,
                    //valTextItems = val.split(":-/ "), //val.split([:-/ ]/g)
                    valTextItems = val.split(/[\:\-/ ]/g),
                    len = valTextItems.length,
		            nYear = (len > 0) ? +valTextItems[0] : 0,
                    nMonth = (len > 1) ? +valTextItems[1] : 0,
                    nDay = (len > 2) ? +valTextItems[2] : 0,
                    nHour = (len > 3) ? +valTextItems[3] : 0,
                    nMin = (len > 4) ? +valTextItems[4] : 0,
                    nSec = (len > 5) ? +valTextItems[5] : 0;

                //尝试转换PHP+MSSQL的日期，形如 2009 五月 12  0:00 || 2009 十一月 12  0:00 || 2009 十月 12  0:00
                if (isNaN(nMonth)) {
                    temp = valTextItems[1];
                    nMonth = grconst.HZ_NUMBER.indexOf(temp.charAt(0)) + 1;
                    if (temp.length >= 3) { //nMonth === 10
                        nMonth += grconst.HZ_NUMBER.indexOf(temp.charAt(1)) + 1;
                    }
                }

                if (dateAtTail) {
                    //swap(nYear, nHour);
                    temp = nYear;
                    nYear = nHour;
                    nHour = temp;

                    //swap(nMonth, nMin);
                    temp = nMonth;
                    nMonth = nMin;
                    nMin = temp;

                    //swap(nDay, nSec);
                    temp = nDay;
                    nDay = nSec;
                    nSec = temp;
                }

                if (nDay > 31) { //“月/日/年”类型
                    //swap(nYear, nDay);
                    temp = nYear;
                    nYear = nDay;
                    nDay = temp;

                    //swap(nMonth, nDay);
                    temp = nMonth;
                    nMonth = nDay;
                    nDay = temp;
                }

                if (nMonth > 12) {
                    //swap(nMonth, nDay);
                    temp = nMonth;
                    nMonth = nDay;
                    nDay = temp;
                }

                return new Date(nYear, --nMonth, nDay, nHour, nMin, nSec); //--nMonth::月份有效值：0-11
            } //end of parseCustomString

            if (typeof val === "string") {
                dval = Date.parse(val);
                val = val? (isNaN(dval) ? parseCustomString() : new Date(dval)) : undefined;
            }
            else {
                dval = new DateTime();
                dval.AsFloat = +val;
                val = dval.value;
            }

            return val;
        } //end of valid

        return Date.prototype.isPrototypeOf(val) ? val : valid();
    },
    //如果是日期类型，克隆；其它类型转换为日期类型
    confirmCloneDateValue = grhelper.confirmCloneDateValue = function (val) {
        return Date.prototype.isPrototypeOf(val) ? cloneDate(val) : confirmDateValue(val);
    },
    /** 
     * 
     * @function grhelper.strimDate
     */
    strimDate = grhelper.strimDate = function (date) { //去掉日期时间值中的时间部分
        var t = date.getTime();
        date.setTime(t - (t - date.getTimezoneOffset() * 60000) % MILLISECONDS_DAY);
    },
    /** 
     * 
     * @function grhelper.incDate
     */
    incDate = grhelper.incDate = function (date) {
        date.setTime(date.getTime() + MILLISECONDS_DAY);
    },
    /** 
     * 
     * @function grhelper.incDate2
     */
    incDate2 = grhelper.incDate2 = function (date, days) {
        date.setTime(date.getTime() + days * MILLISECONDS_DAY);
    },
    //根据起始日期获取期间的结束日期，传入第一个参数为交叉期间的起始日期，类型为Date对象，
    periodRangeBy = grhelper.periodRangeBy = function (byDate, periodType) {
        var BeginDay = byDate.getDate(),
            BeginMonth = byDate.getMonth(),
            BeginYear = byDate.getFullYear(),
            EndDay = BeginDay,
            EndMonth = BeginMonth,
            EndYear = BeginYear,
            range;

        function nextEndMonth() {
            if (EndMonth < 11) {
                ++EndMonth;
            }
            else {
                ++EndYear;
                EndMonth = 0;
            }
        };

        if (periodType <= grenum.PeriodType.Week) {
            range = {
                begin: cloneDate(byDate),
                end: cloneDate(byDate)
            }
            incDate2(range.end, grenum.PeriodType.Day === periodType ? 1 : 7);
        }
        else {
            switch (periodType) {
                //case grenum.PeriodType.Day:
                //    break;
                //case grenum.PeriodType.Week:
                //    break;
                case grenum.PeriodType.ThirdMonth:
                    if (BeginDay <= 10) {
                        BeginDay = 1;
                        EndDay = 11;
                    }
                    else if (BeginDay <= 20) {
                        BeginDay = 11;
                        EndDay = 21;
                    }
                    else {
                        BeginDay = 21;
                        nextEndMonth();
                        EndDay = 1;
                    }
                    break;
                case grenum.PeriodType.HalfMonth:
                    if (BeginDay <= 15) {
                        BeginDay = 1;
                        EndDay = 16;
                    }
                    else {
                        BeginDay = 16;
                        nextEndMonth();
                        EndDay = 1;
                    }
                    break;
                case grenum.PeriodType.Month:
                    BeginDay = EndDay = 1;
                    nextEndMonth();
                    break;
                case grenum.PeriodType.Quarter:
                    BeginDay = EndDay = 1;
                    BeginMonth = BeginMonth - (BeginMonth % 3);
                    EndMonth = BeginMonth;
                    nextEndMonth();
                    nextEndMonth();
                    nextEndMonth();
                    break;
                case grenum.PeriodType.HalfYear:
                    BeginDay = EndDay = 1;
                    BeginMonth = BeginMonth < 6 ? 0 : 6;
                    EndMonth = BeginMonth < 6 ? 6 : 0;
                    if (!EndMonth) {
                        EndYear++;
                    }
                    break;
                case grenum.PeriodType.Year:
                    BeginDay = EndDay = 1;
                    BeginMonth = EndMonth = 0;
                    EndYear++;
                    break;
            }

            //self.CurPeriodBeginDate = new Date(BeginYear, BeginMonth, BeginDay);
            //self.CurPeriodEndDate = new Date(EndYear, EndMonth, EndDay);
            range = {
                begin: new Date(BeginYear, BeginMonth, BeginDay),
                end: new Date(EndYear, EndMonth, EndDay)
            };
        }

        return range;
    },

    periodRangeNext = grhelper.periodRangeNext = function (periodRange, periodType) {
        var BeginDay = periodRange.begin.getDate(),
            BeginMonth = periodRange.begin.getMonth(),
            BeginYear = periodRange.begin.getFullYear(),
            EndDay = BeginDay,
            EndMonth = BeginMonth,
            EndYear = BeginYear,
            range;

        function nextEndMonth() {
            if (EndMonth < 11) {
                ++EndMonth;
            }
            else {
                ++EndYear;
                EndMonth = 0;
            }
        };

        if (periodType <= grenum.PeriodType.Week) {
            range = {
                begin: cloneDate(periodRange.end),
                end: cloneDate(periodRange.end)
            }
            incDate2(range.end, grenum.PeriodType.Day === periodType ? 1 : 7);
        }
        else {
            switch (periodType) {
                case grenum.PeriodType.ThirdMonth:
                    if (BeginDay <= 10) {
                        BeginDay = 11;
                        EndDay = 21;
                    }
                    else if (BeginDay <= 20) {
                        BeginDay = 21;
                        EndDay = 1;
                        nextEndMonth();
                    }
                    else {
                        BeginDay = 1;
                        EndDay = 11;
                        nextEndMonth();
                        BeginYear = EndYear;
                        BeginMonth = EndMonth;
                    }
                    break;
                case grenum.PeriodType.HalfMonth:
                    if (BeginDay <= 15) {
                        BeginDay = 16;
                        EndDay = 1
                        nextEndMonth();
                    }
                    else {
                        BeginDay = 1;
                        EndDay = 16;
                        nextEndMonth();
                        BeginYear = EndYear;
                        BeginMonth = EndMonth;
                    }
                    break;
                case grenum.PeriodType.Month:
                    nextEndMonth();
                    BeginYear = EndYear;
                    BeginMonth = EndMonth;
                    nextEndMonth();
                    break;
                case grenum.PeriodType.Quarter:
                    nextEndMonth();
                    nextEndMonth();
                    nextEndMonth();
                    BeginYear = EndYear;
                    BeginMonth = EndMonth;
                    BeginDay = EndDay;
                    nextEndMonth();
                    nextEndMonth();
                    nextEndMonth();
                    break;
                case grenum.PeriodType.HalfYear:
                    if (BeginMonth) {
                        BeginMonth = 0;
                        BeginYear++;
                        EndMonth = 6;
                    }
                    else {
                        BeginMonth = 6;
                        EndMonth = 0;
                    }
                    EndYear++;
                    break;
                case grenum.PeriodType.Year:
                    BeginYear++;
                    EndYear++;
                    EndYear++;
                    break;
            }

            //self.CurPeriodBeginDate = new Date(BeginYear, BeginMonth, BeginDay);
            //self.CurPeriodEndDate = new Date(EndYear, EndMonth, EndDay);
            range = {
                begin: new Date(BeginYear, BeginMonth, BeginDay),
                end: new Date(EndYear, EndMonth, EndDay)
            };
        }

        return range;
    },

    //将参数转换为 Boolean 类型
    /** 
     * 
     * @function grhelper.confirmBooleanValue
     */
    confirmBooleanValue = grhelper.confirmBooleanValue = function (val) {
        if (val.constructor === Boolean.prototype.constructor) { //if (Boolean.prototype.isPrototypeOf(val)){
            return val;
        }

        if (typeof val === "string") { //if (String.prototype.isPrototypeOf(val)) {
            val.toLowerCase();
            if ((val === "TRUE") || (val === "true")) {
                return true;
            }
            val = parseInt(val);
        }

        return !!val;
    },

    /** 
     * 
     * @function grhelper.ensureNameText
     */
    ensureNameText = grhelper.ensureNameText = function (name) { //如果不是良好的名称文字，用“[]”括起来
        //    var chars = name.split(''),
        //        len = chars.length,
        //        i = 0,
        //        ch;

        //    ch = chars[i++];
        //    if ('a') <= ch && ch <= _T('z'))
        //        || (_T('A') <= ch && ch <= _T('Z'))
        //        || ((ch >= 0x0100)) //IsHZChar 
        //        || (ch == _T('_'));

        //if ( !IsGoodNameText(ObjectName) )
        //	ObjectName = _T("[") + ObjectName + _T("]");

        //首字符为字母、下画线与非ASCII字符,后面字符为字母、下画线、数字与非ASCII字符
        //正则表达式实现，\u0100-\uffff表示非ASCII字符
        if (!/^[A-Za-z_\u0100-\uffff][\w\u0100-\uffff]*$/.test(name)) { //if (!/^[A-Za-z_]\w*$/.test(name)) {
            name = "[" + name + "]";
        }
        return name;
    },
    //将枚举项文字转换为整数值
    /** 
     * 
     * @function grhelper.enumName2Value
     */
    enumName2Value = grhelper.enumName2Value = function (enumobj, enumItemName) {
        var v = enumobj[enumItemName];

        //return v !== undefined ? v : -1;
        if (v === undefined) {
            //按不区分大小写方式进行匹配
            enumItemName = enumItemName.toUpperCase();
            for (var i in enumobj) {
                if (i.toUpperCase() === enumItemName) {
                    return enumobj[i];
                }
            }

            v = -1;
        }

        return v;
    },
    /** 
     * 
     * @function grhelper.enumValue2Name
     */
    enumValue2Name = grhelper.enumValue2Name = function (enumobj, enumItemValue) {
        for (var i in enumobj) {
            if (enumobj[i] === enumItemValue) {
                return i;
            }
        }
        return "";
    },
    //将按位集合属性的文字值转换为整数值
    /** 
     * 
     * @function grhelper.enumBitText2Value
     */
    enumBitText2Value = function (enumobj, enumBitText) {
        var items, i, len, ret = 0;

        enumBitText = enumBitText.substring(1, enumBitText.length - 1); //去掉两端的[]
        items = enumBitText.split("|");
        len = items.length;
        for (i = 0; i < len; i++) {
            ret += enumobj[items[i]] || 0;
        }
        return ret;
    },


    /** 
     * 用32为整数表示颜色值 0xaabbggrr 形式
     * 其中aa表示透明值，255表示不透明，0表示完全透明
     * 将三原色值转换为一个整数值, red在最高位
     * @function grhelper.rgba2color
     */
    rgba2color = grhelper.rgba2color = function (r, g, b, a) {
        return colorAlpha(r | (g << 8) | (b << 16), a);
    },
    /** 
     * 为三原色颜色值加上alpha值 
     * @function grhelper.colorAlpha
     */
    colorAlpha = grhelper.colorAlpha = function (color, alpha) {
        return color | (Math.max(0, Math.min(Math.round(alpha * 255))) << 24);
    },
    /** 
     * 将整数值颜色值分解为三原色值 
     * @function grhelper.color2rgba
     */
    color2rgba = grhelper.color2rgba = function (color) {
        return {
            r: color & 0xff,
            g: (color >> 8) & 0xff,
            b: (color >> 16) & 0xff,
            a: (color & 0xff000000) ? ((color >> 24) & 0xff) / 255 : 1, //a: ((color >> 24) & 0xff) / 255,
        }
    },
    /** 
     * 将颜色值转换为十六进制的HTML颜色表示法，如：#aa08f0 
     * @function grhelper.colorValue2Html
     */
    colorValue2Html = grhelper.colorValue2Html = function (color) {
        var rgba = color2rgba(color);

        function twoBitHex(val) {
            return (val < 16 ? "0" : "") + val.toString(16);
        }

        //以16进制表示，必须要补足6位，每种原色值都为2位
        return rgba.a === 1 ?
            "#" + twoBitHex(rgba.r) + twoBitHex(rgba.g) + twoBitHex(rgba.b) :
            "rgba(" + rgba.r + "," + rgba.g + "," + rgba.b + "," + numericToHtml(rgba.a) + ")";
    },
    colorIsBlack = grhelper.colorIsBlack = function (color) {
        return color & 0x00ffffff;
    },

    //
    /** 
     * 从文字串中解析出头部的颜色定义。颜色属性要求写在最前面，如 rgb(255,0,0)0.00, 这样形式
     * 如果成功，返回解析后的下一个字符位置与颜色值，否则返回false 
     * @function grhelper.decodeTextColor
     */
    decodeTextColor = grhelper.decodeTextColor = function (text) {
        var start = 4,
            end,
            //length = text.length,
            textValues,
            r, g, b;

        //颜色属性要求写在最前面，如 rgb(255,0,0)0.00, 这样形式
        if (text.substr(0, 4) === "rgb(") {
            end = text.indexOf(")", start);
            if (end !== -1) {
                text = text.substring(4, end);
                textValues = text.split(",");
                if (textValues.length === 3) {
                    r = parseInt(textValues[0]);
                    g = parseInt(textValues[1]);
                    b = parseInt(textValues[2]);
                    if ((0 <= r && r <= 255) && (0 <= g && g <= 255) && (0 <= b && b <= 255)) {
                        return {
                            color: rgb(r, g, b),
                            index: end + 1
                        };
                    }
                }
            }
        }
        return false;
    },
    colorGradientLight = grhelper.colorGradientLight = function (color) {
        var rgba = color2rgba(color),
            rate = 120 / 255;

        rgba.r += (255 - rgba.r) * rate;
        rgba.g += (255 - rgba.g) * rate;
        rgba.b += (255 - rgba.b) * rate;
        if (rgba.r > 255) {
            rgba.r = 255;
        }
        if (rgba.g > 255) {
            rgba.g = 255;
        }
        if (rgba.b > 255) {
            rgba.b = 255;
        }

        return rgba2color(rgba.r, rgba.g, rgba.b, rgba.a);
    },

    colorGradientDark = grhelper.colorGradientDark = function (color) {
        var rgba = color2rgba(color),
            rate = 30 / 255;

        rgba.r -= rgba.r * rate;
        rgba.g -= rgba.g * rate;
        rgba.b -= rgba.b * rate;
        if (rgba.r < 0) {
            rgba.r = 0;
        }
        if (rgba.g < 0) {
            rgba.g = 0;
        }
        if (rgba.b < 0) {
            rgba.b = 0;
        }

        return rgba2color(rgba.r, rgba.g, rgba.b, rgba.a);
    },

    /** 
     * 
     * @function grhelper.prototypeLinkExtend
     */
    prototypeLinkExtend = grhelper.prototypeLinkExtend = function (child, parent) {
        var f,
            c = child.prototype;

        function F() {
        };
        F.prototype = parent.prototype;

        f = new F();
        for (var i in c) {
            f[i] = c[i];
        }

        child.prototype = f;
        child.prototype.constructor = child;
    },
/** 
 * 
 * @function grhelper.prototypeCopyExtend
 */
    prototypeCopyExtend = grhelper.prototypeCopyExtend = function (child, parent) {
        var p = parent.prototype,
            c = child.prototype;

        for (var i in p) {
            if (!c.hasOwnProperty(i)) { //只有子类没定义的成员才用拷贝
                c[i] = p[i];
            }
            //grhelper.GRASSERT(typeof (p[i]) === "function", p.toString() + "[" + i + "] isn't a function");
        }
        //c.uber = p; 多级继承,没法成为链状,所以干脆不用

        //new added 2018/01/19 这样引用constructor才是对象自身
        c.constructor = child;
    },

    /** 
     * 
     * @function grhelper.createArray
     */
    createArray = grhelper.createArray = function (len, val) {
        var a = [],
            i = 0;

        while (i++ < len) {
            a.push(val);
        }

        return a;
    },
    //复制对象成员数据，deep为真指定复制子对象，反之则赋值对象应用
    /** 
     * 
     * @function grhelper.assignObjectEx
     */
    assignObjectEx = grhelper.assignObjectEx = function (to, from, deep) {
        var fm, fmt;

        for (var i in from) {
            if (from.hasOwnProperty(i)) {
                fm = from[i];
                fmt = typeof fm;
                if (deep && fmt === "object") { //if (fmt === "object" && fmt) {
                    if (!to[i]) {
                        to[i] = {};
                    }
                    assignObject(to[i], fm);
                }
                else { //if (fmt !== "function") {
                    to[i] = fm;
                }
            }
        }
        return to;
    },
    /** 
     * 
     * @function grhelper.assignObject
     */
    assignObject = grhelper.assignObject = function (to, from) {
        assignObjectEx(to, from, 1);
    },
    //仅复制对象成员数据，子对象不复制
    /** 
     * 
     * @function grhelper.assignObjectAtom
     */
    assignObjectAtom = grhelper.assignObjectAtom = function (to, from) {
        var fm;

        for (var i in from) {
            if (from.hasOwnProperty(i)) {
                fm = from[i];
                if (typeof fm !== "object") {
                    to[i] = fm;
                }
            }
        }
        return to;
    },
    //对象相等比较
    /** 
     * 
     * @function grhelper.compareObject
     */
    compareObject = grhelper.compareObject = function (frist, second) {
        var fmt;

        if (frist === second) {
            return 1;
        }
        if (!frist || !second) {
            grhelper.GRASSERT(frist || second, "");
            return 0;
        }

        for (var i in frist) {
            fmt = typeof frist[i];
            if (fmt === "object") {
                if (!compareObject(frist[i], second[i])) {
                    return 0;
                }
            }
            else if (fmt !== "function") {
                if (frist[i] !== second[i]) {
                    return 0;
                }
            }
        }

        return 1;
    },

    /** 
     * Cross-browser xml parsing 
     * @function grhelper.parseXML
     */
    parseXML = grhelper.parseXML = function (xmlText) {
        var xml;

        function trimBlankChars() {
            var start = 0,
                end = xmlText.indexOf("<", start),
                texItem,
                texts = [];

            //节点内的空白字符不要移除掉
            while (end >= 0) {
                //在 > 与 < 之间如果全是空白字符，则全部舍弃掉，反之则原样复制
                if (end > start) {
                    texItem = xmlText.substring(start, end);
                    /\S/g.test(texItem) && texts.push(texItem);
                }

                //找到对应的 >, < 与 > 之间的内容原样复制
                start = end
                end = xmlText.indexOf(">", start + 1);
                texts.push(xmlText.substring(start, ++end))

                // 继续找下一个 <
                start = end;
                end = xmlText.indexOf("<", start);
            }

            return texts;
        }

        //xml文本的各个节点之间不能有空白字符( 如\r\n\f\t\v)，不然 DOMParser 不能成功解析
        /\s/g.test(xmlText) && (xmlText = trimBlankChars().join(""));

        // Support: IE9
        try {
            xml = new DOMParser().parseFromString(xmlText, "text/xml");
        } catch (e) {
            xml = undefined;
        }

        return xml;
    },
    /** 
     * 
     * @function grhelper.xmlToReportDataJSON
     */
    xmlToReportDataJSON = grhelper.xmlToReportDataJSON = function (xml) {
        var priorNodeName = "",
            record,
            records,
            node,
            node2,
            json = {};

        node = xml.childNodes[0].firstChild;
        while (node) {
            if (node.nodeName !== priorNodeName) {
                priorNodeName = node.nodeName;
                records = [];
                json[node.nodeName] = records;
            }

            record = {};
            node2 = node.firstChild;
            while (node2) {
                record[node2.nodeName] = node2.hasOwnProperty("text") ? node2.text : node2.textContent;

                node2 = node2.nextSibling;
            }
            records.push(record);

            node = node.nextSibling;
        }

        return json;
    },

    /** 
     * 
     * @function grhelper.getRelativePosition
     */
	getRelativePosition = grhelper.getRelativePosition = function (evt) {
	    var mouseX,
            mouseY,
	        e = evt.originalEvent || evt,
			canvas = evt.currentTarget || evt.srcElement,
			boundingRect = canvas.getBoundingClientRect();

	    if (e.touches) {
	        mouseX = e.touches[0].clientX - boundingRect.left;
	        mouseY = e.touches[0].clientY - boundingRect.top;

	    }
	    else {
	        mouseX = e.clientX - boundingRect.left;
	        mouseY = e.clientY - boundingRect.top;
	    }

	    return {
	        x: mouseX,
	        y: mouseY
	    };

	},
    /** 
     * 
     * @function grhelper.addEvent
     */
	addEvent = grhelper.addEvent = function (node, eventType, method) {
	    if (node.addEventListener) {
	        node.addEventListener(eventType, method);
	    } else if (node.attachEvent) {
	        node.attachEvent("on" + eventType, method);
	    } else {
	        node["on" + eventType] = method;
	    }
	},
    /** 
     * 
     * @function grhelper.removeEvent
     */
	removeEvent = grhelper.removeEvent = function (node, eventType, handler) {
	    if (node.removeEventListener) {
	        node.removeEventListener(eventType, handler, false);
	    } else if (node.detachEvent) {
	        node.detachEvent("on" + eventType, handler);
	    } else {
	        node["on" + eventType] = noop;
	    }
	},
	bindEvents = grhelper.bindEvents = function (chart, arrayOfEvents, handler) {
	    // Create the events object if it's not already present
	    if (!chart.events) {
	        chart.events = {};
	    }

	    //each(arrayOfEvents, function (eventName) {
	    //    chart.events[eventName] = function () {
	    //        handler.apply(chart, arguments);
	    //    };
	    //    addEvent(chart.chart.canvas, eventName, chart.events[eventName]);
	    //});
	    //addEvent(chart.chart.canvas, eventName, chart.events[eventName]);
	    arrayOfEvents.forEach(function (eventName) {
	        chart.events[eventName] = function () {
	            handler.apply(chart, arguments);
	        };
	        addEvent(chart.canvas, eventName, chart.events[eventName]);
	    });
	},
	unbindEvents = grhelper.unbindEvents = function (chart, arrayOfEvents) {
	    //each(arrayOfEvents, function (handler, eventName) {
	    //    removeEvent(chart.chart.canvas, eventName, handler);
	    //});
	    arrayOfEvents.forEach(function (handler, eventName) {
	        removeEvent(chart.canvas, eventName, handler);
	    });
	},

    /** 
     * 
     * @function grhelper.toRadians
     */
    toRadians = grhelper.toRadians = function (degrees) {
        return degrees * Math.PI / 180;
    },
    /** 
     * 
     * @function grhelper.toDegree
     */
    toDegree = grhelper.toDegree = function (radians) {
        return radians * 180 / Math.PI;
    };

    //end of global function

    /////////////////////////////////////////////////////////////////////////
    /**
     * Describe the DateTime class here.
     * @class
     */
    var DateTime = grcommon.DateTime = function () {
        this.value = new Date();
    };
    grcommon.DateTime.prototype = {
        //clone: function () {
        //    var self = this;
        //    return new Rect(self.left, self.top, self.right, self.bottom);
        //},
        //[propget, id(1), helpstring("")] HRESULT Year([out, retval] LONG* pVal);
        /** @readonly */
        get Year() {
            return this.value.getFullYear();
        },
        //[propget, id(2), helpstring("")] HRESULT Month([out, retval] LONG* pVal);
        /** @readonly */
        get Month() {
            return this.value.getMonth() + 1;
        },
        //[propget, id(3), helpstring("")] HRESULT Day([out, retval] LONG* pVal);
        /** @readonly */
        get Day() {
            return this.value.getDate();
        },
        //[propget, id(4), helpstring("")] HRESULT Hour([out, retval] LONG* pVal);
        /** @readonly */
        get Hour() {
            return this.value.getHours();
        },
        //[propget, id(5), helpstring("")] HRESULT Minute([out, retval] LONG* pVal);
        /** @readonly */
        get Minute() {
            return this.value.getMinutes();
        },
        //[propget, id(6), helpstring("")] HRESULT Second([out, retval] LONG* pVal);
        /** @readonly */
        get Second() {
            return this.value.getSeconds();
        },
        //[propget, id(7), helpstring("")] HRESULT DayOfWeek([out, retval] LONG* pVal);
        /** @readonly */
        get DayOfWeek() {
            return this.value.getDay(); //Sunday is zero(星期天为0)
        },
        //[propget, id(8), helpstring("")] HRESULT DayOfYear([out, retval] LONG* pVal);
        /** @readonly */
        get DayOfYear() {
            var value = this.value,
                year = value.getFullYear();

            return (new Date(year, value.getMonth(), value.getDate()).getTime() - new Date(year, 0, 1).getTime()) / MILLISECONDS_DAY + 1;
        },
        //[propget, id(9), helpstring("")] HRESULT AsFloat([out, retval] DOUBLE* pVal);
        /** */
        get AsFloat() {
            //JS: 返回 1970 年 1 月 1 日午夜与 Date 对象中的时间值之间的毫秒数
            //Widows的DATE: 以 1899 年 12 月 30 日午夜作为零时开始, 1899年12月30日午夜为0.00, 1900年1月1日午夜为2.00
            //JS要保持与/Widows的DATE兼容
            //return (this.value.getTime() + new Date(1970, 0, 1).getTime() - new Date(1899, 11, 30).getTime() - this.value.getTimezoneOffset() * 60000) / MILLISECONDS_DAY;
            return (this.value.getTime() + new Date(1970, 0, 1).getTime() - new Date(1899, 11, 30).getTime() - TIMEZONE_OFFSET) / MILLISECONDS_DAY;
        },
        //[propput, id(9), helpstring("")] HRESULT AsFloat([in] DOUBLE newVal);
        set AsFloat(val) {
            this.value.setTime(val * MILLISECONDS_DAY + new Date(1899, 11, 30).getTime() - new Date(1970, 0, 1).getTime() + TIMEZONE_OFFSET);
            //var x = this.AsFloat;
        },

        //[id(10), helpstring("")] HRESULT ValueFromDate([in] LONG Year, [in] LONG Month, [in] LONG Day);
        /**
         */
        ValueFromDate: function (year, month, day) {
            this.value = new Date(year, month - 1, day);
        },
        //[id(11), helpstring("")] HRESULT ValueFromDateTime([in] LONG Year, [in] LONG Month, [in] LONG Day, [in] LONG Hour, [in] LONG Minute, [in] LONG Second);
        /**
         */
        ValueFromDateTime: function (year, month, day, hour, minute, second) {
            this.value = new Date(year, month - 1, day, hour, minute, second);
        },
        //[id(12), helpstring("")] HRESULT Format([in] BSTR Format, [out,retval] BSTR* Text);
        /**
         */
        Format: function (format) {
            return new gr.format.DateTimeFormatter(format).format(this.value);
        },
    }
    //var DateTime = grcommon.DateTime;

    /////////////////////////////////////////////////////////////////////////
    /**
     * @class
     */
    var Rect = grcommon.Rect = function (left, top, right, bottom) {
        var self = this;
        self.left = left;
        self.top = top;
        self.right = right;
        self.bottom = bottom;
    };
    grcommon.Rect.prototype = {
        /** */
        clone: function () {
            var self = this;
            return new grcommon.Rect(self.left, self.top, self.right, self.bottom);
        },

        /** */
        IsRectEmpty: function () {
            var self = this;
            return self.left >= self.right || self.top >= self.bottom;
        },
        /** */
        PtInRect: function (x, y) {
            var self = this;
            return self.left <= x && x < self.right && self.top <= y && y < self.bottom;
        },
        /** */
        Width: function () {
            var self = this;

            return self.right - self.left;
        },
        /** */
        Height: function () {
            var self = this;

            return self.bottom - self.top;
        },
        /** */
        SetRect: function (left, top, right, bottom) {
            var self = this;
            self.left = left;
            self.top = top;
            self.right = right;
            self.bottom = bottom;
        },
        /** */
        InflateRect: function (dx, dy) {
            var self = this;
            self.left -= dx;
            self.top -= dy;
            self.right += dx;
            self.bottom += dy;
        },
        /** */
        OffsetRect: function (dx, dy) {
            var self = this;
            self.left += dx;
            self.top += dy;
            self.right += dx;
            self.bottom += dy;
        },
        IntersectRect: function (rc2) {
            var self = this;

            self.left = Math.max(self.left, rc2.left);
            self.top = Math.max(self.top, rc2.top);
            self.right = Math.min(self.right, rc2.right);
            self.bottom = Math.min(self.bottom, rc2.bottom);
        },
    };
    //var Rect = grcommon.Rect;

    /////////////////////////////////////////////////////////////////////////
    /**
     * @class
     */
    var Pen = grcommon.Pen = function (width, color, style) {
        var self = this;

        (width === undefined) && (width = 1);
        (color === undefined) && (color = 0);
        (style === undefined) && (style = grenum.PenStyle.Solid);

        self.Width = width;
        self.Color = colorAlpha(color, 1.0); //？？这个是否应该在构造函数的参数中提供Alpha值，搜"new Pen"看哪些地方要改
        self.Style = style;
    };
    Pen.prototype = {
        /** */
        clone: function () {
            var self = this,
                pen = new Pen();

            pen.Width = self.Width;
            pen.Style = self.Style;
            pen.Color = self.Color;

            return pen;
        },
        /** */
        loadFromJSON: function (objJson, alpha, isWR) {
            if (objJson) {
                assignJSONMembers(this, objJson, isWR);

                enumMemberValid(this, "Style", grenum.PenStyle);
                colorMemberValid(this, "Color", alpha);
            }
        },
        /** */
        getDashStyle: function () {
            var ret;

            switch (this.Style) {
                case grenum.PenStyle.Dash:
                    ret = [2, 2];
                    break;
                case grenum.PenStyle.Dot:
                    ret = [1, 1];
                    break;
                case grenum.PenStyle.DashDot:
                    ret = [2, 1, 1, 1];
                    break;
                case grenum.PenStyle.DashDotDot:
                    ret = [2, 1, 1, 1, 1, 1];
                    break;
                default:
                    ret = [];
                    break;
            }

            return ret; //undefined;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //html不支持内边框
    /**
     * @class
     */
    var Border = grcommon.Border = function (defaultStyles) { //不同地方的Border,其Styles的默认值不一样(control, cell, detailGrid)
        var self = this;

        self.Styles = defaultStyles;
        //self.InnerIndent = 2;
        //self.InnerStyles = 0;
        self.Shadow = false;
        self.ShadowWidth = 4;
        self.ShadowColor = 0;

        self.Pen = new Pen();
        //self.InnerPen = new Pen();
    };
    grcommon.Border.prototype = {
        /** */
        loadFromJSON: function (objJson, penAlpha, isWR) {
            var self = this;

            if (objJson) {
                assignJSONMembers(self, objJson, isWR);

                enumBitMemberValid(self, "Styles", grenum.BorderStyle);
                colorMemberValid(self, "ShadowColor");

                objJson.Pen && self.Pen.loadFromJSON(objJson.Pen, penAlpha, isWR);
            }
        },

        clone: function () {
            var self = this,
                border = new Border();

            border.Styles = self.Styles;
            //border.InnerIndent = self.InnerIndent;
            //border.InnerStyles = self.InnerStyles;
            border.Shadow = self.Shadow;
            border.ShadowWidth = self.ShadowWidth;
            border.ShadowColor = self.ShadowColor;

            border.Pen = self.Pen.clone();

            return border;
        },

        /** */
        getLeftWidth: function () {
            var self = this;

            return (self.Styles & grenum.BorderStyle.DrawLeft) ? self.Pen.Width : 0;
        },

        /** */
        getRightWidth: function () {
            var self = this;

            return ((self.Styles & grenum.BorderStyle.DrawRight) ? self.Pen.Width : 0) +
                (self.Shadow ? self.ShadowWidth : 0);
        },

        /** */
        getTopWidth: function () {
            var self = this;

            return (self.Styles & grenum.BorderStyle.DrawTop) ? self.Pen.Width : 0;
        },

        /** */
        getBottomWidth: function () {
            var self = this;

            return ((self.Styles & grenum.BorderStyle.DrawBottom) ? self.Pen.Width : 0) +
                (self.Shadow ? self.ShadowWidth : 0);
        },
    };

    /////////////////////////////////////////////////////////////////////////
    /**
     * @class
     */
    var Font = grcommon.Font = function () {
        var self = this;

        self.Size = 97500;
        self.Bold = false;
        self.Italic = false;
        self.Underline = false;
        self.Strikethrough = false;
        //self.Weight = 700;
        //self.Charset = 0;
        self.Name = "";
    };
    Font.prototype = {
        /** */
        loadFromJSON: function (objJson, isWR) {
            objJson && assignJSONMembers(this, objJson, isWR);
        },
        /** */
        clone: function () {
            var self = this,
                font = new Font();

            font.Size = self.Size;
            font.Bold = self.Bold;
            font.Italic = self.Italic;
            font.Underline = self.Underline;
            font.Strikethrough = self.Strikethrough;
            font.Name = self.Name;

            return font;
        },
    };

    /**
     * @class
     */
    grcommon.FontWrapper = function (parentFont) {
        this.parentFont = parentFont;
    };
    grcommon.FontWrapper.prototype = {
        /** */
        loadFromJSON: function (objJson, isWR) {
            var self = this;

            if (objJson) {
                self.prepareModify();
                self.font.loadFromJSON(objJson, isWR);
            }
        },
        /** */
        assign: function (from) {
            var self = this;

            if (from.font) {
                self.font = from.font.clone();
            }
            else {
                delete self.font;
            }
        },
        /** */
        prepareModify: function () {
            var self = this;
            if (!self.font) {
                self.font = self.parentFont.UsingFont().clone();
            }
        },

        //com interface
        /** */
        Clone: function () {
            var self = this,
                fontWrapper = new grcommon.FontWrapper(self.parentFont);

            fontWrapper.font = self.UsingFont().clone();

            return fontWrapper;
        },
        /** */
        UsingFont: function () {
            var self = this;
            return self.font ? self.font : self.parentFont.UsingFont();
        },

        /** */
        get Name() {
            return this.UsingFont().Name;
        },
        set Name(val) {
            var self = this;

            self.prepareModify();
            self.font.Name = val;
        },
        /** */
        get Point() {
            return this.UsingFont().Size / 10000;
        },
        set Point(val) {
            var self = this;

            self.prepareModify();
            self.font.Size = val * 10000;
        },
        /** */
        get Bold() {
            return this.UsingFont().Bold;
        },
        set Bold(val) {
            var self = this;

            self.prepareModify();
            self.font.Bold = val;
        },
        /** */
        get Italic() {
            return this.UsingFont().Italic;
        },
        set Italic(val) {
            var self = this;

            self.prepareModify();
            self.font.Italic = val;
        },
        /** */
        get Underline() {
            return this.UsingFont().Underline;
        },
        set Underline(val) {
            var self = this;

            self.prepareModify();
            self.font.Underline = val;
        },
        /** */
        get Strikethrough() {
            return this.UsingFont().Strikethrough;
        },
        set Strikethrough(val) {
            var self = this;

            self.prepareModify();
            self.font.Strikethrough = val;
        },

        //LineHeight: function () {
        //    return this.Point;
        //},
    };

    /**
     * @class
     */
    var TextFormat = grcommon.TextFormat = function () {
        var self = this;

        self.WordWrap = false;
        self.EndEllipsis = false;
        self.TextAlign = grenum.TextAlign.MiddleLeft;
        self.TextOrientation = grenum.TextOrientation.Default; //用transform也许可部分实现,暂不实现
        self.TextAngle = 0;
        self.CharacterSpacing = 0;
        self.LineSpacing = 0;
        //self.ParagraphSpacing = 0;
        self.FirstCharIndent = 0;
        //self.FontWidthRatio = 1;
        self.HtmlTags = false;
    };
    TextFormat.prototype = {
        /** */
        loadFromJSON: function (objJson, isWR) {
            var self = this,
                member = "CharSpacing";

            if (objJson) {
                assignJSONMembers(self, objJson, isWR);

                if (isWR) {
                    member = gr.wr.wrPropNameEncode(member);
                }
                member = objJson[member];
                if (member) {
                    self.CharacterSpacing = member;
                }

                enumMemberValid(self, "TextAlign", grenum.TextAlign);
                enumMemberValid(self, "TextOrientation", grenum.TextOrientation);
            }
        },

        Clone: function () {
            var self = this,
                textFormat = new TextFormat();

            textFormat.WordWrap = self.WordWrap;
            textFormat.EndEllipsis = self.EndEllipsis;
            textFormat.TextAlign = self.TextAlign;
            self.TextOrientation = self.TextOrientation; //用transform也许可部分实现,暂不实现
            self.TextAngle = self.TextAngle;
            textFormat.CharacterSpacing = self.CharacterSpacing;
            textFormat.LineSpacing = self.LineSpacing;
            //self.ParagraphSpacing = self.ParagraphSpacing;
            textFormat.FirstCharIndent = self.FirstCharIndent;

            return textFormat;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    /**
     * @class
     */
    grcommon.Context = function (ctx) {
        var self = this;

        self.ctx = ctx;

        ctx.textBaseline = "top";

        //self.fillColors = [0x0];
        //self.fillStyles = ["#000"];
        //self.defaultFillStyles = ctx.fillStyle;
        self.pens = [new Pen()];
        self.fills = [ctx.fillStyle];
        self.fonts = [];
        self.clips = [];
    };
    grcommon.Context.prototype = {
        get width() {
            return this.ctx.canvas.width;
        },
        get height() {
            return this.ctx.canvas.height;
        },

        get usingFont() {
            var fonts = this.fonts,
                len = fonts.length;

            grhelper.GRASSERT(len > 0);
            return fonts[len - 1];
        },

        //setDefaultFillColor: function (color) {
        //    var self = this;

        //    self.defaultFillStyles = colorValue2Html(color);
        //    self.ctx.fillStyle = self.defaultFillStyles;
        //},
        //setFillStyle: function (style) {
        //    this.ctx.fillStyle = style;
        //},
        //selectFillColor: function (color) {
        //    this.ctx.fillStyle = colorValue2Html(color);
        //},
        //restoreFillStyle: function () {
        //    var self = this;

        //    self.ctx.fillStyle = self.defaultFillStyles;
        //},
        selectFillStyle: function (style) {
            var self = this;

            self.fills.push(style);
            self.ctx.fillStyle = style;
        },
        selectFillColor: function (color) { //selectTextColor 也是用此函数
            this.selectFillStyle(colorValue2Html(color));
        },
        restoreFillStyle: function () {
            var self = this,
                fills = self.fills;

            fills.pop();
            self.ctx.fillStyle = fills[fills.length - 1];
        },
        //selectTextColor: function (color) {
        //    this.selectFillColor(color);
        //},

        selectPen: function (pen) {
            var self = this;

            self.pens.push(pen);
            self._applyPen();
        },
        selectPen2: function (width, color, style) {
            this.selectPen(new Pen(width, color, style));
        },
        restorePen: function () {
            var self = this;

            self.pens.pop();
            self._applyPen();
        },

        selectFont: function (font) {
            var self = this,
                fonts = self.fonts,
                appliedFont = fonts[fonts.length - 1];

            if (font !== appliedFont) {
                self.ctx.font = fontCSSText(font);
            }
            fonts.push(font);
        },
        restoreFont: function () {
            var self = this,
                fonts = self.fonts,
                font = fonts.pop(),
                appliedFont = fonts[fonts.length - 1];

            if (fonts.length > 0) {
                if (appliedFont !== font) {
                    self.ctx.font = fontCSSText(appliedFont);
                }
            }
            else {
                self.ctx.font = "";
            }
        },
        fontSizeTo: function (val) { //必须调用restoreFont 进行复原操作
            var self = this,
                font = self.usingFont.clone();

            font.Size = val;
            self.selectFont(font);
        },
        //fontSizeRestore: function () {
        //    this.restoreFont();
        //},

        pushClipRect: function (x, y, width, height) {
            var self = this,
                ctx = this.ctx,
                clips = self.clips,
                clipsLen = clips.length,
                rect = new Rect(x, y, x + width, y + height);

            clipsLen && rect.IntersectRect(clips[clipsLen - 1]);
            clips.push(rect);

            ctx.beginPath();
            ctx.rect(rect.left, rect.top, rect.Width(), rect.Height());
            ctx.clip();
        },
        popClipRect: function () {
            var self = this,
                ctx = this.ctx,
                canvas = ctx.canvas,
                clips = self.clips,
                clipsLen = clips.length;
            rect;

            grhelper.GRASSERT(clipsLen > 0);

            clips.pop(rect);

            rect = (clipsLen > 1) ? clips[clipsLen - 2] : new Rect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.rect(rect.left, rect.top, rect.Width(), rect.Height());
            ctx.clip();
        },

        measureTextWidth: function (text) {
            return this.ctx.measureText(text).width;
        },
        measureTextHeight: function (text) {
            return fontHeight(this.usingFont);
        },
        drawText: function (text, xLeft, yTop) {
            this.ctx.fillText(text, xLeft, yTop);
        },
        drawTextCenter: function (text, xCenter, yTop) {
            var ctx = this.ctx;

            ctx.textAlign = "center";
            ctx.fillText(text, xCenter, yTop);
            ctx.textAlign = "start";
        },
        drawTextAlign: function (text, x, y, w, h, textAlign, shrinkToFit) {
            var self = this,
                lineHeight = fontHeight(self.usingFont),
                center = textAlign & grenum.TextAlignBit.CENTER,
                right = textAlign & grenum.TextAlignBit.RIGHT,
                middle = textAlign & grenum.TextAlignBit.MIDDLE,
                bottom = textAlign & grenum.TextAlignBit.BOTTOM,
                textWidth;

            if (middle) {
                y += (h - lineHeight) / 2;
            }
            else if (bottom) {
                y += h - lineHeight;
            }

            //暂未考虑垂直方向的文字对齐处理，这里也只考虑了单行文字输出
            if (center || right) {
                textWidth = self.measureTextWidth(text);
                if (!shrinkToFit || textWidth < w) {
                    if (center) {
                        x += (w - textWidth) / 2;
                    }
                    else { //if (textAlign === grenum.TextAlign.MiddleRight) {
                        x += w - textWidth;
                    }
                }
            }

            //self.ctx.fillText(text, x, y, shrinkToFit? w : undefined); 这样写不对，文字显示不出来
            shrinkToFit ? self.ctx.fillText(text, x, y, w) : self.ctx.fillText(text, x, y);
        },
        drawTextAlign2: function (text, rect, textAlign, shrinkToFit) {
            this.drawTextAlign(text, rect.left, rect.top, rect.Width(), rect.Height(), textAlign, shrinkToFit);
        },
        drawFormatText: function (text, x, y, w, h, textFormat) {
            var self = this;

            //TDD...只有少部分实现
            if (textFormat.TextOrientation === grenum.TextOrientation.Default) {
                if (!textFormat.TextAngle) {
                    if (!textFormat.CharacterSpacing && !textFormat.LineSpacing
                        && !textFormat.FirstCharIndent && !textFormat.ParagraphSpacing
                        && textFormat.FontWidthRatio === 1 && !(textFormat.TextAlign & grenum.TextAlignBit.JUSTIFY)) {
                        //DoDrawText(Text, TextLen, TextRect, textFormat);
                        self.drawTextAlign(text, x, y, w, h, textFormat.TextAlign);
                    }
                    else {
                        //DoDrawSpacedText(Text, TextLen, TextRect, textFormat, TRUE);
                        self.drawTextAlign(text, x, y, w, h, textFormat.TextAlign);
                    }
                }
                else {
                    //DoDrawRotationText(Text, TextLen, TextRect, textFormat);
                    self.drawTextRotate(text, x, y, textFormat.TextAngle)
                }
            }
            else {
                //DoDrawOrientationText(Text, TextLen, TextRect, textFormat);
                self.drawOrientationText(text, x, y, w, h, textFormat);
            }
        },
        drawOrientationText: function (text, x, y, w, h, textFormat) {
            var self = this,
                ctx = self.ctx,
                i = 0,
                textLen = text.length,
                lineHeight = fontHeight(self.usingFont),
                textOrientation = textFormat.TextOrientation,
                FIRSTLR = textOrientation & grenum.TextOrientationBit.FIRSTLR,
                L2R = textOrientation & grenum.TextOrientationBit.L2R,
                U2D = textOrientation & grenum.TextOrientationBit.U2D;

            //TDD...只有少部分实现
            if (FIRSTLR) {
                self.drawTextAlign(text, x, y, w, h, textFormat.TextAlign);
            }
            else {
                while (i < textLen) {
                    ctx.fillText(text[i++], x, y);
                    y += lineHeight;
                }
            }
        },
        drawTextRotate: function (text, x, y, angleDegree) {
            var ctx = this.ctx;

            ctx.translate(x, y);
            ctx.rotate(toRadians(-angleDegree));
            this.ctx.fillText(text, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0); // reset current transformation matrix to the identity matrix
        },
        drawEqualSpaceText: function (text, xBegin, xEnd, y) {
            var self = this,
                CurPos1 = xBegin,
                CurPos2,
                TextLen = text.length,
                i = 0,
                charText,
                perWidth = (xEnd - xBegin) / TextLen;

            while (i < TextLen) {
                CurPos2 = xBegin + perWidth * (i + 1);
                charText = text.substr(i++, 1);
                self.drawText(charText, (CurPos2 + CurPos1 - self.measureTextWidth(charText)) / 2, y);
                CurPos1 = CurPos2;
            }
        },

        beginPath: function () {
            var self = this;

            self.ctx.beginPath();
            self.inpath = 1;
        },
        closePath: function () {
            this.ctx.closePath();
        },
        //endPath: function () {
        //    //不需要做任何事
        //},
        stroke: function () {
            var self = this;

            grhelper.GRASSERT(self.inpath, "");

            self.ctx.stroke();
            self.inpath = 0;
        },
        fill: function () {
            var self = this;

            grhelper.GRASSERT(self.inpath, "");

            self.ctx.fill();
            self.inpath = 0;
        },
        strokefill: function () {
            var self = this;

            grhelper.GRASSERT(self.inpath, "");

            self.ctx.stroke();
            self.ctx.fill();
            self.inpath = 0;
        },

        fillRect: function (x, y, w, h, color) {
            var self = this;

            self.selectFillColor(color);
            self.ctx.fillRect(x, y, w, h);
            self.restoreFillStyle(color);
        },
        fillRect2: function (rect, color) {
            this.fillRect(rect.left, rect.top, rect.Width(), rect.Height(), color);
        },

        moveTo: function (x, y) {
            var self = this,
                ctx = self.ctx;

            !self.inpath && ctx.beginPath();
            ctx.moveTo(x, y);
        },
        lineTo: function (x, y) {
            var self = this,
                ctx = self.ctx;

            ctx.lineTo(x, y);
            !self.inpath && ctx.stroke();
        },

        drawLine: function (x1, y1, x2, y2) {
            var ctx = this.ctx;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        },
        drawPolyLine: function (pts, toFill, endClose) { //[x1,y1,x2,y2,x3,y3 ... ...]
            var ctx = this.ctx,
                i = 0,
                len = pts.length;

            ctx.beginPath();

            ctx.moveTo(pts[i++], pts[i++]);
            while (i < len) {
                ctx.lineTo(pts[i++], pts[i++]);
            }
            endClose && ctx.closePath();

            ctx.stroke();
            toFill && ctx.fill();
        },

        bezierCurveTo: function (cp1x, cp1y, cp2x, cp2y, x, y) {
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        },

        //s: start point, e: end point, i: inner control point, o: outer control point
        polyBezier: function (pts) { //pt[0], pt[0].o, pt[1].i, pt[1], pt[1].o, pt[2].i, pt[2], pt[2].o, ... pt[len-1].i, pt[len-1]
            var ctx = this.ctx,
                i,
                len = pts.length;

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (i = 1; i < len; i++) {
                ctx.bezierCurveTo(pts[i].x, pts[i++].y, pts[i].x, pts[i++].y, pts[i].x, pts[i].y);
            }
            ctx.stroke();
        },

        circle: function (left, top, width, height, toFill) {
            var ctx = this.ctx,
                r = ((width < height) ? width : height) / 2;

            left += width / 2;
            top += height / 2;

            ctx.beginPath();
            ctx.arc(left, top, r, 0, 2 * Math.PI);
            ctx.stroke();
            toFill && ctx.fill();
        },
        ellipse: function (left, top, width, height, toFill) {
            var ctx = this.ctx,
                r = (width > height) ? width : height, //选择a、b中的较大者作为arc方法的半径参数
                ratioX = width / r, //横轴缩放比率
                ratioY = height / r; //纵轴缩放比率

            left += width / 2; //x center
            top += height / 2; //y center 
            r /= 2;

            ctx.beginPath();

            ctx.save();
            ctx.scale(ratioX, ratioY); //进行缩放（均匀压缩）

            //ctx.beginPath();
            ////从椭圆的??左端点开始逆时针绘制
            //ctx.moveTo((left + width) / ratioX, top / ratioY);
            //ctx.arc((left + width / 2) / ratioX, (top + height / 2) / ratioY, r, 0, 2 * Math.PI);
            ctx.arc(left / ratioX, top / ratioY, r, 0, 2 * Math.PI);
            //ctx.closePath();

            ctx.restore();

            ctx.stroke();
            toFill && ctx.fill();
        },
        rectangle: function (left, top, width, height, toFill) {
            var self = this;

            self.ctx.strokeRect(left, top, width, height);
            toFill && self.ctx.fillRect(left, top, width, height);
        },
        rectangle2: function (rect, toFill) {
            this.rectangle(rect.left, rect.top, rect.Width(), rect.Height(), toFill);
        },
        square: function (left, top, width, height, toFill) {
            var a = width < height ? width : height;

            left += (width - a) / 2;
            top += (height - a) / 2;

            this.rectangle(left, top, a, a, toFill);
        },
        roundRectangle: function (left, top, width, height, xRadius, yRadius, toFill) {
            var ctx = this.ctx;

            ctx.beginPath();
            ctx.moveTo(left + xRadius, top);
            ctx.lineTo(left + width - xRadius, top);
            ctx.quadraticCurveTo(left + width, top, left + width, top + yRadius);
            ctx.lineTo(left + width, top + height - yRadius);
            ctx.quadraticCurveTo(left + width, top + height, left + width - xRadius, top + height);
            ctx.lineTo(left + xRadius, top + height);
            ctx.quadraticCurveTo(left, top + height, left, top + height - yRadius);
            ctx.lineTo(left, top + yRadius);
            ctx.quadraticCurveTo(left, top, left + xRadius, top);
            //ctx.closePath();
            ctx.stroke();
            toFill && ctx.fill();
        },
        roundSquare: function (left, top, width, height, xRadius, yRadius, toFill) {
            var a = width < height ? width : height;

            left += (width - a) / 2;
            top += (height - a) / 2;

            this.roundRectangle(left, top, a, a, xRadius, yRadius, toFill);
        },

        //开始角度小于(<)结束角度按逆时针方向绘制，反之按顺时针方向绘制。
        //arc ellipseArc pie 这几个函数的角度值都以度为单位，调用canvas render api 必须要转换为幅度
        arc: function (x, y, radius, startAngle, endAngle) {
            var self = this,
                ctx = self.ctx,
                stroke = !self.inpath;

            stroke && ctx.beginPath();
            ctx.arc(x, y, radius, -toRadians(startAngle), -toRadians(endAngle), startAngle <= endAngle);
            stroke && ctx.stroke();
        },
        ellipseArc: function (left, top, width, height, startAngle, endAngle) {
            var self = this,
                ctx = self.ctx,
                stroke = !self.inpath,
                ellipseSupported = ctx.ellipse,
                xRadius = width / 2,
                yRadius = height / 2,
                cx = left + xRadius,
                cy = top + yRadius,
                anticlockwise = startAngle <= endAngle,
                startAngle = -toRadians(startAngle),
                endAngle = -toRadians(endAngle);

            //startAngle = -toRadians(startAngle);
            //endAngle = -toRadians(endAngle);

            stroke && ctx.beginPath();

            //ie不支持ellipse函数
            //chrome支持此方法，但也没有画出，暂未知道原因
            if (ellipseSupported) {
                ctx.ellipse(cx, cy, xRadius, yRadius, 0, startAngle, endAngle, anticlockwise);
            }
            else {
                ctx.arc(cx, cy, Math.min(xRadius, yRadius), startAngle, endAngle, anticlockwise);
            }

            stroke && ctx.stroke();
        },
        pie: function (x, y, r, beginAngle, endAngle, toFill) {
            var self = this,
                ctx = self.ctx;

            beginAngle = toRadians(beginAngle);
            endAngle = toRadians(endAngle);

            ctx.beginPath();
            ctx.moveTo(x, y);
            //ctx.arc(x, y, r, beginAngle, endAngle, 0);
            ctx.arc(x, y, r, -beginAngle, -endAngle, 1); //这样显示就与Windows程序一致了
            ctx.closePath();

            ctx.stroke();
            toFill && ctx.fill();
        },
        ellipsePie: function (left, top, width, height, startAngle, endAngle, toFill) {
            var ctx = this.ctx,
                ellipseSupported = ctx.ellipse,
                xRadius = width / 2,
                yRadius = height / 2,
                cx = left + xRadius,
                cy = top + yRadius,
                anticlockwise = startAngle <= endAngle,

                startX, //= cx + Math.cos(startAngle) * xRadius,
                startY; //= cy - Math.sin(startAngle) * yRadius;
            //endX = cx + Math.cos(endAngle) * xRadius,
            //endY = cy - Math.sin(endAngle) * yRadius;

            startAngle = toRadians(startAngle);
            endAngle = toRadians(endAngle);

            if (!ellipseSupported) {
                xRadius = yRadius = Math.min(xRadius, yRadius);
            }
            startX = cx + Math.cos(startAngle) * xRadius;
            startY = cy - Math.sin(startAngle) * yRadius;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(startX, startY);
            if (ellipseSupported) {
                ctx.ellipse(cx, cy, xRadius, yRadius, 0, -startAngle, -endAngle, anticlockwise);
            }
            else {
                ctx.arc(cx, cy, xRadius, -startAngle, -endAngle, anticlockwise); //这样显示就与Windows程序一致了
            }
            ctx.closePath();
            ctx.stroke();
            toFill && ctx.fill()
        },

        drawBar: function (rect, Pen, FillColor, direction) { //direction: 0-上,2-下,1-右,3-左
            var self = this,
                ctx = self.ctx,
                pt,
                pts = [
                    { x: rect.left, y: rect.bottom },
                    { x: rect.left, y: rect.top },
                    { x: rect.right, y: rect.top },
                    { x: rect.right, y: rect.bottom }
                ];

            self.selectFillColor(FillColor);
            self.selectPen(Pen);

            ctx.fillRect(rect.left, rect.top, rect.Width(), rect.Height());

            ctx.beginPath();
            pt = pts[direction];
            ctx.moveTo(pt.x, pt.y);
            pt = pts[++direction % 4];
            ctx.lineTo(pt.x, pt.y);
            pt = pts[++direction % 4];
            ctx.lineTo(pt.x, pt.y);
            pt = pts[++direction % 4];
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();

            self.restorePen();
            self.restoreFillStyle();
        },

        DrawHorzLine: function (yPos, xBegin, xEnd) {
            this.drawLine(xBegin, yPos, xEnd, yPos);
        },
        DrawVertLine: function (xPos, yBegin, yEnd) {
            this.drawLine(xPos, yBegin, xPos, yEnd);
        },

        DrawPointMarker: function (Rect, MarkerStyle, pen, fillColor) {
            var self = this,
                //ctx = self.ctx,
                fillColorDefined = (fillColor !== undefined),
                Size = Rect.Width(),
                InnerIndent = Math.min(4, (Size - 4) / 2),
                x,
                y;

            function drawStar() {
                var StartAngles = MarkerStyle === grenum.PointMarkerStyle.Star4 ? 4 :
                    (MarkerStyle === grenum.PointMarkerStyle.Star5 ? 5 :
                    ((MarkerStyle === grenum.PointMarkerStyle.Star6) ? 6 : 10)),
                    SingleAngle = 2 * Math.PI / StartAngles,
                    HalfAngle = SingleAngle / 2,
                    r = Rect.Width() / 2,
                    r2 = r / 2,
                    xc = Rect.left + r,
                    yc = Rect.top + r,
                    Angle = Math.PI / 2,
                    i,
                    pts = []; //90*RADIAN_PI/180.0;

                for (i = 0; i < StartAngles; i++) {
                    pts.push(xc + Math.cos(Angle) * r, yc - Math.sin(Angle) * r); //x, y
                    Angle += HalfAngle;

                    pts.push(xc + Math.cos(Angle) * r2, yc - Math.sin(Angle) * r2); //x, y
                    Angle += HalfAngle;
                }
                self.drawPolyLine(pts, 1, 1);
            };
            function drawCross() {
                //var linePen = Pen.clone();
                var definePen = pen && fillColorDefined,
                    linePen;

                if (definePen) {
                    linePen = pen.clone();
                    linePen.Color = fillColor;
                    self.selectPen(linePen);
                }

                self.drawLine(Rect.left, Rect.top, Rect.right, Rect.bottom);
                self.drawLine(Rect.left, Rect.bottom, Rect.right, Rect.top);

                if (MarkerStyle === grenum.PointMarkerStyle.Cross4) {
                    x = (Rect.left + Rect.right) / 2;
                    self.drawLine(x, Rect.top, x, Rect.bottom);

                    y = (Rect.top + Rect.bottom) / 2;
                    self.drawLine(Rect.left, y, Rect.right, y);
                }

                definePen && self.restorePen();
            }

            fillColorDefined && self.selectFillColor(fillColor);
            pen && self.selectPen(pen);

            switch (MarkerStyle) {
                case grenum.PointMarkerStyle.Circle:
                case grenum.PointMarkerStyle.CirclePoint:
                case grenum.PointMarkerStyle.CircleCross:
                    self.ellipse(Rect.left, Rect.top, Rect.Width(), Rect.Height(), 1);
                    if (grenum.PointMarkerStyle.CirclePoint === MarkerStyle) {
                        self.circle((Rect.left + Rect.right) / 2 - 1, (Rect.top + Rect.bottom) / 2 - 1, 2, 2, 0);
                    }
                    else if (grenum.PointMarkerStyle.CircleCross === MarkerStyle) {
                        Size = Math.min(4, Size / 3); //这里表示要收缩的长度
                        self.drawLine(Rect.left + Size, Rect.top + Size, Rect.right - Size, Rect.bottom - Size);
                        self.drawLine(Rect.right - Size, Rect.top + Size, Rect.left + Size, Rect.bottom - Size);
                    }
                    break;
                case grenum.PointMarkerStyle.Square:
                case grenum.PointMarkerStyle.SquareCheck:
                case grenum.PointMarkerStyle.SquareCross:
                    self.rectangle(Rect.left, Rect.top, Rect.Width(), Rect.Height(), 1);
                    if (grenum.PointMarkerStyle.SquareCheck === MarkerStyle) {
                        self.drawPolyLine([
                        Rect.left + InnerIndent, Rect.top + Size / 2,
                        Rect.left + Size / 2, Rect.bottom - InnerIndent,
                        Rect.right - InnerIndent, Rect.top + InnerIndent,
                        ]);
                    }
                    else if (grenum.PointMarkerStyle.SquareCross === MarkerStyle) {
                        self.drawLine(Rect.left + InnerIndent, Rect.top + InnerIndent, Rect.right - InnerIndent, Rect.bottom - InnerIndent);
                        self.drawLine(Rect.right - InnerIndent, Rect.top + InnerIndent, Rect.left + InnerIndent, Rect.bottom - InnerIndent);
                    }
                    break;
                case grenum.PointMarkerStyle.Cross:
                case grenum.PointMarkerStyle.Cross4:
                    drawCross();
                    break;
                case grenum.PointMarkerStyle.Dimond:
                    self.drawPolyLine([
                        (Rect.left + Rect.right) / 2, Rect.top,
                        Rect.left, (Rect.top + Rect.bottom) / 2,
                        (Rect.left + Rect.right) / 2, Rect.bottom,
                        Rect.right, (Rect.top + Rect.bottom) / 2],
                        1, 1);
                    break;
                case grenum.PointMarkerStyle.Triangle:
                    self.drawPolyLine([
                        (Rect.left + Rect.right) / 2, Rect.top,
                        Rect.left, Rect.bottom,
                        Rect.right, Rect.bottom], 1, 1);
                    break;
                case grenum.PointMarkerStyle.Star4:
                case grenum.PointMarkerStyle.Star5:
                case grenum.PointMarkerStyle.Star6:
                case grenum.PointMarkerStyle.Star10:
                    drawStar();
                    break;
                    //default:
                    //    ATLASSERT(grenum.PointMarkerStyle.None === MarkerStyle);
                    //    break;
            }

            pen && self.restorePen();
            fillColorDefined && self.restoreFillStyle();
        },

        //private:
        _applyPen: function () {
            var self = this,
                ctx = self.ctx,
                pens = self.pens,
                pen = pens[pens.length - 1];

            ctx.lineWidth = pen.Width;
            ctx.strokeStyle = colorValue2Html(pen.Color);
            ctx.setLineDash(pen.getDashStyle());
        },
    };

    grcommon.Graphics = function (report) {
        var self = this;

        self.report = report;
        self.ByUnit = 0;
    };
    grcommon.Graphics.prototype = {
        toPixels: function (drawVal) { //当前绘制单位值值转换为像素
            var self = this;

            return self.ByUnit ? self.report.UnitToPixels(drawVal) : drawVal;
        },

        pixelsTo: function (pixels) { //参数为像素，转换为当前绘制单位值
            var self = this;

            return self.ByUnit ? self.report.PixelsToUnit(pixels) : pixels;
        },

        //[propget, id(60), helpstring("")] HRESULT Left([out, retval] DOUBLE* pVal);
        //[propget, id(61), helpstring("")] HRESULT Top([out, retval] DOUBLE* pVal);
        //[propget, id(62), helpstring("")] HRESULT Width([out, retval] DOUBLE* pVal);
        //[propget, id(63), helpstring("")] HRESULT Height([out, retval] DOUBLE* pVal);
        //[propget, id(64), helpstring("")] HRESULT ByUnit([out, retval] VARIANT_BOOL* pVal);
        //[propput, id(64), helpstring("")] HRESULT ByUnit([in] VARIANT_BOOL newVal);
        get Left() {
            return 0;
        },
        get Top() {
            return 0;
        },
        get Width() {
            var self = this;

            return self.pixelsTo(self.ctx.width);
        },
        get Height() {
            var self = this;

            return self.pixelsTo(self.ctx.height);
        },

        attach: function (grctx) {
            this.ctx = grctx;
        },

        //[id(1), helpstring("")] HRESULT MoveTo([in] DOUBLE x, [in] DOUBLE y);
        MoveTo: function (x, y) {
            var self = this;

            self.ctx.moveTo(self.toPixels(x), self.toPixels(y));
        },
        //[id(2), helpstring("")] HRESULT LineTo([in] DOUBLE x, [in] DOUBLE y);
        LineTo: function (x, y) {
            var self = this;

            self.ctx.lineTo(self.toPixels(x), self.toPixels(y));
        },
        //[id(3), helpstring("")] HRESULT FillRect([in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] OLE_COLOR FillColor);
        FillRect: function (x, y, width, height, color) {
            var self = this;

            self.ctx.fillRect(self.toPixels(x), self.toPixels(y), self.toPixels(width), self.toPixels(height), color);
        },
        //[id(4), helpstring("")] HRESULT DrawPixel([in] DOUBLE x, [in] DOUBLE y, [in] OLE_COLOR Color); //TDD...

        //[id(5), helpstring("")] HRESULT Rectangle([in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] VARIANT_BOOL ToFill);
        Rectangle: function (x, y, width, height, toFill) {
            var self = this;

            self.ctx.rectangle(self.toPixels(x), self.toPixels(y), self.toPixels(width), self.toPixels(height), toFill);
        },
        //[id(6), helpstring("")] HRESULT RoundRect([in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] LONG cornerx, [in] LONG cornery, [in] VARIANT_BOOL ToFill);
        RoundRect: function (left, top, width, height, xRadius, yRadius, toFill) {
            var self = this;

            self.ctx.roundRectangle(self.toPixels(left), self.toPixels(top), self.toPixels(width), self.toPixels(height),
                self.toPixels(xRadius), self.toPixels(yRadius), toFill);
        },
        //[id(7), helpstring("")] HRESULT Ellipse([in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] VARIANT_BOOL ToFill);
        Ellipse: function (left, top, width, height, toFill) {
            var self = this;

            self.ctx.ellipse(self.toPixels(left), self.toPixels(top), self.toPixels(width), self.toPixels(height), toFill);
        },

        //[id(10), helpstring("")] HRESULT Pie([in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE r, [in] DOUBLE BeginAngleDegree, [in] DOUBLE EndAngleDegree, [in] VARIANT_BOOL ToFill);
        Pie: function (x, y, r, beginAngle, endAngle, toFill) {
            var self = this;

            self.ctx.pie(self.toPixels(x), self.toPixels(y), self.toPixels(r), beginAngle, endAngle, toFill);
        },

        //[id(11), helpstring("")] HRESULT Arc([in] DOUBLE cx, [in] DOUBLE cy, [in] DOUBLE r, [in] DOUBLE BeginAngleDegree, [in] DOUBLE EndAngleDegree);
        Arc: function (x, y, radius, startAngle, endAngle) {
            var self = this;

            self.ctx.arc(self.toPixels(x), self.toPixels(y), self.toPixels(radius), startAngle, endAngle);
        },

        //[id(12), helpstring("")] HRESULT EllipseArc([in] DOUBLE left, [in] DOUBLE top, [in] DOUBLE width, [in] DOUBLE height, [in] DOUBLE BeginAngleDegree, [in] DOUBLE EndAngleDegree);
        EllipseArc: function (left, top, width, height, startAngle, endAngle) {
            var self = this;

            self.ctx.ellipseArc(self.toPixels(left), self.toPixels(top), self.toPixels(width), self.toPixels(height), startAngle, endAngle);
        },

        //[id(13), helpstring("")] HRESULT EllipsePie([in] DOUBLE left, [in] DOUBLE top, [in] DOUBLE width, [in] DOUBLE height, [in] DOUBLE BeginAngleDegree, [in] DOUBLE EndAngleDegree, [in] VARIANT_BOOL ToFill);
        EllipsePie: function (left, top, width, height, BeginAngleDegree, EndAngleDegree, ToFill) {
            var self = this;

            self.ctx.ellipsePie(self.toPixels(left), self.toPixels(top), self.toPixels(width), self.toPixels(height),
                BeginAngleDegree, EndAngleDegree, ToFill);
        },

        //[id(15), helpstring("")] HRESULT DrawLabelText([in] BSTR String, [in] DOUBLE x, [in] DOUBLE y);
        DrawLabelText: function (text, xLeft, yTop) {
            var self = this;

            self.ctx.drawText(text, self.toPixels(xLeft), self.toPixels(yTop));
        },
        //[id(16), helpstring("")] HRESULT DrawRotateText([in] BSTR String, [in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE RotateDegree);
        DrawRotateText: function (text, x, y, angleDegree) {
            var self = this;

            self.ctx.drawTextRotate(text, self.toPixels(x), self.toPixels(y), angleDegree);
        },

        //[id(17), helpstring("")] HRESULT DrawText([in] BSTR String, [in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] GRTextAlign TextAlign, [in] VARIANT_BOOL WordWrap);
        DrawText: function (text, x, y, w, h, textAlign, wordwrap) {
            var self = this;

            self.ctx.drawTextAlign(text, self.toPixels(x), self.toPixels(y), self.toPixels(w), self.toPixels(h), textAlign);
        },

        //[id(18), helpstring("")] HRESULT DrawFormatText([in] BSTR String, [in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] IGRTextFormat *TextFormat);
        DrawFormatText: function (text, x, y, w, h, textFormat) {
            var self = this;

            self.ctx.drawFormatText(text, self.toPixels(x), self.toPixels(y), self.toPixels(w), self.toPixels(h), textFormat);
        },
        //[id(19), helpstring("")] HRESULT DrawFormatTextShrinkToFit([in] BSTR String, [in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height, [in] IGRTextFormat *TextFormat);
        DrawFormatTextShrinkToFit: function (text, x, y, w, h, textFormat) {
            var self = this;

            //TDD...暂时不全面实现
            self.ctx.drawTextAlign(text, self.toPixels(x), self.toPixels(y), self.toPixels(w), self.toPixels(h), textFormat.TextAlign, 1);
        },


        //[id(23), helpstring("")] HRESULT CalcLabelTextWidth([in] BSTR String, [out, retval] DOUBLE* pVal);
        CalcLabelTextWidth: function (text) {
            var self = this;

            return self.pixelsTo(self.ctx.measureTextWidth(text));
        },

        //[id(24), helpstring("")] HRESULT CalcLabelTextHeight([in] BSTR String, [out, retval] DOUBLE* pVal);
        CalcLabelTextHeight: function (text) {
            var self = this;

            return self.pixelsTo(self.ctx.measureTextHeight(text));
        },
        //[id(25), helpstring("")] HRESULT CalcTextOutLen([in] DOUBLE Width, [in] DOUBLE Height, [in] BSTR Text, [in] VARIANT_BOOL WordWrap, [out,retval] LONG* pTextLen);
        CalcTextOutLen: function (width, height, text, wordwrap) {
            //TDD...暂不实现此函数
            return text.length;
        },
        //[id(27), helpstring("")] HRESULT CalcDrawFormatTextHeight([in] BSTR String, [in] DOUBLE width, [in] IGRTextFormat *TextFormat, [out, retval] DOUBLE* pVal);
        CalcDrawFormatTextHeight: function (text, width, textFormat) {
            var self = this;

            //TDD...暂不实现此函数
            return self.pixelsTo(self.ctx.measureTextHeight(text));
        },
        //[id(28), helpstring("")] HRESULT CalcDrawFormatTextWidth([in] BSTR String, [in] IGRTextFormat *TextFormat, [out, retval] DOUBLE* pVal); //如果是多行文字，求出最大需要的文字宽度
        CalcDrawFormatTextWidth: function (text, textFormat) {
            var self = this;

            //TDD...暂不实现此函数
            return self.pixelsTo(self.ctx.measureTextWidth(text));
        },
        //[id(29), helpstring("")] HRESULT CalcDrawFormatTextOutLen([in] BSTR Text, [in] DOUBLE Width, [in] DOUBLE Height, [in] IGRTextFormat *TextFormat, [out, retval] LONG* pTextLen);
        CalcDrawFormatTextOutLen: function (text, width, height, textFormat) {
            //TDD...暂不实现此函数
            return text.length;
        },

        //[id(30), helpstring("")] HRESULT DrawPicture([in] IGRPicture *pPicture, [in] DOUBLE left, [in] DOUBLE top, [in] DOUBLE width, [in] DOUBLE height, [in] GRPictureAlignment PictureAlignment, [in] GRPictureSizeMode PictureSizeMode, [in] GRPictureTransparentMode Transparent);
        DrawPicture: function (picture, left, top, width, height, alignment, sizeMode, transparent) {
            //TDD...暂不实现此函数
        },

        //[id(35), helpstring("")] HRESULT SelectFont([in] IGRFont *pFont);
        SelectFont: function (font) {
            this.ctx.selectFont(font.font);
        },
        //[id(36), helpstring("")] HRESULT RestoreFont(void);
        RestoreFont: function () {
            this.ctx.restoreFont();
        },
        //[id(37), helpstring("")] HRESULT FontPointChangeTo([in] DOUBLE Point);
        FontPointChangeTo: function (val) {
            this.ctx.fontSizeTo(val);
        },
        //[id(38), helpstring("")] HRESULT fontSizeRestore(void);
        FontSizeRestore: function () {
            this.ctx.restoreFont();
        },

        //[id(45), helpstring("")] HRESULT SelectTextColor([in] OLE_COLOR TextColor);
        SelectTextColor: function (color) {
            this.ctx.selectFillColor(color);
        },
        //[id(46), helpstring("")] HRESULT RestoreTextColor(void);
        RestoreTextColor: function () {
            this.ctx.restoreFillStyle();
        },
        //[id(47), helpstring("")] HRESULT selectPen([in] DOUBLE PenWidth, [in] OLE_COLOR PenColor, [in] GRPenStyle PenStyle);
        SelectPen: function (width, color, style) {
            this.ctx.selectPen2(width, color, style);
        },
        //[id(48), helpstring("")] HRESULT RestorePen(void);
        RestorePen: function () {
            this.ctx.restorePen();
        },

        //[id(49), helpstring("")] HRESULT SelectFillColor([in] OLE_COLOR BrushColor);
        SelectFillColor: function (color) {
            this.ctx.selectFillColor(color);
        },
        //[id(50), helpstring("")] HRESULT RestoreFillColor(void);
        RestoreFillColor: function () {
            this.ctx.restoreFillStyle();
        },
        //[id(51), helpstring("")] HRESULT PushClipRect([in] DOUBLE x, [in] DOUBLE y, [in] DOUBLE width, [in] DOUBLE height);
        PushClipRect: function (x, y, width, height) {
            var self = this;

            self.ctx.pushClipRect(self.toPixels(x), self.toPixels(y), self.toPixels(width), self.toPixels(height));
        },
        //[id(52), helpstring("")] HRESULT PopClipRect(void);
        PopClipRect: function () {
            this.ctx.popClipRect();
        },

        ////将画折线与曲线的函数公开
        //[propget, id(65), helpstring("")] HRESULT CCPInnerX([out, retval] DOUBLE* pVal);
        //[propget, id(66), helpstring("")] HRESULT CCPInnerY([out, retval] DOUBLE* pVal);
        //[propget, id(67), helpstring("")] HRESULT CCPOuterX([out, retval] DOUBLE* pVal);
        //[propget, id(68), helpstring("")] HRESULT CCPOuterY([out, retval] DOUBLE* pVal);
        //[id(14), helpstring("")] HRESULT CurveTo([in] DOUBLE xInnerControl, [in] DOUBLE  yInnerControl, [in] DOUBLE xOuterControl, [in] DOUBLE  yOuterControl, [in] DOUBLE xEnd, [in] DOUBLE  yEnd);
        CurveTo: function (xInnerControl, yInnerControl, xOuterControl, yOuterControl, xEnd, yEnd) {
            var self = this;

            self.ctx.bezierCurveTo(self.toPixels(xInnerControl), self.toPixels(yInnerControl),
                self.toPixels(xOuterControl), self.toPixels(yOuterControl),
                self.toPixels(xEnd), self.toPixels(yEnd));
        },

        //[id(26), helpstring("")] HRESULT CalcCurveControlPoints([in] DOUBLE xFirst, [in] DOUBLE yFirst, [in] DOUBLE xMiddle, [in] DOUBLE yMiddle, [in] DOUBLE xAfter, [in] DOUBLE yAfter);
        CalcCurveControlPoints: function (xFirst, yFirst, xMiddle, yMiddle, xAfter, yAfter) {
            var self = this,
                Tension = 0.4,
                d1 = Math.sqrt(Math.pow(xMiddle - xFirst, 2) + Math.pow(yMiddle - yFirst, 2)),
                d2 = Math.sqrt(Math.pow(xAfter - xMiddle, 2) + Math.pow(yAfter - yMiddle, 2)),
                d12 = d1 + d2,
                fa = 1,
                fb = 1;

            if (d12 > 0) {
                fa = Tension * d1 / d12; // scaling factor for triangle Ta
                fb = Tension * d2 / d12;
            }

            self.CCPInnerX = xMiddle - fa * (xAfter - xFirst);
            self.CCPInnerY = yMiddle - fa * (yAfter - yFirst);
            self.CCPOuterX = xMiddle + fb * (xAfter - xFirst);
            self.CCPOuterY = yMiddle + fb * (yAfter - yFirst);
        },

        //[id(8), helpstring("")] HRESULT DrawPointMarker([in] GRPointMarkerStyle MarkerStyle, [in] DOUBLE cx, [in] DOUBLE cy, [in] DOUBLE size); //应用当前画笔与填充色绘制数据点图标
        DrawPointMarker: function (MarkerStyle, cx, cy, size) {
            var self = this;

            cx = self.toPixels(cx);
            cy = self.toPixels(cy);
            size = self.toPixels(size/2);
            self.ctx.DrawPointMarker(new Rect(cx - size, cy - size, cx + size, cy + size), MarkerStyle);
        },

        ////2018/06/06 new added
        //[id(70), helpstring("")] HRESULT BeginPath(void);
        BeginPath: function () {
            this.ctx.beginPath();
        },
        //[id(71), helpstring("")] HRESULT ClosePath(void);
        ClosePath: function () {
            this.ctx.closePath();
        },
        //[id(72), helpstring("")] HRESULT EndPath(void);
        EndPath: function () {
            //不需要做任何事情
        },
        //[id(73), helpstring("")] HRESULT StrokePath(void);
        StrokePath: function () {
            this.ctx.stroke();
        },
        //[id(74), helpstring("")] HRESULT FillPath(void);
        FillPath: function () {
            this.ctx.fill();
        },
        //[id(75), helpstring("")] HRESULT StrokeAndFillPath(void);
        StrokeAndFillPath: function () {
            this.ctx.strokefill();
        },
    };

    /////////////////////////////////////////////////////////////////////////
    /**
     * @class
     */
    grcommon.HtmlStyles = function () {
        this.items = [];
    };
    grcommon.HtmlStyles.prototype = {
        /** */
        add: function (name, value) {
            this.items.push({
                name: name,
                value: value
            });
        },
        /** */
        addBackColor: function (color) {
            this.add("background-color", colorValue2Html(color));
        },

        /** */
        addCellBorder: function (grid) {
            var self = this;

            if (grid.ShowColLine && grid.ShowRowLine && compareObject(grid.ColLinePen, grid.RowLinePen)) {
                self.add("border", penStyleText(grid.ColLinePen));
            }
            else {
                grid.ShowRowLine && self.add("border-bottom", penStyleText(grid.ColLinePen));
                grid.ShowColLine && self.add("border-right", penStyleText(grid.RowLinePen));
            }
        },
        /** */
        addObjectPadding: function (object) {
            //padding:10px 5px 15px 20px; (上内边距是 10px 右内边距是 5px 下内边距是 15px 左内边距是 20px)
            //padding:10px; 所有 4 个内边距都是 10px
            //padding:10px 5px; 上内边距和下内边距是 10px 右内边距和左内边距是 5px
            var padding = object.padding,
                value = "";

            if (padding.Right === padding.Left && padding.Top === padding.Bottom) {
                if (padding.Right !== padding.Top) {
                    value = pixelsToHtml(padding.Top) + " ";
                }
                value += pixelsToHtml(padding.Right);
            }
            else {
                value = pixelsToHtml(padding.Top) + " " + pixelsToHtml(padding.Right) + " " + pixelsToHtml(padding.Bottom) + " " + pixelsToHtml(padding.Left);
            }
            return this.add("padding", value);
        },
        /** */
        addBorder: function (border) {
            var htmlStyles = this,
                text;

            if (border.Styles) {
                text = penStyleText(border.Pen);

                if (border.Styles === 0x0f) {
                    htmlStyles.add("border", text);
                }
                else {
                    (border.Styles & grenum.BorderStyle.DrawLeft) && htmlStyles.add("border-left", text);
                    (border.Styles & grenum.BorderStyle.DrawRight) && htmlStyles.add("border-right", text);
                    (border.Styles & grenum.BorderStyle.DrawTop) && htmlStyles.add("border-top", text);
                    (border.Styles & grenum.BorderStyle.DrawBottom) && htmlStyles.add("border-bottom", text);
                }
            }

            if (border.Shadow) {
                //语法: box-shadow: h-shadow v-shadow [blur] [spread] color [inset]; 例子: box-shadow: 10px 10px #888888;
                text = pixelsToHtml(border.ShadowWidth) + " ";
                htmlStyles.add("box-shadow", text + text + colorValue2Html(border.ShadowColor));
            }
        },
        /** */
        addTextFormat: function (textFormat, isCell) {
            var htmlStyles = this,
                name = "text-align",
                whiteSpace = textFormat.WordWrap; //WordWrap 对应HTML的 white-space，而不是 text-wrap 属性，但目前主流浏览器都不支持 text-wrap 属性

            if (textFormat.TextAlign & 0x01) {
                htmlStyles.add(name, "left");
            }
            else if (textFormat.TextAlign & 0x02) {
                htmlStyles.add(name, "center");
            }
            else if (textFormat.TextAlign & 0x04) {
                htmlStyles.add(name, "right");
            }
            else {
                htmlStyles.add(name, "justify"); //好像不起作用
            }

            if (isCell) {
                name = "vertical-align";
                if (textFormat.TextAlign & 0x10) {
                    htmlStyles.add(name, "top");
                }
                else if (textFormat.TextAlign & 0x20) {
                    htmlStyles.add(name, "middle");
                }
                else { //if (textformat.TextAlign & 0x04) 
                    htmlStyles.add(name, "bottom");
                }
            }

            if (textFormat.EndEllipsis) {
                //必须要overflow white-space text-overflow三个属性同时用才有效
                //文字下端对齐时,省略号显示无效果
                htmlStyles.add("text-overflow", "ellipsis");
                whiteSpace = false;
            }

            if (whiteSpace) {
                htmlStyles.add("white-space", "normal");
            }
            else {
                htmlStyles.add("overflow", "hidden");
                htmlStyles.add("white-space", "nowrap");
            }

            textFormat.CharacterSpacing && htmlStyles.add("letter-spacing", pixelsToHtml(textFormat.CharacterSpacing));

            //line-height 实现LineSpacing,但没法进行换算

            textFormat.FirstCharIndent && htmlStyles.add("text-indent", pixelsToHtml(textFormat.FirstCharIndent));

            //如果颜色为纯黑色，则不生成color属性
            //TBD...???! colorIsBlack 的 实现好像也有问题？？？
            colorIsBlack(textFormat.ForeColor) && htmlStyles.add("color", colorValue2Html(textFormat.ForeColor));
        },

        /** */
        getText: function () {
            var cssText = "";

            this.items.forEach(function (style) {
                cssText += style.name + ':' + style.value + ';';
            });

            return cssText;
        },

        /** */
        clear: function () {
            this.items = [];
        },
    };
    var HtmlStyles = grcommon.HtmlStyles;

    /**
     * @class
     */
    grcommon.HtmlElement = function (tag, parent) {
        var self = this;

        self.tag = tag;
        self.classes = [];

        parent.addChild(this);
    };
    grcommon.HtmlElement.prototype = {
        /** */
        //getStyles: function () {
        //    var self = this;

        //    if (!self._styles) {
        //        self._styles = new HtmlStyles();
        //    }
        //    return self._styles;
        //},
        get styles() {
            var self = this;

            if (!self._styles) {
                self._styles = new HtmlStyles();
            }
            return self._styles;
        },

        /** */
        addClass: function (classname) {
            this.classes.push(classname);
        },

        /** */
        addStyle: function (name, value) {
            //var self = this;

            //if (!self._styles) {
            //    self._styles = new HtmlStyles();
            //}

            //self._styles.add(name, value);
            this.styles.add(name, value);
        },

        /** */
        addBackColorStyle: function (color) {
            this.addStyle("background-color", colorValue2Html(color));
        },

        /** */
        addAttribute: function (name, value) {
            var self = this;

            if (!self._attributes) {
                self._attributes = [];
            }

            self._attributes.push({
                name: name,
                value: value
            });
        },

        /** */
        addChild: function (childElement) {
            var self = this;

            if (!self.children) {
                self.children = [];
            }

            self.children.push(childElement);
        },

        /** */
        //template: <span class="-gr-abs-pos -gr-bs0 -gr-pds0" style="left:15.00px;top:159.00px;width:214.00px;height:34.00px;display: table">
        beginText: function () {
            var self = this,
                html = '<' + self.tag;

            if (self.classes.length > 0) {
                html += ' class="';
                self.classes.forEach(function (theclass, index) {
                    if (index > 0) {
                        html += ' ';
                    }
                    html += theclass;
                });
                html += '"';
            }

            if (self._styles) {
                html += ' style="' + self._styles.getText() + '"';
            }

            if (self._attributes) {
                self._attributes.forEach(function (attr) {
                    //html += ' ' + attr.name + '="' + attr.value + '"';
                    var value = attr.value;
                    html += ' ' + attr.name;
                    if (value !== undefined) {
                        html += '="' + value + '"';
                    }
                });
            }

            if (self.skipend) {
                html += '/';
            }
            html += '>';

            return html;
        },

        /** */
        endText: function () {
            var self = this;

            return self.skipend ? '' : '</' + self.tag + '>';
        },
    };

})();
//{{END CODE}}