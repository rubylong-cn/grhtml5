var gr = gr || {};

//{{BEGIN CODE}}
//数据格式化程序模块
(function (undefined) {
    "use strict";

    var grenum = gr.enum_,
        grconst = gr.const_,
        grcommon = gr.common,
        grlocale = gr.locale,
        grhelper = gr.helper,

        DateTime = grcommon.DateTime, //dom/crosstab  format

        intFixed = grhelper.intFixed, //dom/crosstab format
        confirmDateValue = grhelper.confirmDateValue, //dom format
        confirmBooleanValue = grhelper.confirmBooleanValue, //dom format
        rgba2color = grhelper.rgba2color, //dom/chart format
        color2rgba = grhelper.color2rgba, //dom/chart format
        decodeTextColor = grhelper.decodeTextColor; //format

    /////////////////////////////////////////////////////////////////////////
    var grformat = gr.format = {};

    /////////////////////////////////////////////////////////////////////////
    //Boolean
    //    @classdesc 布尔格式化类的描述
    /**
     * Describe the BooleanFormatter class here.
     * @class
     */
    grformat.BooleanFormatter = function (formatText) {
        this.parse(formatText);
    };
    grformat.BooleanFormatter.prototype = {
        /** */
        parse: function (formatText) {
            var self = this,
                pos;

            if (!formatText) {
                /** 
                 * @member {string} BooleanFormatter#trueValueText
                 */
                self.trueValueText = "true";
                /** @member {string} falseValueText*/
                self.falseValueText = "false";
            }
            else {
                pos = formatText.indexOf(':');
                if (pos === -1) {
                    self.trueValueText = formatText;
                    self.falseValueText = "";
                }
                else {
                    self.trueValueText = formatText.substr(0, pos);
                    self.falseValueText = formatText.substr(pos + 1);
                }
            }
        },

        /** */
        format: function (value) {
            var self = this;

            value = confirmBooleanValue(value);
            return value ? self.trueValueText : self.falseValueText;
        },
    }

    /////////////////////////////////////////////////////////////////////////
    //NumericAnalyser
    /**
     * 
     * @class NumericAnalyser
     */
    var NumericAnalyser = function () {
        this.defaultMe();
    };
    NumericAnalyser.prototype = {
        /** */
        defaultMe: function () {
            var t = this;
            t.precision = 9;				//小数位数
            t.leastPrecision = 0;			//最少显示的小数位数
            t.leastIntegerWidth = 1;		//整数部分长度，为数不足用零补齐
            t.showPositive = false;			//显示正号
            t.showNegative = true;	        //显示负号,当负数括号显示或红字显示时,将此属性置为false；如果格式中定义了负号，则负号始终显示
            t.showSymbolAtHead = true;		//正负符号显示在前面
            t.negativeBracket = false;		//负数用括号表示
            t.intSepStep = 0; //t.hasThousandSep = false;		//应用千分位分隔符(,)标志
            t.asPercent = false;			//显示为百分比
            t.asCurrency = false;			//显示货币金额符号
            t.blankSepSymbol = false;		//用空格隔开正负符号或金额符号
            t.firstCurrencySymbol = true;	//金额符号在正负符号之前显示
            t.exponent = false;				//表示是否为科学计数法
            t.textColor = 0;                //文字的显示颜色,负数红字显示时在格式化串中指定文字颜色 0===rgb(0, 0, 0);
            t.prefix = "";
            t.suffix = "";
        },

        /** */
        isCustomTextColor: function () {
            return (this.textColor !== 0);
        },

        /** */
        parse: function (formatText) {
            var self = this,
                textColorResult,
                index,
                index2, //indexCurrencySymbol,
                dotIndex,
                length;

            function isFormatChar(ch) {
                return ("0#.,+-()$%".indexOf(ch) !== -1);
            };

            self.defaultMe();

            if (formatText) {
                //颜色属性要求写在最前面，如 rgb(255,0,0)0.00, 这样形式
                textColorResult = decodeTextColor(formatText);
                if (textColorResult) {
                    formatText = formatText.substr(textColorResult.index);
                    self.textColor = textColorResult.color;
                }

                length = formatText.length;

                self.exponent = (formatText.charAt(0) === 'e'); //如果首字母为“e”，表示科学计数 

                //解析出 prefix 与 suffix
                if (!self.exponent) {
                    index = 0;
                    while ((index < length) && !isFormatChar(formatText.charAt(index))) {
                        ++index;
                    }
                    if (index > 0) {
                        self.prefix = formatText.substr(0, index);
                        formatText = formatText.substr(index);
                        length = formatText.length;
                    }
                    if (index < length) {
                        index = length - 1;
                        while (!isFormatChar(formatText.charAt(index)) && (index > 0)) {
                            --index;
                        }
                        if (index < (length - 1)) {
                            self.suffix = formatText.substr(index + 1);
                            formatText = formatText.substr(0, index + 1);
                            length = formatText.length;
                        }
                    }
                }

                //记录小数点的位置
                dotIndex = formatText.indexOf('.');
                if (dotIndex === -1) {
                    dotIndex = length;
                }

                //解析出整数分位
                //self.hasThousandSep = (formatText.indexOf(",") >= 0);
                index = formatText.indexOf(',');
                if (index >= 0) {
                    self.intSepStep = (dotIndex - index - 1);
                    if (self.intSepStep < 0) {
                        self.intSepStep = 3;
                    }
                }

                //TDD...性能验证: 逐个取出各个字符，然后比较其是否为某个特征值
                self.negativeBracket = (formatText.indexOf("(") >= 0) && (formatText.indexOf(")") >= 0);
                self.asPercent = (formatText.indexOf("%") >= 0);
                self.blankSepSymbol = (formatText.indexOf(" ") >= 0);

                index = formatText.indexOf('+');
                self.showPositive = (index >= 0);

                index2 = formatText.indexOf('-');
                self.showNegative = (index2 >= 0) || (!self.negativeBracket && !self.isCustomTextColor());
                if (index < index2) {
                    index = index2;
                }

                index2 = formatText.indexOf('$');
                self.asCurrency = (index2 >= 0);
                if (index < index2) {
                    index = index2;
                }

                self.showSymbolAtHead = (index === -1) || (index < dotIndex);

                //这里必须保证index2 是 formatText.indexOf('$')
                if (self.asCurrency) {
                    if (self.negativeBracket) {
                        index = formatText.indexOf(self.showSymbolAtHead ? "(" : ")");
                        self.firstCurrencySymbol = index2 < index;
                    }
                    else {
                        self.firstCurrencySymbol = (index2 <= index);
                    }
                }

                self.leastIntegerWidth = 0;
                for (index = 0; index < dotIndex; ++index) {
                    if (formatText.charAt(index) === "0") {
                        ++self.leastIntegerWidth;
                    }
                }

                self.leastPrecision = 0;
                self.precision = 0;
                for (index = dotIndex + 1; index < length; ++index) {
                    if (formatText.charAt(index) === "0") {
                        ++self.leastPrecision;
                        ++self.precision;
                    }
                    else if (formatText.charAt(index) === "#") {
                        ++self.precision;
                    }
                }
            }
        },

        /**
         */
        format: function (value) {
            var self = this,
                rgbaColor,
                tail,
                e,
                index,
                index2,
                dotIndex, //小数点的序号
                intChars, //整数部分的位数
                paddingZeros, //整数部分前面需要补充0的个数
                currentDigital, //当前整数部分数字的位序号，最左边位(即小数点左边位)序号为1
                length,
                partResult,
                ret = "";

            value = +value; //把参数转换为数字

            if (self.isCustomTextColor()) {
                //在前面加 [_color#=rgb(255,0,0)] 这样的颜色标识属性
                rgbaColor = color2rgba(self.textColor);
                ret = "[_color#=rgb(" + rgbaColor.r + "," + rgbaColor.g + "," + rgbaColor.b + ")]";
            }

            if (self.asPercent) {
                value *= 100;
            }

            if (self.exponent) {
                tail = value;
                if (tail < 0.0) {
                    tail = -tail;
                }

                e = 0;
                if (tail !== 0) {
                    while (tail >= 10.0) {
                        tail /= 10.0;
                        ++e;
                    }
                    while (tail < 1.0) {
                        tail *= 10.0;
                        --e;
                    }
                }

                self.exponent = false;
                if (value < 0.0) {
                    tail = -tail;
                }
                ret += self.format(tail);
                ret += 'e';
                if (e >= 0) {
                    ret += '+';
                }
                else {
                    ret += '-';
                    e = -e;
                }
                ret += e;
                self.exponent = true;
                return ret;
            }

            //这样是为了处理四舍五入，但始终还是有处理不对的，如：33554432.285 保留两位得 33554432.28 而不是正确的 33554432.29
            //变通解决：33554432.285 + 0.00000001，这样会得 33554432.29
            //在js中测试好像不要这样处理
            //if (self.precision < 11) {
            //    if (value > 0) {
            //        value += 0.00000000001;
            //    }
            //    else if (value < 0) {
            //        value -= 0.00000000001;
            //    }
            //}

            partResult = value.toFixed(self.precision);
            length = partResult.length;

            //去掉尾部多余的零
            if (self.precision > self.leastPrecision) {
                //index2 表示开始序号
                for (index = length - 1, index2 = index - self.precision + self.leastPrecision; index > index2; index--) {
                    if (partResult.charAt(index) !== "0") {
                        break;
                    }
                }

                //如果小数后没有位,则小数点也不要
                if (partResult.charAt(index) !== ".") {
                    index++;
                }

                if (index < partResult.length) {
                    partResult = partResult.substr(0, index);
                    length = index;
                }
            }

            //dotIndex = (self.precision > 0) ? partResult.indexOf('.') : length;
            dotIndex = partResult.indexOf('.');
            if (dotIndex < 0) {
                dotIndex = length;
            }

            //加前缀
            ret += self.prefix;

            //生成正负符号前导字符
            if (self.showSymbolAtHead) {
                if (self.asCurrency && self.firstCurrencySymbol) {
                    ret += grlocale.currencySymbol;
                }

                if (value < 0) {
                    if (self.negativeBracket) {
                        ret += '(';
                    }
                }
                else if (self.showPositive && (value > 0)) {
                    ret += '+';
                }

                if (self.asCurrency && !self.firstCurrencySymbol) {
                    ret += grlocale.currencySymbol; //AppendSymbol(&pDestPtr, g_SCurrency);
                }

                if (self.blankSepSymbol) {
                    ret += ' ';
                }
            }
            else if (self.negativeBracket && (value < 0)) {
                ret += '(';
            }

            index = 0; //指示partResult中当前的数字字符序号
            intChars = dotIndex; //整数部分的位数
            if (value < 0) {
                --intChars;
                ++index;

                if (self.showNegative) {
                    ret += '-'
                }
            }
            paddingZeros = self.leastIntegerWidth - intChars; //前面需要补充0的个数
            currentDigital = intChars; //当前数字的位序号，最左边位序号为1

            //补齐整数部分不足的位数
            if (paddingZeros > 0) {
                currentDigital += paddingZeros;
                while (currentDigital > intChars) {
                    ret += '0';
                    currentDigital--;

                    if (self.intSepStep > 0 && (currentDigital % self.intSepStep === 0)) {
                        ret += grlocale.thousandSep;
                    }
                }
            }
            else {
                //实现0不显示，或整数部分为0时不显示，如#(0)无显示，#.0000(-0.12345)显示为-.1235
                while (paddingZeros++ < 0) {
                    if (partResult.charAt(index) !== '0') {
                        break;
                    }
                    index++;
                }
            }

            //将整数部分复制到返回参数中
            //如果有千分位，插入千分位
            if (self.intSepStep > 0) {
                while (currentDigital > 0) {
                    ret += partResult.charAt(index++);
                    if ((--currentDigital % self.intSepStep === 0) && (currentDigital !== 0)) {
                        ret += grlocale.thousandSep;
                    }
                }
            }
            else {
                ret += partResult.substring(index, dotIndex);
            }

            //添加小数部分
            if (dotIndex < length) {
                ret += partResult.substr(dotIndex);
            }

            //生成负数符号后导字符
            if (!self.showSymbolAtHead) {
                if (self.blankSepSymbol) {
                    ret += ' ';
                }

                if (self.asCurrency && self.firstCurrencySymbol) {
                    ret += grlocale.currencySymbol;
                }

                if (value < 0) {
                    ret += self.negativeBracket ? ')' : '-';
                }
                else if (self.showPositive && (value > 0)) {
                    ret += '+';
                }

                if (self.asCurrency && !self.firstCurrencySymbol) {
                    ret += grlocale.currencySymbol;
                }
            }
            else if (self.negativeBracket && (value < 0)) {
                ret += ')';
            }

            if (self.asPercent) {
                ret += '%';
            }

            //加后缀
            ret += self.suffix;

            return ret;
        },
    };

    //IntEnumAnalyser
    /**
     * The IntEnumAnalyser class.
     * @class
     */
    var IntEnumAnalyser = function (formatText) {
        //去掉前后的括号
        formatText = formatText.substring(1, formatText.length - 1);

        var items = formatText.split(',');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var pos = item.indexOf('=');
            this[item.substr(0, pos)] = item.substr(pos + 1);
        }
    };
    IntEnumAnalyser.prototype = {
        /** */
        format: function (value) {
            var text = this[value];
            if (text === undefined)
                text = "";
            return text;
        }
    };

    /////////////////////////////////////////////////////////////////////////
    // Numeric
    var BIGMONEY_FORMAT = "$$",
        BIGNUMERIC_FORMAT = "$$$";

    /**
     * NumericFormatter 类.
     * @class
     */
    grformat.NumericFormatter = function (formatText) {
        this.parse(formatText);
    };
    grformat.NumericFormatter.prototype = {
        /**
         */
        defaultMe: function () {
            var self = this;

            self.formatType = grenum.NumericFormatType.Normal;
            self.positiveAnalyser = new NumericAnalyser();
            if (self.negativeAnalyser) {
                self.negativeAnalyser = undefined;
            }
            if (self.zeroAnalyser) {
                self.zeroAnalyser = undefined;
            }
            if (self.intEnumAnalyser) {
                self.intEnumAnalyser = undefined;
            }
        },

        /**
         * Check whether the dairy product is solid at room temperature.
         * @abstract
         * @return {string}
         */
        parse: function (formatText) {
            var self = this,
                index;

            function _doNormalParse(formatText) {
                var formatItems,
                    count;

                formatItems = formatText.split(';');
                count = formatItems.length;
                self.positiveAnalyser.parse(formatItems[0]);
                if ((count > 1) && (formatItems[1] !== "")) {
                    self.negativeAnalyser = new NumericAnalyser();
                    self.negativeAnalyser.parse(formatItems[1]);
                }
                if ((count > 2) && (formatItems[2] !== "")) {
                    self.zeroAnalyser = new NumericAnalyser();
                    self.zeroAnalyser.parse(formatItems[2]);
                }
            }

            self.defaultMe();

            if (formatText) {
                var len = formatText.length;
                if (formatText) {
                    index = formatText.indexOf(BIGNUMERIC_FORMAT);
                    if (index !== -1) {
                        //前缀与后缀保存在 m_PositiveAnalyser 中
                        self.formatType = grenum.NumericFormatType.HZAmtNumeric;
                        formatText = formatText.substr(0, index) + formatText.substr(index + BIGNUMERIC_FORMAT.length);
                        (formatText !== "") && _doNormalParse(formatText);
                    }
                    else if ((len >= 2) && (formatText.substr(0, 2) === BIGMONEY_FORMAT)) {	//判断是否为转换汉字大写金额
                        if (len === 2) {
                            self.formatType = grenum.NumericFormatType.HZBigAmt;
                        }
                        else {
                            self.formatType = grenum.NumericFormatType.HZBigNumeric;
                            _doNormalParse(formatText.substr(2));
                        }
                    }
                    else if ((formatText.charAt(0) === '{') && (formatText.charAt(len - 1) === '}')) {
                        self.formatType = grenum.NumericFormatType.IntEnum;
                        self.intEnumAnalyser = new IntEnumAnalyser(formatText);
                    }
                    else {
                        _doNormalParse(formatText);
                    }
                }
            }
        },

        /**
         */
        format: function (value) {
            var self = this,
                ret;

            function doIntPartToBigMoney(valueText, dotIndex) {
                var index,
                    curNum,
                    needLevel = false,
                    priorZero = false,
                    count = 0,
                    ret = "";

                //对整数部份进行反相识别处理
                for (index = dotIndex - 1; index >= 0; index--, count++) {
                    curNum = parseInt(valueText.charAt(index));

                    if ((count % 4 === 0) && (count > 0)) {
                        needLevel = true; //如果处理的数字为第四位（万），或第八位（亿）等，则要求置段
                    }

                    if (curNum === 0) {
                        //只对拾佰仟位的０进行识别，主要考虑到拾的特殊性，即如１０读壹拾，不会读壹拾零
                        priorZero = true; //去掉%4判断, 让 102000 读做：壹拾万零贰仟元整。9，050，155，001-〉玖拾亿零伍仟零壹拾伍万伍仟零壹元整
                    }
                    else {
                        if (priorZero) {
                            //只有比当前处理的位要低中有数字才补零
                            if (ret !== "") {
                                ret = grconst.BIG_AMT_NUMBER.charAt(0) + ret;
                            }
                            priorZero = false;
                        }

                        if (count > 0) {
                            //这里判断是否需要读段名，如万，亿等
                            if (needLevel && (count % 4 !== 0)) {
                                ret = grconst.HZ_AMT_STEP.charAt(count - (count % 4)) + ret;
                            }
                            needLevel = false;

                            ret = grconst.HZ_AMT_STEP.charAt(count) + ret;
                        }

                        ret = grconst.BIG_AMT_NUMBER.charAt(curNum) + ret;
                    }
                }

                return ret;
            };

            function toBigNumericDigit(numText) {
                var ret = "",
                    no,
                    index,
                    len = numText.length;

                for (index = 0; index < len; index++) {
                    no = parseInt(numText.charAt(index));
                    if (!isNaN(no)) {
                        ret += grconst.BIG_AMT_NUMBER.charAt(no);
                    }
                }

                return ret;
            }

            function toBigMoney(value) {
                var dotIndex,
                    negative = (value <= 0),
                    jiaoNum, //角位对应数字
                    fengNum, //分位对应数字
                    valueText,
                    ret;

                if (-0.005 < value && value < 0.005) { //0.004449;
                    return grconst.HZ_ZERO_YUAN; //"零元整";
                }

                if (negative) {
                    value = -value;
                }

                //为了处理四舍五入，加上一个很小的微调值，不然2.655会显示为2.65
                //TDD...待测试必要性 value += 0.00000000001;

                valueText = value.toFixed(2);
                dotIndex = valueText.indexOf('.'); //将数字分整数部份与小数部份处理

                //转换整数部分
                ret = doIntPartToBigMoney(valueText, dotIndex);

                //如果没有整数部分，则不用加元
                if (ret !== "") {
                    ret += grconst.HZ_AMT_STEP.charAt(0);
                }

                //下面实现对小数点后面的处理, 先判断是否为全零，则不需要继续读
                jiaoNum = parseInt(valueText.charAt(dotIndex + 1));
                fengNum = parseInt(valueText.charAt(dotIndex + 2));
                if ((jiaoNum === 0) && (fengNum === 0)) {
                    ret += grconst.HZ_AMT_UNIT[0];
                }
                else {
                    //对角的处理，如果没有整数部分，则不用加上零角的零
                    if ((jiaoNum !== 0) || (ret !== "")) {
                        ret += grconst.BIG_AMT_NUMBER.charAt(jiaoNum);
                    }
                    if (jiaoNum !== 0) {
                        ret += grconst.HZ_AMT_UNIT.charAt(1);
                    }

                    //对分的处理，如果没有分，角后加‘整’
                    if (fengNum !== 0) {
                        ret += grconst.BIG_AMT_NUMBER.charAt(fengNum);
                        ret += grconst.HZ_AMT_UNIT.charAt(2);
                    }
                    else {
                        ret += grconst.HZ_AMT_UNIT.charAt(0);
                    }
                }

                if (negative) {
                    ret = grconst.HZ_NEGATIVE + ret;
                }

                return ret;
            };

            function toBigNumeric(value, numericAnalyser) {
                var len,
                    dotIndex,
                    precision = Math.max(0, numericAnalyser.precision),
                    leastPrecision = Math.min(precision, numericAnalyser.leastPrecision),
                    zeroLowRange = -0.5 * Math.pow(0.1, precision),
                    negative = (value <= zeroLowRange),
                    valueText,
                    ret;

                if (value < 0) {
                    value = -value;
                }

                valueText = value.toFixed(precision);
                len = valueText.length;
                dotIndex = valueText.indexOf('.'); //将数字分整数部份与小数部份处理
                if (dotIndex === -1) {
                    dotIndex = len;
                }

                //整数部分转换
                ret = doIntPartToBigMoney(valueText, dotIndex);

                //如果没有整数部分，则要加上“零”
                if (ret === "") {
                    ret = grconst.BIG_AMT_NUMBER.charAt(0);
                }

                //下面实现对小数点后面的处理, 先判断是否为全零，是则不需要继续读
                //尾部的纯0也不需要转换
                //以下 len 表示最后一个非0数字的序号
                for (len--; len > dotIndex + leastPrecision; len--) {
                    if (valueText.charAt(len) !== '0') {
                        break;
                    }
                }

                if (len > dotIndex) {
                    ret += "\u70b9"; //首先加“点”, '点'=0x70b9

                    for (dotIndex++; dotIndex <= len; dotIndex++) {
                        ret += grconst.BIG_AMT_NUMBER.charAt(parseInt(valueText.charAt(dotIndex)));
                    }
                }

                if (negative) {
                    ret = grconst.HZ_NEGATIVE + ret;
                }
                if (numericAnalyser.prefix !== "") {
                    ret = numericAnalyser.prefix + ret;
                }
                if (numericAnalyser.suffix !== "") {
                    ret += numericAnalyser.suffix;
                }

                return ret;
            };

            value = +value;
            if (isNaN(value)) {
                ret = "";
            }
            else {
                if (self.formatType <= grenum.NumericFormatType.HZAmtNumeric) {
                    if (self.zeroAnalyser && (-0.5 < value && value < 0.5)) {
                        //改进0不显示，根据显示小数位数，近似0的数也要隐藏，不然会格式化为0
                        var positivePrecision = self.positiveAnalyser.precision;
                        if (self.positiveAnalyser.asPercent) {
                            positivePrecision += 2;
                        }

                        var negativePrecision = positivePrecision;
                        if (self.negativeAnalyser) {
                            negativePrecision = self.negativeAnalyser.precision;
                            if (self.negativeAnalyser.asPercent) {
                                negativePrecision += 2;
                            }
                        }

                        var negativeZeroValue = Math.pow(0.1, negativePrecision) * -0.5;
                        var positiveZeroValue = Math.pow(0.1, positivePrecision) * 0.5;

                        if (negativeZeroValue < value && value < positiveZeroValue) {
                            ret = self.zeroAnalyser.format(0);
                        }
                    }

                    if (ret === undefined) {
                        if (self.negativeAnalyser && (value < 0)) {
                            ret = self.negativeAnalyser.format(value);
                        }
                        else {
                            ret = self.positiveAnalyser.format(value);
                        }
                    }

                    if (self.formatType === grenum.NumericFormatType.HZAmtNumeric) {
                        ret = toBigNumericDigit(ret);
                    }
                }
                else if (self.formatType === grenum.NumericFormatType.IntEnum) {
                    ret = self.intEnumAnalyser.format(value);
                }
                else {
                    //ASSERT(formatType==HZBigAmt || formatType==HZBigNumeric);
                    ret = (self.formatType === grenum.NumericFormatType.HZBigAmt) ?
                        toBigMoney(value) : toBigNumeric(value, self.positiveAnalyser);
                }
            }

            return ret;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //DateTimeFormatter
    grformat.DateTimeFormatter = function (formatText) {
        this.parse(formatText);
    };
    grformat.DateTimeFormatter.prototype = {
        parse: function (formatText) {
            var len,
                index,
                repeats,
                chars,
                curChar,
                nextChar,
                item,
                items = this.items = [];

            function repeatChars() {
                repeats = 1;
                while (chars[index + 1] === curChar) {
                    index++;
                    repeats++;
                }
            };

            function escapeSpecialChars() {
                var theRepeats = repeats;
                repeats = repeats % 2;
                theRepeats = (theRepeats - repeats) / 2;
                (theRepeats > 0) && appendRepeatTextChars(theRepeats);
            };

            function appendRepeatTextChars(count) {
                var text = "",
                    itemCount = items.length;

                do {
                    text += curChar;
                } while (--count > 0);

                if ((itemCount > 0) && (items[itemCount - 1].type === grenum.dateTimeItemType.text)) {
                    items[itemCount - 1].data += text;
                }
                else {
                    items.push({
                        type: grenum.dateTimeItemType.text,
                        data: text,
                        funDisplayText: textDisplayText
                    });
                }
            }

            function yearDisplayText(date, formatItem) {
                return intFixed(date.getFullYear(), formatItem.subtype);
            }
            function monthDisplayText(date, formatItem) {
                var m = date.getMonth(); //月份数减一

                if (formatItem.subtype <= grenum.dateTimeItemSubtype.digit4) {
                    return intFixed(m + 1, formatItem.subtype);
                }
                else {
                    if (grlocale.supportIntl) {
                        return (formatItem.subtype === grenum.dateTimeItemSubtype.short) ?
                            new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date) :
                            new Intl.DateTimeFormat(undefined, { month: 'long' }).format(date);
                    }
                    else {
                        return (m < 10) ?
                            grconst.HZ_NUMBER.charAt(m) : (grconst.HZ_NUMBER.charAt(9) + grconst.HZ_NUMBER.charAt(m - 10)) +
                            grconst.HZ_DATETIME_UNIT.charAt(5);
                    }
                }
            }
            function dayDisplayText(date, formatItem) {
                return intFixed(date.getDate(), formatItem.subtype);
            }
            function weekdayDisplayText(date, formatItem) {
                var d;

                if (grlocale.supportIntl) {
                    return (formatItem.subtype === grenum.dateTimeItemSubtype.short) ?
                        new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date) :
                        new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
                }
                else {
                    d = date.getDay();
                    return (formatItem.subtype === (grenum.dateTimeItemSubtype.short) ?
                        grconst.HZ_DATETIME_UNIT.substr(0, 1) : grconst.HZ_DATETIME_UNIT.substring(2, 4)) +
                        ((d > 0) ? grconst.HZ_NUMBER.charAt(d - 1) : grconst.HZ_DATETIME_UNIT.charAt(1));
                }
            }
            function hour12DisplayText(date, formatItem) {
                //0点与12点都要显示为12
                var h = date.getHours() % 12;
                if (!h) {
                    h = 12;
                }
                return intFixed(h, formatItem.subtype);
            }
            function hour24DisplayText(date, formatItem) {
                return intFixed(date.getHours(), formatItem.subtype);
            }
            function minuteDisplayText(date, formatItem) {
                return intFixed(date.getMinutes(), formatItem.subtype);
            }
            function secondDisplayText(date, formatItem) {
                return intFixed(date.getSeconds(), formatItem.subtype);
            }

            function localedateDisplayText(date, formatItem) {
                return date.toLocaleDateString();
            }
            function localetimeDisplayText(date, formatItem) {
                return date.toLocaleTimeString();
            }
            function localedatetimeDisplayText(date, formatItem) {
                return date.toLocaleString();
            }

            function textDisplayText(date, formatItem) {
                return formatItem.data;
            }

            function ampmDisplayText(date, formatItem) {
                return (date.getHours() < 12) ? grlocale.textAM : grlocale.textPM;
            }
            function datesepDisplayText(date, formatItem) {
                return grlocale.dateSep;
            }
            function timesepDisplayText(date, formatItem) {
                return grlocale.timeSep;
            }

            if (!formatText) {
                items.push({
                    type: grenum.dateTimeItemType.localedatetime,
                    funDisplayText: localedatetimeDisplayText
                });
            }
            else {
                chars = formatText.split('');
                len = chars.length;

                index = 0;
                do {
                    curChar = chars[index];
                    repeatChars();

                    item = {};
                    switch (curChar) {
                        case 'd':
                            if (repeats < 3) {
                                item.type = grenum.dateTimeItemType.day;
                                item.funDisplayText = dayDisplayText;
                                item.subtype = (repeats === 1) ? grenum.dateTimeItemSubtype.numeric : grenum.dateTimeItemSubtype.digit2;
                            }
                            else { //>=3
                                item.type = grenum.dateTimeItemType.weekday;
                                item.funDisplayText = weekdayDisplayText;
                                item.subtype = (repeats === 3) ? grenum.dateTimeItemSubtype.short : grenum.dateTimeItemSubtype.long;
                            }
                            break;
                        case 'M':
                            item.type = grenum.dateTimeItemType.month;
                            item.funDisplayText = monthDisplayText;
                            if (repeats === 1) {
                                item.subtype = grenum.dateTimeItemSubtype.numeric;
                            }
                            else if (repeats === 2) {
                                item.subtype = grenum.dateTimeItemSubtype.digit2;
                            }
                            else if (repeats === 3) {
                                item.subtype = grenum.dateTimeItemSubtype.short;
                            }
                            else { //>=4
                                item.subtype = grenum.dateTimeItemSubtype.long;
                            }
                            break;
                        case 'y':
                            item.type = grenum.dateTimeItemType.year;
                            item.funDisplayText = yearDisplayText; //this.format.yearDisplayText;
                            item.subtype = (repeats < 3) ? grenum.dateTimeItemSubtype.digit2 : grenum.dateTimeItemSubtype.numeric;
                            break;
                        case 'h':
                            item.type = grenum.dateTimeItemType.hour12;
                            item.funDisplayText = hour12DisplayText;
                            item.subtype = (repeats === 1) ? grenum.dateTimeItemSubtype.numeric : grenum.dateTimeItemSubtype.digit2;
                            break;
                        case 'H':
                            item.type = grenum.dateTimeItemType.hour24;
                            item.funDisplayText = hour24DisplayText;
                            item.subtype = (repeats === 1) ? grenum.dateTimeItemSubtype.numeric : grenum.dateTimeItemSubtype.digit2;
                            break;
                        case 'm':
                            item.type = grenum.dateTimeItemType.minute;
                            item.funDisplayText = minuteDisplayText;
                            item.subtype = (repeats === 1) ? grenum.dateTimeItemSubtype.numeric : grenum.dateTimeItemSubtype.digit2;
                            break;
                        case 's':
                            item.type = grenum.dateTimeItemType.second;
                            item.funDisplayText = secondDisplayText;
                            item.subtype = (repeats === 1) ? grenum.dateTimeItemSubtype.numeric : grenum.dateTimeItemSubtype.digit2;
                            break;
                        case 't':
                            if (repeats === 2) {
                                item.type = grenum.dateTimeItemType.ampm;
                                item.funDisplayText = ampmDisplayText;
                            }
                            break;
                        case '%':
                            escapeSpecialChars();
                            if (repeats) {
                                nextChar = chars[index + 1];
                                ++index;
                                if (nextChar === 'd') {
                                    item.type = grenum.dateTimeItemType.localedate;
                                    item.funDisplayText = localedateDisplayText;
                                }
                                else if (nextChar === 't') {
                                    item.type = grenum.dateTimeItemType.localetime;
                                    item.funDisplayText = localetimeDisplayText;
                                }
                                else if (nextChar === 'g') {
                                    item.type = grenum.dateTimeItemType.localedatetime;
                                    item.funDisplayText = localedatetimeDisplayText;
                                }
                                else {
                                    index--;
                                }
                            }
                            break;
                        case ':':
                            escapeSpecialChars();
                            if (repeats) {
                                item.type = grenum.dateTimeItemType.timesep;
                                item.funDisplayText = timesepDisplayText;
                            }
                            break;
                        case '/':
                            //如果是 //，则固定按 / 分隔，继续执行到 default
                            escapeSpecialChars();
                            if (repeats) {
                                item.type = grenum.dateTimeItemType.datesep;
                                item.funDisplayText = datesepDisplayText;
                            }
                            break;
                        default:
                            appendRepeatTextChars(repeats);
                            break;
                    }
                    item.type && (item.type !== grenum.dateTimeItemType.text) && items.push(item);
                } while (++index < len);
            }
        },

        format: function (value) {
            var ret = "";

            if (value !== undefined) {
                value = confirmDateValue(value);

                this.items.forEach(function (item) {
                    ret += item.funDisplayText(value, item);
                });
            }

            return ret;
        },
    }

    //TDD以后gr.utility应该单独放在一个js文件(grutility.js)中。因为依赖性关系，其不能并入grcommon.js中
    var grutility = gr.utility = {
        CreateDateTime: function () {
            return new DateTime();
        },

        DateTimeFormat: function (date, format) {
            return new grformat.DateTimeFormatter(format).format(confirmDateValue(date));
        },
        NumberFormat: function (val, format) {
            return new grformat.NumericFormatter(format).format(val);
        },
        NumberFormatToBigHZ: function (val, decimals) {
            var i, format = "$$0";
            if (decimals > 0) {
                format += '.'
                for (i = 0; i < decimals; i++) {
                    format += '0';
                }
            }
            return grutility.NumberFormat(val, format);
        },
        NumberFormatToBigHZAmount: function (val) {
            return grutility.NumberFormat(val, "$$");
        },

        NumberRound45: function (val, decimals) {
            var p = Math.pow(10, decimals);
            return Math.round(val * p) / p;
        },
        //四舍六入五成双
        //对于位数很多的近似数，当有效位数确定后，其后面多余的数字应该舍去，只保留有效数字最末一位，这种修约（舍入）规则是“四舍六入五成双”，
        //也即“4舍6入5凑偶”这里“四”是指≤4 时舍去，"六"是指≥6时进上，"五"指的是根据5后面的数字来定，当5后有数时，舍5入1；当5后无有效数字
        //时，需要分两种情况来讲：①5前为奇数，舍5入1；②5前为偶数，舍5不进。（0是偶数）
        NumberRound465: function (val, decimals) {
            var p = Math.pow(10, decimals + 2), genum, shinum, baidigit;

            val = Math.floor(val * p);
            genum = val % 10;
            shinum = val % 100 - genum;
            val -= (shinum + genum);

            if (shinum >= 60) {
                val += 100;
            }
            else if (shinum === 50) {
                if (genum > 0) {
                    val += 100;
                }
                else {
                    baidigit = (val % 1000) / 100;
                    if (baidigit % 2) {
                        val += 100;
                    }
                }
            }

            return (val / p);
        },

        ColorFromRGB: function (r, g, b, a) {
            //return b | (g << 8) | (r << 16);
            if (a === undefined) {
                a = 1;
            }
            return rgba2color(r, g, b, a);
        },
    };
})();
//{{END CODE}}