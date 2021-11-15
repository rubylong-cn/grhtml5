var gr = gr || {};

//{{BEGIN CODE}}
//运算表达式程序模块
(function (undefined) {
    "use strict";

    var grenum = gr.enum_,
        grhelper = gr.helper,
        grformat = gr.format,
        grutility = gr.utility,

        ensureNameText = grhelper.ensureNameText, //dom/crosstab expression
        enumName2Value = grhelper.enumName2Value, //dom expression
        enumValue2Name = grhelper.enumValue2Name, //dom/crosstab expression
        prototypeCopyExtend = grhelper.prototypeCopyExtend, //dom/chart/crosstab expression

        BooleanFormatter = grformat.BooleanFormatter,
        DateTimeFormatter = grformat.DateTimeFormatter,
        NumericFormatter = grformat.NumericFormatter,

        grexp = gr.exp = {},

    /////////////////////////////////////////////////////////////////////////
        FIELD_LEFT_BRECKET = "[#", //FIELD_LEFT_BRECKET
        FIELD_RIGHT_BRECKET = "#]", //FIELD_RIGHT_BRECKET
        FIELD_BRECKET_LEN = 2, //FIELD_BRECKET_LEN

        splitFunArguments = function (ParameterText) {
            var len = ParameterText.length,
                i = 0,
                begin = 0,
                ch,
                item,
                InBrecketLevel = 0,
                ExpTextItems = []


            //将参数一个个切分出来，包含在括号"()"中的部分要完整看待。（rubylong::SplitText(ParameterText, L",", ExpTextItems); //不能这样分割）
            //const wchar_t *pBegin = ParameterText;
            //const wchar_t *pCur = pBegin;
            //int InBrecketLevel = 0;
            while (i < len) {
                ch = ParameterText[i];

                if (InBrecketLevel) {
                    if (ch === ')') {
                        InBrecketLevel--;
                    }
                    else if (ch === '(') {
                        InBrecketLevel++;
                    }
                }
                else if (ch === ',') {
                    item = ParameterText.substring(begin, i);
                    if (item) {
                        ExpTextItems.push(item);
                    }
                    begin = i + 1;
                }
                else if (ch === '(') {
                    ++InBrecketLevel;
                }

                ++i;
            }
            item = ParameterText.substring(begin, i);
            if (item) {
                ExpTextItems.push(item);
            }

            return ExpTextItems;
        };

    /////////////////////////////////////////////////////////////////////////
    var Summary = grexp.Summary = function () {
    };
    Summary.prototype = {
        init: function (expText, displayFieldName) {
            var self = this;

            if (expText) {
                self.paramExp = new Expression(self.report, expText); //grexp不能提前定义
            }
            if (displayFieldName) {
                self.displayField = self.report.RunningFieldByName(displayFieldName);
            }

            //switch (self.SummaryFun) {
            //    case grenum.SummaryFun.Var:      //方差
            //    case grenum.SummaryFun.VarP:      //总体方差
            //    case grenum.SummaryFun.StdDev:      //标准偏差
            //    case grenum.SummaryFun.StdDevP:      //总体标准偏差
            //    case grenum.SummaryFun.AveDev:      //平均偏差
            //    case grenum.SummaryFun.DevSq:      //偏差平方和

            //    case grenum.SummaryFun.CountBlank:      //空值个数
            //    case grenum.SummaryFun.CountA:      //非空值个数
            //    case grenum.SummaryFun.AvgA:      //非空值平均
            //    case grenum.SummaryFun.MinN:      //第N个最小值
            //    case grenum.SummaryFun.MaxN:      //第N个最大值

            //    case grenum.SummaryFun.VarA:      //非空方差
            //    case grenum.SummaryFun.VarPA:      //非空总体方差
            //    case grenum.SummaryFun.StdDevA:      //非空标准偏差
            //    case grenum.SummaryFun.StdDevPA:      //非空总体标准偏差
            //    case grenum.SummaryFun.AveDevA:      //非空平均偏差
            //    case grenum.SummaryFun.DevSqA:      //非空偏差平方和
            //    case grenum.SummaryFun.Distinct:      //非重复值个数
            //    case grenum.SummaryFun.StrMin:      //文字最小值
            //    case grenum.SummaryFun.StrMax:      //文字最大值
            //        self.values = [];
            //        break;
            //    default:
            //        break;
            //}
        },

        getAsFloat: function () {
            var self = this;

            return self.valueField ? self.valueField.AsFloat : self.value;
        },
        getValue: function () {
            return this.getAsFloat();
        },
        setValue: function (val) {
            var self = this;

            if (self.valueField) {
                self.valueField.AsFloat = val;
            }
            else {
                self.value = val;
            }
        },
        isDateTimeValue: function () {
            var self = this;

            return self.argExp &&
                self.argExp.isSingleVariable() &&
                self.argExp.varItems[0].varField.isDateTimeValue();
        },

        beginSummaryValue: function () {
            var self = this,
                SummaryFun = self.SummaryFun;

            self.recordCount = 0;

            //累计与组累计不应该在分组开始时将初值置0
            if (SummaryFun === grenum.SummaryFun.Min || SummaryFun === grenum.SummaryFun.Max) {
                self.value = undefined;
            }
            else if (SummaryFun !== grenum.SummaryFun.SumAcc && SummaryFun !== grenum.SummaryFun.GroupSumAcc) {
                self.value = 0;
            }

            //if (self.values) {
            self.values = [];
            //}

            //if (self.displayTexts) {
            //    self.displayTexts = [];
            //}
        },
        summaryCurRecord: function () {
            var self = this,
                values = self.values,
                summaryFun = self.SummaryFun,
                paramExp = self.paramExp,
                val = paramExp ? paramExp.calculate() : 0;

            ++self.recordCount;

            switch (summaryFun) {
                case grenum.SummaryFun.Sum:
                case grenum.SummaryFun.Avg:
                case grenum.SummaryFun.SumAcc:
                case grenum.SummaryFun.GroupSumAcc:
                    //val = self.paramExp ? self.paramExp.calculate() : 0;
                    if (!isNaN(val)) {
                        self.value += val;
                    }
                    break;
                case grenum.SummaryFun.Min:
                case grenum.SummaryFun.Max:
                    //self.value 为 undefined，表示尚未求过最值
                    if (paramExp && !paramExp.isNull())  //记录非空值
                    {
                        //val = self.Calculate();
                        if (self.value === undefined) {
                            self.value = val;
                        }
                        else if ((summaryFun === grenum.SummaryFun.Max && self.value < val) ||
                            (summaryFun === grenum.SummaryFun.Min) && (self.value > val)) {
                            self.value = val;
                            if (self.displayField) {
                                self.stringValue = self.displayField.DisplayText;
                            }
                        }
                    }
                    break;
                case grenum.SummaryFun.Var:      //方差
                case grenum.SummaryFun.VarP:      //总体方差
                case grenum.SummaryFun.StdDev:      //标准偏差
                case grenum.SummaryFun.StdDevP:      //总体标准偏差
                case grenum.SummaryFun.AveDev:      //平均偏差
                case grenum.SummaryFun.DevSq:      //偏差平方和
                    values.push_back(val);
                    break;
                case grenum.SummaryFun.CountBlank:     //空值个数
                case grenum.SummaryFun.CountA:     //非空值个数
                    if (paramExp && paramExp.isNull()) { //记录下空值个数
                        self.value += 1;
                    }
                    break;
                case grenum.SummaryFun.MinN:      //第N个最小值，空值不参与计算
                case grenum.SummaryFun.MaxN:      //第N个最大值，空值不参与计算
                case grenum.SummaryFun.AvgA:      //非空值平均
                case grenum.SummaryFun.VarA:      //非空方差
                case grenum.SummaryFun.VarPA:      //非空总体方差
                case grenum.SummaryFun.StdDevA:      //非空标准偏差
                case grenum.SummaryFun.StdDevPA:      //非空总体标准偏差
                case grenum.SummaryFun.AveDevA:      //非空平均偏差
                case grenum.SummaryFun.DevSqA:      //非空偏差平方和
                    paramExp && !paramExp.isNull() && values.push(val); //记录非空值
                    break;
                case grenum.SummaryFun.Distinct:      //非重复值个数
                    paramExp && values.push(paramExp.getTextForDistinct());
                    break;
                case grenum.SummaryFun.StrMax:      //文字最大值
                case grenum.SummaryFun.StrMin:      //文字最小值
                    if (paramExp) {
                        val = paramExp.getTextForDistinct();
                        if (self.value === 0) { //self.value === 0 表示最值还没有设过
                            self.value = val;
                        }
                        else if ((summaryFun === grenum.SummaryFun.StrMax && self.value.localeCompare(val) < 0) ||
                            (summaryFun === grenum.SummaryFun.StrMin && self.value.localeCompare(val) > 0)) {
                            self.value = val;
                        }
                    }
                    break;
                    //case grenum.SummaryFun.StrMin:      //文字最小值
                    //    if (self.paramExp) {
                    //        val = self.paramExp.getTextForDistinct();
                    //        if (self.value === 0) { //self.value === 0 表示最值还没有设过
                    //            self.value = val;
                    //        }
                    //        else if (self.value.localeCompare(val) > 0) {
                    //            self.value = val;
                    //        }
                    //    }
                    //    break;
                case grenum.SummaryFun.SumAbs:      //绝对值求和
                    self.value += Math.abs(self.Calculate());
                    break;
                    //default:
                    //    ATLASSERT((grenum.SummaryFun.Count == self.SummaryFun) || (grenum.SummaryFun.GroupSumAccInSup == self.SummaryFun));
                    //    break;
            }
        },
        endSummaryValue: function () {
            var self = this,
                vlen = self.values ? self.values.length : 0;

            switch (self.SummaryFun) {
                case grenum.SummaryFun.Avg:
                    if (self.recordCount > 0) {
                        self.value /= self.recordCount;
                    }
                    else {
                        self.value = undefined;
                    }
                    break;
                case grenum.SummaryFun.Count:
                    self.value = self.recordCount;
                    break;
                case grenum.SummaryFun.Var:      //方差
                case grenum.SummaryFun.VarA:      //非空方差
                    self.value = vlen > 1 ? self.devSq() / (vlen - 1) : undefined;
                    break;
                case grenum.SummaryFun.VarP:      //总体方差
                case grenum.SummaryFun.VarPA:      //非空总体方差
                    self.value = vlen > 1 ? self.devSq() / vlen : undefined;
                    break;
                case grenum.SummaryFun.StdDev:      //标准偏差
                case grenum.SummaryFun.StdDevA:      //非空标准偏差
                    self.value = vlen > 1 ? Math.sqrt(self.devSq() / (vlen - 1)) : undefined //self.StdDev();
                    break;
                case grenum.SummaryFun.StdDevP:      //总体标准偏差
                case grenum.SummaryFun.StdDevPA:      //非空总体标准偏差
                    self.value = vlen > 1 ? Math.sqrt(self.devSq() / vlen) : undefined //self.StdDevP();
                    break;
                case grenum.SummaryFun.AveDev:      //平均偏差
                case grenum.SummaryFun.AveDevA:      //非空平均偏差
                    self.value = self.aveDev();
                    break;
                case grenum.SummaryFun.DevSq:      //偏差平方和
                case grenum.SummaryFun.DevSqA:      //非空偏差平方和
                    self.value = self.devSq();
                    break;
                case grenum.SummaryFun.MinN:      //第N个最小值
                case grenum.SummaryFun.MaxN:      //第N个最大值
                    self.values.sort(function (f, s) {
                        return f - s;
                    });
                    if (vlen < self.rankNo) {
                        return undefined;
                    }
                    self.value = self.values[(grenum.SummaryFun.MaxN === self.SummaryFun) ? vlen - self.rankNo : self.rankNo];
                    break;
                    //case grenum.SummaryFun.CountBlank:     //空值个数
                    //	//self.value = self.value;
                    //	break;
                case grenum.SummaryFun.CountA:     //非空值个数
                    self.value = self.recordCount - self.value;
                    break;
                case grenum.SummaryFun.AvgA:      //非空值平均
                    self.value = self.average();
                    break;
                case grenum.SummaryFun.Distinct:      //非重复值个数
                    self.value = self.distinct();
                    break;
                    //case grenum.SummaryFun.StrMin:      //非重复值个数
                    //case grenum.SummaryFun.StrMax:      //非重复值个数
                    //    //ATLASSERT(self.displayTexts && self.displayTexts->size() <=1);
                    //    self.stringValue = self.displayTexts[0];
                    //    if (self.stringValue === undefined)
                    //        self.stringValue = "";
                    //    break;
                    //case grenum.SummaryFun.Min:
                    //case grenum.SummaryFun.Max:
                    //	if ( self.pDisplayField )
                    //	{
                    //		//self.m_RankNo 表示最大值对应的记录号
                    //		m_SummaryInfo.m_pDetailGridRecordset->MoveTo(self.m_RankNo);
                    //		CComVariant DisplayValue;
                    //		self.pDisplayField->get_Value( &DisplayValue );

                    //		self.pValueField->put_Value( DisplayValue );
                    //	}
                    //	break;
                    //default:
                    //    //don't need do anything 
                    //    break;
            }
        },
        average: function () {
            var self = this;

            var len = self.values.length,
                total = 0;

            self.values.forEach(function (v) {
                total += v;
            });

            return len ? total / len : undefined;
        },
        aveDev: function () { //平均偏差
            var self = this,
                len = self.values.length,
                avr = average(),
                total = 0;

            self.values.forEach(function (v) {
                total += Math.abs(v - avr);
            });

            return len ? total / len : undefined;
        },
        devSq: function () { //偏差平方和
            var avr = average(),
                total = 0;

            this.values.forEach(function (v) {
                var a = v - avr;
                total += a * a;
            });

            return total;
        },
        distinct: function () { //非重复值个数
            var self = this,
                prior,
                cur,
                i = 1,
                len = self.values.length,
                count = len;

            self.values.sort(function (f, s) {
                return f.localeCompare(s);
            });

            prior = self.values[0];
            while (i < len) {
                cur = self.values[i++];
                if (prior === cur) {
                    count--;
                }
                else {
                    prior = cur;
                }
            }

            return count;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    // MemoTextSummaryFun
    var MemoTextSummaryFun = function (report, fun, argment) {
        var self = this,
            expText,
            argitems = splitFunArguments(argment),
            format = "";

        self.report = report;
        self.SummaryFun = fun;

        if (argitems.length > 0) {
            expText = argitems[0];
        }
        if (argitems.length > 1) {
            self.rankNo = parseInt(argitems[1]);
        }

        self.init(expText);

        //如果只有一个关联对象，自动应用关联对象的格式化参数
        if (self.paramExp) {
            argitems = self.paramExp.varItems;
            if (argitems.length === 1) {
                format = argitems[0].varField.object.Format;
            }
        }
        self.formater = new NumericFormatter(format);
    };
    MemoTextSummaryFun.prototype = {
        type: grenum.ExpVarType.Summary,

        getDisplayText: function () {
            var self = this;

            return self.formater.format(self.getAsFloat());
        },

        //applyFormat: function () {
        //    var self = this,
        //        obj = self.paramExp.varItems,
        //        format = "";

        //    if (obj.length === 1) {
        //        format = format[0].varField.obj.Format;
        //        //if (format) {
        //        //}
        //    }
        //    self.formater = new NumericFormatter(format);
        //},

        getExpText: function () {
            var self = this;

            return enumValue2Name(grenum.SummaryFun, self.SummaryFun) +
                "(" +
                self.paramExp ? self.paramExp.getExpText() : "" +
                self.RankNo ? "," + self.RankNo : "" +
                ")";
        },
    };
    prototypeCopyExtend(MemoTextSummaryFun, Summary);

    /////////////////////////////////////////////////////////////////////////
    //MemoTextMathFun
    var MemoTextMathFun = function (report, fun, argment) {
        var self = this,
            argItems = splitFunArguments(argment);

        self.report = report;
        self.MathFun = fun;

        self.paramExps = [];
        argItems.forEach(function (item) {
            self.paramExps.push(new Expression(report, item));
        });
    };
    MemoTextMathFun.prototype = {
        type: grenum.ExpVarType.MathFun,

        getAsFloat: function () {
            var self = this,
                MathFun = self.MathFun,
                paramExps = self.paramExps,
                paramExpLen = paramExps.length,
                ParamsOk = (paramExpLen === 1),
                p1,
                p2,
                ret = 0;

            if (MathFun === grenum.MathFun.round45
                || MathFun === grenum.MathFun.round465
                || MathFun === grenum.MathFun.pow
                || MathFun === grenum.MathFun.atan2) {
                ParamsOk = (paramExpLen == 2);
            }
            else if (MathFun === grenum.MathFun.maxArray
                || MathFun === grenum.MathFun.minArray) {
                ParamsOk = (paramExpLen > 1);
            }
            if (!ParamsOk) {
                alert("表达式中函数 '" + enumValue2Name(grenum.MathFun, MathFun) + "' 的参数未正确提供。");
                return NaN;
            }

            p1 = paramExps[0].calculate();
            p2 = (paramExpLen === 2) ? paramExps[1].calculate() : 0;
            switch (MathFun) {
                case grenum.MathFun.round45:
                    ret = grutility.NumberRound45(p1, p2);
                    break;
                case grenum.MathFun.round465:
                    ret = grutility.NumberRound465(p1, p2);
                    break;
                case grenum.MathFun.abs:
                    ret = Math.abs(p1);
                    break;
                case grenum.MathFun.acos:
                    ret = Math.acos(p1);
                    break;
                case grenum.MathFun.asin:
                    ret = Math.asin(p1);
                    break;
                case grenum.MathFun.atan:
                    ret = Math.atan(p1);
                    break;
                case grenum.MathFun.atan2:
                    ret = Math.atan2(p1, p2);
                    break;
                case grenum.MathFun.ceil:
                    ret = Math.ceil(p1);
                    break;
                case grenum.MathFun.cos:
                    ret = Math.cos(p1);
                    break;
                case grenum.MathFun.exp:
                    ret = Math.exp(p1);
                    break;
                case grenum.MathFun.floor:
                    ret = Math.floor(p1);
                    break;
                case grenum.MathFun.log:
                    ret = Math.log(p1);
                    break;
                case grenum.MathFun.maxArray:
                    ret = p1;
                    if (paramExpLen > 1) {
                        if (p1 < p2) {
                            ret = p2;
                        }

                        if (paramExpLen > 2) {
                            while (paramExpLen-- > 2) {
                                p1 = paramExps[paramExpLen].calculate();
                                if (ret < p1) {
                                    ret = p1;
                                }
                            }
                        }
                    }
                    break;
                case grenum.MathFun.minArray:
                    ret = p1;
                    if (paramExpLen > 1) {
                        if (p1 > p2) {
                            ret = p2;
                        }

                        if (paramExpLen > 2) {
                            while (paramExpLen-- > 2) {
                                p1 = paramExps[paramExpLen].calculate();
                                if (ret > p1) {
                                    ret = p1;
                                }
                            }
                        }
                    }
                    break;
                case grenum.MathFun.pow:
                    ret = Math.pow(p1, p2);
                    break;
                case grenum.MathFun.round:
                    ret = Math.round(p1);
                    break;
                case grenum.MathFun.sin:
                    ret = Math.sin(p1);
                    break;
                case grenum.MathFun.sqrt:
                    ret = Math.sqrt(p1);
                    break;
                case grenum.MathFun.tan:
                    ret = Math.tan(p1);
                    break;
            }

            return ret;
        },
        getValue: function () {
            var self = this,
                valueField = self.valueField;

            return valueField ? valueField.AsFloat : self.getAsFloat();
        },
        getDisplayText: function () {
            var self = this,
                valueField = self.valueField;

            return valueField ? valueField.DisplayText : self.getAsFloat() + "";
        },
        getExpText: function () {
            var self = this,
                paramExps = self.paramExps,
                paramExpLen = paramExps.length,
                i = 0,
                Text = enumValue2Name(grenum.MathFun, self.MathFun) + "(";

            while (i < paramExpLen) {
                if (i > 0) {
                    Text += ",";
                }
                Text += paramExps[i].getExpText();
            }
            Text += ")";
            return Text;
        },
        isDateTimeValue: function () {
            return 0;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //MemoTextSystemVar
    var MemoTextSystemVar = function (report, argment) {
        var self = this,
            argitems = argment.split(',');

        self.var = enumName2Value(grenum.SystemVarType, argitems[0]);
        (argitems.length > 1) && (self.groupIndex = parseInt(argitems[1]));
        self.report = report;
    };
    MemoTextSystemVar.prototype = {
        type: grenum.ExpVarType.SystemVar,

        getAsFloat: function () {
            var self = this;

            return self.report.SystemVarValue2(self.var, self.groupIndex);
        },

        getValue: function () {
            return this.getAsFloat();
        },

        getDisplayText: function () {
            var self = this;
                return self.var > 0? self.getAsFloat() + "" : "";
        },

        getExpText: function () {
            var self = this;

            return "SystemVar(" +
                enumValue2Name(grenum.SystemVarType, self.var) +
                self.groupIndex ? "," + self.groupIndex : "" +
                ")";
        },

        isDateTimeValue: function () {
            return this.var === grenum.SystemVarType.CurrentDateTime;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //MemoTextParameter
    var MemoTextParameter = function (object) {
        this.oParameter = object; //oParameter 与 StaticBox.oParameter 保持名称一致
    };
    MemoTextParameter.prototype = {
        type: grenum.ExpVarType.Parameter,

        getAsFloat: function () {
            return this.oParameter.AsFloat;
        },
        getValue: function () {
            return this.oParameter.Value;
        },
        getDisplayText: function () {
            var self = this;

            return self.valueField ? self.valueField.DisplayText : self.oParameter.DisplayText;
        },
        getExpText: function () {
            return ensureNameText(this.oParameter.Name);
        },
        isDateTimeValue: function () {
            return this.oParameter.DataType === grenum.ParameterDataType.DateTime;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //MemoTextField
    var MemoTextField = function (object) {
        this.object = object;
    };
    MemoTextField.prototype = {
        type: grenum.ExpVarType.RecordsetField,

        getAsFloat: function () {
            return this.object.AsFloat;
        },
        getValue: function () {
            return this.object.Value;
        },
        getDisplayText: function () {
            return this.object.DisplayText;
        },
        getExpText: function () {
            return ensureNameText(this.object.Name);
        },
        isDateTimeValue: function () {
            return this.object.FieldType === grenum.FieldType.DateTime;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //textControl
    var MemoTextTextControl = function (object) {
        this.object = object;
    };
    MemoTextTextControl.prototype = {
        type: grenum.ExpVarType.TextControl,

        getAsFloat: function () {
            return parseFloat(this.object.DisplayText);
        },
        getValue: function () {
            return this.getDisplayText();
        },
        getDisplayText: function () {
            return this.object.DisplayText;
        },

        getExpText: function () {
            return ensureNameText(this.object.Name);
        },

        isDateTimeValue: function () {
            return 0;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //VarItem
    var VarItem = function (varField, beginIndex, endIndex) {
        var self = this;

        self.varField = varField;
        self.beginIndex = beginIndex;
        self.endIndex = endIndex;
    };

    /////////////////////////////////////////////////////////////////////////
    //派生关系
    //ExpressionBase
    // |--Expression(统计函数的表达式) 
    // |--TextExpression
    //      |--MemoTextExpression
    //      |--ChartTextExpression
    //owner 为两种类型：Report 或 TextBuilder 对象。如果为 TextBuilder 对象，则是图表中的表达式
    var ExpressionBase = function (owner, expText) {
        var self = this,

            index,
            indexBegin,
            indexEnd,
            indexArgmentBegin,
            len,
            curChar,
            chars,
            name,     //解析出来的动态域名称
            argment,  //解析出来的动态域参数 
            varField,
            leftBracketCount,
            valid = true,

            //???...是否应该全程常数化???
            reBlank = /\s/,
            reNumeric = /[\d.]/,
            reOperator = /[()+-/%*]/,
            reSeperator = /[()+-/%*\s]/; //( ) + - / % * 及空白字符(空格、换行等)

        function skipBlankChar() {
            curChar = chars[index];
            while (reBlank.test(curChar)) {
                curChar = chars[++index];
            }
        };
        function extractBracketName(lbracket, rbracket) {
            var ret = (curChar === lbracket);
            if (ret) {
                index = expText.indexOf(rbracket, indexBegin);
                if (index === -1) {
                    valid = false;
                }
                else {
                    name = expText.substring(indexBegin + 1, index);
                    indexEnd = ++index;
                }
            }
            return ret;
        };

        //expText = expText.replace(/\s/g, ""); //去掉中间的空白字符
        chars = expText.split('');
        len = chars.length;

        self.expText = expText;
        self.varItems = [];

        //分解出函数与变量  //1+[Address]*MaxN(City,3)+SystemVar(GroupPageCount,1)+({Parameter1}-Sum(Address%2))
        index = 0;
        while ((index < len) && valid) {
            skipBlankChar();

            //两个正则表达式合并???
            if (reOperator.test(curChar) || reNumeric.test(curChar)) {
                index++;
            }
            else {
                indexBegin = index;

                if (extractBracketName('{', '}')) {
                    varField = self.decodeVariable(owner, name, 1);
                }
                else {
                    if (!extractBracketName('[', ']')) {
                        while ((index < len) && !reSeperator.test(chars[index])) {
                            index++;
                        };
                        indexEnd = index;
                        name = expText.substring(indexBegin, indexEnd);
                        if (!name) {
                            continue;
                        }
                    }

                    skipBlankChar();

                    //If '(', is a function, else is a variable
                    if (curChar === '(') {
                        indexArgmentBegin = ++index;
                        leftBracketCount = 1; //这里表示左括号个数
                        while (index < len) {
                            curChar = chars[index++];
                            if (curChar === ')') {
                                leftBracketCount--;
                                if (leftBracketCount <= 0) {
                                    break;
                                }
                            }
                            else if (curChar === '(') {
                                leftBracketCount++;
                            }
                        }
                        argment = expText.substring(indexArgmentBegin, index - 1);
                        indexEnd = index;

                        varField = self.decodeFunction(owner, name, argment);
                    }
                    else {
                        varField = self.decodeVariable(owner, name, 0);
                    }
                }

                if (varField) {
                    self.varItems.push(new VarItem(varField, indexBegin, indexEnd));
                }
                else {
                    valid = false;
                }
            }
        }

        self.valid = valid;
    };
    ExpressionBase.prototype = {
        calculate: function () {
            var self = this,
                begin = 0,
                realizedexp = "", //realizedexp = "value=",
                value = NaN;

            if (self.valid) {
                //首先将可变数据域替换为实际值，倒序替换值
                self.varItems.forEach(function (item) {
                    if (begin < item.beginIndex) {
                        realizedexp += self.expText.substring(begin, item.beginIndex);
                    }
                    begin = item.endIndex;

                    realizedexp += item.varField.getAsFloat() + "";
                });
                realizedexp += self.expText.substr(begin);

                //eval 造成 Uglifyjs 压缩代码部分失效
                //eval(realizedexp);
                value = gr.script.calcExp(realizedexp);

                if (value >= Number.POSITIVE_INFINITY || value <= Number.NEGATIVE_INFINITY) {
                    value = NaN;
                }
            }

            return value;
        },

        isSingleVariable: function () {
            var self = this;

            return (self.varItems.length === 1) && (self.varItems[0].beginIndex === 0) && (self.varItems[0].endIndex === self.expText.length);
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //Expression
    var Expression = function (report, expText) {
        ExpressionBase.call(this, report, expText);
    };
    Expression.prototype = {
        decodeVariable: function (report, name, bigBrecketed) {
            var object,
                varField = undefined;

            if (bigBrecketed) {
                if (object = report.ParameterByName(name)) {
                    varField = new MemoTextParameter(object);
                }
            }
            else {
                if (object = report.RunningFieldByName(name)) {
                    varField = new MemoTextField(object);
                }
                else if (object = report.ParameterByName(name)) {
                    varField = new MemoTextParameter(object);
                }
                else if (object = report.ControlByName(name)) {
                    //if (object.ControlType) { ???...
                    varField = new MemoTextTextControl(object);
                    //}
                }
            }

            return varField;
        },

        decodeFunction: function (report, name, argment) {
            var fun = enumName2Value(grenum.SummaryFun, name),
                varField;

            if (fun >= 0) {
                varField = new MemoTextSummaryFun(report, fun, argment);
            }
            else if (name === "SystemVar") {
                varField = new MemoTextSystemVar(report, argment);
                //2020/04/01 changed: var < 0也要加入，让含有页数与页号的系统变量显示为空，而不是显示为原始定义函数,
                //if (varField.var < 0) {
                //    varField = undefined;
                //}
            }
            else {
                fun = enumName2Value(grenum.MathFun, name);
                if (fun >= 0) {
                    varField = new MemoTextMathFun(report, fun, argment);
                }
            }

            return varField;
        },

        getExpText: function () {
            var self = this,
                begin = 0,
                text = "";

            self.varItems.forEach(function (item) {
                if (begin < item.beginIndex) {
                    text += self.expText.substring(begin, item.beginIndex);
                }
                begin = item.endIndex;

                text += item.varField.getExpText();
            });
            text += self.expText.substr(begin);

            return text;
        },

        getTextForDistinct: function () {
            var self = this;

            if (self.isSingleVariable()) {
                return self.varItems[0].varField.getDisplayText();
            }
            else {
                return self.calculate() + "";
            }
        },

        isNull: function () {
            return this.varItems.some(function (item) {
                return item.IsNull;
            });
        },
    };
    prototypeCopyExtend(Expression, ExpressionBase);

    /////////////////////////////////////////////////////////////////////////
    //TextExpression
    var TextExpression = function (owner, expText) {
        var self = this,
            index,
            index1,
            startIndex = 0,
            useDateTimeFormat,
            formatText = "";

        //处于[]之间的:不能作为格式的区别符号对待,如[#[子表:数量]#]，但也要注意日期时间格式中的“:”，如：yyyy年MM月dd日 HH:mm:ss
        //查找冒号之前是否有“[”，查找冒号之后是否有“]”，如果都有，说明是一个数据域中的冒号，而不是表达式与格式之间的分隔冒号
        index = expText.indexOf(':');
        while (index >= 0) {
            index1 = expText.indexOf('[', startIndex);
            if ((index1 === -1) || (index1 > index)) {
                break;
            }

            index1 = expText.indexOf(']', index);
            if (index1 === -1) {
                break;
            }

            startIndex = index1 + 1;
            index = expText.indexOf(':', startIndex);
        }
        if (index >= 0) {
            //self.format记录下来，为后面的交叉表所用 field.Format = self.originObject.textBuilder.items[0].format;
            formatText = self.format = expText.substr(index + 1);
            expText = expText.substr(0, index);
        }

        ExpressionBase.call(self, owner, expText); //call base class constractor

        //如果formatText为空，从关联的数据域中直接取显示文字
        if (formatText || !self.isSingleVariable()) {
            useDateTimeFormat = self.isSingleVariable() && self.varItems[0].varField.isDateTimeValue();
            if (!useDateTimeFormat && formatText) {
                //根据格式串中的字符自动判断格式类型
                //如果出现 0 # $ e 之一只要一出现则认为是数字类型，其后如出现y M d t h H m s 则认为是日期类型，否则还是数字类型
                useDateTimeFormat = /[yMdthHms]/.test(formatText) && !/[0#e$]/.test(formatText); //应用正则表达式判断,还不知道一个正则表达式如何写
            }
            self.formater = useDateTimeFormat ? new DateTimeFormatter(formatText) : new NumericFormatter(formatText);
        }
    };
    TextExpression.prototype = {
        getDisplayText: function () {
            var self = this,
                val;

            function invalidMsg(obj) {
                return "\"" + obj.expText + "\" 不是有效的运算表达式";
            };

            if (!self.valid) {
                return invalidMsg(this);
            }

            if (self.formater) {
                if (self.isSingleVariable()) {
                    val = self.varItems[0].varField.getValue();
                }
                else {
                    val = self.calculate();
                    //if (isNaN(val)) {
                    //    return invalidMsg(this);
                    //}
                }
                return self.formater.format(val);
            }
            else {
                return self.varItems[0].varField.getDisplayText(); //是单一数据域且未设置格式, 从关联的数据域中直接取显示文字
            }
        },
    };
    prototypeCopyExtend(TextExpression, ExpressionBase);

    /////////////////////////////////////////////////////////////////////////
    //MemoTextExpression
    var MemoTextExpression = function (report, expText) {
        TextExpression.call(this, report, expText);
    };
    MemoTextExpression.prototype = {
        decodeVariable: Expression.prototype.decodeVariable,

        decodeFunction: Expression.prototype.decodeFunction,

        isPureNumeric: function () {
            var self = this;

            return NumericFormatter.prototype.isPrototypeOf(self.formater) ||
                (self.isSingleVariable() && !self.varItems[0].varField.isDateTimeValue());
        },
    };
    prototypeCopyExtend(MemoTextExpression, TextExpression);

    /////////////////////////////////////////////////////////////////////////
    //ChartParameter
    var ChartParameter = function (object) {
        this.oParameter = object; //oParameter 与 StaticBox.oParameter 保持名称一致
    };
    ChartParameter.prototype = {
        getAsFloat: function () {
            return this.oParameter.AsFloat;
        },
        getValue: function () {
            return this.oParameter.Value;
        },
        getDisplayText: function () {
            return this.oParameter.DisplayText;
        },
        isDateTimeValue: function () {
            return this.oParameter.DataType === grenum.ParameterDataType.DateTime;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //ChartVarFun
    var ChartVarFun = function (textBuilder, varType) {
        var self = this;

        self.textBuilder = textBuilder;
        self.varType = varType;
    };
    ChartVarFun.prototype = {
        getAsFloat: function () {
            var self = this,
                textBuilder = self.textBuilder,
                chart = textBuilder.chart,
                seriesIndex = textBuilder.seriesIndex,
                groupIndex = textBuilder.groupIndex,
                val;
            //ATLASSERT(0<=m_SeriesIndex && m_SeriesIndex<chart.GetSeriesCount());
            //ATLASSERT(0<=m_GroupIndex && ((!chart.IsScatterGraph() && m_GroupIndex<chart.GetGroupCount()) 
            //    || (chart.IsScatterGraph() && m_GroupIndex<chart.RequestDrawXYZValueCount(m_SeriesIndex))) );
            //grenum.ChartVarType.SeriesLabel, grenum.ChartVarType.GroupLabel: 这两项无数据值

            function findGraphBySeries() {
                //ATLASSERT( pSeries );
                var i,
                    graphs = chart.graphs,
                    len = graphs.length,
                    graph;

                for (i = 0; i < len; i++) {
                    graph = graphs[i];
                    if (graph.some(function (theSeriesIndex) {
                        return theSeriesIndex === seriesIndex;
                    })) {
                        break;
                    }
                }

                return graph;
            };

            if (chart.IsScatterGraph()) {
                val = chart.Value(seriesIndex, groupIndex);
                switch (self.varType) {
                    case grenum.ChartVarType.XVal:
                        val = val.x;
                        break;
                    case grenum.ChartVarType.YVal:
                        val = val.y;
                        break;
                    case grenum.ChartVarType.ZVal:
                        val = val.z;
                        break;
                    case grenum.ChartVarType.YVal100BySeries:
                        val = val.z / chart.GetSeriesTotalValue(seriesIndex);
                        break;
                    case grenum.ChartVarType.YValTotalBySeries:
                        val = chart.GetSeriesTotalValue(seriesIndex);
                        break;
                        //default: //grenum.ChartVarType.YVal100ByGroup grenum.ChartVarType.YValTotalByGroup //散列点图形无组簇的概念，无此项数据.
                        //    break;
                }
            }
            else {
                val = chart.Value(seriesIndex, groupIndex);
                switch (self.varType) {
                    //case grenum.ChartVarType.YVal:
                    //    break;
                    case grenum.ChartVarType.YVal100ByGroup:
                        val /= chart.GetGroupTotalValue(findGraphBySeries(), groupIndex);
                        break;
                    case grenum.ChartVarType.YValTotalByGroup:
                        val = chart.GetGroupTotalValue(findGraphBySeries(), groupIndex);
                        break;
                    case grenum.ChartVarType.YVal100BySeries:
                        val /= chart.GetSeriesTotalValue(seriesIndex);
                        break;
                    case grenum.ChartVarType.YValTotalBySeries:
                        Val = chart.GetSeriesTotalValue(seriesIndex);
                        break;
                        //default: //grenum.ChartVarType.XVal grenum.ChartVarType.ZVal
                        //    Val =  0; 
                        //    break;
                }
            }

            return val;
        },
        getValue: function () {
            return this.getAsFloat();
        },

        getDisplayText: function () {
            var self = this,
                varType = self.varType,
                textBuilder = self.textBuilder,
                seriesIndex = textBuilder.seriesIndex,
                groupIndex = textBuilder.groupIndex,
                chart = textBuilder.chart,
                IsScatter = chart.IsScatterGraph(),
                series = chart.graphSerieses[seriesIndex],
                val = self.getAsFloat(),
                DataType = 0;

            //变量分类类型说明：
            //0: 表示无此类型显示文字，返回空串
            //1: 表示X轴对应值
            //2: 表示Y轴对应值
            //3: 表示Z值
            //4: 表示序列标签或组簇标签文字
            //5: 表示百分比值，格式化为默认百分比形式

            if (IsScatter) {
                switch (varType) {
                    case grenum.ChartVarType.XVal:
                        DataType = 1;
                        break;
                    case grenum.ChartVarType.YVal:
                        DataType = 2;
                        break;
                    case grenum.ChartVarType.ZVal:
                    case grenum.ChartVarType.YValTotalBySeries:
                        DataType = 3;
                        break;
                    case grenum.ChartVarType.YVal100BySeries:
                        DataType = 5;
                        break;
                    case grenum.ChartVarType.SeriesLabel:
                        DataType = 4;
                        break;
                    default: //grenum.ChartVarType.YVal100ByGroup grenum.ChartVarType.YValTotalByGroup grenum.ChartVarType.GroupLabel：散列点图形无组簇的概念，无此项数据.
                        break;
                }
            }
            else {
                switch (varType) {
                    case grenum.ChartVarType.XVal:
                    case grenum.ChartVarType.SeriesLabel:
                    case grenum.ChartVarType.GroupLabel:
                        DataType = 4;
                        break;
                    case grenum.ChartVarType.YVal:
                    case grenum.ChartVarType.YValTotalByGroup:
                    case grenum.ChartVarType.YValTotalBySeries:
                        DataType = 2;
                        break;
                    case grenum.ChartVarType.YVal100ByGroup:
                    case grenum.ChartVarType.YVal100BySeries:
                        DataType = 5;
                        break;
                    default: //grenum.ChartVarType.ZVal
                        break;
                }
            }

            switch (DataType) {
                case 1: //X
                    val = chart.XAxis.ScaleFormatParser.format(val); //ATLASSERT( IsScatter );
                case 2: //Y
                    val = IsScatter ? chart.YAxisOfSeries(series).ScaleFormatParser.format(val) : series.ValueFormatParser.format(val);
                    break;
                case 3: //Z
                    val = series.ValueFormatParser.format(val);
                    break;
                case 4: //标签文字
                    val = grenum.ChartVarType.SeriesLabel === varType ? chart.SeriesLabel(seriesIndex) : chart.GroupLabel(groupIndex);
                    break;
                case 5: //%
                    val = grutility.NumberFormat(val, "0.00%");
                    break;
                default: //0 无此类型显示文字
                    break;
            }

            return val;
        },
        isDateTimeValue: function () {
            return 0;
        },
    };

    /////////////////////////////////////////////////////////////////////////
    //ChartTextExpression
    var ChartTextExpression = function (textBuilder, expText) {
        TextExpression.call(this, textBuilder, expText);
    };
    ChartTextExpression.prototype = {
        decodeVariable: function (textBuilder, name, bigBrecketed) {
            var object = textBuilder.chart.report.ParameterByName(name);

            return object ? new ChartParameter(object) : undefined;
        },
        decodeFunction: function (textBuilder, name, argment) {
            var varField;

            if (name.toLowerCase() === "chartvar") {
                argment = enumName2Value(grenum.ChartVarType, argment);
                if (argment > 0) {
                    varField = new ChartVarFun(textBuilder, argment);
                }
            }

            return varField;
        },
    };
    prototypeCopyExtend(ChartTextExpression, TextExpression);

    /////////////////////////////////////////////////////////////////////////
    //FixedText
    var FixedText = function (text) {
        this.text = text;
    };
    FixedText.prototype = {
        getDisplayText: function () {
            return this.text;
        }
    }

    /////////////////////////////////////////////////////////////////////////
    //TextBuilder
    var TextBuilder = grexp.TextBuilder = function (owner, rawText) { //owner为 Report 或 Chart 对象
        var self = this,
            expressionType = owner.XAxis ? ChartTextExpression : MemoTextExpression,
            preIndex = 0,
            beginIndex = 0,
            endIndex = 0,
            expression;

        self.items = [];
        if (owner.XAxis) {
            self.chart = owner;
            owner = this; //图表中的表达式，以 TextBuilder 作为 owner 参数
        }

        while ((beginIndex = rawText.indexOf(FIELD_LEFT_BRECKET, endIndex)) >= 0) {
            endIndex = rawText.indexOf(FIELD_RIGHT_BRECKET, beginIndex + FIELD_BRECKET_LEN);
            if (endIndex >= 0) {
                expression = new expressionType(owner, rawText.substring(beginIndex + FIELD_BRECKET_LEN, endIndex));

                endIndex += FIELD_BRECKET_LEN;

                if (expression.valid) {
                    (preIndex < beginIndex) && self.items.push(new FixedText(rawText.substring(preIndex, beginIndex)));
                    preIndex = endIndex;

                    self.items.push(expression);
                }

                beginIndex = endIndex;
            }
        }
        (preIndex < rawText.length) && self.items.push(new FixedText(rawText.substr(preIndex)));
    };
    TextBuilder.prototype = {
        forEach: function (callback) {
            this.items.forEach(callback);
        },

        generateDisplayText: function () {
            var self = this,
                items = self.items,
                item,
                varItems,
                varField,
                i = 0,
                j,
                len = items.length,
                len2,
                ret = "";

            //this.forEach(function (item) {
            //    ret += item.getDisplayText();
            //});
            while (i < len) {
                item = items[i++];

                //如果包含页号与页数系统变量，整个综合文字的显示文字为空。
                //页号与页数系统变量会让MemoTextSystemVar对象的var属性小于0
                varItems = item.varItems;
                if (varItems) {
                    len2 = varItems.length;
                    for (j = 0; j < len2; ++j) {
                        varField = varItems[j].varField;
                        if (varField.type === grenum.ExpVarType.SystemVar && varField.var < 0) {
                            return "";
                        }
                    }
                }

                ret += item.getDisplayText();
            }

            return ret;
        },

        generateChartDisplayText: function (seriesIndex, groupIndex) {
            var self = this;

            self.seriesIndex = seriesIndex;
            self.groupIndex = groupIndex;
            return self.generateDisplayText();
        },

        isStaticText: function () {
            var self = this;

            return (self.items.length == 1) && FixedText.prototype.isPrototypeOf(self.items[0]);
        },
    };
})();
//{{END CODE}}