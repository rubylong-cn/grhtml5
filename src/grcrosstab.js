var gr = gr || {};

(function (undefined) {
    "use strict";

    var grenum = gr.enum_;

    var grhelper = gr.helper,
        grcommon = gr.common,
        grexp = gr.exp,

        DateTime = grcommon.DateTime, //dom/crosstab format

        Summary = grexp.Summary, //dom
        TextBuilder = grexp.TextBuilder,

        enumMemberValid = grhelper.enumMemberValid, //dom/chart/crosstab

        intFixed = grhelper.intFixed, //dom/crosstab format

        cloneDate = grhelper.cloneDate, //dom/crosstab
        strimDate = grhelper.strimDate, //dom/crosstab
        incDate = grhelper.incDate, //dom/crosstab
        incDate2 = grhelper.incDate2, //dom/crosstab

        ensureNameText = grhelper.ensureNameText, //dom/crosstab expression

        enumValue2Name = grhelper.enumValue2Name, //dom/crosstab expression

        prototypeCopyExtend = grhelper.prototypeCopyExtend, //dom/chart/crosstab expression

        createArray = grhelper.createArray, //dom/chart/crosstab
        assignObjectEx = grhelper.assignObjectEx, //dom/crosstab
        assignObjectAtom = grhelper.assignObjectAtom, //dom/crosstab

        dom = gr.dom,
        Object = dom.Object,
        DetailGrid = dom.DetailGrid,
        FieldBox = dom.FieldBox;

    //{{BEGIN CODE}}
    //交叉表程序模块
    var csz_HTotal_Suffix = "",             //不加后缀，让合计列名称与原始保持一致，以便对齐列可用
        csz_HAverage_Suffix = "_hta",
        csz_HAverageA_Suffix = "_htaa",
        csz_HCount_Suffix = "_htc",
        csz_HCountA_Suffix = "_htca",
        csz_HMin_Suffix = "_htn",
        csz_HMax_Suffix = "_htx",

        csz_HPercent_Suffix = "_hp",
        csz_VPercent_Suffix = "_vp",

        csz_HTotalPercent_Suffix = "_htp",
        csz_VTotalPercent_Suffix = "_vtp";

    function CrossSummaryGetFieldSuffix(SummaryFun) {
        switch (SummaryFun) {
            case grenum.SummaryFun.Avg:
                return csz_HAverage_Suffix;
            case grenum.SummaryFun.AvgA:
                return csz_HAverageA_Suffix;
            case grenum.SummaryFun.Count:
                return csz_HCount_Suffix;
            case grenum.SummaryFun.CountA:
                return csz_HCountA_Suffix;
            case grenum.SummaryFun.Min:
                return csz_HMin_Suffix;
            case grenum.SummaryFun.Max:
                return csz_HMax_Suffix;
        }

        return ""; //undefined;
    }

    var HSummaryFlag = function () {
        this.Flag = 0;
    };
    HSummaryFlag.prototype = {
        get CalcHTotal() {
            return this.Flag & 0x1;
        },
        set CalcHTotal(val) {
            var self = this;

            val ? self.Flag |= 0x1 : self.Flag &= ~0x1;
        },

        get CalcHAverage() {
            return this.Flag & 0x2;
        },
        set CalcHAverage(val) {
            var self = this;

            val ? self.Flag |= 0x2 : self.Flag &= ~0x2;
        },

        get CalcHAverageA() {
            return this.Flag & 0x4;
        },
        set CalcHAverageA(val) {
            var self = this;

            val ? self.Flag |= 0x4 : self.Flag &= ~0x4;
        },

        get CalcHCount() {
            return this.Flag & 0x8;
        },
        set CalcHCount(val) {
            var self = this;

            val ? self.Flag |= 0x8 : self.Flag &= ~0x8;
        },

        get CalcHCountA() {
            return this.Flag & 0x10;
        },
        set CalcHCountA(val) {
            var self = this;

            val ? self.Flag |= 0x10 : self.Flag &= ~0x10;
        },

        get CalcHMin() {
            return this.Flag & 0x20;
        },
        set CalcHMin(val) {
            var self = this;

            val ? self.Flag |= 0x20 : self.Flag &= ~0x20;
        },

        get CalcHMax() {
            return self.Flag & 0x40;
        },
        set CalcHMax(val) {
            var self = this;

            val ? self.Flag |= 0x40 : self.Flag &= ~0x40;
        },

        onBySummaryFun: function (summaryFun) {
            var self = this;

            self.CalcHTotal = true; //其它统计都要求先求和

            if (summaryFun === grenum.SummaryFun.Avg) {
                self.CalcHAverage = true;
            }
            else if (summaryFun === grenum.SummaryFun.AvgA) {
                self.CalcHAverageA = true;
            }
            else if (summaryFun === grenum.SummaryFun.Count) {
                self.CalcHCount = true;
            }
            else if (summaryFun === grenum.SummaryFun.CountA) {
                self.CalcHCountA = true;
            }
            else if (summaryFun === grenum.SummaryFun.Min) {
                self.CalcHMin = true;
            }
            else if (summaryFun === grenum.SummaryFun.Max) {
                self.CalcHMax = true;
            }
        },
    };

    var DataFieldInfo = function (other) {
        var self = this;

        self.originObject = undefined; //关联原网格的一个字段或一个部件框

        self.HTotalFlag = new HSummaryFlag();    //通过位指定合计中的统计方式
        self.HSubtotalFlag = new HSummaryFlag(); //通过位指定小计中的统计方式
        self.MiscFlag = 0;                       //通过位指定各种杂项标记

        self.DatafieldIndex = -1;   //指定数据字段在交叉数据组中的序号
        self.TotalValue = 0;     //存储当前记录横向求和计算过程中的求和值
        self.EntireTotalValue = 0; //存储总和值

        other && assignObjectEx(self, other, 0);
    };
    DataFieldInfo.prototype = {
        CopyAddField: function (crossRecordset, FieldName) {
            var self = this,
                field = crossRecordset.Fields.Add();

            if (self.originObject.FieldType) {
                field.assign(self.originObject);

                //如果为数字类型，则交叉这里始终设为小数类型，如原始字段为整数类型，保持交叉统计字段为整数类型就会丢失数据精度
                //其它非数字类型的字段必须保持类型不变
                if (self.originObject.isNumeric()) {
                    field.FieldType = grenum.FieldType.Float;
                }
            }
            else if (self.NumericField) {
                //ATLASSERT 此时 self.originObject 必定为一个综合文字框
                field.FieldType = grenum.FieldType.Float;
                field.Format = self.originObject.textBuilder.items[0].format;
            }

            field.Name = FieldName;
            field.DBFieldName = "";
            field._tableMember = FieldName; //2018/03/05 new added，保证字段Name与DBFieldName不一致时也能同步交叉，见 Field 的 Name 属性代码

            return field;
        },

        CombineCalcFlag: function (other) {
            var self = this;

            self.HTotalFlag.Flag |= other.HTotalFlag.Flag;
            self.HSubtotalFlag.Flag |= other.HSubtotalFlag.Flag;
            self.MiscFlag |= other.MiscFlag;
        },

        SetFlagBySummaryFun: function (SummaryFun, ColumnKind) {
            var self = this;

            if (ColumnKind === grenum.CrossColumnKind.SubTotal) {
                self.HSubtotalFlag.onBySummaryFun(SummaryFun);
            }
            else {
                self.HTotalFlag.onBySummaryFun(SummaryFun);
            }
        },

        get CalcHPercent() {
            return this.MiscFlag & 0x1;
        },
        set CalcHPercent(val) {
            var self = this;

            val ? self.MiscFlag |= 0x1 : self.MiscFlag &= ~0x1;
        },

        get CalcVPercent() {
            return this.MiscFlag & 0x2;
        },
        set CalcVPercent(val) {
            var self = this;

            val ? self.MiscFlag |= 0x2 : self.MiscFlag &= ~0x2;
        },

        get CalcTotalHPercent() {
            return this.MiscFlag & 0x4;
        },
        set CalcTotalHPercent(val) {
            var self = this;

            val ? self.MiscFlag |= 0x4 : self.MiscFlag &= ~0x4;
        },

        get CalcTotalVPercent() {
            return this.MiscFlag & 0x8;
        },
        set CalcTotalVPercent(val) {
            var self = this;

            val ? self.MiscFlag |= 0x8 : self.MiscFlag &= ~0x8;
        },

        get CalcHTotalExclude() {
            return this.MiscFlag & 0x10;
        },
        set CalcHTotalExclude(val) {
            var self = this;

            val ? self.MiscFlag |= 0x10 : self.MiscFlag &= ~0x10;
        },

        get NumericField() {
            return this.MiscFlag & 0x20;
        },
        set NumericField(val) {
            var self = this;

            val ? self.MiscFlag |= 0x20 : self.MiscFlag &= ~0x20;
        },
    };

    var HPercentSum = function (group, dataFieldInfo) {
        var self = this;

        self.Group = group;
        self.DataFieldInfo = dataFieldInfo;
        //self.TotalSumBox = undefined;
        self.DataSumBoxes = [];
    };

    var DynamicTitleCellInfo = function (originTextBox) {
        var self = this;

        self.PriorCrossTitleCell = undefined;
        self.OriginTextBox = originTextBox;
        self.PriorTitleText = "";
    };

    var CrossTab = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.HCrossFields = "";
        self.VCrossFields = "";
        self.ListCols = 1;
        self.TotalCols = 0;
        self.SubtotalCols = 0;
        self.HResort = true;
        self.HSortAsc = true;
        self.VResort = true;
        self.VSortAsc = true;

        self.HTotalAtFirst = false;
        self.HPercentColumns = "";
        self.VPercentColumns = "";
        self.TotalExcludeColumns = "";
        self.TotalHPercentColumns = "";
        self.TotalVPercentColumns = "";
        self.DisabledSumFields = "";
        self.PercentFormat = "0.##%";

        self.HCrossPeriodType = grenum.PeriodType.None;
        self.BeginDateParameter = "";
        self.EndDateParameter = "";

        self.GroupAutoSum = true;
    };
    CrossTab.prototype = {
        loadFromJSON: function (objJson) {
            var self = this;

            if (objJson) {
                Object.prototype.loadFromJSON.call(self, objJson);

                enumMemberValid(self, "HCrossPeriodType", grenum.PeriodType);
            }
        },

        prepare: function () {
            var self = this,
                i,
                report = self.report,
                isCalendarReport = self.HCrossPeriodType === grenum.PeriodType.Calendar,

                crossGrid = new DetailGrid(report),
                crossRecordset = crossGrid.Recordset,
                crossTitleCells = crossGrid.ColumnTitle.TitleCells,
                crossColumns = crossGrid.Columns,
                crossGroupItems,

                originGrid = self.owner,
                originRecordset = originGrid.Recordset,
                originColumns = originGrid.Columns,
                originGroupItems = originGrid.Groups.items,
                originTitleCellItems = originGrid.ColumnTitle.TitleCells.items,

                oHCrossFields = [],
                oVCrossFields = [],

	            CrossDataFieldCount,	//每个交叉项的数据字段个数，包括计算字段
                CrossItemCount = 0,     //交叉项数
                DataFieldInfos = [], //交叉数据项信息，字段成员关联原始网格的
                ListFieldsPair = [],  //原始记录集与交叉记录集之间字段的对应关系，仅对非交叉数据项

                CrossDataFieldObjects = [],	//关联交叉网格的，存储所有交叉数据字段
                CrossHCrossFieldObjects = [], //关联交叉网格的，存储所有横向交叉数据字段
                SubtotalCrossItemEndIndexs = [],//记录每个横向交叉小计项对应的结束交叉项	
                SubtotalFieldObjects = [];	    //关联交叉网格的，存储所有交叉小计数据字段

            function prepareDateRange() {
                var BeginDateParameter = report.ParameterByName(self.BeginDateParameter),
                    EndDateParameter = report.ParameterByName(self.EndDateParameter),
                    range = {};

                if (BeginDateParameter) {
                    range.begin = BeginDateParameter.AsDateTime;
                }
                if (EndDateParameter) {
                    range.end = EndDateParameter.AsDateTime;
                    if (!BeginDateParameter) {
                        range.begin = cloneDate(range.end);
                    }
                }
                else {
                    range.end = cloneDate(range.begin);
                }
                if (range.end < range.begin) {
                    BeginDateParameter = range.begin;
                    range.begin = range.end;
                    range.end = BeginDateParameter;
                }
                return range;
            };

            function CrossTabDefineGrid() {
                var csz_CalendarMonthFieldName = "_Month_",
                    csz_CalendarDateFieldName = "_Date_",

                    TotalFieldCount,
                    recordIndexes, //记录排序后的记录序号，不改变原记录集中的存储顺序；如按横向交叉字段排序的排序的记录序号
                    temp,

                    BeginCrossColNo = 0,
                    EndCrossColNo = 1,
                    EndSubtotalColNo = 1,
                    CrossTitleCellStartIndex = -1, //[CrossTitleCellStartIndex, CrossTitleCellEndIndex]
                    CrossTitleCellEndIndex = -1,
                    SubtotalTitleCellBeginIndex = -1, //[SubtotalTitleCellBeginIndex, SubtotalTitleCellEndIndex]
                    SubtotalTitleCellEndIndex = -1,
		            SubtotalTitleLayer = 0,
                    TotalTitleCellBeginIndex = -1,

      	            oHPercentColumns = [],//关联原始网格的,计算横向百分比的列
                    oVPercentColumns = [],//关联原始网格的,计算纵向百分比的列
                    oTotalHPercentColumns = [],//关联原始网格的,合计中计算横向百分比的列
                    oTotalVPercentColumns = [],//关联原始网格的,合计中计算纵向百分比的列
                    oTotalExcludeColumns = [],//关联原始网格的,合计中要排除的列
	                oDisabledSumFields = [],  //关联原始网格的，合计中需要排除的字段，即按字段原始值进行显示

                    DynamicTitleCellInfos = [], //记录动态多层表头的上层表头信息

                    periodRange; //按期间交叉的报表的开始日期与结束日期

                function CrossTabFindDataFields() {
                    //var columnCount = originColumns.Count;

                    function getColumnKind(column) {
                        var orderNo = column.orderNo;

                        if (orderNo < BeginCrossColNo) {
                            return grenum.CrossColumnKind.List;
                        }
                        if (orderNo < EndCrossColNo) {
                            return grenum.CrossColumnKind.Cross;
                        }
                        if (orderNo < EndSubtotalColNo) {
                            return grenum.CrossColumnKind.SubTotal;
                        }
                        return grenum.CrossColumnKind.Total;
                    };

                    function DoCrossTabFindDataFieldInControl(control, column) {
                        var controlInfo = new DataFieldInfo(),
                            ColumnKind = getColumnKind(column),
                            unListColumn = ColumnKind !== grenum.CrossColumnKind.List,
                            controlType = control.ControlType,
                            HasSummaryFun;

                        function DoCrossTabFindAddDataField(info) {
                            //ATLASSERT( info.pOriginField );
                            if (oDisabledSumFields.indexOf(info.originObject) < 0) {
                                //如果 pField 已经添加,则要叠加数据 
                                if (!DataFieldInfos.some(function (crossFieldInfo) {
                                    if (crossFieldInfo.originObject !== info.originObject) {
                                        return false;
                                }
                                    crossFieldInfo.CombineCalcFlag(info);
                                    return true;
                                })) {
                                    info.NumericField = info.originObject.isNumeric();
                                    DataFieldInfos.push(info);
                                }
                            }
                        }

                        function DoCrossTabFindDataFieldInExpression(exp, info) {
                            if (exp) {
                                //找出统计表达式中所有用到的字段
                                exp.varItems.forEach(function (varItem) {
                                    var varField = varItem.varField;
                                    //if (MemoTextField.prototype.isPrototypeOf(varField)) {
                                    if (varField.type === grenum.ExpVarType.RecordsetField) {
                                        info.originObject = varField.object;
                                        DoCrossTabFindAddDataField(info);
                                    }
                                });
                            }
                            else {
                                //某些统计函数(如计数)不用关联字段，所以pExpression为NULL
                                //此时让第一个交叉数据字段作为此项的原始字段
                                //ATLASSERT( !DataFieldInfos.empty() );
                                info.originObject = DataFieldInfos[0].originObject;
                                DoCrossTabFindAddDataField(info);
                            }
                        }

                        if (ColumnKind === grenum.CrossColumnKind.Total) {
                            controlInfo.HTotalFlag.CalcHTotal = 1;
                            if (oTotalExcludeColumns.indexOf(column) >= 0) {
                                controlInfo.CalcHTotalExclude = 1;
                            }
                            if (oTotalHPercentColumns.indexOf(column) >= 0) {
                                controlInfo.CalcTotalHPercent = 1;
                            }
                            if (oTotalVPercentColumns.indexOf(column) >= 0) {
                                controlInfo.CalcTotalVPercent = 1;
                            }
                        }
                        else if (ColumnKind === grenum.CrossColumnKind.SubTotal) {
                            controlInfo.HSubtotalFlag.CalcHTotal = 1;
                        }
                        else if (ColumnKind === grenum.CrossColumnKind.Cross) {
                            if (oHPercentColumns.indexOf(column) >= 0) {
                                controlInfo.CalcHPercent = 1;
                            }
                            if (oVPercentColumns.indexOf(column) >= 0) {
                                controlInfo.CalcVPercent = 1;
                            }
                            if (controlInfo.CalcHPercent) {
                                controlInfo.HTotalFlag.CalcHTotal = 1;
                            }
                        }

                        //找出其关联的字段，要考虑自由格的情况
                        if (controlType === grenum.ControlType.FieldBox || controlType === grenum.ControlType.PictureBox) {
                            if (unListColumn) { //项目列上的非统计部件框不能视为交叉数据项
                                controlInfo.originObject = control.oDataField;
                                controlInfo.originObject && DoCrossTabFindAddDataField(controlInfo);
                            }
                        }
                        else if (controlType === grenum.ControlType.SummaryBox) {
                            controlInfo.SetFlagBySummaryFun(control.SummaryFun, ColumnKind);

                            //找出统计框中所有用到的字段
                            DoCrossTabFindDataFieldInExpression(control.paramExp, controlInfo);
                        }
                        else if (controlType === grenum.ControlType.Barcode) {
                            if (unListColumn) { //项目列上的非统计部件框不能视为交叉数据项
                                controlInfo.originObject = control;
                                DataFieldInfos.push(controlInfo);
                            }
                        }
                        else if (controlType === grenum.ControlType.MemoBox) {
                            HasSummaryFun = false;
                            control.textBuilder.forEach(function (exp) {
                                if (exp.varItems) { //if (MemoTextExpression.prototype.isPrototypeOf(exp)) {
                                    exp.varItems.forEach(function (varItem) {
                                        var TheInfo,
                                            varField = varItem.varField;

                                        if (varField.type === grenum.ExpVarType.Summary) {
                                            TheInfo = new DataFieldInfo(controlInfo);
                                            TheInfo.SetFlagBySummaryFun(varField.SummaryFun, ColumnKind);
                                            DoCrossTabFindDataFieldInExpression(varField.paramExp, TheInfo);

                                            HasSummaryFun = true;
                                        }
                                        else if (varField.type === grenum.ExpVarType.RecordsetField && unListColumn) {
                                            //如果是关联字段项，加入对应字段项，不然横向统计如果用到此字段就没法对应上。(ColumnKind != grenum.CrossColumnKind.List)：项目列上的非统计部件框不能视为交叉数据项
                                            TheInfo = new DataFieldInfo(controlInfo);
                                            TheInfo.originObject = varField.object;
                                            DoCrossTabFindAddDataField(TheInfo);
                                        }
                                    });
                                }

                                if (!HasSummaryFun && unListColumn) {  //项目列上的非统计部件框不能视为交叉数据项
                                    controlInfo.originObject = control;
                                    controlInfo.NumericField = control.isPureNumericExpression();
                                    DataFieldInfos.push(controlInfo);
                                }
                            });
                        }
                    };

                    //项目列中也可以包含统计函数，也要将这些对应字段归集到this.DataFieldInfos中
                    function DoCrossTabFindDataFieldsInContent(titleCellItems) {
                        titleCellItems.forEach(function (titleCell) {
                            if (titleCell.GroupTitle) {
                                DoCrossTabFindDataFieldsInContent(titleCell.SubTitles.items);
                            }
                            else {
                                //找出其关联的字段，要考虑自由格的情况
                                titleCell.Column.ContentCell.getControls().forEach(function (control) {
                                    DoCrossTabFindDataFieldInControl(control, titleCell.Column);
                                });
                            }
                        });
                    };

                    function DoCrossTabFindDataFieldsInGroupSection(groupSection) {
                        groupSection.Controls.forEach(function (control) {
                            var column = originColumns.itemByName(control.AlignColumn) || originColumns.itemByName(control.AlignColumnEx);
                            column && (getColumnKind(column) !== grenum.CrossColumnKind.List)  //只能在不是对齐到项目列的部件框上找交叉字段
                            && DoCrossTabFindDataFieldInControl(control, column);
                        });
                    };

                    DoCrossTabFindDataFieldsInContent(originTitleCellItems);

                    //应该找出分组头尾中需要用到的字段
                    originGroupItems.forEach(function (group) {
                        DoCrossTabFindDataFieldsInGroupSection(group.Footer);
                        DoCrossTabFindDataFieldsInGroupSection(group.Header);
                    });

                    //取出每个字段的名称；计算每个交叉数据组的数据字段个数，包括计算字段
                    CrossDataFieldCount = 0;
                    DataFieldInfos.forEach(function (crossFieldInfo) {
                        crossFieldInfo.DatafieldIndex = CrossDataFieldCount;

                        ++CrossDataFieldCount;
                        if (crossFieldInfo.CalcHPercent) {
                            ++CrossDataFieldCount;
                        }
                        if (crossFieldInfo.CalcVPercent) {
                            ++CrossDataFieldCount;
                        }
                    });
                }; //end of CrossTabFindDataFields

                function RemoveCrossDataFields() {
                    DataFieldInfos.forEach(function (crossFieldInfo) {
                        if (crossFieldInfo.originObject.FieldType) {
                            crossRecordset.Fields.Remove(crossFieldInfo.originObject.Name);
                        }
                    });
                };

                function AddCrossField(fieldName) {
                    var field = crossRecordset.Fields.Add();
                    field.Name = fieldName;
                    field.FieldType = grenum.FieldType.Float;
                    return field;
                };

                function RemoveCrossSummaryBoxes() {
                    function RemoveOneGroupSectionCrossSummaryBoxes(groupSection) {
                        groupSection.Controls.items = groupSection.Controls.items.filter(function (control) {
                            var column = crossColumns.itemByName(control.AlignColumn) || crossColumns.itemByName(control.AlignColumnEx);

                            return !column || column.orderNo < self.ListCols;
                        });
                    };

                    crossGrid.buildColumnsOrder();

                    crossGroupItems.forEach(function (group) {
                        RemoveOneGroupSectionCrossSummaryBoxes(group.Footer);
                        RemoveOneGroupSectionCrossSummaryBoxes(group.Header);
                    });
                }

                //.CrossOrderNoText == csz_HTotal_Suffix 表示是横向合计列
                //.CrossOrderNoText 前面加上‘_S’标识，表示是小计列
                //.CrossOrderNoText == NULL 表示是前面的项目列表列
                //.其它就是普通交叉列
                function DoAddCrossColumn(OriginTitleCell, CrossGroupTitleCell, ColumnKind, CrossOrderNo, TitleLevel, SupChanged, DataTitleCellIndex) {
                    var CrossOrderNoText = CrossOrderNo ? (grenum.CrossColumnKind.Cross === ColumnKind ? "_" : "_S") + CrossOrderNo : "",
                        NewName = OriginTitleCell.Name + CrossOrderNoText;

                    function DoAssignTitleCell(originTitleCell, crossTitleCell) {
                        var controlType,
                            newControl;

                        if (originTitleCell.FreeCell) {
                            crossTitleCell.setFreeCell(true);
                            assignObjectAtom(crossTitleCell, originTitleCell);
                            //crossTitleCell.FreeCell = 1;

                            //如果为自由格，应将所有文字框都转换为静态框，并用运行时文字作为静态框的文本
                            originTitleCell.Controls.forEach(function (control) {
                                var text,
                                    originField;

                                function IsSpecialPeriodType() { //表示交叉期间为周、旬、半月、季度等 
                                    return (self.HCrossPeriodType === grenum.PeriodType.Week)
                                        || (self.HCrossPeriodType === grenum.PeriodType.ThirdMonth)
                                        || (self.HCrossPeriodType === grenum.PeriodType.HalfMonth)
                                        || (self.HCrossPeriodType === grenum.PeriodType.Quarter)
                                        || (self.HCrossPeriodType === grenum.PeriodType.HalfYear);
                                };

                                function GetSpecialPeriodTitleText() {
                                    var Year = self.curPeriod.begin.getFullYear(),
                                        Month = self.curPeriod.begin.getMonth() + 1,
                                        Day = self.curPeriod.begin.getDate(),
                                        text;

                                    function days(date) {
                                        //return Math.floor(date.getTime() / MILLISECONDS_DAY);
                                        var datetime = new DateTime();
                                        datetime.value = date;
                                        return Math.floor(datetime.AsFloat);
                                    }

                                    switch (self.HCrossPeriodType) {
                                        case grenum.PeriodType.Week:
                                            text = "\u7B2C" + Math.floor((days(self.curPeriod.begin) - days(periodRange.begin)) / 7 + 1) + "\u5468"; //第%d周
                                            break;
                                        case grenum.PeriodType.ThirdMonth:
                                            if (Day < 11) {
                                                text = "\u4E0A"; //上
                                            }
                                            else if (Day < 21) {
                                                text = "\u4E2D"; //中
                                            }
                                            else {
                                                text = "\u4E0B"; //下
                                            }
                                            text = Month + "\u6708" + text + "\u65EC"; //"%d月%s旬";  {'%', 'd', \u6708, '%', 's', \u65EC, '\0'}
                                            break;
                                        case grenum.PeriodType.HalfMonth:
                                            if (Day < 16) {
                                                text = "\u4E0A"; //上
                                            }
                                            else {
                                                text = "\u4E0B"; //下
                                            }
                                            text = Month + "\u6708" + text + "\u534A\u6708"; //"%d月%s半月";  {'%', 'd', \u6708, '%', 's', \u534A, \u6708, '\0'}
                                            break;
                                        case grenum.PeriodType.Quarter:
                                            text = intFixed(Year, 2) + "-" + ((Month + 2) / 3) + "\u5B63\u5EA6"; // {'%','2','d','-','%','d', \u5B63, \u5EA6, '\0'}; "%2d-%d季度"
                                            break;
                                        case grenum.PeriodType.HalfYear:
                                            if (Month < 7) {
                                                text = "\u4E0A"; //上
                                            }
                                            else {
                                                text = "\u4E0B"; //下
                                            }
                                            text = intFixed(Year, "00") + "-" + text + "\u534A\u5E74"; //{'%','2','d','%','s',\u534A, \u5E74,'\0'}; "%2d%s半年";
                                            break;
                                    }
                                    return text;
                                }

                                controlType = control.ControlType;
                                if (control.TextFormat) { //有 TextFormat 属性,表示其是 TextBox 类型部件框
                                    newControl = crossTitleCell.Controls.Add(grenum.ControlType.StaticBox); //crossTitleCell.Controls.Add(controlType === grenum.ControlType.MemoBox? grenum.ControlType.MemoBox : grenum.ControlType.StaticBox);
                                    newControl.assign(control);

                                    if (IsSpecialPeriodType() && controlType === grenum.ControlType.FieldBox && control.DataField === self.HCrossFields) {
                                        text = GetSpecialPeriodTitleText();
                                    }
                                    else {
                                        text = control.getDisplayText();
                                    }
                                    newControl.Text = text;
                                }
                                else {
                                    newControl = crossTitleCell.Controls.Add(controlType);
                                    newControl.assign(control);

                                    //如果是图像，则字段上的图像数据要设为静态的数据
                                    if (controlType === grenum.ControlType.PictureBox) {
                                        if (control.DataField) {
                                            newControl.DataField = "";

                                            originField = report.FieldByName(control.DataField);
                                            if (originField) {
                                                if (originField.FieldType === grenum.FieldType.Binary) {
                                                    newControl.Picture = originField.Value;
                                                }
                                                else {
                                                    text = originField.DisplayText;
                                                    newControl.ImageIndex = parseInt(text);
                                                    if (isNaN(newControl.ImageIndex)) {
                                                        newControl.ImageIndex = 0;
                                                        newControl.ImageFile = text;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else if (controlType === grenum.ControlType.Barcode) {//如果是条形码，则关联的字段数据要变为静态的数据
                                        newControl.Text = control.get_DisplayText();
                                    }
                                }
                            });
                        }
                        else {
                            //static_cast<CGRColumnTitleCell *>(crossTitleCell)->AssignOnlySelf( originTitleCell );
                            crossTitleCell.assign(originTitleCell);
                            crossTitleCell.Text = originTitleCell.getDisplayText(); //2019/07/20 added
                        }
                    } //end of DoAssignTitleCell

                    function addGroupColumn() {
                        var UsePriorTitleCell = 0,
                            crossColumnDynamicTitles,
                            dynamicTitleCellInfo,
                            controls;

                        //仅当是交叉数据列时，才需要考虑多层表头列归类
                        if (ColumnKind === grenum.CrossColumnKind.Cross) {
                            crossColumnDynamicTitles = DynamicTitleCellInfos[DataTitleCellIndex - CrossTitleCellStartIndex];
                            dynamicTitleCellInfo = crossColumnDynamicTitles ? crossColumnDynamicTitles[TitleLevel] : 0;
                            UsePriorTitleCell = dynamicTitleCellInfo && dynamicTitleCellInfo.PriorCrossTitleCell &&
                                dynamicTitleCellInfo.PriorTitleText === dynamicTitleCellInfo.OriginTextBox.getDisplayText() &&
                                !SupChanged;
                        }
                        else if (ColumnKind === grenum.CrossColumnKind.SubTotal) {
                            //如果小计标题格的上层格与交叉列的上层格有重叠，则肯定UsePriorTitleCell
                            UsePriorTitleCell = (CrossTitleCellEndIndex == SubtotalTitleCellBeginIndex);
                            dynamicTitleCellInfo = DynamicTitleCellInfos[DynamicTitleCellInfos.length - 1];
                            dynamicTitleCellInfo = (TitleLevel < dynamicTitleCellInfo.length) ?
                                dynamicTitleCellInfo[TitleLevel] : undefined;
                            if (UsePriorTitleCell) {
                                UsePriorTitleCell = dynamicTitleCellInfo &&
                                    !!dynamicTitleCellInfo.PriorCrossTitleCell;
                            }
                            else if (TitleLevel == 0) {
                                //根据小计标题格的显示文字是否有变化进行判断
                                controls = OriginTitleCell.Controls;
                                UsePriorTitleCell = controls && controls.Count === 1 &&
                                    controls.Item(1).getDisplayText && controls.Item(1).getDisplayText() === dynamicTitleCellInfo.PriorTitleText;
                            }
                        }
                        else if (ColumnKind === grenum.CrossColumnKind.Total) {
                            dynamicTitleCellInfo = DynamicTitleCellInfos[DynamicTitleCellInfos.length - 1][TitleLevel];

                            //如果小计标题格的上层格与交叉列的上层格有重叠，则肯定UsePriorTitleCell
                            UsePriorTitleCell = (SubtotalTitleCellEndIndex == TotalTitleCellBeginIndex);
                            if (UsePriorTitleCell) {
                                UsePriorTitleCell = !!dynamicTitleCellInfo.PriorCrossTitleCell;
                            }
                        }

                        if (UsePriorTitleCell) {
                            CrossGroupTitleCell = dynamicTitleCellInfo.PriorCrossTitleCell;
                        }
                        else {
                            CrossGroupTitleCell = (CrossGroupTitleCell ? CrossGroupTitleCell.SubTitles : crossTitleCells).AddGroup("", "");
                            DoAssignTitleCell(OriginTitleCell, CrossGroupTitleCell);
                            CrossGroupTitleCell.Name = NewName;

                            if (dynamicTitleCellInfo) {
                                dynamicTitleCellInfo.PriorCrossTitleCell = CrossGroupTitleCell;
                                dynamicTitleCellInfo.PriorTitleText = dynamicTitleCellInfo.OriginTextBox.getDisplayText();
                            }
                        }

                        OriginTitleCell.SubTitles.forEach(function (titlecell) {
                            DoAddCrossColumn(titlecell, CrossGroupTitleCell, ColumnKind, CrossOrderNo, TitleLevel + 1, !UsePriorTitleCell, DataTitleCellIndex);
                        });
                    }; //end of addGroupColumn

                    function addOneCrossColumn() {
                        var unListColumn = ColumnKind !== grenum.CrossColumnKind.List,
                            isHTotalColumn = ColumnKind === grenum.CrossColumnKind.Total, //CrossOrderNoText === csz_HTotal_Suffix,
                            GroupAutoSum = self.GroupAutoSum && unListColumn, //项目列不要自动定义统计框
                            //crossColumn = crossColumns.addTo(CrossGroupTitleCell ? CrossGroupTitleCell.SubTitles : crossGrid.ColumnTitle.TitleCells),
                            crossColumn,
                            crossControls,
                            isSingleControl,
                            originColumn = OriginTitleCell.Column,
                            ColumnOrderNo = originColumn.orderNo,
                            columnInfo = new DataFieldInfo();

                        function FindDataFieldInfoByName(fieldName) {
                            var matchedInfo;

                            DataFieldInfos.some(function (crossFieldInfo) {
                                if (crossFieldInfo.originObject.Name !== fieldName) { //?? GetOriginObjectName
                                    return false;
                                }
                                matchedInfo = crossFieldInfo;
                                return true;
                            });

                            return matchedInfo;
                        };

                        function FindHPercentSum(group, dataFieldInfo) {
                            var matched;
                            self.HPercentSums.some(function (item) {
                                if (item.Group !== group || item.DataFieldInfo !== dataFieldInfo) {
                                    return false;
                                }
                                matched = item;
                                return true;
                            });
                            return matched;
                        };

                        // 如果 ??SummaryFun == grsfStrMax，则表示没有统计函数，或不是合计列统计
                        function BuildDataAndSummaryFieldName(SummaryFun, DataField) {
                            var suffix = CrossSummaryGetFieldSuffix(SummaryFun),
                                SummaryDataField;

                            if (ColumnKind === grenum.CrossColumnKind.Total || ColumnKind === grenum.CrossColumnKind.List) {
                                if (suffix) {
                                    DataField += csz_HTotal_Suffix + suffix;
                                    SummaryDataField = DataField;
                                }
                                else {
                                    if (columnInfo.CalcHPercent) {
                                        SummaryDataField = DataField + csz_HTotal_Suffix;
                                        DataField += csz_HTotalPercent_Suffix;
                                    }
                                    else if (columnInfo.CalcVPercent) {
                                        DataField += csz_VTotalPercent_Suffix;
                                        SummaryDataField = DataField;
                                    }
                                    else {
                                        DataField += csz_HTotal_Suffix;
                                        SummaryDataField = DataField;
                                    }
                                }
                            }
                            else if (ColumnKind === grenum.CrossColumnKind.SubTotal) {
                                DataField += CrossOrderNoText + suffix;
                                SummaryDataField = DataField;
                            }
                            else {
                                DataField += CrossOrderNoText;
                                SummaryDataField = DataField;
                                if (columnInfo.CalcHPercent) {
                                    DataField += csz_HPercent_Suffix;
                                }
                                else if (columnInfo.CalcVPercent) {
                                    DataField += csz_VPercent_Suffix;
                                    SummaryDataField = DataField;
                                }
                            }

                            SummaryDataField = ensureNameText(SummaryDataField);

                            return {
                                DataField: DataField,
                                SummaryDataField: SummaryDataField,
                            };
                        }; //end of BuildDataAndSummaryFieldName

                        function BuildSummaryExpressionText(exp, SummaryFun) {
                            var begin = 0,
                                fieldNamePair,
                                expText = "";

                            exp.varItems.forEach(function (varItem2) {
                                if (begin < varItem2.beginIndex) {
                                    expText += exp.expText.substring(begin, varItem2.beginIndex);
                                }

                                if (varItem2.varField.type === grenum.ExpVarType.RecordsetField) {
                                    fieldNamePair = BuildDataAndSummaryFieldName(SummaryFun, varItem2.varField.object.Name);
                                    expText += fieldNamePair.SummaryDataField;
                                }
                                else {
                                    expText += varItem2.varField.getExpText();
                                }
                                begin = varItem2.endIndex;
                            });
                            expText += exp.expText.substr(begin);

                            return expText;
                        };  //end of BuildSummaryExpressionText

                        function buildTextExpressionText(expText, expFormat) {
                            expText = "[#" + expText;
                            if (expFormat) {
                                expText += ":" + expFormat;
                            }
                            expText += "#]";

                            return expText;
                        }; //end of buildTextExpressionText

                        //将综合文字框中的一个表达式转换为交叉需要的表达式
                        //如果是在分组节上，则保留里面的统计函数。。。
                        //反之则在内容格中，统计函数要去掉
                        function buildTextExpressionCross(textExp, isGroupSection) {
                            var begin = 0,
                                summaryExpText,
                                text = "";

                            textExp.varItems.forEach(function (varItem) {
                                var expfield = varItem.varField,
                                    type = expfield.type;

                                if (begin < varItem.beginIndex) {
                                    text += textExp.expText.substring(begin, varItem.beginIndex);
                                }

                                //去掉统计函数，直接关联其统计表达式，里面的字段替换为对应的统计字段
                                if (type === grenum.ExpVarType.Summary) {
                                    summaryExpText = BuildSummaryExpressionText(expfield.paramExp, expfield.SummaryFun);
                                    if (isGroupSection) {
                                        text += enumValue2Name(grenum.SummaryFun, expfield.SummaryFun) +
                                            "(" +
                                            summaryExpText +
                                            (expfield.RankNo ? "," + expfield.RankNo : "") +
                                            ")";
                                    }
                                    else {
                                        text += summaryExpText;
                                    }
                                }
                                else {
                                    text += expfield.getExpText();
                                }
                                begin = varItem.endIndex;
                            });
                            text += textExp.expText.substr(begin);

                            return text;
                        }; //end of  buildTextExpressionCross

                        function DefineCustomGroupSummary() {
                            crossGroupItems.forEach(function (crossGroup, index) {
                                var originGroup,
                                    summaryBoxes = [];

                                function DefineOneGroupSectionCustomSummary(originGroupSection, crossGroupSection) {
                                    if (crossGroupSection.isToGenerate()) {
                                        originGroupSection.Controls.forEach(function (originControl) {
                                            var controlType = originControl.ControlType,
                                                control,
                                                text,
                                                originAlignColumn = originControl.AlignColumn || originControl.AlignColumnEx,
                                                originField;

                                            if (originAlignColumn === originColumn.Name) {
                                                control = crossGroupSection.Controls.Add(controlType);
                                                control.assign(originControl);
                                                control.AlignColumn = crossColumn.Name;
                                                control.AlignColumnEx = "";

                                                //infoControl = new DataFieldInfo();
                                                //if (controlType === grenum.ControlType.SummaryBox || controlType === grenum.ControlType.MemoBox) {
                                                //    infoControl.SetCalcHPercent(columnInfo.CalcHPercent);
                                                //    infoControl.SetCalcVPercent(columnInfo.CalcVPercent);
                                                //    //if ( CalcHAverage )
                                                //    //    Info.HTotalFlag.SetOnCalcHAverage();
                                                //}

                                                if (controlType === grenum.ControlType.SummaryBox) {

                                                    if (originControl.DataField) {
                                                        control.DataField = BuildSummaryExpressionText(originControl.paramExp, originControl.SummaryFun);
                                                        control.Tag = originControl.DataField; //将原始字段记录在 Tag 属性中, 为后面 FindDataFieldInfoByName 所用

                                                        summaryBoxes.push(control);
                                                    }
                                                }
                                                else if (controlType === grenum.ControlType.MemoBox) {
                                                    //表达式要进行分析：如果存在统计函数，应该将统计函数中引用的字段找出，并进行改名
                                                    text = "";
                                                    originControl.textBuilder.forEach(function (exp) {
                                                        if (exp.varItems) { //if (MemoTextExpression.prototype.isPrototypeOf(exp)) {
                                                            text += buildTextExpressionText(buildTextExpressionCross(exp, true), exp.format);
                                                        }
                                                        else {
                                                            text += exp.text;
                                                        }
                                                    });
                                                    control.Text = text;
                                                }
                                                else if (controlType === grenum.ControlType.FieldBox) {
                                                    originField = report.FieldByName(control.DataField);
                                                    if (originField) {
                                                        //controlInfo.pOriginField = pOriginField;
                                                        control.DataField = BuildDataAndSummaryFieldName(0, originFieldName).SummaryDataField; //static_cast<CGRFieldBox *>(pFieldBox.p)->SetDataField( FieldDataFieldName );
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }; //end of DefineOneGroupSectionCustomSummary

                                originGroup = originGroupItems[index];

                                DefineOneGroupSectionCustomSummary(originGroup.Footer, crossGroup.Footer);
                                DefineOneGroupSectionCustomSummary(originGroup.Header, crossGroup.Header);

                                summaryBoxes.forEach(function (summaryBox) {
                                    var theinfo,
                                        theHPercentSum;

                                    if (columnInfo.CalcHPercent) {
                                        summaryBox.Format = self.PercentFormat;

                                        theinfo = FindDataFieldInfoByName(summaryBox.Tag);
                                        //ATLASSERT(pDataFieldInfo);

                                        theHPercentSum = FindHPercentSum(crossGroup, theinfo);
                                        if (!theHPercentSum) {
                                            theHPercentSum = new HPercentSum(crossGroup, theinfo);
                                            self.HPercentSums.push(theHPercentSum);
                                        }

                                        if (isHTotalColumn) {
                                            theHPercentSum.TotalSumBox = summaryBox;
                                        }
                                        else {
                                            theHPercentSum.DataSumBoxes.push(summaryBox);
                                        }
                                    }
                                });
                            });
                        }; //end of DefineCustomGroupSummary

                        //因上层表头重叠，不属于的列应该排除掉
                        if (CrossTitleCellEndIndex === SubtotalTitleCellBeginIndex &&
                            ((ColumnKind == grenum.CrossColumnKind.Cross && ColumnOrderNo >= EndCrossColNo) ||
                            (ColumnKind == grenum.CrossColumnKind.SubTotal && ColumnOrderNo < EndCrossColNo))) {
                            return;
                        }

                        if (SubtotalTitleCellEndIndex === TotalTitleCellBeginIndex &&
                            ((ColumnKind == grenum.CrossColumnKind.SubTotal && ColumnOrderNo >= EndSubtotalColNo) ||
                            (ColumnKind == grenum.CrossColumnKind.Total && ColumnOrderNo < EndSubtotalColNo))) {
                            return;
                        }

                        crossColumn = crossColumns.addTo(CrossGroupTitleCell ? CrossGroupTitleCell.SubTitles : crossGrid.ColumnTitle.TitleCells),
                        crossColumn.assign(originColumn);
                        crossColumn.Name = NewName;

                        //在交叉列与小计列中记录下交叉项的序号，在生成内容格时，将此序号作为Atrr生成，以便在鼠标点击事件中获取对应的横向交叉字段值
                        if (ColumnKind === grenum.CrossColumnKind.Cross || ColumnKind === grenum.CrossColumnKind.SubTotal) {
                            crossColumn._crossOrderNo = CrossItemCount;
                        }

                        //定义标题格
                        DoAssignTitleCell(OriginTitleCell, crossColumn.TitleCell);

                        //定义内容格。关联的字段名称要对应更新，目前只考虑字段框与综合文字框的情况，综合文字框要转换为字段框
                        crossColumn.ContentCell.assign(originColumn.ContentCell);
                        crossControls = crossColumn.ContentCell.getControls();
                        isSingleControl = (crossControls.length === 1);

                        if (isHTotalColumn) {
                            if (oTotalHPercentColumns.indexOf(originColumn) >= 0) {
                                columnInfo.CalcHPercent = 1;
                            }
                            if (oTotalVPercentColumns.indexOf(originColumn) >= 0) {
                                columnInfo.CalcVPercent = 1;
                            }
                        }
                        else {
                            if (oHPercentColumns.indexOf(originColumn) >= 0) {
                                columnInfo.CalcHPercent = 1;
                            }
                            if (oVPercentColumns.indexOf(originColumn) >= 0) {
                                columnInfo.CalcVPercent = 1;
                            }
                        }

                        crossControls.forEach(function (control, index) {
                            var controlType = control.ControlType,
                                fieldNamePair;

                            function DefineAutoGroupSummary(params) {
                                crossGroupItems.forEach(function (crossGroup, indexGroup) {
                                    //判断分组上是否已经定义对齐列的部件框框，如果是，则不要再自动定义了
                                    var originGroup = originGroupItems[indexGroup],
                                        summaryBox,
                                        DataFieldInfo,
                                        hpercentSum;

                                    function OneGroupHasAlignControl(groupSection, column) {
                                        return groupSection.isToGenerate() &&
                                            groupSection.Controls.items.some(function (control) {
                                                return control.AlignColumn === column.Name || control.AlignColumnEx === column.Name;
                                            });
                                    };

                                    function DefineOneGroupSectionAutoSummary(groupSection) {
                                        var summaryBox,
                                            summaryBoxBorder,
                                            borderWidth,
                                            border;

                                        if (groupSection.isToGenerate()) {
                                            summaryBox = groupSection.Controls.Add(grenum.ControlType.SummaryBox);

                                            summaryBox.assign(control);
                                            summaryBox.Dock = grenum.DockStyle.None; //pTextBox中通常是grdsFill，这样不合理，导致后面设 Anchor 等布局无效
                                            summaryBox.TextAlign = control.TextAlign;
                                            summaryBox.AlignColumn = crossColumn.Name; //...crossColumn.Name;
                                            summaryBox.DataField = params.summaryDataField; //params.summaryDataField;

                                            if (originGrid.ShowColLine) {
                                                summaryBoxBorder = summaryBox.Border;
                                                summaryBoxBorder.Styles |= grenum.BorderStyle.DrawRight;

                                                //如果部件框本身有右边框，则要累加边框宽度
                                                borderWidth = originGrid.ColLinePen.Width;
                                                border = control.Border;
                                                if (border && border.Styles & grenum.BorderStyle.DrawRight && border.Pen.Width > 0) {
                                                    borderWidth += border.Pen.Width;
                                                }
                                                else {
                                                    summaryBoxBorder.Pen.Color = originGrid.ColLinePen.Color;
                                                }
                                                summaryBoxBorder.Pen.Width = borderWidth;
                                            }

                                            if (isSingleControl) {
                                                summaryBox.Top = 0;
                                                summaryBox.Height = groupSection.Height;
                                                //summaryBox.SetAnchor( (GRAnchorStyles)(grasLeft | grasTop | grasBottom) ); //Grow height when the section grow

                                                if (crossColumn.ContentCell.BackColor !== 0xffffff && groupSection.BackColor === 0xffffff) {
                                                    summaryBox.BackStyle = grenum.BackStyle.Normal;
                                                    summaryBox.BackColor = crossColumn.ContentCell.BackColor;
                                                }
                                            }
                                            else {
                                                summaryBox.Top = control.Top;
                                                summaryBox.Height = control.Height;
                                                if (control.BackStyle() === grenum.BackStyle.Normal) {
                                                    summaryBox.BackStyle = grenum.BackStyle.Normal;
                                                    summaryBox.BackColor = control.BackColor;
                                                }
                                            }
                                        }

                                        return summaryBox;
                                    }; //end of DefineOneGroupSectionAutoSummary

                                    if (!OneGroupHasAlignControl(originGroup.Footer, originColumn) &&
                                        !OneGroupHasAlignControl(originGroup.Header, originColumn)) {
                                        summaryBox = DefineOneGroupSectionAutoSummary(crossGroup.Footer);
                                        if (!summaryBox) {
                                            summaryBox = DefineOneGroupSectionAutoSummary(crossGroup.Header);
                                        }

                                        if (summaryBox) {
                                            summaryBox.Format = params.format;

                                            if (columnInfo.CalcHPercent) {
                                                summaryBox.Format = self.PercentFormat;

                                                DataFieldInfo = FindDataFieldInfoByName(params.originDataField);
                                                //ATLASSERT(pDataFieldInfo);
                                                hpercentSum = FindHPercentSum(crossGroup, DataFieldInfo);
                                                if (!hpercentSum) {
                                                    hpercentSum = new HPercentSum(crossGroup, DataFieldInfo);
                                                    self.HPercentSums.push(hpercentSum);
                                                }

                                                if (isHTotalColumn) {
                                                    hpercentSum.TotalSumBox = summaryBox;
                                                }
                                                else {
                                                    hpercentSum.DataSumBoxes.push(summaryBox);
                                                }
                                            }
                                        }
                                    }
                                });
                            }; //end of DefineAutoGroupSummary

                            function defineDataFieldBoxCross() {
                                var originFieldName = control.DataField,
                                    summaryFun = control.SummaryFun,
                                    field,
                                    dataFormat;

                                if (controlType === grenum.ControlType.SummaryBox) {
                                    if (!originFieldName) {
                                        //某些统计函数（如计数）不用关联字段，以第一个交叉字段作为其原始字段
                                        originFieldName = DataFieldInfos[0].originObject.Name;
                                    }
                                    //summaryFun = control.SummaryFun;
                                    //controlInfo.SetFlagBySummaryFun(summaryFun, ColumnKind);
                                    dataFormat = control.Format;

                                    //移除统计框，改为定义一个字段框
                                    if (crossColumn.ContentCell.Controls) {
                                        control = new FieldBox(crossColumn.ContentCell);
                                        control.assign(crossControls[index]);
                                        crossColumn.ContentCell.Controls.items[index] = control;
                                    }
                                    else {
                                        //crossColumn.ContentCell.wrapper ... = control;
                                        //crossColumn.ContentCell.assign(control);  //?? assign
                                        crossColumn.ContentCell.assign(crossControls[index]);
                                    }

                                }

                                fieldNamePair = BuildDataAndSummaryFieldName(summaryFun, originFieldName);

                                control.DataField = fieldNamePair.DataField;
                                if (controlType !== grenum.ControlType.PictureBox) {
                                    if (dataFormat) {
                                        field = crossRecordset.Fields.Item(fieldNamePair.DataField);
                                        if (field) { //如果为项目列中的统计框，则对应的字段在此时还没有定义，所以pField为NULL
                                            field.Format = dataFormat;
                                        }
                                    }

                                    if (GroupAutoSum) {
                                        DefineAutoGroupSummary({
                                            summaryDataField: fieldNamePair.SummaryDataField,
                                            originDataField: originFieldName,
                                            //isExpField: false,
                                            format: "",
                                        });
                                    }
                                }
                            }; //end of defineDataFieldBoxCross

                            function defineMemoBoxCross() {
                                var done = false,
                                    hasTotalSummaryFun,
                                    originControl,
                                    exp,
                                    expText;

                                done = isCalendarReport && Calendar_RettachMemoBoxDataField(control, CrossOrderNoText);
                                if (!done) {
                                    //如果存在表达式，且里面有统计函数，则将统计函数分解出来(即去掉统计函数，只留下函数中的表达式，但要将字段改为对应的交叉项
                                    originControl = originColumn.ContentCell.getControls()[index];
                                    hasTotalSummaryFun = (exp = originControl.textBuilder.items[0]) && exp.varItems &&
                                        exp.varItems.some(function (varItem) {
                                            return varItem.varField.type === grenum.ExpVarType.Summary;
                                        });
                                    if (hasTotalSummaryFun) {
                                        expText = buildTextExpressionCross(exp, false);
                                        control.Text = buildTextExpressionText(expText, exp.format);

                                        //自动定义合计,还要应用格式
                                        if (GroupAutoSum) {
                                            DefineAutoGroupSummary({
                                                summaryDataField: ensureNameText(expText),
                                                originDataField: "",
                                                //isExpField: true,
                                                format: exp.format,
                                            });
                                        }
                                    }
                                    else if (unListColumn) { //项目列不要改
                                        fieldNamePair = BuildDataAndSummaryFieldName(0, control.Name);
                                        control.Text = "[#" + fieldNamePair.DataField + "#]";

                                        GroupAutoSum && DefineAutoGroupSummary({
                                            summaryDataField: fieldNamePair.SummaryDataField,
                                            originDataField: control.Name,
                                            //isExpField: false,
                                            format: "",
                                        });
                                    }
                                }

                                //IsPureNumericExpression() 中调用了AttachObject，因为Attach在原始网格上，后面要运行在交叉网格上，所以要取消Attach
                                //static_cast<CGRMemoBox *>(pMemoBox.p)->AttachObjectCancel();
                            }; //end of defineMemoBoxCross

                            if (controlType === grenum.ControlType.FieldBox || controlType === grenum.ControlType.SummaryBox || controlType === grenum.ControlType.PictureBox) {
                                defineDataFieldBoxCross();
                            }
                            else if (controlType === grenum.ControlType.Barcode) {
                                if (ColumnKind !== grenum.CrossColumnKind.List) {
                                    fieldNamePair = BuildDataAndSummaryFieldName(control.Name, 0);
                                    control.Text = "[#" + fieldNamePair.DataField + "#]";
                                }
                            }
                            else if (controlType === grenum.ControlType.MemoBox) {
                                defineMemoBoxCross()
                            }
                        }); //end of crossControls.forEach
                        //>>

                        //不论为AutoGroupSum何值，都根据 originColumn 定义对应的自定义统计框
                        //项目列的对应统计框没有移除，不要再次定义统计框
                        unListColumn && DefineCustomGroupSummary();
                    }; //end of addOneCrossColumn

                    if (OriginTitleCell.GroupTitle) {
                        addGroupColumn();
                    }
                    else {
                        OriginTitleCell.Column.Visible && addOneCrossColumn();
                    }
                }; //end of DoAddCrossColumn

                function DefineFieldMaps() {
                    var orginFields = originRecordset.Fields;
                    crossRecordset.Fields.forEach(function (field) {
                        ListFieldsPair.push({
                            crossField: field,
                            originField: orginFields.itemByName(field.Name)
                        });
                    });
                }

                function defineHTotalFields() {
                    DataFieldInfos.forEach(function (crossFieldInfo) {
                        var htotalFlag = crossFieldInfo.HTotalFlag,
                            originName = crossFieldInfo.originObject.Name,
                            newField;

                        function DoAddTotalField(crossFieldInfo, newName, fieldNameSuffix) {
                            newField = crossFieldInfo.CopyAddField(crossRecordset, newName + fieldNameSuffix);
                            newField.GetDisplayTextScript = ""; //不应用脚本
                            CrossDataFieldObjects.push(newField);
                        }

                        htotalFlag.CalcHTotal && DoAddTotalField(crossFieldInfo, originName, csz_HTotal_Suffix);
                        htotalFlag.CalcHAverage && DoAddTotalField(crossFieldInfo, originName, csz_HAverage_Suffix);
                        htotalFlag.CalcHAverageA && DoAddTotalField(crossFieldInfo, originName, csz_HAverageA_Suffix);
                        htotalFlag.CalcHCount && DoAddTotalField(crossFieldInfo, originName, csz_HCount_Suffix);
                        htotalFlag.CalcHCountA && DoAddTotalField(crossFieldInfo, originName, csz_HCountA_Suffix);
                        htotalFlag.CalcHMin && DoAddTotalField(crossFieldInfo, originName, csz_HMin_Suffix);
                        htotalFlag.CalcHMax && DoAddTotalField(crossFieldInfo, originName, csz_HMax_Suffix);

                        if (crossFieldInfo.CalcTotalHPercent) {
                            newField = AddCrossField(originName + csz_HTotalPercent_Suffix);
                            newField.Format = self.PercentFormat;
                            CrossDataFieldObjects.push(newField);
                        }

                        if (crossFieldInfo.CalcTotalVPercent) {
                            newField = AddCrossField(originName + csz_VTotalPercent_Suffix);
                            newField.Format = self.PercentFormat;
                            CrossDataFieldObjects.push(newField);
                        }
                    });
                };

                function DefineTotalColumns() {
                    var TopmostTitleCellCount = originTitleCellItems.length;

                    for (i = TotalTitleCellBeginIndex; i < TopmostTitleCellCount; i++) {
                        DoAddCrossColumn(originTitleCellItems[i], undefined, grenum.CrossColumnKind.Total, undefined, 0, true, -1);
                    }
                }

                //组标题格,且其中只有一个部件框，部件框必须为文字框(TextBox)才能产生多层表头
                function BuildDynamicTitleCellInfos(originTitleCell) {
                    var controls = originTitleCell.getControls(),
                        control;

                    if (originTitleCell.GroupTitle && controls.length === 1) {
                        control = controls[0];
                        if (control.TextFormat) {
                            DynamicTitleCellInfos[DynamicTitleCellInfos.length - 1].push(new DynamicTitleCellInfo(control));

                            //(originTitleCell.SubTitles.items.length === 1) && BuildDynamicTitleCellInfos(originTitleCell.SubTitles.items[0]);
                            (originTitleCell.SubTitles.items.length >= 1) && BuildDynamicTitleCellInfos(originTitleCell.SubTitles.items[0]);
                        }
                    }
                };

                function buildHCrossRecordIndexes() {
                    var sortItems = [];

                    if (self.HResort) {
                        oHCrossFields.forEach(function (field) {
                            sortItems.push({
                                field: field,
                                asc: self.HSortAsc,
                                "case": 1
                            });
                        });
                    }

                    recordIndexes = originRecordset.sortRecords(sortItems, 1);
                };

                function DefineCrossGroupItem(CrossOrderNo) {
                    var CrossOrderNoText,
                        newfield;

                    //首字母加连字符号、不然列名很可能出现同名的情况，如合计列Column21，数据列Column2，数据列会自动产生为Column21
                    CrossOrderNoText = "_" + CrossOrderNo;

                    //定义横向交叉字段对应字段，用于存储横向交叉数据
                    oHCrossFields.forEach(function (field) {
                        newfield = crossRecordset.Fields.Add();

                        newfield.assign(field);

                        newfield._tableMember = "";
                        newfield.DBFieldName = "";
                        newfield.Name += CrossOrderNoText;

                        newfield._hfval = field.Value; //将值保存下来，以便在生成交叉记录时使用

                        CrossHCrossFieldObjects.push(newfield);
                    });

                    //加入本项目对应的字段与列定义，并记录下来
                    DataFieldInfos.forEach(function (crossFieldInfo) {
                        var fieldname0 = crossFieldInfo.originObject.Name + CrossOrderNoText;

                        //常规数据字段
                        CrossDataFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, fieldname0));

                        //横向求比率字段
                        if (crossFieldInfo.CalcHPercent) {
                            newfield = AddCrossField(fieldname0 + csz_HPercent_Suffix);
                            newfield.Format = self.PercentFormat;
                            CrossDataFieldObjects.push(newfield);
                        }

                        //纵向求比率字段
                        if (crossFieldInfo.CalcVPercent) {
                            newfield = AddCrossField(fieldname0 + csz_VPercent_Suffix);
                            newfield.Format = self.PercentFormat;
                            CrossDataFieldObjects.push(newfield);
                        }
                    });

                    //加入对应的列
                    for (i = CrossTitleCellStartIndex; i <= CrossTitleCellEndIndex; i++) {
                        DoAddCrossColumn(originTitleCellItems[i], undefined, grenum.CrossColumnKind.Cross, CrossOrderNo, 0, false, i);
                    }
                };

                function DefineNormalCrossGroups() {
                    function SubtotalIsCrossChange() {
                        var //titleInfo,
                            DynamicTitleCellInfo,
                            pSubTitleCells,
                            UsePriorTitleCell = true,
                            DynamicTitleCellInfoVector = DynamicTitleCellInfos[DynamicTitleCellInfos.length - 1],
                            pOriginTitleCell = originTitleCellItems[CrossTitleCellStartIndex],
                            DynamicTitleCellInfoIndex = 0;

                        //return originTitleCellItems[CrossTitleCellStartIndex].GroupTitle &&
                        //    DynamicTitleCellInfos.length === 1 &&
                        //    DynamicTitleCellInfos[0].length >= 1 &&
                        //    (titleInfo = DynamicTitleCellInfos[0][0]).PriorCrossTitleCell &&
                        //    titleInfo.PriorTitleText !== titleInfo.OriginTextBox.getDisplayText();
                        if (DynamicTitleCellInfos.length > 1) {
                            return false;
                        }

                        //bool UsePriorTitleCell = true;
                        //const vector<CDynamicTitleCellInfo> &DynamicTitleCellInfoVector = DynamicTitleCellInfos.back();

                        //如果是多级报表，则上层的每级都要判断
                        //CComPtr<IGRColumnTitleCell> pOriginTitleCell;
                        //m_pOriginTitleCells->ItemAt(m_CrossTitleCellStartIndex, &pOriginTitleCell);
                        //VARIANT_BOOL IsGroupTitleCell;
                        //pOriginTitleCell->get_GroupTitle(&IsGroupTitleCell);
                        //int DynamicTitleCellInfoIndex = 0;
                        while (pOriginTitleCell.GroupTitle)
                        {
                            if (DynamicTitleCellInfoIndex >= DynamicTitleCellInfoVector.length) {
                                break;
                            }

                            DynamicTitleCellInfo = DynamicTitleCellInfoVector[DynamicTitleCellInfoIndex];
                            UsePriorTitleCell = !!DynamicTitleCellInfo.PriorCrossTitleCell &&
                                DynamicTitleCellInfo.PriorTitleText == DynamicTitleCellInfo.OriginTextBox.getDisplayText();
                            if (!UsePriorTitleCell) {
                                break;
                            }

                            pSubTitleCells = pOriginTitleCell.SubTitles; //pOriginTitleCell->get_SubTitles(&pSubTitleCells);
                            if (pSubTitleCells.Count <= 0) { //if (SubTitleCellCount <= 0 || SubTitleCellCount > 1)
                                break;
                            }

                            if (++DynamicTitleCellInfoIndex >= SubtotalTitleLayer) {
                                break;
                            }

                            pOriginTitleCell = pSubTitleCells.Item(1);
                        }

                        return !UsePriorTitleCell;
                    }

                    function SubtotalDefineCrossItem() {
                        var SubTotalOrderNo,
                            SubTotalOrderNoText,
                            name0;

                        SubtotalCrossItemEndIndexs.push(CrossItemCount);
                        SubTotalOrderNo = SubtotalCrossItemEndIndexs.length;
                        SubTotalOrderNoText = "_S" + SubTotalOrderNo; //在前面加上‘_S’标识，表示是小计相关子段与聂

                        //加入本项目对应的字段与列定义，并记录下来
                        DataFieldInfos.forEach(function (crossFieldInfo) {
                            name0 = crossFieldInfo.originObject.Name + SubTotalOrderNoText;

                            //小计求和子段
                            SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HTotal_Suffix));

                            crossFieldInfo.HSubtotalFlag.CalcHAverage && SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HAverage_Suffix));
                            crossFieldInfo.HSubtotalFlag.CalcHAverageA && SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HAverageA_Suffix));
                            crossFieldInfo.HSubtotalFlag.CalcHCount && SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HCount_Suffix));
                            crossFieldInfo.HSubtotalFlag.CalcHCountA && SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HCountA_Suffix));
                            crossFieldInfo.HSubtotalFlag.CalcHMin && SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HMin_Suffix));
                            crossFieldInfo.HSubtotalFlag.IsCalcHMax && SubtotalFieldObjects.push(crossFieldInfo.CopyAddField(crossRecordset, name0 + csz_HMax_Suffix));
                        });

                        //加入对应的列
                        for (i = SubtotalTitleCellBeginIndex; i <= SubtotalTitleCellEndIndex; i++) {
                            DoAddCrossColumn(originTitleCellItems[i], undefined, grenum.CrossColumnKind.SubTotal, SubTotalOrderNo, 0, false, -1);
                        }
                    };

                    recordIndexes.forEach(function (recordNo, index) {
                        //忽略掉专门添加的纵向记录
                        if (recordNo < self.VAddedItemRecordOffsetBegin || recordNo >= self.VAddedItemRecordOffsetEnd) {
                            originRecordset.MoveTo(recordNo);

                            if (!index || originRecordset.fieldsKeepedValueChanged(oHCrossFields)) {
                                //判断横向交叉小计发生了变化
                                if (self.SubtotalCols > 0 && index && SubtotalIsCrossChange()) {
                                    originRecordset.MoveTo(recordIndexes[index - 1]);	//退回到上一笔记录，定义交叉小计
                                    SubtotalDefineCrossItem();
                                    originRecordset.MoveTo(recordNo);      //前进到当前记录
                                }

                                originRecordset.keepValue();

                                DefineCrossGroupItem(++CrossItemCount);
                            }

                            originRecordset.curRecord._CrossNo_ = CrossItemCount; //在记录中保存其对应的交叉项, 存储记录与交叉项的关系
                        }
                    });

                    //定义最后的交叉小计
                    (self.SubtotalCols > 0) && SubtotalDefineCrossItem();
                };

                function DefinePeriodCrossGroups() {
                    var recordCount = recordIndexes.length,
                        recordIndex = 0,
                        originDate,
                        crossDate;

                    function NextPeriodRange() {
                        if (periodRange) {
                            self.curPeriod = grhelper.periodRangeNext(self.curPeriod, self.HCrossPeriodType);
                        }
                        else {
                            periodRange = prepareDateRange();

                            //2015/06/02 added 根据风的测试，应该对参数日期进行取整处理
                            strimDate(periodRange.begin);
                            strimDate(periodRange.end);
                            incDate(periodRange.end); //加一天,形成半闭包范围

                            self.curPeriod = grhelper.periodRangeBy(periodRange.begin, self.HCrossPeriodType);
                        }

                        return self.curPeriod.begin < periodRange.end;
                    };

                    while (NextPeriodRange()) {
                        //将横向交叉字段的值变为交叉期间的开始日期值
                        //在动态生成交叉项的表头时,一般需要取原始记录集中的横向交叉字段的值生成表头文字
                        originDate = oHCrossFields[0].AsDateTime;
                        oHCrossFields[0].AsDateTime = self.curPeriod.begin; //交叉日期字段记录期间的开始日期
                        DefineCrossGroupItem(++CrossItemCount);
                        oHCrossFields[0].AsDateTime = originDate;

                        while (recordIndex < recordCount) {
                            originRecordset.MoveTo(recordIndexes[recordIndex]);
                            crossDate = oHCrossFields[0].AsDateTime;
                            if (crossDate < self.curPeriod.begin || crossDate >= self.curPeriod.end) {
                                break;
                            }

                            originRecordset.curRecord._CrossNo_ = CrossItemCount; //在记录中保存其对应的交叉项, 存储记录与交叉项的关系
                            recordIndex++;
                        }
                    }
                }; //end of DefinePeriodCrossGroups

                function CheckHPercentSum() {
                    self.HPercentSums.forEach(function (hpercentsum) {
                        var summaryBox,
                            datafield;

                        function defineTotalSummaryBox(groupSection) {
                            if (groupSection.isToGenerate()) {
                                summaryBox = groupSection.Controls.Add(grenum.ControlType.SummaryBox);
                                summaryBox.DataField = datafield;
                            }
                        };

                        if (!hpercentsum.TotalSumBox) {
                            datafield = hpercentsum.DataFieldInfo.originObject.Name + csz_HTotal_Suffix;

                            defineTotalSummaryBox(hpercentsum.Group.Footer);
                            !summaryBox && defineTotalSummaryBox(hpercentsum.Group.Header);

                            summaryBox.Visible = false;
                            hpercentsum.TotalSumBox = summaryBox;
                        }
                    });
                }

                function moveTotalFieldsToEnd() {
                    var totalFields = CrossDataFieldObjects.splice(0, TotalFieldCount);
                    CrossDataFieldObjects = CrossDataFieldObjects.concat(totalFields);
                };

                function Calendar_RettachMemoBoxDataField(memoBox, CrossOrderNoText) {
                    var text = memoBox.Text,
                        sepIndex = text.indexOf(":"),
                        newText;

                    if (sepIndex > 0) {
                        if (text.substring(2, sepIndex) === oHCrossFields[0].Name) {
                            if (CrossOrderNoText === "G") {
                                newText = "[#" + csz_CalendarDateFieldName;
                            }
                            else {
                                newText = text.substr(0, sepIndex) + CrossOrderNoText;
                            }
                            newText += text.substr(sepIndex);
                            memoBox.Text = newText;
                            return 1;
                        }
                    }

                    return 0;
                };

                function Calendar_CrossTabDefineGrid() {
                    var group = crossGrid.Groups.items[0],
                        field,
                        backColor;

                    function Calendar_DefineCrossGroups() {
                        var i,
                            oHCrossField = oHCrossFields[0],
                            tempDate = new Date(2009, 7, 30), //2009-8-30这天是星期天
                            originDate = oHCrossField.AsDateTime;

                        for (i = 0; i < 7; ++i) {
                            if (oHCrossField) {
                                //在动态生成交叉项的表头时,需要取原始记录集中的横向交叉字段的值生成表头文字
                                oHCrossField.AsDateTime = tempDate;
                            }
                            DefineCrossGroupItem(++CrossItemCount);
                            incDate(tempDate); //加一天
                        }
                        oHCrossField.AsDateTime = originDate;
                    };

                    function Calendar_RettachGroupSectionDataField(groupSection) {
                        var oHCrossField = oHCrossFields[0];

                        groupSection.Controls.forEach(function (control) {
                            if (control.ControlType === grenum.ControlType.FieldBox) {
                                if (oHCrossField.Name === control.DataField) {
                                    control.DataField = csz_CalendarDateFieldName;
                                }
                            }
                            else if (control.ControlType === grenum.ControlType.MemoBox) {
                                Calendar_RettachMemoBoxDataField(control, "G");
                            }
                        });
                    };

                    //将字段与列分别定义7份
                    Calendar_DefineCrossGroups();

                    //如果有分组，多加一个月份字段，并将分组的依据字段设为此字段
                    if (group) {
                        field = crossRecordset.Fields.Add();
                        field.FieldType = grenum.FieldType.Integer;
                        field.Name = csz_CalendarMonthFieldName;
                        oVCrossFields.push(field); //将这个月份分组依据字段存入 m_VCrossFieldObjects
                        group.ByFields = csz_CalendarMonthFieldName;

                        //加一个字段，专门存每行对应的日期，供在分组节中显示
                        field = crossRecordset.Fields.Add();
                        field.FieldType = grenum.FieldType.DateTime;
                        field.Format = oHCrossFields[0].Format;
                        field.Name = csz_CalendarDateFieldName;
                        oVCrossFields.push(field); //将这个字段存入 m_VCrossFieldObjects

                        //更新分组头尾中字段框与综合文字框关联的字段
                        Calendar_RettachGroupSectionDataField(group.Header);
                        Calendar_RettachGroupSectionDataField(group.Footer);
                    }

                    //如果有多个列，将第二列的背景色作为周日与周六的背景色
                    if (originColumns.Count > 1) {
                        backColor = originColumns.items[1].ContentCell.BackColor;
                        crossColumns.Item(1).ContentCell.BackColor = backColor; //设置星期日对应的列
                        crossColumns.Item(7).ContentCell.BackColor = backColor; //设置星期六对应的列
                    }
                }; //end of Calendar_DefineCrossGroups

                if (isCalendarReport) {
                    self.GroupAutoSum = false;

                    //首先找出日期字段
                    originRecordset.Fields.forEach(function (field) {
                        (field.FieldType === grenum.FieldType.DateTime) && oHCrossFields.push(field);
                    });
                    if (!oHCrossFields.length) {
                        throw new Error("None date field!");
                    }
                }
                else {
                    oHPercentColumns = originColumns.decodeItems(self.HPercentColumns);
                    oVPercentColumns = originColumns.decodeItems(self.VPercentColumns);
                    oTotalHPercentColumns = originColumns.decodeItems(self.TotalHPercentColumns);
                    oTotalVPercentColumns = originColumns.decodeItems(self.TotalVPercentColumns);
                    oTotalExcludeColumns = originColumns.decodeItems(self.TotalExcludeColumns);

                    oHCrossFields = originRecordset.decodeFields(self.HCrossFields);
                    if (!oHCrossFields.length) {
                        throw new Error("生成交叉表不成功，没有定义'横向交叉数据字段'！");
                    }

                    oVCrossFields = originRecordset.decodeFields(self.VCrossFields);
                    oDisabledSumFields = originRecordset.decodeFields(self.DisabledSumFields);

                    //半闭包形式
                    BeginCrossColNo = self.ListCols;
                    EndSubtotalColNo = originColumns.Count - self.TotalCols;
                    EndCrossColNo = EndSubtotalColNo - self.SubtotalCols;
                }

                //考虑多层表头的情况，指定首层标题格集合的交叉序号
                originTitleCellItems.forEach(function (titlecell, index) {
                    //var lastOrder = titlecell.findLastColumn().orderNo;
                    var lastColumn = titlecell.findLastColumn(),
                        lastOrder;

                    if (lastColumn) {
                        lastOrder = lastColumn.orderNo;

                        if (CrossTitleCellStartIndex < 0 && lastOrder >= BeginCrossColNo) {
                            CrossTitleCellStartIndex = index;
                        }
                        if (CrossTitleCellEndIndex < 0 && lastOrder + 1 >= EndCrossColNo) {
                            CrossTitleCellEndIndex = index;
                        }
                        if (SubtotalTitleCellBeginIndex < 0 && lastOrder >= EndCrossColNo) {
                            SubtotalTitleCellBeginIndex = index;
                        }
                        if (SubtotalTitleCellEndIndex < 0 && lastOrder + 1 >= EndSubtotalColNo) {
                            SubtotalTitleCellEndIndex = index;
                        }
                        if (TotalTitleCellBeginIndex < 0 && lastOrder >= EndSubtotalColNo) {
                            TotalTitleCellBeginIndex = index;
                        }
                    }
                });
                if (SubtotalTitleCellBeginIndex < 0) {
                    SubtotalTitleCellBeginIndex = CrossTitleCellEndIndex + 1;
                }
                if (TotalTitleCellBeginIndex < 0) {
                    TotalTitleCellBeginIndex = SubtotalTitleCellEndIndex + 1;
                }

                if (EndSubtotalColNo > EndCrossColNo && CrossTitleCellEndIndex >= SubtotalTitleCellBeginIndex) {
                    temp = originColumns.items[EndCrossColNo].TitleCell;
                    while (temp.SupCell) {
                        ++SubtotalTitleLayer;
                        temp = temp.SupCell;
                    }
                }


                CrossTabFindDataFields(); //找出要交叉的数据项，并列出其字段名称
                RemoveCrossDataFields();  //首先：从交叉记录集中去掉交叉数据项对应的字段。从交叉网格中去掉交叉数据列
                RemoveCrossSummaryBoxes(); //去掉分组头尾中与交叉数据列对齐的统计框
                crossGrid.clearColumns(); //去掉原有列与多层表头标题格

                if (isCalendarReport) {
                    Calendar_CrossTabDefineGrid();
                }
                else {
                    if (!DataFieldInfos.length) {
                        throw new Error("生成交叉表不成功，不存在交叉数据项！");
                    }
                    if (CrossTitleCellStartIndex <= 0) {
                        throw new Error("生成交叉表不成功，不存在交叉数据列！");
                    }

                    buildHCrossRecordIndexes(); //按横向交叉字段进行排序记录集

                    //定义项目列
                    for (i = 0; i < CrossTitleCellStartIndex; ++i) {
                        DoAddCrossColumn(originTitleCellItems[i], undefined, grenum.CrossColumnKind.List, undefined, 0, true, -1);
                    }

                    DefineFieldMaps(); //建立交叉记录集中保留字段与原始记录集字段之间的关系

                    //应该先定义字段，后定义交叉列及合计列，因为列有可能要引用字段对象，如给字段设置“Format”属性
                    //ATLASSERT( CrossDataFieldObjects.empty() );
                    defineHTotalFields(); //定义横向合计字段
                    TotalFieldCount = CrossDataFieldObjects.length;

                    //加合计列
                    self.HTotalAtFirst && DefineTotalColumns();

                    //如果只有一个上级格，有可能是多层表头，要创建动态组信息
                    for (i = CrossTitleCellStartIndex; i <= CrossTitleCellEndIndex; i++) {
                        DynamicTitleCellInfos.push([]);
                        BuildDynamicTitleCellInfos(originTitleCellItems[i]);
                    }

                    //建立交叉项
                    if (self.HCrossPeriodType === grenum.PeriodType.None) {
                        //建立常规交叉项
                        DefineNormalCrossGroups();
                    }
                    else {
                        //建立按期间产生交叉项
                        DefinePeriodCrossGroups();
                    }

                    //加合计列
                    !self.HTotalAtFirst && DefineTotalColumns();

                    //应该将合计字段从CrossDataFieldObjects的前面移动到尾部
                    (TotalFieldCount > 0) && moveTotalFieldsToEnd();

                    //保证横向求合计百分比的项目必须要有合计统计框，如没有则要要加一个隐藏的
                    CheckHPercentSum();
                }
            }; //end of CrossTabDefineGrid

            function CrossTabBuildData() {
                var recordIndexes,
                    VTotalValues = createArray(CrossItemCount * DataFieldInfos.length, 0); //存储纵向求和值,大小为 CrossGroupCount * DataFieldCount

                function buildVCrossRecordIndexes() {
                    var sortItems = [];

                    if (self.VResort) {
                        oVCrossFields.forEach(function (field) {
                            sortItems.push({
                                field: field,
                                asc: self.VSortAsc,
                                "case": 1
                            });
                        });

                        oHCrossFields.forEach(function (field) {
                            sortItems.push({
                                field: field,
                                asc: self.HSortAsc,
                                "case": 1
                            });
                        });
                    }

                    recordIndexes = originRecordset.sortRecords(sortItems, 1);
                };

                function DumpOneRecord(CrossGroupNo, VTotalValues) { //将原始一笔记录加载到交叉表中
                    //oHCrossFields.forEach(function (field, index) {
                    //    var fieldIndex = (oHCrossFields.length * CrossGroupNo) + index;
                    //    if (CrossHCrossFieldObjects[fieldIndex].IsNull) {
                    //        CrossHCrossFieldObjects[fieldIndex].Value = field.Value;
                    //    }
                    //});

                    DataFieldInfos.forEach(function (crossFieldInfo, crossfieldIndex) {
                        var fieldIndex = CrossDataFieldCount * CrossGroupNo + crossFieldInfo.DatafieldIndex,
                            val;

                        if (crossFieldInfo.NumericField) {
                            val = crossFieldInfo.originObject.AsFloat;
                            CrossDataFieldObjects[fieldIndex].AsFloat += val;

                            //横向与纵向合计，排除合计的数据项不进行累加
                            if (!crossFieldInfo.CalcHTotalExclude || !crossFieldInfo.TotalValue) { //!crossFieldInfo.TotalValue表示没设置值
                                crossFieldInfo.TotalValue += val;
                                VTotalValues && (VTotalValues[CrossGroupNo * DataFieldInfos.length + crossfieldIndex] += val);
                            }
                        }
                        else {
                            //对于非数字字段，如果已经设置过值，则不要再次设置
                            if (CrossDataFieldObjects[fieldIndex].IsNull) {
                                //如果originObject是部件框，肯定是MemoBox与Barcode，所以在MemoBox与Barcode实现了 Value 属性
                                CrossDataFieldObjects[fieldIndex].Value = crossFieldInfo.originObject.Value;
                            }
                        }
                    });
                };

                function AppendRecord() {
                    crossRecordset.Append();

                    ListFieldsPair.forEach(function (pair) {
                        pair.crossField.Value = pair.originField.Value;
                    });

                    CrossHCrossFieldObjects.forEach(function (field) {
                        field.Value = field._hfval;
                    });

                    //为横向求合计设初值
                    DataFieldInfos.forEach(function (crossFieldInfo) {
                        crossFieldInfo.TotalValue = 0;
                    });
                };

                function PostRecord() {
                    //写入计算横向合计值,并累加总计
                    var crossItemNo,
                        datafieldIndex = CrossDataFieldCount * CrossItemCount,
                        dataFields = CrossDataFieldObjects;

                    function PostHSummary(BegincrossItemNo, EndcrossItemNo, FieldInfo, SummaryFlag, TotalValue) {
                        //ATLASSERT(SummaryFlag.Flag && SummaryFlag.IsCalcHTotal());
                        var Count = EndcrossItemNo - BegincrossItemNo,
                            CountA = Count;

                        if (SummaryFlag.CalcHAverageA || SummaryFlag.CalcHCountA) {
                            for (crossItemNo = BegincrossItemNo; crossItemNo < EndcrossItemNo; crossItemNo++) {
                                if (CrossDataFieldObjects[CrossDataFieldCount * crossItemNo + FieldInfo.DatafieldIndex].IsNull) {
                                    --CountA;
                                }
                            }
                        }

                        //注意：以下代码顺序一定不能乱，必须与 CDF_CalcH...的定义顺序一致
                        dataFields[datafieldIndex].AsFloat = TotalValue;
                        datafieldIndex++;

                        if (SummaryFlag.CalcHAverage) {
                            (Count > 0) && (dataFields[datafieldIndex].AsFloat = TotalValue / Count);
                            datafieldIndex++;
                        }

                        if (SummaryFlag.CalcHAverageA) {
                            (CountA > 0) && (dataFields[datafieldIndex].AsFloat = TotalValue / CountA);
                            datafieldIndex++;
                        }

                        if (SummaryFlag.CalcHCount) {
                            dataFields[datafieldIndex].AsFloat = Count;
                            datafieldIndex++;
                        }

                        if (SummaryFlag.CalcHCountA) {
                            dataFields[datafieldIndex].AsFloat = CountA;
                            datafieldIndex++;
                        }

                        function calcM() {
                            var MinVal = Number.MAX_VALUE,
                                MaxVal = -Number.MAX_VALUE, //Number.MIN_VALUE,
                                field,
                                val;

                            for (crossItemNo = BegincrossItemNo; crossItemNo < EndcrossItemNo; ++crossItemNo) {
                                field = CrossDataFieldObjects[CrossDataFieldCount * crossItemNo + FieldInfo.DatafieldIndex];
                                if (!field.IsNull) {
                                    val = field.AsFloat;
                                    if (!isNaN(val)) {
                                        if (MinVal > val) {
                                            MinVal = val;
                                        }
                                        if (MaxVal < val) {
                                            MaxVal = val;
                                        }
                                    }
                                }
                            }
                            if (SummaryFlag.CalcHMin) {
                                if (MinVal < Number.MAX_VALUE) {
                                    dataFields[datafieldIndex].AsFloat = MinVal;
                                }
                                datafieldIndex++;
                            }
                            if (SummaryFlag.CalcHMax) {
                                if (MaxVal > -Number.MAX_VALUE) //Number.MIN_VALUE)
                                    dataFields[datafieldIndex].AsFloat = MaxVal;
                                datafieldIndex++;
                            }
                        };

                        (SummaryFlag.CalcHMin || SummaryFlag.CalcHMax) && calcM();
                    };

                    DataFieldInfos.forEach(function (crossFieldInfo) {
                        if (crossFieldInfo.HTotalFlag.Flag) {
                            PostHSummary(0, CrossItemCount, crossFieldInfo, crossFieldInfo.HTotalFlag, crossFieldInfo.TotalValue, CrossDataFieldObjects);

                            if (crossFieldInfo.CalcTotalHPercent) {
                                dataFields[datafieldIndex].AsFloat = 1;
                                datafieldIndex++;
                            }

                            if (crossFieldInfo.CalcTotalVPercent) {
                                datafieldIndex++;
                            }

                            crossFieldInfo.EntireTotalValue += crossFieldInfo.TotalValue;
                        }
                    });

                    //计算横向百分比
                    for (crossItemNo = 0; crossItemNo < CrossItemCount; ++crossItemNo) {
                        DataFieldInfos.forEach(function (crossFieldInfo) {
                            if (crossFieldInfo.CalcHPercent) {
                                datafieldIndex = (CrossDataFieldCount * crossItemNo) + crossFieldInfo.DatafieldIndex;
                                if (crossFieldInfo.TotalValue != 0) {
                                    CrossDataFieldObjects[datafieldIndex + 1].AsFloat = CrossDataFieldObjects[datafieldIndex].AsFloat / crossFieldInfo.TotalValue;
                                }
                                else {
                                    CrossDataFieldObjects[datafieldIndex + 1].Clear();
                                }
                            }
                        });
                    }

                    //<<计算交叉小计/////////////////////////////////////////////////////////////////////////
                    function calcSubtotal() {
                        var OneSubtotalFieldCount = SubtotalFieldObjects.length / SubtotalCrossItemEndIndexs.length, //每个小计项记录数据的字段个数
                            BeginGrossItemIndex = 0;

                        SubtotalCrossItemEndIndexs.forEach(function (EndGrossItemIndex, SubtotalIndex) {
                            var SubtotalValues = createArray(DataFieldInfos.length, 0);

                            for (crossItemNo = BeginGrossItemIndex; crossItemNo < EndGrossItemIndex; ++crossItemNo) {
                                DataFieldInfos.forEach(function (crossFieldInfo, index) {
                                    SubtotalValues[index] += CrossDataFieldObjects[CrossDataFieldCount * crossItemNo + crossFieldInfo.DatafieldIndex].AsFloat;
                                });
                            }

                            dataFields = SubtotalFieldObjects;
                            datafieldIndex = OneSubtotalFieldCount * SubtotalIndex;
                            DataFieldInfos.forEach(function (crossFieldInfo, index) {
                                PostHSummary(BeginGrossItemIndex, EndGrossItemIndex, crossFieldInfo, crossFieldInfo.HSubtotalFlag, SubtotalValues[index]);
                            });

                            BeginGrossItemIndex = EndGrossItemIndex;
                        });
                    };

                    SubtotalCrossItemEndIndexs.length && calcSubtotal();
                    //>>计算交叉小计/////////////////////////////////////////////////////////////////////////.

                    crossRecordset.Post();
                }; //end of PostRecord

                function CalcVValues() {
                    var SubtotalVal,
                        SubtotalTotal,
                        subtotalNo,
                        crossItemNo,
                        fieldIndex,
                        val,
                        valTotal;

                    crossRecordset.First();
                    while (!crossRecordset.Eof()) {
                        crossRecordset.Edit();

                        SubtotalVal = 0;
                        SubtotalTotal = 0;
                        subtotalNo = 0;
                        for (crossItemNo = 0; crossItemNo < CrossItemCount; ++crossItemNo) {
                            DataFieldInfos.forEach(function (crossFieldInfo, crossfieldIndex) {
                                if (crossFieldInfo.CalcVPercent) {
                                    fieldIndex = CrossDataFieldCount * crossItemNo + crossFieldInfo.DatafieldIndex;
                                    val = CrossDataFieldObjects[fieldIndex].AsFloat;
                                    valTotal = VTotalValues[crossItemNo * DataFieldInfos.length + crossfieldIndex];

                                    if (crossFieldInfo.CalcHPercent) {
                                        ++fieldIndex;
                                    }
                                    ++fieldIndex;

                                    if (valTotal) {
                                        CrossDataFieldObjects[fieldIndex].AsFloat = val / valTotal;
                                    }
                                    //else
                                    //    CrossDataFieldObjects[fieldIndex]->Clear();

                                    SubtotalVal += val;
                                    SubtotalTotal += valTotal;

                                }
                            });

                            //Subtotal
                            if (crossItemNo === SubtotalCrossItemEndIndexs[subtotalNo]) {
                                DataFieldInfos.forEach(function (crossFieldInfo) {
                                    if (crossFieldInfo.CalcVPercent) {
                                        fieldIndex = (CrossDataFieldCount * subtotalNo) + crossFieldInfo.DatafieldIndex + 1 + (crossFieldInfo.CalcHPercent ? 1 : 0);
                                        if (SubtotalTotal) {
                                            SubtotalFieldObjects[fieldIndex].AsFloat = SubtotalVal / SubtotalTotal;
                                        }
                                        //else
                                        //    SubtotalFieldObjects[fieldIndex]->Clear();
                                    }
                                });
                                subtotalNo++;
                            }
                        }

                        //合计
                        fieldIndex = CrossDataFieldCount * CrossItemCount;
                        DataFieldInfos.forEach(function (crossFieldInfo) {
                            var htotalFlag = crossFieldInfo.HTotalFlag;

                            if (fieldIndex < CrossDataFieldObjects.length) {
                                val = CrossDataFieldObjects[fieldIndex].AsFloat;

                                htotalFlag.CalcHTotal && ++fieldIndex;
                                htotalFlag.CalcHAverage && ++fieldIndex;
                                htotalFlag.CalcHAverageA && ++fieldIndex;
                                htotalFlag.CalcHCount && ++fieldIndex;
                                htotalFlag.CalcHCountA && ++fieldIndex;
                                htotalFlag.CalcHMin && ++fieldIndex;
                                htotalFlag.CalcHMax && ++fieldIndex;
                                crossFieldInfo.CalcTotalHPercent && ++fieldIndex;

                                if (crossFieldInfo.CalcTotalVPercent) {
                                    if (crossFieldInfo.EntireTotalValue) {
                                        CrossDataFieldObjects[fieldIndex].AsFloat = val / crossFieldInfo.EntireTotalValue;
                                    }
                                    ++fieldIndex;
                                }
                            }
                        });

                        crossRecordset.Post();

                        crossRecordset.Next();
                    }
                }; //end of CalcVValues

                function Calendar_CrossTabBuildData() {
                    var periodRange = prepareDateRange(),
                        sortItems = [],
                        recordCount,
                        index = 0,
                        //originDate,
                        weekDay,
                        month,
                        i;

                    //首先让数据按日期字段进行排序
                    sortItems.push({
                        field: oHCrossFields[0],
                        asc: 1,
                        "case": 1
                    });
                    recordIndexes = originRecordset.sortRecords(sortItems, 1);
                    recordCount = recordIndexes.length;

                    //遍历原始记录集，将数据计算并填入到交叉记录集中
                    while (periodRange.begin <= periodRange.end) {
                        while (index < recordCount) {
                            originRecordset.MoveTo(recordIndexes[index]);
                            if (oHCrossFields[0].AsDateTime >= periodRange.begin) {
                                break;
                            }
                            index++;
                        }

                        weekDay = periodRange.begin.getDay(); //一个介于 0 和 6 之间的整数，该整数表示星期数（0 表示周日，6 表示周六）。
                        month = periodRange.begin.getMonth(); //介于 0（1 月）和 11（12 月）之间的整数

                        AppendRecord();
                        if (oVCrossFields.length) {
                            oVCrossFields[0].AsInteger = month + 1;
                            oVCrossFields[1].AsDateTime = periodRange.begin;
                        }
                        for (i = weekDay; i < 7; ++i) {
                            CrossHCrossFieldObjects[i].AsDateTime = periodRange.begin;

                            while (index < recordCount) {
                                originRecordset.MoveTo(recordIndexes[index]);
                                if (oHCrossFields[0].AsDateTime > periodRange.begin) {
                                    break;
                                }

                                DumpOneRecord(i, undefined);
                                index++;
                            }

                            incDate(periodRange.begin);
                            if (periodRange.begin > periodRange.end || (oVCrossFields.length && month !== periodRange.begin.getMonth())) {
                                break;
                            }
                        }
                        PostRecord();
                    }
                }; //end of Calendar_CrossTabBuildData

                if (isCalendarReport) {
                    Calendar_CrossTabBuildData();
                }
                else {
                    buildVCrossRecordIndexes();

                    //遍历原始记录集，计算数据并填入到交叉记录集中
                    recordIndexes.forEach(function (recordNo, index) {
                        //忽略掉专门添加的纵向记录
                        if (recordNo < self.HAddedItemRecordOffsetBegin || recordNo >= self.HAddedItemRecordOffsetEnd) {
                            originRecordset.MoveTo(recordNo);

                            if (!index || originRecordset.fieldsKeepedValueChanged(oVCrossFields)) {
                                originRecordset.keepValue();
                                index && PostRecord(); //提交上一记录
                                AppendRecord(); //增加新记录行
                            }
                        }

                        //设置交叉数据项的值
                        originRecordset.curRecord._CrossNo_ && DumpOneRecord(originRecordset.curRecord._CrossNo_ - 1, VTotalValues); //将原始一笔记录加载到交叉表中

                    });
                    PostRecord(); //提交最后一笔数据

                    //求纵向数据
                    if (DataFieldInfos.some(function (crossFieldInfo) {
                        return crossFieldInfo.CalcVPercent || crossFieldInfo.CalcTotalVPercent;
                    })) {
                        CalcVValues();
                    }
                }
            }; //end of CrossTabBuildData

            //清理上一次的生成数据
            self.HAddedItemRecordOffsetBegin = -1;		//额外补充的横向交叉记录的开始位置
            self.HAddedItemRecordOffsetEnd = -1;		//额外补充的横向交叉记录的结束位置，不包含此值
            self.VAddedItemRecordOffsetBegin = -1;		//额外补充的纵向交叉记录的开始位置
            self.VAddedItemRecordOffsetEnd = -1;		//额外补充的纵向交叉记录的结束位置，不包含此值
            self.HPercentSums = [],  //横向求百分比求合计信息

            crossGrid.assign(originGrid);
            crossGrid.IsCrossTab = 0;
            crossGrid.Recordset.BeforePostRecordScript = ""; //交叉表记录集不要执行提交记录脚本
            crossGroupItems = crossGrid.Groups.items,

            CrossTabDefineGrid();

            CrossTabBuildData();

            //交叉网格生成完备，对交叉网格进行生成前准备
            report.RunningDetailGrid = crossGrid;
            crossGrid.attachData();
            crossGrid.prepare();
        }, //end of prepare

        unprepare: function () {
            //var self = this;

            //self.CrossTab && self.CrossTab.unprepare();
        },

        GroupEndProcess: function (group) {
            var self = this;

            self.HPercentSums.forEach(function (hpercentsum) {
                var total;

                if (hpercentsum.Group === group) {
                    total = hpercentsum.TotalSumBox.Value;

                    hpercentsum.DataSumBoxes.forEach(function (datasumbox) {
                        if (total) {
                            datasumbox.Value /= total;
                        }
                        else {
                            datasumbox.Value = 0;
                        }
                    });

                    hpercentsum.TotalSumBox.Value = 1;
                }
            });
        },

        getClickedCellHCrossFieldValue: function (fieldName) {
            var detailgrid = this.report.RunningDetailGrid,
                clickedCell = detailgrid.clickedCell,
                clickedCrossNo = clickedCell ? clickedCell.getAttribute("_grcrossno") : 0,
                field,
                value;

            if (clickedCrossNo) {
                field = detailgrid.Recordset.Fields.Item(fieldName + "_" + clickedCrossNo);
                field && (value = field.Value);
            }

            return value;
        },
        getClickedCellHCrossPeriod: function () {
            var self = this,
                detailgrid = self.report.RunningDetailGrid,
                clickedCell = detailgrid.clickedCell,
                clickedCrossNo = clickedCell ? "_" + clickedCell.getAttribute("_grcrossno") : 0,
                value;

            clickedCrossNo &&
                (value = grhelper.periodRangeBy(detailgrid.Recordset.Fields.Item(self.HCrossFields + clickedCrossNo).AsDateTime, self.HCrossPeriodType));

            return value;
        },

        //com interface
        //[propget, id(45), helpstring("property Recordset")] HRESULT Recordset([out, retval] IGRRecordset** pVal);
        get Recordset() {
            var report = this.report,
                RunningDetailGrid = report.RunningDetailGrid;

            //如果 RunningDetailGrid 不是 DetailGrid，则其是交叉表创建的明细网格对象
            return (RunningDetailGrid != report.DetailGrid) ? RunningDetailGrid.Recordset : undefined;
        },

        ////定义添加横向与纵向数据条目的方法
        //[id(50), helpstring("method HBeginAddItem")] HRESULT HBeginAddItem(void);
        HBeginAddItem: function () {
            var self = this;

            self.HAddedItemRecordOffsetBegin = self.report.RunningDetailGrid.Recordset.RecordCount;
        },
        //[id(51), helpstring("method HEndAddItem")] HRESULT HEndAddItem(void);
        HEndAddItem: function () {
            var self = this;

            self.HAddedItemRecordOffsetEnd = self.report.RunningDetailGrid.Recordset.RecordCount;
        },
        //[id(52), helpstring("method VBeginAddItem")] HRESULT VBeginAddItem(void);
        VBeginAddItem: function () {
            var self = this;

            self.VAddedItemRecordOffsetBegin = self.report.RunningDetailGrid.Recordset.RecordCount;
        },
        //[id(53), helpstring("method VEndAddItem")] HRESULT VEndAddItem(void);
        VEndAddItem: function () {
            var self = this;

            self.VAddedItemRecordOffsetEnd = self.report.RunningDetailGrid.Recordset.RecordCount;
        },
        //[id(54), helpstring("method GetCurPeriodBeginDate")] HRESULT GetCurPeriodBeginDate([out, retval] DATE* pVal);
        GetCurPeriodBeginDate: function () {
            return this.curPeriod.begin;
        },
        //[id(55), helpstring("method GetCurPeriodEndDate")] HRESULT GetCurPeriodEndDate([out, retval] DATE* pVal);
        GetCurPeriodEndDate: function () {
            return this.curPeriod.end;
        },
    };
    prototypeCopyExtend(CrossTab, Object);

    //gr.dom.CrossTab = CrossTab;
    //{{END CODE}}

    window.CrossTab = CrossTab;
})();
