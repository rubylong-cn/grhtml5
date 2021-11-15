var gr = gr || {};

(function (undefined) {
    "use strict";

    //{{BEGIN CODE}}
    //报表对象程序模块
    gr.dom = {};

    var grenum = gr.enum_,
        grconst = gr.const_,
        grcommon = gr.common,
        grhelper = gr.helper,
        grformat = gr.format,
        grexp = gr.exp,

        BooleanFormatter = grformat.BooleanFormatter,
        DateTimeFormatter = grformat.DateTimeFormatter,
        NumericFormatter = grformat.NumericFormatter,

        Summary = grexp.Summary, //dom
        TextBuilder = grexp.TextBuilder,

        DateTime = grcommon.DateTime, //dom/crosstab  format
        Rect = grcommon.Rect, //dom/chart
        Pen = grcommon.Pen, //dom/chart
        Border = grcommon.Border, //dom
        Font = grcommon.Font, //dom
        FontWrapper = grcommon.FontWrapper, //dom
        TextFormat = grcommon.TextFormat, //dom
        Context = grcommon.Context, //dom/chart
        Graphics = grcommon.Graphics, //dom
        HtmlStyles = grcommon.HtmlStyles, //dom viewer
        HtmlElement = grcommon.HtmlElement, //dom

        assignJSONMembers = grhelper.assignJSONMembers, //dom
        enumMemberValid = grhelper.enumMemberValid, //dom/chart/crosstab
        enumBitMemberValid = grhelper.enumBitMemberValid, //dom
        colorMemberValid = grhelper.colorMemberValid, //dom/chart

        fontString = grhelper.fontString, //dom/chart
        fontHeight = grhelper.fontHeight, //dom/chart

        intFixed = grhelper.intFixed, //dom/crosstab format
        pixelsToHtml = grhelper.pixelsToHtml, //dom viewer
        percentToHtml = grhelper.percentToHtml,//dom 

        cloneDate = grhelper.cloneDate, //dom/crosstab
        confirmDateValue = grhelper.confirmDateValue, //dom format
        confirmCloneDateValue = grhelper.confirmCloneDateValue, //dom format
        strimDate = grhelper.strimDate, //dom/crosstab
        incDate = grhelper.incDate, //dom/crosstab
        incDate2 = grhelper.incDate2, //dom/crosstab

        confirmBooleanValue = grhelper.confirmBooleanValue, //dom format

        ensureNameText = grhelper.ensureNameText, //dom/crosstab expression

        enumName2Value = grhelper.enumName2Value, //dom expression
        enumValue2Name = grhelper.enumValue2Name, //dom/crosstab expression

        rgba2color = grhelper.rgba2color, //dom/chart format
        colorAlpha = grhelper.colorAlpha, //dom
        color2rgba = grhelper.color2rgba, //dom/chart format
        colorGradientLight = grhelper.colorGradientLight, //dom/chart
        colorGradientDark = grhelper.colorGradientDark, //dom/chart
        //colorValue2Html = grhelper.colorValue2Html, //dom viewer

        prototypeLinkExtend = grhelper.prototypeLinkExtend, //dom/chart
        prototypeCopyExtend = grhelper.prototypeCopyExtend, //dom/chart/crosstab expression

        createArray = grhelper.createArray, //dom/chart/crosstab
        assignObjectEx = grhelper.assignObjectEx, //dom/crosstab
        assignObject = grhelper.assignObject, //dom viewer
        assignObjectAtom = grhelper.assignObjectAtom, //dom/crosstab

        parseXML = grhelper.parseXML, //dom/chart viewer

        getRelativePosition = grhelper.getRelativePosition, //dom/chart
        addEvent = grhelper.addEvent, //dom/chart
        bindEvents = grhelper.bindEvents, //dom/chart

        wrPropNameEncode = gr.wr? gr.wr.wrPropNameEncode : undefined,

        toDegree = grhelper.toDegree, //dom/chart
        toRadians = grhelper.toRadians; //dom/chart

    /////////////////////////////////////////////////////////////////////////
    var uidCanvas = (function () {
        var id = 0;
        return function () {
            return "-gr-canvas-" + id++;
        };
    })();

    var calcSectionsHeightPercent = function (sections) {
        var totalHeight = 0,
            totalPercent = 0;

        if (sections.length) {
            sections.forEach(function (section) {
                totalHeight += section.pxHeight;
            });

            sections.forEach(function (section) {
                section.pctHeight = Math.round(section.pxHeight * 100 / totalHeight);
                totalPercent += section.pctHeight;
            });

            //因为Math.round的原因，totalPercent有可能不是100
            sections[0].pctHeight += 100 - totalPercent;
        }
    };

    /////////////////////////////////////////////////////////////////////////
    /**
     * @class
     */
    var Collection = function (owner) {
        var self = this;

        self.owner = owner;
        self.items = [];
    };
    Collection.prototype = {
        loadFromJSON: function (jsonItems) {
            var i = 0,
                len;

            if (jsonItems) {
                len = jsonItems.length;
                while (i < len) {
                    this._doloadItem(jsonItems[i++]);
                }
            }
        },

        getJsonMember: function (prop) {
            grhelper.GRASSERT(!this.owner.report.isWR || !!wrPropNameEncode(prop), "");
            return this.owner.report.isWR ? wrPropNameEncode(prop) : prop;
        },

        assign: function (from) {
            var self = this;

            self.RemoveAll();
            from.forEach(function (item) {
                self.Add().assign(item);
            });
        },

        attachData: function () {
            var items = this.items,
                i = items.length;

            while (i--) {
                items[i].attachData();
            }
        },

        prepare: function () {
            var items = this.items,
                i = 0,
                len = items.length;

            //必须按增序执行，部件框要求这样
            while (i < len) {
                items[i++].prepare();
            }
        },

        unprepare: function () {
            var items = this.items,
                i = items.length;

            while (i--) {
                items[i].unprepare();
            }
        },

        generate: function (parentElement) {
            var items = this.items,
                i = 0,
                len = items.length;

            while (i < len) {
                items[i++].generate(parentElement);
            }
        },

        itemByName: function (name) {
            var items = this.items,
                i = items.length,
                item;

            if (name) {
                name = name.toUpperCase();
                while (i--) {
                    item = items[i];
                    if (item.Name.toUpperCase() === name)
                        return item;
                }
            }
            return undefined;
        },

        indexOfCOMIndex: function (index) {
            if (index) {
                if (typeof index !== "number") {
                    index = this.IndexByName(index || "");
                }
                --index;
            }
            else {
                index = -1;
            }
            return index;
        },

        indexOf: function (item) {
            var items = this.items,
                i = items.length;

            while (i--) {
                if (item === items[i])
                    return i;
            }

            return -1;
        },

        //从名称序列中解析出匹配的元素集合,返回值为数组
        decodeItems: function (nametexts) {
            var self = this,
                items = [],
                names;

            if (nametexts) {
                names = nametexts.split(";");
                names.forEach(function (name) {
                    var item;

                    name = name.trim();
                    item = self.itemByName(name);
                    item && items.push(item);
                });
            }

            return items;
        },

        forEach: function (callback) {
            this.items.forEach(callback);
        },

        //private
        _doloadItem: function (jsonItem) { //virtaul function
            this.Add().loadFromJSON(jsonItem);
        },

        //com interface
        //member Collection.Count
        /** 
         */
        get Count() {
            return this.items.length;
        },

        /** 
         */
        Item: function (index) {
            var self = this;

            return self.items[self.indexOfCOMIndex(index)];
        },

        /** 
         */
        Add: function () {
            var self = this,
                item = self._createItem();

            self.items.push(item);
            return item;
        },

        /** 
         */
        Remove: function (index) {
            var self = this;

            index = self.indexOfCOMIndex(index);
            (index >= 0) && self.items.splice(index, 1);
        },

        /** 
         * @function Collection.RemoveAll
         */
        RemoveAll: function () {
            this.items = [];
        },

        /** 
         * @function Collection.IndexByName
         */
        IndexByName: function (name) {
            var items = this.items,
                i = items.length;

            if (name) {
                while (i--) {
                    if (items[i].Name === name)
                        return i + 1;
                }
            }
            return -1;
        },

        /** 
         * @function Collection.ItemAt
         */
        ItemAt: function (i) {
            var items = this.items;

            i--;
            return (i >= 0 && i < items.length) ? items[i] : undefined;
        },

        /** 
         * @function Collection.ChangeItemOrder
         */
        ChangeItemOrder: function (oldIndex, newIndex) {
            var items = this.items;
            o,
            len = items.length;

            newIndex = Math.max(1, Math.min(len, newIndex)) - 1;
            if ((oldIndex != newIndex) && (oldIndex > 0 && oldIndex-- <= len)) {
                o = items[oldIndex];
                if (oldIndex < newIndex) {
                    do {
                        items[oldIndex] = items[oldIndex + 1]
                    } while (++oldIndex < newIndex)
                }
                else {
                    do {
                        items[oldIndex] = items[oldIndex - 1]
                    } while (--oldIndex > newIndex)
                    items[newIndex] = o;
                }
            }
        },
    };

    /**
     * @class Controls
     * @extends Collection
     */
    var Controls = function (owner) {
        Collection.call(this, owner);
    };
    Controls.prototype = {
        _doloadItem: function (jsonitem) {
            var self = this,
                item = self.Add(enumName2Value(grenum.ControlType, jsonitem[self.getJsonMember("Type")]));

            item && item.loadFromJSON(jsonitem);
        },

        /** 
         * @function Controls.assign
         */
        assign: function (from) { //override
            var self = this;

            self.RemoveAll();
            from.forEach(function (item) {
                self.Add(item.ControlType).assign(item);
            });
        },

        layout: function () {
            var self = this,
                items = self.items,
                dockRect = self.owner.getRect(),
                i = 0,
                len = items.length;

            while (i < len) {
                items[i++].layout(dockRect); //dockRect在函数调用过程中会改变
            }
        },

        generate: function (parentElement) {
            var items = this.items,
                i = items.length,
                control;

            while (i--) {
                control = items[i];
                control.Visible && control.generate(parentElement);
            }
        },

        Add: function (type) {
            var self = this;

            function createControl(type, parent) {
                var o = undefined;

                switch (type) {
                    case grenum.ControlType.StaticBox:
                        o = new StaticBox(parent);
                        break;
                    case grenum.ControlType.ShapeBox:
                        o = new ShapeBox(parent);
                        break;
                    case grenum.ControlType.Line:
                        o = new Line(parent);
                        break;
                    case grenum.ControlType.SystemVarBox:
                        o = new SystemVarBox(parent);
                        break;
                    case grenum.ControlType.FieldBox:
                        o = new FieldBox(parent);
                        break;
                    case grenum.ControlType.SummaryBox:
                        o = new SummaryBox(parent);
                        break;
                    case grenum.ControlType.PictureBox:
                        o = new PictureBox(parent);
                        break;
                    case grenum.ControlType.MemoBox:
                        o = new MemoBox(parent);
                        break;
                    case grenum.ControlType.SubReport:
                        o = new SubReport(parent);
                        break;
                    case grenum.ControlType.Chart:
                        o = new Chart(parent);
                        break;
                    case grenum.ControlType.Barcode:
                        o = new Barcode(parent);
                        break;
                    case grenum.ControlType.FreeGrid:
                        o = new FreeGrid(parent);
                        break;
                    case grenum.ControlType.RichTextBox:
                        o = new RichTextBox(parent);
                        break;
                }
                grhelper.GRASSERT(o, "");
                return o;
            };

            var item = createControl(type, self.owner);
            item && self.items.push(item);
            return item;
        },
    };
    prototypeLinkExtend(Controls, Collection);

    var Columns = function (owner) {
        Collection.call(this, owner);
    };
    Columns.prototype = {
        _doloadItem: function (jsonItem) {
            var self = this,
                column = new Column(self.owner);

            column.loadFromJSON(jsonItem);
            self.items.push(column);
        },

        addTo: function (titleCells) {
            var self = this,
                contentCells = self.owner.ColumnContent.ContentCells,
                titlecell,
                contentcell,
                column = new Column(self.owner);

            self.items.push(column);

            titlecell = new ColumnTitleCell(titleCells, false);
            titleCells.items.push(titlecell);
            column.TitleCell = titlecell;
            titlecell.Column = column;

            contentcell = new ColumnContentCell(contentCells);
            contentCells.items.push(contentcell);
            column.ContentCell = contentcell;
            contentcell.Column = column;

            return column;
        },

        Add: function () { //同时增加 ContentCell 与 TitleCell
            var self = this;
            return self.addTo(self.owner.ColumnTitle.TitleCells);
        },

        Remove: function (index) { //时删除 ContentCell 与 TitleCell
            var self = this,
                detailgrid = self.owner,
                ccs = detailgrid.ColumnContent.ContentCells.items,
                column;

            function removeTitleCell(titleCells, titleCell) {
                var item,
                    i,
                    index = titleCells.indexOf(titleCells);

                if (index >= 0) {
                    titleCells.splice(index, 1);
                    return 1;
                }

                index = titleCells.length;
                for (i = 0; i < index; i++) {
                    item = titleCells[i];
                    if (item.GroupTitle) {
                        if (removeTitleCell(item.SubTitles.items, titleCell)) {
                            return 1;
                        }
                    }
                }

                return 0;
            };

            index = self.indexOfCOMIndex(index);
            if (index >= 0) {
                column = self.items[index];

                ccs.splice(ccs.indexOf(column.ContentCell), 1);
                removeTitleCell(detailgrid.ColumnTitle.TitleCells.items, column.TitleCell);
                self.items.splice(index, 1);
            }
        },

        RemoveAll: function () {
            var self = this,
                detailgrid = self.owner;

            self.items = [];
            detailgrid.ColumnContent.ContentCells.items = [];
            detailgrid.ColumnTitle.TitleCells.items = [];
        },
    };
    prototypeLinkExtend(Columns, Collection);

    var ColumnTitleCells = function (owner, supcell) {
        var self = this;

        Collection.call(self, owner);

        self.supcell = supcell;
    };
    ColumnTitleCells.prototype = {
        _doloadItem: function (jsonItem) {
            var self = this,
                cell = new ColumnTitleCell(self, jsonItem[self.getJsonMember("GroupTitle")]);

            cell.loadFromJSON(jsonItem);
            self.items.push(cell);
        },

        assign: function (from) { //override
            var self = this;

            self.items = [];
            from.forEach(function (item) {
                var obj = new ColumnTitleCell(self, item.GroupTitle);
                self.items.push(obj);

                obj.assign(item);

                item.GroupTitle && obj.SubTitles.assign(item.SubTitles);
            });
        },

        //com interface
        AddGroup: function (name, titletext) {
            var self = this,
                item = new ColumnTitleCell(self, true);

            item.Name = name;
            item.Text = titletext;

            self.items.push(item);

            return item;
        },

        RemoveGroup: function (index) {
            var self = this,
                item = self.Item(index);

            if (item && item.GroupTitle) {
                Collection.prototype.Remove.call(self, index);
                self.items = self.items.concat(item.SubTitles.items);
            }
        },

        Add: function () { //禁止通过此方法增加
        },

        Remove: function (index) { //禁止通过此方法删除
        },

        RemoveAll: function () { //禁止通过此方法删除
        },
    };
    prototypeLinkExtend(ColumnTitleCells, Collection);

    var ColumnContentCells = function (owner) {
        Collection.call(this, owner);
    };
    ColumnContentCells.prototype = {
        _doloadItem: function (jsonItem) {
            var self = this,
                cell = new ColumnContentCell(self);

            cell.loadFromJSON(jsonItem);
            self.items.push(cell);
        },

        assign: function (from) { //override
            var self = this;

            self.items = [];
            from.forEach(function (item) {
                var obj = new ColumnContentCell(self);
                self.items.push(obj);

                obj.assign(item);
            });
        },

        Add: function () { //禁止通过此方法增加
        },

        ChangeItemOrder: function (oldIndex, newIndex) { //禁止此方法
        },

        Remove: function (index) { //禁止通过此方法删除
        },

        RemoveAll: function () { //禁止通过此方法删除
        },
    };
    prototypeLinkExtend(ColumnContentCells, Collection);

    var Fields = function (owner) {
        Collection.call(this, owner);
    };
    Fields.prototype._createItem = function () {
        return new Field(this.owner);
    };
    prototypeLinkExtend(Fields, Collection);

    var Groups = function (owner) {
        Collection.call(this, owner);
    };
    Groups.prototype = {
        _createItem: function () {
            return new Group(this.owner);
        },

        _doloadItem: function (jsonItem) { //virtaul function
            !jsonItem.PageGroup && this.Add().loadFromJSON(jsonItem);
        },
    };
    prototypeLinkExtend(Groups, Collection);

    var ReportHeaders = function (owner) {
        Collection.call(this, owner);
    };
    ReportHeaders.prototype._createItem = function () {
        return new ReportHeader(this.owner);
    };
    prototypeLinkExtend(ReportHeaders, Collection);

    var ReportFooters = function (owner) {
        Collection.call(this, owner);
    };
    ReportFooters.prototype._createItem = function () {
        return new ReportFooter(this.owner);
    };
    prototypeLinkExtend(ReportFooters, Collection);

    var Parameters = function (owner) {
        Collection.call(this, owner);
    };
    Parameters.prototype._createItem = function () {
        return new Parameter(this.owner);
    };
    prototypeLinkExtend(Parameters, Collection);

    /////////////////////////////////////////////////////////////////////////
    var Object = function (owner) {
        var self = this;

        self.owner = owner;
        self.report = owner.report;
        self.Tag = "";

        grhelper.GRASSERT(owner, "object owner isn't assigned");
    };
    Object.prototype = {
        afterLoad: function (objJson) {
        },

        loadFromJSON: function (objJson) {
            var self = this;

            if (objJson) {
                assignJSONMembers(self, objJson);

                self.afterLoad(objJson);
            }
        },

        assign: function (from) {
            var self = this,
                font = self.Font,
                onclick = from.onclick,
                ondblclick = from.ondblclick,
                m,
                tn;

            for (var name in from) {
                if (self.hasOwnProperty(name)) { //只复制自己存在的属性,如将一个统计框复制给一个静态框, 就不应该复制静态框不需要的属性
                    m = from[name];
                    tn = typeof m;
                    if (tn !== "object" && tn !== "array") {
                        self[name] = m;
                    }
                }
            }

            font && font.assign(from.Font);

            onclick && (self.onclick = onclick);
            ondblclick && (self.ondblclick = ondblclick);

            if (self.children) {
                self.children.forEach(function (child) {
                    var c = from[child];
                    if (c) {
                        if (c.owner) { //有owner表示是 Object 或 Collection 对象 (c.isPrototypeOf(Object) || c.isPrototypeOf(Collection)){
                            self[child].assign(c);
                        }
                        else {
                            assignObject(self[child], c);
                        }
                    }
                });
            }
        },
        //unprepare: function () {
        //},

        registerEventClass: function () {
            var self = this,
                events = self.report.viewer._domevents,
                onclick = self.onclick,
                ondblclick = self.ondblclick;

            if (onclick && !self.onclickClassID) {
                events.push({
                    obj: self,
                    type: grenum.elementEventType.click,
                    fun: onclick
                });
                self.onclickClassID = events.length;
            }

            if (ondblclick && !self.ondblclickClassID) {
                events.push({
                    obj: self,
                    type: grenum.elementEventType.dblclick,
                    fun: ondblclick
                });
                self.ondblclickClassID = events.length;
            }
        },

        addElementEventClass: function (element) {
            var self = this,
                viewer = self.report.viewer,
                onclickClassID = self.onclickClassID,
                ondblclickClassID = self.ondblclickClassID;

            onclickClassID && element.addClass(viewer._getEventCSSName(onclickClassID));
            ondblclickClassID && element.addClass(viewer._getEventCSSName(ondblclickClassID));
        },

        getUsingFont: function () {
            return this.Font.UsingFont();
        },

        getJsonMember: function (prop) {
            grhelper.GRASSERT(!this.owner.report.isWR || !!wrPropNameEncode(prop), "");
            return this.report.isWR ? wrPropNameEncode(prop) : prop;
        },

        toFillBack: function () {
            var self = this;

            return (self.BackColor !== self.owner.BackColor);
        },

        //get Parent() { //这样不行
        //    return this.owner;
        //},
    };

    var CellBase = function (owner) {
        var self = this;

        Object.call(self, owner);

        self._borderCustom = false;
        self.BackColor = owner.BackColor;

        self.CanGrow = false;
        self.CanShrink = false;

        self.Font = new FontWrapper(owner.Font);

        self._freeCell = true; //让下一句 setFreeCell 执行是起作用的
        self.setFreeCell(false);
    };
    CellBase.prototype = {
        loadFromJSON: function (objJson) {
            var self = this;

            if (objJson) {
                self.setFreeCell(!!objJson[self.getJsonMember("FreeCell")]); //必须在 FreeCell 属性值未设置前执行才有效果

                assignJSONMembers(self, objJson);

                self.afterLoad(objJson);
            }
        },

        afterLoad: function (objJson) {
            var self = this,
                report = self.report,
                alpha = report.viewer.alpha,
                isWR = report.isWR;

            colorMemberValid(self, "BackColor", alpha.background);
            colorMemberValid(self, "ForeColor", alpha.text);

            self.Font.loadFromJSON(objJson.Font, isWR);

            self.setBorderCustom(objJson[self.getJsonMember("BorderCustom")]);
            if (self._borderCustom) {
                self.Border.loadFromJSON(objJson.Border, alpha.border, isWR);
            }

            if (self.FreeCell) {
                self.Controls.loadFromJSON(objJson.Control);
            }
            else {
                self.TextFormat.loadFromJSON(objJson, isWR); //TextFormat直接定义在文字部件框上
            }
        },

        assign: function (from) {
            var self = this,
                control;

            //必须在 Object.prototype.assign.call(self, from); 之前，让必要的创建行为生效
            self.setFreeCell(from.FreeCell);
            self.setBorderCustom(from.BorderCustom);

            Object.prototype.assign.call(self, from);

            self.Font.assign(from.Font);
            from.Border && assignObject(self.Border, from.Border);

            if (from.FreeCell) {
                self.Controls.assign(from.Controls);

                if (self.isSingleDockControl()) {
                    control = self.Controls.items[0];

                    //如果部件框本身没有定义交互事件，需要把单元格的事件设置到部件框，这样单元格的事件才会有效
                    !control.onclick && self.onclick && (control.onclick = self.onclick);
                    !control.ondblclick && self.ondblclick && (control.ondblclick = self.ondblclick);
                }
            }
            else {
                assignObject(self.TextFormat, from.TextFormat);
            }
        },

        attachData: function () {
            var self = this;

            if (self.FreeCell) {
                self.Controls.attachData();
            }
            else {
                self._getWrapperClass().attachData.call(self);
            }
        },

        prepare: function () {
            var self = this,
                viewer = self.report.viewer,
                controls = self.Controls,
                font = self.Font.font,
                varx;

            self.registerEventClass();

            if (self.FreeCell) {
                controls.layout();

                if (!self.isSingleDockControl() && (viewer.options.controlPosition !== grenum.controlLayout.absolute)) {
                    varx = self.getRect();
                    Section.prototype.buildTableLayout.call(self, varx.Width(), varx.Height());
                }

                controls.prepare();

                if (self.isSingleDockControl()) {
                    varx = controls.items[0];

                    //如果部件框本身没有定义交互事件，需要把单元格的事件设置到部件框，这样单元格的事件才会有效
                    if (!varx.onclick && self.onclick) {
                        varx.onclick = self.onclick;
                        varx.onclickClassID = self.onclickClassID;
                    }
                    if (!varx.ondblclick && self.ondblclick) {
                        varx.ondblclick = self.ondblclick;
                        varx.ondblclickClassID = self.ondblclickClassID;
                    }
                }
            }

            if (font) {
                self.defaultFontStyle = viewer.selectFontItem(font);
            }

            self.tableRows
            && self.tableRows.forEach(function (row) {
                row.defaultStyle = viewer.selectSectionItem(row);
            });
            //else {
            self.defaultStyle = viewer.selectCellItem(self);
            //}
        },

        unprepare: function () {
            var self = this;

            if (self.FreeCell) {
                self.Controls.unprepare();
            }
            else {
                self._getWrapperClass().unprepare.call(self);
            }

            delete self.defaultFontStyle;
            delete self.defaultStyle;
        },

        doGenerate: function (htmlElement) {
            var self = this,
                viewer = self.report.viewer,
                controls = self.Controls,
                font = self.Font.font,
                defaultFontStyle = self.defaultFontStyle;

            htmlElement.addClass(viewer.selectCell(self));
            //font && htmlElement.addClass(viewer.selectFont(font, self.defaultFontStyle));
            font && defaultFontStyle && htmlElement.addClass(viewer.selectFont(font, defaultFontStyle));

            //在子类中补充额外的元素参数
            self.addStyles && self.addStyles(htmlElement);

            if (self.FreeCell) {
                if (self.isSingleDockControl()) {
                    controls.items[0].generateInCell(htmlElement);
                }
                else {
                    self.addElementEventClass(htmlElement);

                    if (self.tableRows) {
                        htmlElement.addStyle("padding", "0px");

                        htmlElement = new HtmlElement("table", htmlElement);
                        htmlElement.addStyle("border-collapse", "collapse");

                        Section.prototype.generateTableRows.call(self, htmlElement);
                    }
                    else {
                        htmlElement.addStyle("position", "relative");
                        controls.generate(htmlElement);
                    }
                }
            }
            else {
                self.addElementEventClass(htmlElement);

                TextBox.prototype.generateNormal.call(self, htmlElement);
            }
        },

        setFreeCell: function (val) {
            var self = this,
                wrapperClass;

            if (self._freeCell !== val) {
                self._freeCell = val;

                if (val) {
                    self.Controls = new Controls(self);

                    delete self.ControlType;
                }
                else {
                    wrapperClass = self._getWrapperClass();
                    wrapperClass.createWrapper.call(self);
                    self.ControlType = wrapperClass.ControlType;

                    delete self.Controls;
                }
            }
        },
        setBorderCustom: function (val) {
            var self = this;

            if (self._borderCustom !== val) {
                self._borderCustom = val;

                if (val) {
                    self.Border = new Border(grenum.BorderStyle.DrawRight | grenum.BorderStyle.DrawBottom);
                }
                else {
                    delete self.Border;
                }
            }
        },
        setForeColor: function (foreColor) {
            var self = this;

            if (self.FreeCell) {
                self.Controls.forEach(function (control) {
                    control.ForeColor = foreColor;
                });
            }
            else {
                self.ForeColor = foreColor;
            }
        },

        getDisplayText: function () {
            var self = this;
            grhelper.GRASSERT(!self.FreeCell);
            return self._getWrapperClass().getDisplayText.call(self);
        },
        setDisplayText: function (val) {
            var self = this;
            grhelper.GRASSERT(!self.FreeCell);
            return self._getWrapperClass().setDisplayText.call(self, val);
        },
        getControls: function () {
            var self = this;

            return self.FreeCell ? self.Controls.items : [self];
        },
        isSingleDockControl: function () {
            var controls = this.Controls.items;

            //保证是在自由格时调用
            grhelper.GRASSERT(this.FreeCell, "cell must be free allow to call me");

            return controls.length === 1 && controls[0].Dock === grenum.DockStyle.Fill;
        },
        isControlPositionClass: function () { //virtual
            return 0;
        },
        inDynamicRow: function () { //virtual 指示单元格是否在明细网格的内容格，或者是FreeGridCell，且FreeGrid在内容格或分组节
            return 0;
        },

        _getDisplayText: function () {
            var self = this;

            return self._getWrapperClass()._getDisplayText.call(self);
        },
    };
    prototypeCopyExtend(CellBase, Object);

    var FreeGridCell = function (owner, row, col) {
        var self = this;

        CellBase.call(self, owner);

        self.row = row; //行序号，从0开始
        self.col = col; //列序号，从0开始

        self.ColSpan = 1;
        self.RowSpan = 1;
        self.Text = "";
        self.DataName = "";
    };
    FreeGridCell.prototype = {
        generate: function (parentElement) { //override
            var self = this;

            parentElement = new HtmlElement("td", parentElement);

            (self.ColSpan > 1) && parentElement.addAttribute("colspan", self.ColSpan + "");
            (self.RowSpan > 1) && parentElement.addAttribute("rowspan", self.RowSpan + "");

            self.doGenerate(parentElement);
        },

        getOwnerGrid: function () {
            return this.owner;
        },
        _getWrapperClass: function () {
            return MemoBox.prototype;
        },
        getRect: function () {
            var self = this,
                freegrid = self.owner,
                col = self.col,
                row = self.row,
                ecol = col + self.ColSpan,
                erow = row + self.RowSpan,
                w = 0,
                h = 0;

            while (col < ecol) {
                w += freegrid.columns[col++].pxWidth;
            }
            while (row < erow) {
                h += freegrid.rows[row++].pxHeight;
            }
            return new Rect(0, 0, w, h);
        },
        inDynamicRow: function () { //virtual
            return this.owner.owner.inDynamicRow();
        },

        //com interface
        get FreeCell() {
            return !!this._freeCell;
        },
        set FreeCell(val) {
            this.setFreeCell(val);
        },
        get BorderCustom() {
            return !!this._borderCustom;
        },
        set BorderCustom(val) {
            this.setBorderCustom(val);
        },
        get DisplayText() {
            var self = this;
            return self.FreeCell ? "" : self.getDisplayText();
        },
        set DisplayText(val) {
            var self = this;
            !self.FreeCell && self.setDisplayText(val);
        },
    };
    prototypeCopyExtend(FreeGridCell, CellBase);

    var ColumnCell = function (owner) {
        var self = this;

        CellBase.call(self, owner);

        self.Column = "";
    };
    ColumnCell.prototype = {
        afterLoad: function (objJson) {
            var self = this;

            CellBase.prototype.afterLoad.call(self, objJson);

            self.Column = self.owner.owner.Columns.itemByName(self.Column);
        },

        prepare: function () {
            var self = this;

            CellBase.prototype.prepare.call(self);

            if (self.CanShrink) {
                //在内容行或标题行上定义CanShrink属性，以便在产生 SectionStyle 中不产生 height 属性
                self.owner.CanShrink = 1;
            }
        },


        getOwnerGrid: function () { //virtual
            return this.owner.owner;
        },
    };
    prototypeCopyExtend(ColumnCell, CellBase);

    var ColumnContentCell = function (contentCells) {
        var self = this;

        ColumnCell.call(self, contentCells.owner);

        self.DataField = "";
    };
    ColumnContentCell.prototype = {
        _getWrapperClass: function () {
            return FieldBox.prototype;
        },

        afterLoad: function (objJson) {
            var self = this;

            ColumnCell.prototype.afterLoad.call(self, objJson);

            self.Column.ContentCell = self;
        },

        generate: function (parentElement) {
            var self = this,
                crossNo = self.Column._crossOrderNo;

            parentElement = new HtmlElement("td", parentElement);

            crossNo && parentElement.addAttribute("_grcrossno", crossNo);

            self.doGenerate(parentElement);
        },

        generateMerge: function (parentElement, control) { //产生显示不同列的分组合并单元格
            var self = this,
                viewer = self.report.viewer,
                font = self.Font.font,
                crossNo = self.Column._crossOrderNo;

            parentElement = new HtmlElement("td", parentElement);

            crossNo && parentElement.addAttribute("_grcrossno", crossNo);

            //self.doGenerate(parentElement);
            parentElement.addClass(viewer.selectCell(self));
            font && parentElement.addClass(viewer.selectFont(font, self.defaultFontStyle));
            //self.addStyles && self.addStyles(parentElement); //在子类中补充额外的元素参数
            control.generateInCell(parentElement);
        },

        isControlPositionClass: function () { //virtual
            return this.FreeCell;
        },

        //com interface:
        get Name() {
            return this.Column.Name;
        },
        set Name(val) {
            this.Column.Name = val;
        },
        get FreeCell() {
            return !!this._freeCell;
        },
        set FreeCell(val) {
            this.setFreeCell(val);
        },
        get BorderCustom() {
            return !!this._borderCustom;
        },
        set BorderCustom(val) {
            this.setBorderCustom(val);
        },
        get DisplayText() {
            var self = this;
            return self.FreeCell ? "" : self.getDisplayText();
        },
        set DisplayText(val) {
            var self = this;
            !self.FreeCell && self.setDisplayText(val);
        },

        //get DataField() {
        //    return this.wrapper ? this.wrapper.DataField : "";
        //},
        //set DataField(val) {
        //    if (this.wrapper) {
        //        this.wrapper.DataField = val;
        //    }
        //},
        getRect: function () { //virtual
            var self = this;
            return new Rect(0, 0, self.Column.pxWidth, self.owner.pxHeight);
        },
        inDynamicRow: function () { //virtual
            return 1;
        },
    };
    prototypeCopyExtend(ColumnContentCell, ColumnCell);

    var ColumnTitleCell = function (ownerTitleCells, isGroupTitleCell) {
        var self = this;

        ColumnCell.call(self, ownerTitleCells.owner);

        self.SupCell = ownerTitleCells.supcell;

        self.Visible = true;
        self.GroupTitle = isGroupTitleCell;
        self.Text = "";
        self.Height = 0;

        if (isGroupTitleCell) {
            self._name = "";

            self.SubTitles = new ColumnTitleCells(self.owner, self);
        }
    };
    ColumnTitleCell.prototype = {
        _getWrapperClass: function () {
            return MemoBox.prototype;
        },

        afterLoad: function (objJson) {
            var self = this;

            ColumnCell.prototype.afterLoad.call(self, objJson);

            if (self.GroupTitle) {
                self._name = objJson[self.getJsonMember("Name")];

                self.SubTitles.loadFromJSON(objJson.ColumnTitleCell);
            }
            else {
                self.Column.TitleCell = self;
            }
        },

        //assign: function (from) {
        //    var self = this;

        //    ColumnCell.prototype.assign.call(self, from);

        //    //这里不应该执行，不然 DetailGrid 中 assign 的 assignColumns 函数在递归调用会增加多余的标题格
        //    //self.GroupTitle && self.SubTitles.assign(from.SubTitles);
        //},

        prepare: function () {
            var self = this;

            ColumnCell.prototype.prepare.call(self);

            self.SubTitles && self.SubTitles.prepare();
        },

        generate: function (parentElement) {
            var self = this;

            parentElement = new HtmlElement("th", parentElement);

            self.doGenerate(parentElement);
        },

        addStyles: function (htmlElement) { //virtual
            var self = this,
                rowspan = self.GroupTitle ? 1 : self.owner.layerCount - self.owner.generatingLayer;

            (self.colspan > 1) && htmlElement.addAttribute("colspan", self.colspan + "");
            (rowspan > 1) && htmlElement.addAttribute("rowspan", rowspan + "");
        },

        getRect: function () { //virtual
            var self = this,
                layers = self.owner.layerCount - self.layer,
                column = self.Column,
                w = 0;

            if (self.GroupTitle) {
                layers = 1;
                column = self.findFirstColumn();
                if (column) {
                    w = self.findLastColumn().pxRight - column.pxLeft;
                }
            }
            else {
                w = column.pxWidth;
            }

            return new Rect(0, 0, w, self.owner.pxHeight * layers);
        },


        findFirstColumn: function () {
            var self = this,
                column = self.Column,
                subCells;

            if (self.GroupTitle) {
                subCells = self.SubTitles.items;
                column = (subCells.length > 0) ? subCells[0].findFirstColumn() : undefined;
            }
            return column;
        },
        findLastColumn: function () {
            var self = this,
                column = self.Column,
                subCells;

            if (self.GroupTitle) {
                subCells = self.SubTitles.items;
                //column = subCells[subCells.length - 1].findLastColumn();
                column = (subCells.length > 0) ? subCells[subCells.length - 1].findLastColumn() : undefined;
            }
            return column;
        },

        encloseColumnObject: function (column) {
            var self = this;

            self.owner.owner._ColumnMoveTo(column, self);
        },


        //com interface
        get FreeCell() {
            return !!this._freeCell;
        },
        set FreeCell(val) {
            this.setFreeCell(val);
        },
        get BorderCustom() {
            return !!this._borderCustom;
        },
        set BorderCustom(val) {
            this.setBorderCustom(val);
        },
        get DisplayText() {
            var self = this;
            return self.FreeCell ? "" : self.getDisplayText();
        },
        set DisplayText(val) {
            var self = this;
            !self.FreeCell && self.setDisplayText(val);
        },

        //get Text() {
        //    return this.wrapper ? this.wrapper.Text : "";
        //},
        //set Text(val) {
        //    if (this.wrapper) {
        //        this.wrapper.Text = val;
        //    }
        //},

        get Name() {
            var self = this;

            return self.GroupTitle ? self._name : self.Column.Name;
        },
        set Name(val) {
            var self = this;

            self.GroupTitle ? self._name = val : self.Column.Name = val;
        },

        //参数可以为对象,列名称,列序号
        EncloseColumn: function (columnIndex) {
            var self = this,
                detailgrid = self.owner.owner,
                column = detailgrid.Columns.Item(columnIndex);

            column && detailgrid._ColumnMoveTo(column, self);
        },

        //[id(216), helpstring("method AddSubGroupTitle")] HRESULT AddSubGroupTitle([in] BSTR Name, [in] BSTR Title, [out,retval] IGRColumnTitleCell** ppTitle);
        AddSubGroupTitle: function (name, title) {
            return this.SubTitles.AddGroup(name, title);
        },
    };
    prototypeCopyExtend(ColumnTitleCell, ColumnCell);

    /////////////////////////////////////////////////////////////////////////
    var Control = function (owner) { //owner 是 Section 或 Cell 之一
        var self = this;

        Object.call(self, owner);

        self.Left = 0;
        self.Top = 0;
        self.Width = 0;
        self.Height = 0;

        self.Anchor = grenum.AnchorStyle.Left | grenum.AnchorStyle.Top;
        self.Dock = grenum.DockStyle.None;
        self.Center = grenum.CenterStyle.None;
        self.AlignColumnSide = grenum.AlignColumnSideStyle.Both;
        self.AlignColumn = "";
        self.AlignColumnEx = "";
        self.Locked = false;
        self.ShiftMode = grenum.ShiftMode.Always;

        //非文本框的默认Padding
        self.PaddingLeft = 0;
        self.PaddingRight = 0;
        self.PaddingTop = 0;
        self.PaddingBottom = 0;

        self.BackColor = owner.BackColor;
        self.BackStyle = grenum.BackStyle.Transparent;
        self.ForeColor = owner.ForeColor ? owner.ForeColor : colorAlpha(0, self.report.viewer.alpha.text);

        //self.Cursor, GRDisplayCursor, grdcDefault);
        //self.PrintType, GRPrintType, grptContent);

        self.Visible = true;
        self.CustomDraw = false;

        //self.(Styles, GRBorderStyles, (GRBorderStyles)0);
        //self.(InnerStyles, GRBorderStyles, (GRBorderStyles)0);

        self.Border = new Border(0);
        self.Font = new FontWrapper(owner.Font);

        self.Name = "";

        self.CustomDrawScript = "";
    };
    Control.prototype = {
        children: ["Border"],

        attachData: function () {
        },

        afterLoad: function (objJson) {
            var self = this,
                isWR = self.report.isWR,
                alpha = self.report.viewer.alpha;

            enumMemberValid(self, "Dock", grenum.DockStyle);
            enumMemberValid(self, "Center", grenum.CenterStyle);
            enumMemberValid(self, "AlignColumnSide", grenum.AlignColumnSideStyle);
            enumMemberValid(self, "ShiftMode", grenum.ShiftMode);
            enumMemberValid(self, "BackStyle", grenum.BackStyle);

            enumBitMemberValid(self, "Anchor", grenum.AnchorStyle);

            colorMemberValid(self, "BackColor", alpha.background);
            colorMemberValid(self, "ForeColor", alpha.text);

            self.Font.loadFromJSON(objJson.Font, isWR);
            self.Border.loadFromJSON(objJson.Border, alpha.border, isWR);
        },

        layout: function (dockRect) {
            var self = this,
                report = self.report,
                pxLeft = report.size2Pixel(self.Left),
                pxTop = report.size2Pixel(self.Top),
                pxWidth = report.size2Pixel(self.Width),
                pxHeight = report.size2Pixel(self.Height),
                pxRect = new Rect(pxLeft, pxTop, pxLeft + pxWidth, pxTop + pxHeight),
                oAlignColumn = report.getRunningColumn(self.AlignColumn),
                oAlignColumnEx = report.getRunningColumn(self.AlignColumnEx),
                temp;

            //process align column
            if (oAlignColumn && !oAlignColumn.Visible) {
                oAlignColumn = undefined;
            }
            if (oAlignColumnEx && !oAlignColumnEx.Visible) {
                oAlignColumnEx = undefined;
            }

            if (oAlignColumn || oAlignColumnEx) {
                if (oAlignColumn && oAlignColumnEx) {
                    if (oAlignColumnEx.pxLeft < oAlignColumn.pxLeft) {
                        temp = oAlignColumnEx;
                        oAlignColumnEx = oAlignColumn;
                        oAlignColumn = temp;
                    }
                }
                else if (!oAlignColumnEx) {
                    oAlignColumnEx = oAlignColumn;
                }
                else {
                    oAlignColumn = oAlignColumnEx;
                }

                switch (self.AlignColumnSide) {
                    case grenum.AlignColumnSideStyle.Left:
                        pxRect.left = oAlignColumn.pxLeft;
                        pxRect.right = pxRect.left + pxWidth;
                        break;
                    case grenum.AlignColumnSideStyle.Right:
                        pxRect.right = oAlignColumnEx.pxRight;
                        pxRect.left = pxRect.right - pxWidth;
                        break;
                    default: //grenum.AlignColumnSideStyle.Both:
                        pxRect.left = oAlignColumn.pxLeft;
                        pxRect.right = oAlignColumnEx.pxRight;
                        break;
                }
            }
            else {
                if (grenum.DockStyle.None !== self.Dock) {
                    //DockControl(self.DrawRect, ComObject()->GetDock(), dockRect);
                    pxRect = dockRect.clone();
                    switch (self.Dock) {
                        case grenum.DockStyle.Fill:
                            //pxRect = dockRect.clone();

                            dockRect.left = dockRect.right;
                            dockRect.top = dockRect.bottom;
                            break;
                        case grenum.DockStyle.Left:
                            //pxRect.top = dockRect.top;
                            //pxRect.bottom = dockRect.bottom;
                            pxRect.right = Math.min(dockRect.right, dockRect.left + pxWidth);
                            //pxRect.left = dockRect.left;

                            dockRect.left = pxRect.right;
                            break;
                        case grenum.DockStyle.Top:
                            //pxRect.left = dockRect.left;
                            //pxRect.right = dockRect.right;
                            pxRect.bottom = Math.min(dockRect.bottom, dockRect.top + pxHeight);
                            //pxRect.top = dockRect.top;

                            dockRect.top = pxRect.bottom;
                            break;
                        case grenum.DockStyle.Right:
                            //pxRect.top = dockRect.top;
                            //pxRect.bottom = dockRect.bottom;
                            pxRect.left = Math.max(dockRect.left, dockRect.right - pxWidth);
                            //pxRect.right = dockRect.right;

                            dockRect.right = pxRect.left;
                            break;
                        case grenum.DockStyle.Bottom:
                            //pxRect.left = dockRect.left;
                            //pxRect.right = dockRect.right;
                            pxRect.top = Math.max(dockRect.top, dockRect.bottom - pxHeight);
                            //pxRect.bottom = dockRect.bottom;

                            dockRect.bottom = pxRect.top;
                            break;
                        default: //grenum.DockStyle.None:
                            break;
                    }
                }

                if (self.Center !== grenum.CenterStyle.None && self.Dock !== grenum.DockStyle.Fill) {
                    //Horizontal direction center if needed
                    if (self.Center === grenum.CenterStyle.Horizontal || self.Center === grenum.CenterStyle.Both) {
                        pxWidth = pxRect.Width();
                        pxRect.left = (dockRect.left + dockRect.right - pxWidth) / 2;
                        pxRect.right = pxRect.left + pxWidth;
                    }

                    //Vertical direction center if needed
                    if (self.Center === grenum.CenterStyle.Vertical || self.Center === grenum.CenterStyle.Both) {
                        pxHeight = pxRect.Height();
                        pxRect.top = (dockRect.top + dockRect.bottom - pxHeight) / 2;
                        pxRect.bottom = pxRect.top + pxHeight;
                    }
                }
            }

            self.pxRect = pxRect;
            self.oAlignColumn = oAlignColumn;
            self.oAlignColumnEx = oAlignColumnEx;
        },

        prepare: function () {
            var self = this,
                viewer = self.report.viewer,
                toLayout = !self.owner.isSingleDockControl && self.owner.isControlPositionClass();

            self.registerEventClass();

            //??? 如果是单元格中的包装部件框，则不要产生相关样式数据
            //if (!self.owner.tableRows) {
            self.defaultStyle = viewer.selectControlItem(self);
            //}
            if (self.Font.font) {
                self.defaultFontStyle = viewer.selectFontItem(self.Font.font);
            }
            if (toLayout) {
                self.defaultPositionStyle = viewer.selectPositionItem(self);
            }
        },

        unprepare: function () {
            var self = this;

            delete self.defaultStyle;
            delete self.defaultFontStyle;
            delete self.defaultPositionStyle;

            delete self.oAlignColumn;
            delete self.oAlignColumnEx;
        },

        prepareLayout: function (htmlElement) {
            return htmlElement;
        },

        generate: function (parentElement) {
            var self = this,
                viewer = self.report.viewer,
                pxRect = self.pxRect,
                htmlElement;

            grhelper.GRASSERT(self.Visible, self.Name + "is invisible");

            htmlElement = new HtmlElement("span", parentElement);
            self.addElementEventClass(htmlElement);
            htmlElement.addClass(viewer.selectControl(self));
            self.Font.font && htmlElement.addClass(viewer.selectFont(self.Font.font, self.defaultFontStyle));

            if (self.defaultPositionStyle) {
                htmlElement.addClass(viewer.selectPosition(self));
            }
            else {
                //html中,width与height是除掉Margin,Border与Padding的尺寸
                htmlElement.addStyle("left", pixelsToHtml(pxRect.left));
                htmlElement.addStyle("top", pixelsToHtml(pxRect.top));
                htmlElement.addStyle("width", pixelsToHtml(self.getContentWidth()));
                htmlElement.addStyle("height", pixelsToHtml(self.getContentHeight()));
            }

            //self.generateContent(htmlElement);
            self.generateContent(self.prepareLayout(htmlElement));
        },

        //默认处理方式，派生类可以 override 本函数
        generateInCell: function (cellElement) {
            var self = this;

            self.addElementEventClass(cellElement);

            self.oAlignColumn && self.setCrossNoAttr(cellElement);

            self.generateContent(cellElement);
        },

        generateContent: function (htmlElement) {
            var self = this;

            self.CustomDraw ? self.generateCanvas(htmlElement) : self.generateNormal(htmlElement);
        },

        generateCanvas: function (htmlElement) {
            var self = this,
                drawCanvasBox = self.owner.inDynamicRow() ? self.cloneCanvas() : self;

            self.report.registerCanvas(drawCanvasBox, htmlElement);

            return drawCanvasBox;
        },

        cloneCanvas: function () {
            var self = this,
                newCanvasBox = new self.constructor(self.owner),
                memberName,
                member;

            newCanvasBox.assign(self);

            //动态创建的运行时对象要引用复制
            for (memberName in self) {
                member = self[memberName];

                if ((typeof member === "object") && !newCanvasBox[memberName]) {
                    newCanvasBox[memberName] = member;
                }
            }

            return newCanvasBox;
        },

        resizeCanvas: function () {
            var self = this,
                canvas = self.canvas;

            //只有如下控制才有效，不然缩放窗口，图表会越变越大。但这样还是不能得到很好的效果，但误差不是太大
            //设置为本身的client区域尺寸(clientWidth, clientWidth)也不行，效果更差。 
            //canvas.width = canvas.parentNode.clientWidth;
            //canvas.height = canvas.parentNode.clientHeight;
            canvas.width = Math.min(canvas.parentNode.clientWidth, window.innerWidth);
            canvas.height = Math.min(canvas.parentNode.clientHeight, window.innerHeight);

            self.drawCanvas(1);
        },

        drawCanvas: function (toUpdateShapes) {
            var self = this,
                ownerDetailGrid = self.getOwnerDetailGrid();

            //对于处于明细网格中的部件框，需要同步明细网格中的记录集，以及分组的记录集
            ownerDetailGrid && ownerDetailGrid.syncElementData(self.canvas);

            self.report.fireControlCustomDraw(self);
        },

        setCrossNoAttr: function (cellElement) {
            var crossNo = this.oAlignColumn._crossOrderNo;

            grhelper.GRASSERT(this.oAlignColumn, + "oAlignColumn can't be null");

            crossNo && cellElement.addAttribute("_grcrossno", crossNo);
        },

        toFillBack: function () {
            var self = this;

            return (self.BackStyle === grenum.BackStyle.Normal && self.BackColor !== self.owner.BackColor);
        },

        getContentWidth: function () { //pixels
            var self = this,
                border = self.Border;

            return self.pxRect.Width() - self.PaddingLeft - self.PaddingRight - border.getLeftWidth() - border.getRightWidth();
        },
        getContentHeight: function () { //pixels
            var self = this,
                border = self.Border;

            return self.pxRect.Height() - self.PaddingTop - self.PaddingBottom - border.getTopWidth() - border.getBottomWidth();
        },
        getOwnerDetailGrid: function () {
            var self = this,
                owner = self.owner,
                owner2 = owner.owner,
                owner3 = owner2 ? owner2.owner : undefined,
                detailgrid;

            if (owner3) {
                //标题行或内容行里的：this->cell->ColumnSection->DetailGrid
                //分组节的：this->GroupSection->Group->DetailGrid
                if (owner3.ColumnTitle) { //(owner3.isPrototypeOf(DetailGrid)) {
                    detailgrid = owner3;
                }
                else if (owner2.isPrototypeOf(FreeGrid)) { //自由网格里的：this->cell->FreeGrid
                    detailgrid = owner3.getOwnerDetailGrid();
                }
            }

            return detailgrid;
        },
        //拥有的节对象
        //报表头与报表尾
        //明细网格单元格
        //自由表格单元格中的部件框，不存在直接的ownerSection
        //???这个好像用不上，也不能写为get，应该写function
        //get ownerSection(){
        //    var self =this,
        //        report = self.report,
        //        owner = self.owner,
        //        ownerOwner = owner.owner,
        //        section;

        //    if (ownerOwner === report) { //报表头尾
        //        section = owner;
        //    }
        //    else if (ownerOwner.owner === report.DetailGrid) { //明细网格单元格
        //        section = ownerOwner;
        //    }
        //    return section;
        //},

        //com interface
        //以下这些属性在此不实现，而是在各个具体类中分别定义
        //[propget, id(50), helpstring("property AsTextBox")] HRESULT AsTextBox([out, retval] IGRTextBox** pVal);
        //[propget, id(51), helpstring("property AsChart")] HRESULT AsChart([out, retval] IGRChart** pVal);
        //[propget, id(52), helpstring("property AsStaticBox")] HRESULT AsStaticBox([out, retval] IGRStaticBox** pVal);
        //[propget, id(53), helpstring("property AsShapeBox")] HRESULT AsShapeBox([out, retval] IGRShapeBox** pVal);
        //[propget, id(54), helpstring("property AsSystemVarBox")] HRESULT AsSystemVarBox([out, retval] IGRSystemVarBox** pVal);
        //[propget, id(55), helpstring("property AsFieldBox")] HRESULT AsFieldBox([out, retval] IGRFieldBox** pVal);
        //[propget, id(56), helpstring("property AsSummaryBox")] HRESULT AsSummaryBox([out, retval] IGRSummaryBox** pVal);
        //[propget, id(57), helpstring("property AsPictureBox")] HRESULT AsPictureBox([out, retval] IGRPictureBox** pVal);
        //[propget, id(58), helpstring("property AsRichTextBox")] HRESULT AsRichTextBox([out, retval] IGRRichTextBox** pVal);
        //[propget, id(59), helpstring("property AsMemoBox")] HRESULT AsMemoBox([out, retval] IGRMemoBox** pVal);
        //[propget, id(60), helpstring("property AsSubReport")] HRESULT AsSubReport([out, retval] IGRSubReport** pVal);
        //[propget, id(61), helpstring("property AsLine")] HRESULT AsLine([out, retval] IGRLine** pVal);
        //[propget, id(62), helpstring("property AsBarcode")] HRESULT AsBarcode([out, retval] IGRBarcode** pVal);
        //[propget, id(63), helpstring("property AsFreeGrid")] HRESULT AsFreeGrid([out, retval] IGRFreeGrid** pVal);

        //[id(70), helpstring("method SetBounds")] HRESULT SetBounds([in] DOUBLE Left, [in] DOUBLE Top, [in] DOUBLE Right, [in] DOUBLE Bottom);
        SetBounds: function (Left, Top, Right, Bottom) {
            var self = this;

            self.Left = Left;
            self.Top = Top;
            self.Width = Right - Left;
            self.Height = Bottom - Top;
        },
        //[id(71), helpstring("method BringToFront")] HRESULT BringToFront: function();
        BringToFront: function () {
            var self = this,
                controls = self.owner.Controls;

            controls.ChangeItemOrder(controls.indexOf(self), controls.length);
        },
        //[id(72), helpstring("method SendToBack")] HRESULT SendToBack: function();
        SendToBack: function () {
            var self = this,
                controls = self.owner.Controls;

            controls.ChangeItemOrder(controls.indexOf(self), 1);
        },
        //[id(74), helpstring("method DrawDefault")] HRESULT DrawDefault: function(); 
        DrawDefault: function () {
            //在派生类中override
        },
    };
    prototypeCopyExtend(Control, Object);

    var TextBox = function (owner) {
        var self = this;

        Control.call(self, owner);

        self.createWrapper();

        self.AsTextBox = self; //为了实现COM接口中对应的 AsTextBox 属性
    };
    TextBox.prototype = {
        children: ["Border", "TextFormat"],

        afterLoad: function (objJson) {
            var self = this;

            Control.prototype.afterLoad.call(self, objJson);

            self.TextFormat.loadFromJSON(objJson, self.report.isWR); //TextFormat直接定义在文字部件框上
        },

        createWrapper: function () {
            var self = this;

            //文字框的默认Padding
            self.PaddingLeft = 2;
            self.PaddingRight = 1;
            self.PaddingTop = 1;
            self.PaddingBottom = 1;

            self.CanGrow = false;
            self.CanShrink = false;
            self.ShrinkFontToFit = false;

            self.ForeColor = self.owner.ForeColor ? self.owner.ForeColor : colorAlpha(0, self.report.viewer.alpha.text);;
            self.TextFormat = new TextFormat();

            self.GetDisplayTextScript = "";
        },

        //generateInCell: function (cellElement) {
        //    var self = this;

        //    self.addElementEventClass(cellElement);

        //    self.oAlignColumn && self.setCrossNoAttr(cellElement);

        //    self._genInnerText(cellElement);
        //},

        //关于文字垂直居中显示：html中没有专门的文字居中显示属性
        //1、对于单行文字的居中显示，可以将行高(line-height)设置为与部件框高度一样来实现居中
        //    <span class="-gr-abs-pos -gr-bs0 -gr-pds0" style="left:8.00px;top:98.00px;width:147.00px;height:54.00px;line-height:54px;">
        //        这个是居中显示文字
        //    </span>
        //2、对于多行文字的居中显示，必须用css的display来实现，首先定义为table，然后定义下级span，并定义其table-cell与vertical-align
        //    <span class="-gr-abs-pos -gr-bs0" style="left:480.00px;top:8.00px;width:147.00px;height:134.00px;display: table">
        //        <span style="display: table-cell;vertical-align: middle">
        //            这个参数是字符串....
        //        </span>
        //    </span>
        //3、下端对齐也是类似的，但只能采用display方式(即第2种方式)
        //4、具体实现见 addSpecialStyle() 与 getHtmlText()
        //5、存在的不足：如果文字不绕行，但本身有回车换行数据，文字还是多行的，设置line-height就不行
        prepareLayout: function (htmlElement) {
            var self = this,
                TextFormat = self.TextFormat,
                TextAlign = TextFormat.TextAlign;

            if (!(TextAlign & 0x10)) { //!(self.TextFormat.TextAlign & 0x10)表示文字不是上端对齐
                if (TextFormat.WordWrap || (TextAlign & 0x40)) {
                    htmlElement.addStyle("display", "table");

                    htmlElement = new HtmlElement("span", htmlElement);
                    htmlElement.addStyle("display", "table-cell");
                    htmlElement.addStyle("vertical-align", (TextAlign & 0x20) ? "middle" : "bottom");
                }
                else {
                    htmlElement.addStyle("line-height", pixelsToHtml(self.getContentHeight()));
                }
            }

            //self._genInnerText(htmlElement);
            return htmlElement;
        },

        generateNormal: function (htmlElement) {
            var self = this,
                br = "<br />",
                text = self.getDisplayText();

            function replaceBlankChars() {
                var chars = text.split(""),
                    len = chars.length, //先排除最后一个字符
                    i = 0,
                    ch;

                text = "";
                while (i < len) {
                    ch = chars[i];
                    if (ch === " " && i < len - 1 && chars[i + 1] === " ") {
                        while (i < len && chars[i] === " ") {
                            text += "&nbsp;";
                            i++;
                        }
                    }
                    else {
                        text += ch;
                        i++;
                    }
                }
            }

            if (!self.TextFormat.HtmlTags) {
                ////TDD...性能方面今后关注这里进行改进，是否只 Static Memo Field这几种文字框进行规范化？？
                //注意,必须最先替换 & ,然后是 < >，最后才是其它的
                if (/[\r\n&<>"]/.test(text)) {
                    text = text.replace(/&/g, "&amp;").
                        replace(/</g, "&lt;").
                        replace(/>/g, "&gt;").
                        replace(/"/g, "&quot;").
                        replace(/\r\n/g, br).
                        replace(/\r/g, br).
                        replace(/\n/g, br);
                }

                //如果将空格替换为&nbsp;，则文字的自动绕行功能失效，而是尽量把容器撑开到最宽，从而破坏报表的设计布局
                //测试了chrome ie edge都这样，如果不是包含多个连续的空格，还是保持空格不变   
                //如果包含有连续的空格字符，则要进行转义替换
                /  /.test(text) && replaceBlankChars();
            }

            htmlElement.innerText = text;
        },

        getDisplayText: function () {
            var self = this;

            self.displayTextAssigned = false;
            if (!self.doingGetDisplayText) {
                self.doingGetDisplayText = true;
                self.report.fireTextBoxGetDisplayText(self);
                self.doingGetDisplayText = false;
            }

            if (self.displayTextAssigned) {
                return self.assignedDisplayText;
            }
            else {
                return self._getDisplayText();
            }
        },
        setDisplayText: function (val) {
            var self = this;

            self.assignedDisplayText = val;
            self.displayTextAssigned = true;
        },

        DrawDefault: function () {
            var self = this,
                text = self.getDisplayText(),
                canvas = self.canvas;

            //这里不能与部件框输出(直接定义HTML元素)保持一致
            //如HTML标签在这里就不能支持，除非DrawFormatText函数中实现对HtmlTags的支持
            self.report.Graphics.DrawFormatText(text, 0, 0, canvas.width, canvas.height, self.TextFormat);
        },
    };
    prototypeCopyExtend(TextBox, Control);

    var StaticBox = function (owner) {
        var self = this;

        TextBox.call(self, owner);

        self.Text = "";
        self.Parameter = "";
    };
    StaticBox.prototype = {
        ControlType: grenum.ControlType.StaticBox,

        _getDisplayText: function () {
            var self = this;

            return self.valueField ? self.valueField.DisplayText : (self.oParameter ? self.oParameter.DisplayText : self.Text);
        },

        attachData: function () {
            var self = this;

            if (self.Parameter) {
                self.oParameter = self.report.ParameterByName(self.Parameter);
            }
        },

        unprepare: function () {
            var self = this;

            TextBox.prototype.unprepare.call(self);

            delete self.oParameter;
        },

        //com interface
        get DisplayText() {
            return this.getDisplayText();
        },
        set DisplayText(val) {
            this.setDisplayText(val);
        },
        get AsStaticBox() {
            return this;
        },
    };
    prototypeCopyExtend(StaticBox, TextBox);

    var MemoBox = function (owner) {
        var self = this;

        TextBox.call(self, owner);

        self.Text = "";
        //this.FlowTo = "";
    };
    MemoBox.prototype = {
        ControlType: grenum.ControlType.MemoBox,

        createWrapper: function () {
            var self = this;

            TextBox.prototype.createWrapper.call(self);

            self.Text = "";
        },

        _getDisplayText: function () {
            return this.textBuilder.generateDisplayText();
        },

        attachData: function () {
            var self = this;

            self.textBuilder = new TextBuilder(self.report, self.Text);
        },

        //合写为一个函数
        //getSummaryExpFields: function () {
        //    var items = [];

        //    function extractFromExp(exp) {
        //        exp.varItems && exp.varItems.forEach(function (varItem) {
        //            var varField = varItem.varField,
        //                type = varField.type;

        //            if (type === grenum.ExpVarType.Summary) {
        //                items.push(varField);
        //            }
        //            else if (type === grenum.ExpVarType.MathFun) {
        //                varField.paramExps.forEach(extractFromExp);
        //            }
        //        });
        //    }

        //    this.textBuilder.forEach(extractFromExp);

        //    return items;
        //},
        //getParameterExpFields: function () {
        //    var items = [];

        //    this.textBuilder.forEach(function (exp) {
        //        if (exp.varItems) {
        //            exp.varItems.forEach(function (varItem) {
        //                if (varItem.varField.type === grenum.ExpVarType.Parameter) {
        //                    items.push(varItem.varField);
        //                }
        //            });
        //        }
        //    });

        //    return items;
        //},
        getGroupVars: function () {
            var items = [];

            function extractFromExp(exp) {
                exp.varItems && exp.varItems.forEach(function (varItem) {
                    var varField = varItem.varField,
                        type = varField.type;

                    if (type === grenum.ExpVarType.Summary
                        || type === grenum.ExpVarType.Parameter
                        || type === grenum.ExpVarType.MathFun) {
                        items.push(varField);
                    }

                    if (type === grenum.ExpVarType.Summary) {
                        varField.paramExp && extractFromExp(varField.paramExp);
                    }
                    else if (type === grenum.ExpVarType.MathFun) {
                        varField.paramExps.forEach(extractFromExp);
                    }
                });
            }

            this.textBuilder.forEach(extractFromExp);

            return items;
        },

        isPureNumericExpression: function () {
            var self = this;

            self.prepare();

            //1、只有一个表达式，且为数字类型，且表达式前后没有文字
            //2、如果只有一个变量，则要为数字类型
            return self.textBuilder &&
                self.textBuilder.items.length === 1 &&
                self.textBuilder.items[0].isPureNumeric();
        },

        //com interface
        get DisplayText() {
            return this.getDisplayText();
        },
        set DisplayText(val) {
            this.setDisplayText(val);
        },
        get AsFloat() { //用于 Crosstab 中,获取纯数字表达式的数字值
            //必须要返回一个有效的数字值
            var item0 = this.textBuilder.items[0],
                val = item0.__proto__.hasOwnProperty("calculate") ? item0.calculate() : 0;
            return isNaN(val) ? 0 : val;
        },
        get Value() { //用于 Crosstab 中
            return this.getDisplayText();
        },
        get AsMemoBox() {
            return this;
        },
    };
    prototypeCopyExtend(MemoBox, TextBox);

    var FieldBox = function (owner) {
        var self = this;

        TextBox.call(self, owner);

        self.DataField = "";
    };
    FieldBox.prototype = {
        ControlType: grenum.ControlType.FieldBox,

        createWrapper: function () {
            var self = this;

            TextBox.prototype.createWrapper.call(self);

            self.DataField = "";
        },

        attachData: function () {
            var self = this;

            self.oDataField = self.report.RunningFieldByName(self.DataField);
        },

        unprepare: function () {
            var self = this;

            TextBox.prototype.unprepare.call(self);

            delete self.oDataField;
        },

        //private:
        _getDisplayText: function () {
            var oDataField = this.oDataField;

            return oDataField ? oDataField.DisplayText : "";
        },

        //com interface
        get DisplayText() {
            return this.getDisplayText();
        },
        set DisplayText(val) {
            this.setDisplayText(val);
        },
        get AsFieldBox() {
            return this;
        },
    };
    prototypeCopyExtend(FieldBox, TextBox);

    var SummaryBox = function (owner) {
        var self = this;

        TextBox.call(self, owner);

        self.SummaryFun = grenum.SummaryFun.Sum;
        self.RankNo = 1;
        self.DataField = "";
        //[propget, id(205), helpstring("property DisplayField")] HRESULT DisplayField([out, retval] BSTR* pVal);
        //[propput, id(205), helpstring("property DisplayField")] HRESULT DisplayField([in] BSTR newVal);
        self.DisplayField = "";
        self.Format = "";
        //self.ConditionScript = "";
    };
    SummaryBox.prototype = {
        ControlType: grenum.ControlType.SummaryBox,

        afterLoad: function (objJson) {
            var self = this;

            TextBox.prototype.afterLoad.call(self, objJson);

            enumMemberValid(self, "SummaryFun", grenum.SummaryFun);
        },

        attachData: function () {
            var self = this,
                field,
                paramExp,
                format = self.Format;

            self.init(self.DataField, self.DisplayField);

            //如果本身没有定义 Format， 则从关联字段中继承
            if (!format) {
                field = self.report.RunningFieldByName(self.DataField);
                if (field) {
                    format = field.Format;
                }
            }

            paramExp = self.paramExp;
            if (paramExp && (paramExp.varItems.length === 1)
                && (paramExp.varItems[0].type === grenum.ExpVarType.RecordsetField)
                && (paramExp.varItems[0].object.FieldType === grenum.FieldType.DateTime)) {
                self.formater = new DateTimeFormatter(format);
            }
            else {
                self.formater = new NumericFormatter(format);
            }
        },

        //unprepare: function () {
        //    TextBox.prototype.unprepare.call(this);
        //},

        //private
        _getDisplayText: function () { //virtual
            var self = this,
                summaryFun = self.SummaryFun,
                valueField = self.valueField,
                ret;

            if (summaryFun === grenum.SummaryFun.StrMin || summaryFun === grenum.SummaryFun.StrMax || self.displayField) {
                ret = valueField ? valueField.DisplayText : self.value;
            }
            else {
                if (valueField) {
                    if (valueField.IsNull) {
                        return "";
                    }
                    ret = valueField.AsFloat;
                }
                else {
                    ret = self.value;
                }

                ret = self.formater.format(ret);
            }

            return ret;
        },

        //com interface
        get DisplayText() {
            return this.getDisplayText();
        },
        set DisplayText(val) {
            this.setDisplayText(val);
        },
        get Value() {
            return this.getValue();
        },
        set Value(val) {
            this.setValue(val);
        },
        get AsSummaryBox() {
            return this;
        },
    };
    prototypeCopyExtend(SummaryBox, TextBox);
    prototypeCopyExtend(SummaryBox, Summary);

    var SystemVarBox = function (owner) {
        var self = this;

        TextBox.call(self, owner);

        self.SystemVar = -1; //默认是页数，在H5中没有对应的，所以设置为-1 grenum.SystemVarType.CurrentDateTime;
        self.GroupIndex = 1;
        self.Format = "";
    };
    SystemVarBox.prototype = {
        ControlType: grenum.ControlType.SystemVarBox,

        afterLoad: function (objJson) {
            var self = this;

            TextBox.prototype.afterLoad.call(self, objJson);

            enumMemberValid(self, "SystemVar", grenum.SystemVarType);
        },

        attachData: function () {
            var self = this,
                Format = self.Format;

            if (self.SystemVar === grenum.SystemVarType.CurrentDateTime) {
                self.formater = new DateTimeFormatter(Format);
            }
            else {
                self.formater = new NumericFormatter(Format);
            }
        },

        //private:
        _getDisplayText: function () {
            var self = this,
                systemVar = self.SystemVar;

            //systemVar <= 0的情况是页数与页号，没有成功转换
            return (systemVar > 0)? self.formater.format(self.report.SystemVarValue2(systemVar, self.GroupIndex)) : "";
        },

        //com interface
        get DisplayText() {
            return this.getDisplayText();
        },
        set DisplayText(val) {
            this.setDisplayText(val);
        },
        get AsSystemVarBox() {
            return this;
        },
    };
    prototypeCopyExtend(SystemVarBox, TextBox);

    var CanvasBox = function (owner) {
        Control.call(this, owner);
    };
    CanvasBox.prototype = {
        generateContent: function (htmlElement) {
            this.generateCanvas(htmlElement);
        },

        drawCanvas: function (toUpdateShapes) {
            var self = this;

            self.draw(toUpdateShapes);

            self.CustomDraw &&
            Control.prototype.drawCanvas.call(self, toUpdateShapes);
        },

        DrawDefault: function () {
            this.draw();
        },

        //派生类定义 draw 虚函数
    };
    prototypeCopyExtend(CanvasBox, Control);

    var Line = function (owner) {
        var self = this;

        CanvasBox.call(self, owner);

        self.L2R = true;
        self.U2D = true;

        self.LinePen = new Pen();
    };
    Line.prototype = {
        ControlType: grenum.ControlType.Line,
        children: ["LinePen"],

        afterLoad: function (objJson) {
            var self = this,
                report = self.report;

            CanvasBox.prototype.afterLoad.call(self, objJson);

            self.LinePen.loadFromJSON(objJson.Pen, report.viewer.alpha.stroke, report.isWR);
        },

        ////如果仅是类型不同，可以写在基类，按原型创建对象，不用每个类都写
        //cloneCanvas: function () {
        //    var self = this,
        //        newCanvasBox = new Line(self.owner);

        //    newCanvasBox.assign(self);
        //    return newCanvasBox;
        //},

        draw: function (toUpdateShapes) {
            var self = this,
                canvas = self.canvas,
                context = new Context(canvas.getContext("2d")),
                t,
                x1 = 0,
                y1 = 0,
                x2 = canvas.width,
                y2 = canvas.height;

            context.selectPen(self.LinePen);

            if (!self.L2R) {
                t = x1;
                x1 = x2;
                x2 = t;
            }
            if (!self.U2D) {
                t = y1;
                y1 = y2;
                y2 = t;
            }

            context.drawLine(x1, y1, x2, y2);
        },

        //com interface
        get AsLine() {
            return this;
        },
    };
    prototypeCopyExtend(Line, CanvasBox);

    var ShapeBox = function (owner) {
        var self = this;

        CanvasBox.call(self, owner);

        self.ShapeType = grenum.ShapeBoxType.RoundRect;
        self.FillColor = 0;
        self.FillStyle = grenum.BackStyle.Transparent;

        self.CornerDx = 4;
        self.CornerDy = 4

        self.LinePen = new Pen();
    };
    ShapeBox.prototype = {
        ControlType: grenum.ControlType.ShapeBox,

        children: ["LinePen"],

        afterLoad: function (objJson) {
            var self = this,
                report = self.report,
                alpha = self.report.viewer.alpha;

            CanvasBox.prototype.afterLoad.call(self, objJson);

            enumMemberValid(self, "ShapeType", grenum.ShapeBoxType);
            enumMemberValid(self, "FillStyle", grenum.BackStyle);
            colorMemberValid(self, "FillColor", alpha.background);

            self.LinePen.loadFromJSON(objJson.Pen, alpha.stroke, report.isWR);
        },

        //cloneCanvas: function () {
        //    var self = this,
        //        newCanvasBox = new ShapeBox(self.owner);

        //    newCanvasBox.assign(self);
        //    return newCanvasBox;
        //},

        draw: function (toUpdateShapes) {
            var self = this,
                canvas = self.canvas,
                width = canvas.width,
                height = canvas.height,
                context = new Context(canvas.getContext("2d")),
                offset = self.LinePen.Width / 2,
                toFill = self.FillStyle === grenum.BackStyle.Normal,
                drawFun,
                hasRound,
                args;

            context.selectPen(self.LinePen);
            toFill && context.selectFillColor(self.FillColor);

            switch (self.ShapeType) {
                case grenum.ShapeBoxType.Line:
                    context.drawLine(0, offset, width, offset);
                    break;
                case grenum.ShapeBoxType.Circle:
                    drawFun = context.circle;
                    break;
                case grenum.ShapeBoxType.Ellipse:
                    drawFun = context.ellipse;
                    break;
                case grenum.ShapeBoxType.Rectangle:
                    drawFun = context.rectangle;
                    break;
                case grenum.ShapeBoxType.Square:
                    drawFun = context.square;
                    break;
                case grenum.ShapeBoxType.RoundRect:
                    drawFun = context.roundRectangle;
                    hasRound = 1;
                    break;
                case grenum.ShapeBoxType.RoundSquare:
                    drawFun = context.roundSquare;
                    hasRound = 1;
                    break;
            }

            if (drawFun) {
                args = [offset, offset, width - offset * 2, height - offset * 2];
                hasRound && args.push(self.CornerDx, self.CornerDy);
                args.push(toFill);
                drawFun.apply(context, args);
            }

            toFill && context.restoreFillStyle();
            context.restorePen();
        },

        //com interface
        get AsShapeBox() {
            return this;
        },
    };
    prototypeCopyExtend(ShapeBox, CanvasBox);

    var Barcode = function (owner) {
        var self = this;

        CanvasBox.call(self, owner);

        self.Text = "";

        self.BarcodeType = grenum.BarcodeType.Code39;
        self.BarWidth = 0;
        self.BarRatio = 2;
        self.CheckSum = false;
        self.Direction = grenum.BarcodeDirection.LeftToRight;
        self.Alignment = grenum.StringAlignment.Center;
        self.CaptionPosition = grenum.BarcodeCaptionPosition.Below;
        self.CaptionAlignment = grenum.StringAlignment.Center;

        self.PDF417Rows = 0;
        self.PDF417Columns = 0;
        self.PDF417ErrorLevel = 0;
        self.PDF417Simple = false;

        self.QRCodeVersion = 0;
        self.QRCodeErrorLevel = 1;
        self.QRCodeMask = 0;

        self.DtmxEncoding = grenum.DtmxEncoding.Auto;
        self.DtmxMatrixSize = grenum.DtmxMatrixSize.Auto;
        self.DtmxModuleSize = 0;
    };
    Barcode.prototype = {
        ControlType: grenum.ControlType.Barcode,

        attachData: function () {
            var self = this;

            self.textBuilder = new TextBuilder(self.report, self.Text);
        },

        afterLoad: function (objJson) {
            var self = this,
                barcodeTypeText = objJson[self.getJsonMember("BarcodeType")];

            CanvasBox.prototype.afterLoad.call(self, objJson);

            switch (barcodeTypeText) {
                case "Code25_Interleaved":
                    self.BarcodeType = grenum.BarcodeType.Code25Intlv;
                    break;
                case "Code25_Industrial":
                    self.BarcodeType = grenum.BarcodeType.Code25Ind;
                    break;
                case "Code25_Matrix":
                    self.BarcodeType = grenum.BarcodeType.Code25Matrix;
                    break;
                case "Code39Extended":
                    self.BarcodeType = grenum.BarcodeType.Code39X;
                    break;
                case "Code93Extended":
                    self.BarcodeType = grenum.BarcodeType.Code93X;
                    break;
                default:
                    enumMemberValid(self, "BarcodeType", grenum.BarcodeType);
                    break;
            }
            enumMemberValid(self, "Direction", grenum.BarcodeDirection);
            enumMemberValid(self, "Alignment", grenum.StringAlignment);
            enumMemberValid(self, "CaptionPosition", grenum.BarcodeCaptionPosition);
            enumMemberValid(self, "CaptionAlignment", grenum.StringAlignment);
            enumMemberValid(self, "DtmxEncoding", grenum.DtmxEncoding);
            enumMemberValid(self, "DtmxMatrixSize", grenum.DtmxMatrixSize);
        },

        getDisplayText: function () {
            return this.textBuilder.generateDisplayText();
        },

        generateCanvas: function (htmlElement) {
            var self = this,
                drawCanvasBox, //drawCanvasBox 有可能与 self 不一样
                barcodeType = self.BarcodeType,
                barcodeURL = encodeURI(window.rubylong.grhtml5.barcodeURL),
                params = {
                    type: barcodeType,
                    text: self.DisplayText,
                    codepage: self.report.CodePage,
                };

            drawCanvasBox = CanvasBox.prototype.generateCanvas.call(self, htmlElement);

            if (self.CaptionPosition !== grenum.BarcodeCaptionPosition.None) {
                params.requireShowText = true;
            }

            if (barcodeURL && params.text) { //创建Barcode的服务器参数json文本数据包
                if (barcodeType === grenum.BarcodeType.QRCode || barcodeType === grenum.BarcodeType.GS1QRCode) {
                    params.Version = self.QRCodeVersion;
                    params.ErrorLevel = self.QRCodeErrorLevel;
                    params.Mask = self.QRCodeMask;
                }
                else if (barcodeType === grenum.BarcodeType.PDF417) {
                    params.Rows = self.PDF417Rows;
                    params.Columns = self.PDF417Columns;
                    params.ErrorLevel = self.PDF417ErrorLevel;
                    params.Simple = self.PDF417Simple;
                }
                else if (barcodeType === grenum.BarcodeType.DataMatrix || barcodeType === grenum.BarcodeType.GS1DataMatrix) {
                    params.Encoding = self.DtmxEncoding;
                    params.MatrixSize = self.DtmxMatrixSize;
                    params.ModuleSize = self.DtmxModuleSize;
                }
                else {
                    params.CheckSum = self.CheckSum;
                }

                barcodeURL += "?params=" + encodeURIComponent(JSON.stringify(params));

                //ajax请求条码绘制数据，其中的调用者参数必须是drawCanvasBox，不能为self
                window.rubylong.ajax(barcodeURL, function (xmlhttp, success) {
                    var self = this,
                        ownerDetailGrid;

                    if (success) {
                        //self.data = JSON.parse(xmlhttp.responseText);
                        //self.draw();

                        //对于处于明细网格中的条形码，需要同步明细网格中的记录集，以及分组的记录集
                        ownerDetailGrid = self.getOwnerDetailGrid();
                        ownerDetailGrid && ownerDetailGrid.syncElementData(self.canvas);

                        self._dodraw(JSON.parse(xmlhttp.responseText));
                    }

                }, drawCanvasBox, "POST");
            }
        },

        //cloneCanvas: function () {
        //    var self = this,
        //        newCanvasBox = new Barcode(self.owner); //newCanvasBox = self.constructor.call(self, self.owner); 这样有问题

        //    newCanvasBox.assign(self);
        //    return newCanvasBox;
        //},

        draw: function (toUpdateShapes) {
            //2018/12/07 感觉不要做任何任务，有待进一步确认
            //var self = this;

            //self.data && self._dodraw();
        },

        _dodraw: function (data) {
            var self = this,
                canvas = self.canvas,
                context = new Context(canvas.getContext("2d")),
                usingFont = self.getUsingFont(),
                whiteColor = self.BackColor,
                blackColor = self.ForeColor,

                barcodeType = self.BarcodeType,
                direction = self.Direction,
                captionPosition = self.CaptionPosition,

                //data = self.data,
                Cols = data.cols,
                Rows = data.rows,
                ModuleText = data.graph,
                ModuleTextLen = ModuleText ? ModuleText.length : 0,
                tsOutputText = data.text ? data.text : self.DisplayText,

                Is2DBarcode = Is2DBarcode(barcodeType),
                IsHorz = (direction === grenum.BarcodeDirection.LeftToRight) || (direction === grenum.BarcodeDirection.RightToLeft),
                DrawAsGoodsBarcode = IsGoodsBarcode(barcodeType) &&
                    (direction === grenum.BarcodeDirection.LeftToRight) &&
                    (captionPosition === grenum.BarcodeCaptionPosition.Below),

                textWidth = 0,
                textHeight = fontHeight(usingFont),
                BlankMargin = Is2DBarcode ? Math.max(textHeight, 10) : 0,

                BarAreaWidth,
                BarAreaHeight,
                OneModuleWidth,
                BarGraphWidth,
                BarGraphHeight,
                StartMarginModules = 0,
                StopMarginModules = 0,
                StartMarginWidth = 0,
                StopMarginWidth = 0,
                ModuleWidthTooBig = false, //条宽度太大标志，如为真，则不显示图形，而是显示提示文字
                xCenterOffset = 0,
                yCenterOffset = 0,
                barColor,
                TheBarRect,

                canvasRect = new Rect(0, 0, canvas.width, canvas.height),
                GraphyRect = canvasRect.clone(),
                TextRect = canvasRect.clone(),

                i;

            function Is2DBarcode(barcodeType) {
                return barcodeType === grenum.BarcodeType.PDF417 ||
                    barcodeType === grenum.BarcodeType.QRCode || barcodeType === grenum.BarcodeType.GS1QRCode ||
                    barcodeType === grenum.BarcodeType.DataMatrix || barcodeType === grenum.BarcodeType.GS1DataMatrix;
            }

            function IsGoodsBarcode(barcodeType) {
                return barcodeType === grenum.BarcodeType.CodeEAN13 ||
                    barcodeType === grenum.BarcodeType.CodeEAN8 ||
                    barcodeType === grenum.BarcodeType.CodeUPC_A ||
                    barcodeType === grenum.BarcodeType.CodeUPC_E0 ||
                    barcodeType === grenum.BarcodeType.CodeUPC_E1;
            }

            function HexCharToBYTE(ch) {
                return parseInt(ch, 16);
            }

            if (!Cols) {
                return;
            }

            context.selectFont(usingFont);

            //首先将显示文字的矩形区域计算出来
            if (captionPosition !== grenum.BarcodeCaptionPosition.None) {
                //二维条码要在图形与文字之间留空白距离
                if (IsHorz) {
                    if (captionPosition === grenum.BarcodeCaptionPosition.Above) {
                        TextRect.bottom = TextRect.top + textHeight;
                        GraphyRect.top = TextRect.bottom + BlankMargin;
                    }
                    else {
                        TextRect.top = TextRect.bottom - textHeight;
                        GraphyRect.bottom = TextRect.top - BlankMargin;
                    }
                }
                else {
                    if (captionPosition === grenum.BarcodeCaptionPosition.Above) {
                        TextRect.left = TextRect.right - textHeight;
                        GraphyRect.right = TextRect.left - BlankMargin;
                    }
                    else {
                        TextRect.right = TextRect.left + textHeight;
                        GraphyRect.left = TextRect.right + BlankMargin;
                    }
                }
            }

            BarAreaWidth = IsHorz ? GraphyRect.Width() : GraphyRect.Height();
            BarAreaHeight = IsHorz ? GraphyRect.Height() : GraphyRect.Width();

            //图形显示区域过小，不进行输出
            if (BarAreaWidth < 10 || BarAreaHeight < 10) {
                context.restoreFont();
                return;
            }

            if (captionPosition != grenum.BarcodeCaptionPosition.None) {
                textWidth = context.measureTextWidth(tsOutputText);
            }

            function draw2DBarcode() {
                var col,
                    row,
                    Bit8,
                    CurBitMod,
                    CurBarCount,
                    barColorNew,
                    OneBarWidth = BarAreaWidth / Cols,
                    OneRowHeight = BarAreaHeight / Rows,
                    implLeftToRight = {
                        init: function () {
                            TheBarRect.right = GraphyRect.left;
                            TheBarRect.bottom = GraphyRect.top + OneRowHeight;
                        },
                        draw: function () {
                            TheBarRect.right += (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);
                            TheBarRect.left = TheBarRect.right;
                        },
                        end: function () {
                            TheBarRect.right += (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);

                            TheBarRect.top = TheBarRect.bottom;
                            TheBarRect.bottom += OneRowHeight;
                            TheBarRect.left = GraphyRect.left;
                            TheBarRect.right = GraphyRect.left;
                        }
                    },
                    implRightToLeft = {
                        init: function () {
                            TheBarRect.left = GraphyRect.right;
                            TheBarRect.top = GraphyRect.bottom - OneRowHeight;
                        },
                        draw: function () {
                            TheBarRect.left -= (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);
                            TheBarRect.right = TheBarRect.left;
                        },
                        end: function () {
                            TheBarRect.left -= (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);

                            TheBarRect.bottom = TheBarRect.top;
                            TheBarRect.top -= OneRowHeight;
                            TheBarRect.left = GraphyRect.right;
                            TheBarRect.right = GraphyRect.right;
                        }
                    },
                    implTopToBottom = {
                        init: function () {
                            TheBarRect.bottom = GraphyRect.top;
                            TheBarRect.left = GraphyRect.right - OneRowHeight;
                        },
                        draw: function () {
                            TheBarRect.bottom += (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);
                            TheBarRect.top = TheBarRect.bottom;
                        },
                        end: function () {
                            TheBarRect.bottom += (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);

                            TheBarRect.right = TheBarRect.left;
                            TheBarRect.left -= OneRowHeight;
                            TheBarRect.top = GraphyRect.top;
                            TheBarRect.bottom = GraphyRect.top;
                        }
                    },
                    implBottomToTop = {
                        init: function () {
                            TheBarRect.top = GraphyRect.bottom;
                            TheBarRect.right = GraphyRect.left + OneRowHeight;
                        },
                        draw: function () {
                            TheBarRect.top -= (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);
                            TheBarRect.bottom = TheBarRect.top;
                        },
                        end: function () {
                            TheBarRect.top -= (OneBarWidth * CurBarCount);
                            context.fillRect2(TheBarRect, barColor);

                            TheBarRect.left = TheBarRect.right;
                            TheBarRect.right += OneRowHeight;
                            TheBarRect.top = GraphyRect.bottom;
                            TheBarRect.bottom = GraphyRect.bottom;
                        }
                    },
                    impl;

                grhelper.GRASSERT(Math.floor((Cols - 1) / 8 + 1) * Rows * 2 === ModuleText.length);

                //根据一列的总条数，计算每条的宽度，根据行数，计算每行的高度，
                if (barcodeType != grenum.BarcodeType.PDF417) { //保证小图形块为正方形
                    if (OneBarWidth > OneRowHeight) {
                        OneBarWidth = OneRowHeight;
                    }
                    else {
                        OneRowHeight = OneBarWidth;
                    }
                }

                BarGraphWidth = OneBarWidth * Cols;
                BarGraphHeight = OneRowHeight * Rows;
                xCenterOffset = (BarAreaWidth - BarGraphWidth) / 2; //每条的宽度已经取整，所以总宽度会有剩余，所以进行居中调整
                yCenterOffset = (BarAreaHeight - BarGraphHeight) / 2; //每条的高已经取整，所以总宽度会有剩余，所以进行居中调整
                if (!IsHorz) {
                    i = xCenterOffset;
                    xCenterOffset = yCenterOffset;
                    yCenterOffset = i;
                }

                GraphyRect.left += xCenterOffset;
                GraphyRect.right = GraphyRect.left + BarGraphWidth;
                GraphyRect.top += yCenterOffset;
                GraphyRect.bottom = GraphyRect.top + BarGraphHeight;

                //关于二维码的输出方向说明：以第一行数据的输出方向为判断标志
                //grenum.BarcodeDirection.LeftToRight：正常输出
                //grenum.BarcodeDirection.RightToLeft：顺时针旋转180度输出
                //grenum.BarcodeDirection.TopToBottom：顺时针旋转90度输出
                //grenum.BarcodeDirection.BottomToTop：顺时针旋转270度输出
                switch (direction) {
                    case grenum.BarcodeDirection.LeftToRight:
                        impl = implLeftToRight;
                        break;
                    case grenum.BarcodeDirection.RightToLeft:
                        impl = implRightToLeft;
                        break;
                    case grenum.BarcodeDirection.TopToBottom:
                        impl = implTopToBottom;
                        break;
                    default:
                        grhelper.GRASSERT(grenum.BarcodeDirection.BottomToTop === direction);
                        impl = implBottomToTop;
                        break;
                }

                TheBarRect = GraphyRect.clone();
                impl.init();

                ModuleTextLen = ModuleText.length;
                i = 0;
                for (row = 0; row < Rows; ++row) {
                    Bit8 = (HexCharToBYTE(ModuleText[i++]) << 4) | HexCharToBYTE(ModuleText[i++]);
                    CurBitMod = 0x80;
                    barColor = Bit8 & CurBitMod ? blackColor : whiteColor; //IsBlackBar = ((Bit8 & CurBitMod) !== 0);
                    CurBarCount = 1;
                    CurBitMod >>= 1;

                    for (col = 1; col < Cols; ++col) {
                        if (0 == (col % 8)) {
                            Bit8 = (HexCharToBYTE(ModuleText[i++]) << 4) | HexCharToBYTE(ModuleText[i++]);
                            CurBitMod = 0x80;
                        }

                        barColorNew = Bit8 & CurBitMod ? blackColor : whiteColor; //IsBlackBarNew = ((Bit8 & CurBitMod) != 0);
                        if (barColor === barColorNew) {
                            ++CurBarCount;
                        }
                        else { //绘出Bar
                            impl.draw();

                            barColor = barColorNew;
                            CurBarCount = 1;
                        }

                        CurBitMod >>= 1;
                    }

                    //绘出最后的Bar，并进行换行处理
                    impl.end();
                }
                grhelper.GRASSERT(i === ModuleText.length);
            }

            //以一个文字的1/10大小为单位
            function GetStartStopModules() {
                grhelper.GRASSERT(!StartMarginModules && !StopMarginModules);
                switch (barcodeType) {
                    case grenum.BarcodeType.CodeEAN13:
                        StartMarginModules = 15; //11
                        StopMarginModules = 0;   //7
                        break;
                    case grenum.BarcodeType.CodeUPC_A:
                    case grenum.BarcodeType.CodeUPC_E0:
                    case grenum.BarcodeType.CodeUPC_E1:
                        StartMarginModules = 12; //11
                        StopMarginModules = 12;   //7
                        break;
                    default:
                        break;
                }
            }

            function draw1DBarcode() {
                var Alignment = self.Alignment,
                    ModuleRatios = MakeModules(),
                    Modules = GetWidthOfModule(ModuleText),
                    BarWidth = self.BarWidth,
                    perMargin = textWidth / tsOutputText.length / 10,
                    HalfBarHeight = BarAreaHeight * 2 / 5,
                    OutBarHeight = DrawAsGoodsBarcode ? BarAreaHeight + textHeight * 2 / 3 : BarAreaHeight,
                    itemModule,
                    BarWidth,
                    TheBarHeight,
                    barColor;

                function MakeModules() {
                    var BarRatio = self.BarRatio;

                    switch (barcodeType) {
                        case grenum.BarcodeType.Code25Intlv:
                        case grenum.BarcodeType.Code25Ind:
                        case grenum.BarcodeType.Code39:
                        case grenum.BarcodeType.CodeEAN8:
                        case grenum.BarcodeType.CodeEAN13:
                        case grenum.BarcodeType.Code39X:
                        case grenum.BarcodeType.CodeCodabar:
                        case grenum.BarcodeType.CodeUPC_A:
                        case grenum.BarcodeType.CodeUPC_E0:
                        case grenum.BarcodeType.CodeUPC_E1:
                        case grenum.BarcodeType.CodeUPC_Supp2:
                        case grenum.BarcodeType.CodeUPC_Supp5:
                            if (BarRatio < 2.0)
                                BarRatio = 2.0;
                            if (BarRatio > 3.0)
                                BarRatio = 3.0;
                            break;
                        case grenum.BarcodeType.Code25Matrix:
                            if (BarRatio < 2.25)
                                BarRatio = 2.25;
                            if (BarRatio > 3.0)
                                BarRatio = 3.0;
                            break;
                        default:
                            break;
                    }

                    return [1.0, BarRatio, BarRatio * 1.5, BarRatio * 2];
                }

                function OneBarProps(Code) {
                    var val = HexCharToBYTE(Code);

                    return {
                        w: ModuleRatios[val % 4],
                        lt: Math.floor(val / 4)
                    };
                }

                function GetWidthOfModule(ModuleText) {	//以窄条为计量单位，计算需要显示的条的个数
                    var i = ModuleText.length,
                        Ret = 0;

                    while (i-- > 0) {
                        Ret += OneBarProps(ModuleText[i]).w;
                    }
                    return Ret;
                }

                StartMarginWidth = perMargin * StartMarginModules;
                StopMarginWidth = perMargin * StopMarginModules;
                OneModuleWidth = BarWidth ? report.UnitToPixels(BarWidth) : (BarAreaWidth - StartMarginWidth - StopMarginWidth) / Modules;
                BarGraphWidth = OneModuleWidth * Modules + StartMarginWidth + StopMarginWidth;
                ModuleWidthTooBig = (BarGraphWidth > BarAreaWidth + 1); //小数计算， +1为了防止计算误差

                if (!ModuleWidthTooBig) {
                    //图形居中显示，求出居中偏移
                    switch (Alignment) {
                        case grenum.StringAlignment.Near:
                            xCenterOffset = StartMarginWidth;
                            break;
                        case grenum.StringAlignment.Center:
                            xCenterOffset = (BarAreaWidth - BarGraphWidth) / 2 + StartMarginWidth;
                            break;
                        default:
                            grhelper.GRASSERT(Alignment == grenum.StringAlignment.Far);
                            xCenterOffset = (BarAreaWidth - BarGraphWidth + StartMarginWidth);
                            break;
                    }

                    TheBarRect = GraphyRect;
                    switch (direction) {
                        case grenum.BarcodeDirection.LeftToRight:
                            TheBarRect.left += xCenterOffset;
                            break;
                        case grenum.BarcodeDirection.RightToLeft:
                            TheBarRect.right -= xCenterOffset;
                            break;
                        case grenum.BarcodeDirection.TopToBottom:
                            TheBarRect.top += xCenterOffset;
                            break;
                        default:
                            grhelper.GRASSERT(grenum.BarcodeDirection.BottomToTop == direction);
                            TheBarRect.bottom -= xCenterOffset;
                            break;
                    }

                    for (i = 0; i < ModuleTextLen; ++i) {
                        itemModule = OneBarProps(ModuleText[i]);

                        BarWidth = itemModule.w * OneModuleWidth;
                        TheBarHeight = (itemModule.lt === grenum.barcodeLineType.black_half) ? HalfBarHeight :
                            ((itemModule.lt == grenum.barcodeLineType.black_out) ? OutBarHeight : BarAreaHeight);
                        barColor = (itemModule.lt == grenum.barcodeLineType.white) ? whiteColor : blackColor;

                        switch (direction) {
                            case grenum.BarcodeDirection.LeftToRight:
                                TheBarRect.right = TheBarRect.left + BarWidth;
                                TheBarRect.bottom = TheBarRect.top + TheBarHeight;
                                context.fillRect2(TheBarRect, barColor);
                                TheBarRect.left = TheBarRect.right;
                                break;
                            case grenum.BarcodeDirection.RightToLeft:
                                TheBarRect.left = TheBarRect.right - BarWidth;
                                TheBarRect.bottom = TheBarRect.top + TheBarHeight;
                                context.fillRect2(TheBarRect, barColor);
                                TheBarRect.right = TheBarRect.left;
                                break;
                            case grenum.BarcodeDirection.TopToBottom:
                                TheBarRect.bottom = TheBarRect.top + BarWidth;
                                TheBarRect.left = TheBarRect.right - TheBarHeight;
                                context.fillRect2(TheBarRect, barColor);
                                TheBarRect.top = TheBarRect.bottom;
                                break;
                            default:
                                grhelper.GRASSERT(grenum.BarcodeDirection.BottomToTop == direction);
                                TheBarRect.top = TheBarRect.bottom - BarWidth;
                                TheBarRect.left = TheBarRect.right - TheBarHeight;
                                context.fillRect2(TheBarRect, barColor);
                                TheBarRect.bottom = TheBarRect.top;
                                break;
                        }
                    }
                }
            }

            //显示条形
            if (Is2DBarcode) {
                draw2DBarcode();
            }
            else {
                GetStartStopModules();

                draw1DBarcode();
            }

            if (ModuleWidthTooBig) {
                pdd.drawTextCenter("条宽度太大，条码无法完整显示", (canvasRect.left + canvasRect.right) / 2, (canvasRect.top + canvasRect.bottom - textHeight) / 2);
            }
            else if (captionPosition != grenum.BarcodeCaptionPosition.None) {//显示文字
                function drawCaption() {
                    var CaptionAlignment = self.CaptionAlignment,
                        TextAlign = CaptionAlignment === grenum.StringAlignment.Near ? grenum.TextAlign.MiddleLeft :
                            (CaptionAlignment === grenum.StringAlignment.Center ? grenum.TextAlign.MiddleCenter : grenum.TextAlign.MiddleRight),
                        Alignment = self.Alignment,
                        subText,
                        x,
                        y,
                        BeginPos = TextRect.left + xCenterOffset,
                        EndPos;

                    if (IsHorz) {
                        if (captionPosition === grenum.BarcodeCaptionPosition.Below)
                            yCenterOffset = -yCenterOffset;
                        TextRect.top += yCenterOffset;
                        TextRect.bottom += yCenterOffset;
                    }
                    else {
                        if (captionPosition === grenum.BarcodeCaptionPosition.Above)
                            xCenterOffset = -xCenterOffset;
                        TextRect.left += xCenterOffset;
                        TextRect.right += xCenterOffset;
                    }

                    if (!DrawAsGoodsBarcode) {
                        //二维条码要在图形与文字之间留空白距离
                        if (IsHorz) {
                            switch (Alignment) {
                                case grenum.StringAlignment.Near:
                                    TextRect.right = TextRect.left + BarGraphWidth;
                                    break;
                                case grenum.StringAlignment.Center:
                                    TextRect.left = (TextRect.left + TextRect.right - BarGraphWidth) / 2;
                                    TextRect.right = TextRect.left + BarGraphWidth;
                                    break;
                                default:
                                    grhelper.GRASSERT(Alignment == grenum.StringAlignment.Far);
                                    TextRect.left = TextRect.right - BarGraphWidth;
                                    break;
                            }

                            context.drawTextAlign2(tsOutputText, TextRect, TextAlign);
                        }
                        else {
                            switch (Alignment) {
                                case grenum.StringAlignment.Near:
                                    TextRect.bottom = TextRect.top + BarGraphWidth;
                                    break;
                                case grenum.StringAlignment.Center:
                                    TextRect.top = (TextRect.top + TextRect.bottom - BarGraphWidth) / 2;
                                    TextRect.bottom = TextRect.top + BarGraphWidth;
                                    break;
                                default:
                                    grhelper.GRASSERT(Alignment == grenum.StringAlignment.Far);
                                    TextRect.top = TextRect.bottom - BarGraphWidth;
                                    break;
                            }

                            x = TextRect.right;
                            switch (CaptionAlignment) {
                                case grenum.StringAlignment.Near:
                                    y = TextRect.top;
                                    break;
                                case grenum.StringAlignment.Center:
                                    y = (TextRect.top + TextRect.bottom - textWidth) / 2;
                                    break;
                                default:
                                    grhelper.GRASSERT(CaptionAlignment == grenum.StringAlignment.Far);
                                    y = TextRect.bottom - textWidth;
                                    break;
                            }
                            context.drawTextRotate(tsOutputText, x, y, 270);
                        }
                    }
                    else {
                        i = 0;
                        switch (barcodeType) {
                            case grenum.BarcodeType.CodeEAN13:
                                //各种方向如何处理？：暂时不处理了
                                grhelper.GRASSERT(tsOutputText.length === 13);
                                //首先输出第一个文字
                                BeginPos -= StartMarginWidth;
                                context.drawText(tsOutputText.substr(i++, 1), BeginPos, TextRect.top);

                                //输出左边的文字
                                BeginPos = TextRect.left + xCenterOffset + (3 + 1) * OneModuleWidth; //+1表示左端缩进1个模块
                                EndPos = BeginPos + 42 * OneModuleWidth;
                                context.drawEqualSpaceText(tsOutputText.substr(i, 6), BeginPos, EndPos, TextRect.top);
                                i += 6;

                                //输出右边的文字
                                BeginPos = TextRect.left + xCenterOffset + (3 + 42 + 5) * OneModuleWidth;
                                EndPos = BeginPos + (35 + 7 - 1) * OneModuleWidth; //-1表示右端缩进1个模块
                                context.drawEqualSpaceText(tsOutputText.substr(i, 6), BeginPos, EndPos, TextRect.top);
                                break;
                            case grenum.BarcodeType.CodeEAN8:
                                grhelper.GRASSERT(tsOutputText.length == 8);

                                //输出左边的文字
                                BeginPos += (3 + 1) * OneModuleWidth; //+1表示左端缩进1个模块
                                EndPos = BeginPos + 28 * OneModuleWidth;
                                context.drawEqualSpaceText(tsOutputText.substr(i, 4), BeginPos, EndPos, TextRect.top);
                                i += 4;

                                //输出右边的文字
                                BeginPos = TextRect.left + xCenterOffset + (3 + 28 + 5) * OneModuleWidth;
                                EndPos = BeginPos + (21 + 7 - 1) * OneModuleWidth; //-1表示右端缩进1个模块
                                context.drawEqualSpaceText(tsOutputText.substr(i, 4), BeginPos, EndPos, TextRect.top);
                                break;
                            case grenum.BarcodeType.CodeUPC_E0:
                            case grenum.BarcodeType.CodeUPC_E1:
                                grhelper.GRASSERT(tsOutputText.length === 7);

                                //<<首先输出两端的文字
                                context.fontSizeTo(Math.floor(context.usingFont.Size * 0.77));
                                textHeight = fontHeight(context.usingFont);

                                textWidth = context.measureTextWidth("0"); //TextSize = GRReuse::Getself.RealGenerateTextExtent(_T("0"), 1);
                                BeginPos -= StartMarginWidth;
                                context.drawText("0", BeginPos, TextRect.bottom - textHeight);

                                subText = tsOutputText.substr(6);
                                textWidth = context.measureTextWidth(subText);
                                //BeginPos = TextRect.left + xCenterOffset + (3 + 42 + 7) * OneModuleWidth + StopMarginWidth - textWidth;
                                BeginPos = TextRect.right - xCenterOffset + StopMarginWidth - textWidth;
                                context.drawText(subText, BeginPos, TextRect.bottom - textHeight);

                                context.restoreFont();
                                //>>首先输出两端的文字

                                //输出的文字
                                BeginPos = TextRect.left + xCenterOffset + (3 + 1) * OneModuleWidth; //+1表示左端缩进1个模块
                                EndPos = BeginPos + 42 * OneModuleWidth;
                                context.drawEqualSpaceText(tsOutputText.substr(0, 6), BeginPos, EndPos, TextRect.top);
                                break;
                            case grenum.BarcodeType.CodeUPC_A:
                                grhelper.GRASSERT(tsOutputText.length == 12);

                                //<<首先输出两端的文字
                                context.fontSizeTo(Math.floor(context.usingFont.Point * 0.77));
                                textHeight = fontHeight(context.usingFont);

                                subText = tsOutputText.substr(0, 1);
                                textWidth = context.measureTextWidth(subText);
                                BeginPos -= StartMarginWidth;
                                context.drawText(subText, BeginPos, TextRect.bottom - textHeight);

                                subText = tsOutputText.substr(11);
                                textWidth = context.measureTextWidth(subText);
                                BeginPos = TextRect.left + xCenterOffset + (3 + 12 * 7 + 5 + 3) * OneModuleWidth + Math.max(StopMarginWidth - textWidth, 2);
                                context.drawText(subText, BeginPos, TextRect.bottom - textHeight);

                                context.restoreFont();
                                //>>首先输出两端的文字

                                //输出左边的文字
                                BeginPos = TextRect.left + xCenterOffset + (3 + 7 + 1) * OneModuleWidth; //+1表示左端缩进1个模块
                                EndPos = BeginPos + 35 * OneModuleWidth;
                                ++i;
                                context.drawEqualSpaceText(tsOutputText.substr(i, 5), BeginPos, EndPos, TextRect.top);

                                //输出右边的文字
                                BeginPos = EndPos + 5 * OneModuleWidth; //+1表示左端缩进1个模块
                                EndPos = BeginPos + 35 * OneModuleWidth;
                                i += 5;
                                context.drawEqualSpaceText(tsOutputText.substr(i, 5), BeginPos, EndPos, TextRect.top);
                                break;
                        }
                    }
                }

                drawCaption();
            }

            context.restoreFont();
        },

        get Value() { //用于 Crosstab 中
            return this.getDisplayText();
        },

        //com interface
        get DisplayText() {
            return this.getDisplayText();
        },
        get AsBarcode() {
            return this;
        },
    };
    prototypeCopyExtend(Barcode, CanvasBox);

    var PictureBox = function (owner) {
        var self = this;

        Control.call(self, owner);

        self.Alignment = grenum.PictureAlignment.Center; //暂不支持，就处理居中方式
        self.SizeMode = grenum.PictureSizeMode.Zoom;
        self.TransparentMode = grenum.PictureTransparentMode.None;
        self.RotateMode = grenum.PictureRotateMode.None;
        self.ImageIndex = 0;
        self.Picture = "";
        self.ImageFile = "";
        self.DataField = "";
    };
    PictureBox.prototype = {
        ControlType: grenum.ControlType.PictureBox,

        afterLoad: function (objJson) {
            var self = this;

            Control.prototype.afterLoad.call(self, objJson);

            //enumMemberValid(self, "Alignment", grenum.PictureAlignment);
            enumMemberValid(self, "SizeMode", grenum.PictureSizeMode);
            enumMemberValid(self, "TransparentMode", grenum.PictureTransparentMode);
            enumMemberValid(self, "RotateMode", grenum.PictureRotateMode);
        },

        attachData: function () {
            var self = this;

            self.oDataField = self.report.RunningFieldByName(self.DataField);
        },

        generateNormal: function (htmlElement) {
            var self = this,
                Picture = self.Picture,
                oDataField = self.oDataField,
                ImageFiles = self.ImageFiles,
                ImageFile = ImageFiles ? ImageFiles[self.getOwnerDetailGrid().Recordset.RecordNo] : self.ImageFile, //ImageFile = self.ImageFile,
                ImageIndex = self.ImageIndex,
                SizeMode = self.SizeMode,
                pxRect,
                pxControlWidth,
                pxControlHeight,
                value,
                imgElement,
                tempImg,
                width,
                height;

            if (Picture) {
                value = "data:image;base64," + Picture; //如：<img src="data:image/png;base64,iVBOR..." />
            }
            else if (oDataField) {
                value = oDataField.AsString;
                if (value.length > 256) {
                    value = "data:image;base64," + value;
                }
            }
            else if (ImageFile) {
                value = ImageFile;
            }
            else if (ImageIndex) {
                value = ImageIndex;
            }

            if (value) {
                if (isNaN(value)) {
                    if (SizeMode === grenum.PictureSizeMode.Tile) {
                        htmlElement.addStyle("background-image", "url(" + value + ")");
                    }
                    else {
                        pxRect = self.pxRect;
                        if (!pxRect) {
                            pxRect = self.owner.getRect();
                        }
                        pxControlWidth = pxRect.Width();
                        pxControlHeight = pxRect.Height();

                        htmlElement.addStyle("text-align", "center");
                        htmlElement.addStyle("vertical-align", "middle");

                        imgElement = new HtmlElement("img", htmlElement);
                        imgElement.skipend = 1;

                        //TDD...???图像大小可能要分是表格布局，还是绝对位置布局，不同的布局方式可以要设置不同的width与height属性
                        if (self.SizeMode === grenum.PictureSizeMode.Stretch) {
                            //如果是在表格的单元格中，感觉设置‘100%’图像会把表格撑开，从而让表格变形，多数浏览器都会这样
                            width = pxControlWidth;
                            height = pxControlHeight;
                        }
                        else { //其它模式应该根据图像的尺寸与显示区域的尺寸来确定
                            try {
                                //HTML DOM Image 对象中可以获取到图像的相关属性, 用 createElement 方法创建一个临时的图片对象
                                tempImg = document.createElement("img");
                                tempImg.src = value;

                                if (self.SizeMode === grenum.PictureSizeMode.Zoom || tempImg.width > pxControlWidth || tempImg.height > pxControlHeight) {
                                    if (tempImg.width * pxControlHeight > pxControlWidth * tempImg.height) {
                                        width = pxControlWidth;
                                    }
                                    else {
                                        height = pxControlHeight;
                                    }
                                }
                                else {
                                    //有些图像数据没法得到 width 与 height
                                    if (tempImg.width && tempImg.height) {
                                        width = tempImg.width;
                                        height = tempImg.height;
                                    }
                                    else {
                                        width = pxControlWidth;
                                        height = pxControlHeight;
                                    }
                                }
                            }
                            catch (e) {
                                width = pxControlWidth;
                                height = pxControlHeight;
                            }
                        }

                        width && imgElement.addAttribute("width", Math.round(width));
                        height && imgElement.addAttribute("height", Math.round(height));

                        imgElement.addAttribute("src", value);
                    }
                }
                else { //显示为按钮控件，暂时只显示为checkbox
                    value = +value;

                    htmlElement.addStyle("text-align", "center");
                    htmlElement.addStyle("vertical-align", "middle");

                    //<input type="checkbox" id="myCheck" checked />
                    imgElement = new HtmlElement("input", htmlElement);
                    imgElement.skipend = 1;

                    imgElement.addAttribute("type", "checkbox");

                    //id
                    //if (owner2.ContentCells) {
                    //    id = "CBC" + owner2.owner.Recordset.RecordNo;
                    //}
                    //else if (owner2.Header) {
                    //    id = "CBG" + owner2.recordset.recordNo;
                    //}
                    //else {
                    //    id = self.Name;
                    //}
                    //imgElement.addAttribute("id", id);
                    imgElement.addAttribute("id", self.getCheckBoxID())

                    imgElement.addClass(grconst.CSS_CB); //标识类，便于用querySelectorAll选择

                    if (value === -1 || value === -3) {
                        imgElement.addAttribute("checked");
                    }

                    if (oDataField) {
                        imgElement.addAttribute(grconst.ATTR_FIELD, oDataField.Name); //属性中记录下字段
                    }

                    self.report._has_cb = 1;
                }
            }
        },

        getCheckBoxID: function () {
            var self = this,
                owner2 = self.owner.owner,
                id;

            if (owner2.ContentCells) {
                id = "CBC" + owner2.owner.Recordset.RecordNo;
            }
            else if (owner2.Header) {
                id = "CBG" + owner2.recordset.recordNo;
            }
            else {
                id = self.Name;
            }

            return id;
        },

        set Text(val) { //用于 Report::attachDataTable 中
            this[val.length > 256 ? "Picture" : "ImageFile"] = val;
        },

        get checked() {
            var self = this,
                oDataField = self.oDataField,
                val = oDataField ? oDataField.AsInteger : self.ImageIndex;

            return val === -1 || val === -3;
        },

        set checked(val) {
            var self = this,
                oDataField = self.oDataField,
                recordset,
                ImageIndex = val ? -1 : -2;

            if (oDataField) {
                recordset = oDataField.owner;
                recordset.Edit();
                oDataField.AsInteger = ImageIndex;
                recordset.Post();
            }
            else {
                self.ImageIndex = ImageIndex;
            }

            //对应的html checkbox 元素也要更新checked状态值
            document.getElementById(self.getCheckBoxID()).checked = val;
        },

        //com interface
        get AsPictureBox() {
            return this;
        },
        LoadFromFile: function (PathFile) {
            var self = this,
                ownerDetailGrid = self.getOwnerDetailGrid();

            if (ownerDetailGrid) {
                if (!self.ImageFiles) {
                    self.ImageFiles = {};
                }
                self.ImageFiles[ownerDetailGrid.Recordset.RecordNo] = PathFile;
            }
            else {
                self.ImageFile = PathFile;
            }
        },
    };
    prototypeCopyExtend(PictureBox, Control);

    var RichTextBox = function (owner) {
        var self = this;

        Control.call(self, owner);
    };
    RichTextBox.prototype = {
        ControlType: grenum.ControlType.RichTextBox,

        //attachData: function () {
        //},
        get AsRichTextBox() {
            return this;
        },

        generateNormal: function (htmlElement) {
            htmlElement.innerText = "不支持RichTextBox";
        },
    };
    prototypeCopyExtend(RichTextBox, Control);

    var SubReport = function (owner) {
        var self = this;

        Control.call(self, owner);

        //self.CanGrow = false;
        //self.CanShrink = false;
        self.HideOnRecordsetEmpty = false;
        self.RelationFields = "";
        //self.ReportFile = "";

        self.Report = new Report(owner.report.viewer, self);
    };
    SubReport.prototype = {
        ControlType: grenum.ControlType.SubReport,

        afterLoad: function (objJson) {
            var self = this,
                jsonReport = objJson.Report;

            Control.prototype.afterLoad.call(self, objJson);

            self.Report.isWR = self.report.isWR;

            jsonReport && self.Report.loadFromJSON(jsonReport);
        },

        prepare: function () {
            var self = this,
                ownerReport = self.report;

            Control.prototype.prepare.call(self);

            //将每个子报表记录到其父报表的 _srChildren 数组属性中
            if (!ownerReport._srChildren) {
                ownerReport._srChildren = [];
            }
            ownerReport._srChildren.push(self);

            //如果有主从关系，建立记录集的主从关系
            self.prepareRelationRecordset();
        },

        prepareRelationRecordset: function () {
            var self = this,
                relationFields = self.RelationFields,
                ownerReport = self.report,
                ownerDetailGrid = ownerReport.DetailGrid,
                ownerRecordset,
                ownerFields,
                selfReport = self.Report,
                selfDetailGrid = selfReport.DetailGrid,
                selfRecordset,
                selfFields,
                curTable,
                relationTables;

            if (relationFields && selfDetailGrid && ownerDetailGrid) { //&& ((ParentType() == cpkColumnContentCell) || (ParentType() == cpkGroupSection)) )
                ownerRecordset = ownerDetailGrid.Recordset;
                selfRecordset = selfDetailGrid.Recordset;
                ownerFields = ownerRecordset.decodeFields(relationFields);
                selfFields = selfRecordset.decodeFields(relationFields);
                if (ownerFields.length === selfFields.length && selfRecordset.RecordCount) {
                    self._rmFields = ownerFields;
                    self._rdFields = selfFields;
                    relationTables = self._relations = [];

                    //遍历子报表的全部明细记录，创建self.RunningRecordStoreInfos数据
                    selfRecordset.First();
                    curTable = []
                    relationTables.push(curTable);
                    curTable.push(selfRecordset.curRecord);
                    selfRecordset.keepValue();

                    selfRecordset.Next();
                    while (!selfRecordset.Eof()) {
                        if (selfRecordset.fieldsKeepedValueChanged(selfFields)) {
                            curTable = []
                            relationTables.push(curTable);
                            selfRecordset.keepValue();
                        }
                        curTable.push(selfRecordset.curRecord);

                        selfRecordset.Next();
                    }

                    //按照关系字段进行排序，以便后面匹配用折半查找
                    relationTables.sort(function (first, second) {
                        var i = 0,
                            len = selfFields.length,
                            memberName,
                            firstVal,
                            secondVal;

                        while (i < len) {
                            memberName = selfFields[i++]._tableMember;
                            firstVal = first[0][memberName];
                            secondVal = second[0][memberName];
                            if (firstVal < secondVal) {
                                return -1;
                            }
                            else if (firstVal > secondVal) {
                                return 1;
                            }
                        }
                        return 0;
                    });
                }
            }
        },

        generateNormal: function (htmlElement) {
            var self = this,
                recordset = self.Report.DetailGrid ? self.Report.DetailGrid.Recordset : undefined,
                attachedRelationTable = self._relations,

                ownerReport = self.report,
                ownerReportDetailGrid = ownerReport.DetailGrid,
                ownerDetailGrid = self.getOwnerDetailGrid(), //子报表所处的明细网格，仅当是明细网格中的子报表才会有此值
                ownerDataObj,

                parameters = self.Report.Parameters,
                parameterIndex = parameters.Count,
                parameter,
                name;

            //同步参数数据
            while (parameterIndex > 0) {
                parameter = parameters.Item(parameterIndex--);
                name = parameter.Name;

                //如果在子报表在明细网格中，则先优先匹配同名字段
                if (ownerDetailGrid) {
                    ownerDataObj = ownerReport.FieldByName(name);
                    if (ownerDataObj) {
                        parameter.Value = ownerDataObj.Value;
                    }
                    else {
                        ownerDataObj = ownerReport.ParameterByName(name);
                        if (ownerDataObj) {
                            parameter.Value = ownerDataObj.Value;
                        }
                    }
                }
                else {
                    ownerDataObj = ownerReport.ParameterByName(name);
                    if (ownerDataObj) {
                        parameter.Value = ownerDataObj.Value;
                    }
                    else if (ownerReportDetailGrid) {
                        ownerDataObj = ownerReport.FieldByName(name);
                        if (ownerDataObj) {
                            parameter.Value = ownerDataObj.Value;
                        }
                    }
                }
            }

            grhelper.GRASSERT(!recordset || !recordset._bakTable, "如果是主从关系的子报表明细网格，则要应用对应的子记录集");
            attachedRelationTable && self.attachRelationTable();

            (!self.HideOnRecordsetEmpty || !recordset || recordset.RecordCount) && self.Report.generate(htmlElement);

            attachedRelationTable && self.detachRelationTable();
        },
        detachRelationTable: function () {
            var recordset = this.Report.DetailGrid.Recordset;

            recordset._dataTable = recordset._bakTable;
            recordset._relTblIndex = -1;
            delete recordset._bakTable;
        },
        attachRelationTable: function () {
            //用折半查找法根据主报表的关系字段的值找到对应的子表子记录集
            var self = this,
                relationTables = self._relations,
                recordset = self.Report.DetailGrid.Recordset,
                masterRecord = self.report.DetailGrid.Recordset.curRecord,
                detailRecord,
                upperBound = relationTables.length - 1,
                lowerBound = 0,
                mid,
                cmpRet;

            function relationCmp() {
                var rmFields = self._rmFields,
                    rdFields = self._rdFields,
                    rFieldLen = rmFields.length,
                    i = 0,
                    masterVal,
                    detailVal;

                while (i < rFieldLen) {
                    detailVal = detailRecord[rdFields[i]._tableMember];;
                    masterVal = masterRecord[rmFields[i++]._tableMember];
                    if (detailVal < masterVal) {
                        return -1;
                    }
                    else if (detailVal > masterVal) {
                        return 1;
                    }
                }
                return 0;
            }

            grhelper.GRASSERT(relationTables && !recordset._bakTable, "SubReport's _relations member must be assigned");

            recordset._bakTable = recordset._dataTable;
            recordset._dataTable = [];

            while (lowerBound <= upperBound) {
                mid = Math.floor((lowerBound + upperBound) / 2);
                detailRecord = relationTables[mid][0];
                cmpRet = relationCmp();

                if (cmpRet < 0) {
                    lowerBound = mid + 1;
                }
                else if (cmpRet > 0) {
                    upperBound = mid - 1;
                }
                else {
                    recordset._dataTable = relationTables[mid];
                    recordset._relTblIndex = mid;
                    break;
                }
            }
            return true;
        },

        attachRelationTable2: function (tableIndex) {
            var self = this;

            self.Report.DetailGrid.Recordset._dataTable = self._relations[tableIndex];
        },

        //com interface
        get AsSubReport() {
            return this;
        },
    };
    prototypeCopyExtend(SubReport, Control);

    var FreeGridColumn = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.Visible = true;
        self.FixedWidth = false;
        self.Width = self.report.cm2Size(grenum.constVar.COL_W);
        //self.AlignColumnSide = grenum.AlignColumnSideStyle.Both;
    };
    FreeGridColumn.prototype = {
        prepare: function () {
            self.pxWidth = this.report.size2Pixel(self.Width);
        },

        //com interface
        get FreeGrid() {
            return this.owner;
        },
    };
    prototypeCopyExtend(FreeGridColumn, Object);

    var FreeGridRow = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.Visible = true;
        self.Height = self.report.cm2Size(grenum.constVar.ROW_H);
    };
    FreeGridRow.prototype = {
        prepare: function () {
            self.pxHeight = this.report.size2Pixel(self.Height);
        },

        //com interface
        get FreeGrid() {
            return this.owner;
        },
    };
    prototypeCopyExtend(FreeGridRow, Object);

    var FreeGrid = function (owner) {
        var self = this;

        Control.call(self, owner);

        self.ColumnCount = 5;
        self.RowCount = 5;
        self.TitleRows = 1;
        //self.TitleRepeat, VARIANT_BOOL, FALSE)
        self.ShowColLine = true;
        self.ShowRowLine = true;
        //self.CanGrow, VARIANT_BOOL, FALSE)
        //self.CanShrink, VARIANT_BOOL, FALSE)
        //self.GrowToBottom, VARIANT_BOOL, FALSE)

        //self.Border = new Border(grenum.BorderStyle.DrawLeft | grenum.BorderStyle.DrawRight | grenum.BorderStyle.DrawTop | grenum.BorderStyle.DrawBottom);
        self.ColLinePen = new Pen();
        self.RowLinePen = new Pen();

        self.columns = [];
        self.rows = [];
        self.cells = [];
    };
    FreeGrid.prototype = {
        ControlType: grenum.ControlType.FreeGrid,

        attachData: function () {
            var self = this,
                i,
                len,
                item;

            len = self.cells.length;
            for (i = 0; i < len; i++) {
                item = self.cells[i];
                item && item.forEach(function (cell) {
                    cell.attachData();
                    cell.prepare();
                });
            }
        },

        prepareChildren: function () {
            var self = this,
                columns = self.columns,
                rows = self.rows,
                cells = self.cells,
                i;

            grhelper.GRASSERT(columns.length !== self.ColumnCount || rows.length !== self.RowCount || cells.length !== self.RowCount, "FreeGrid isn't need prepareChildren");

            i = columns.length = self.ColumnCount;
            while (i--) {
                if (!columns[i]) {
                    columns[i] = new FreeGridColumn(self);
                }
            }

            i = cells.length = rows.length = self.RowCount;
            while (i--) {
                if (!rows[i]) {
                    rows[i] = new FreeGridRow(self);
                }
                if (!cells[i]) {
                    cells[i] = [];
                    cells[i].length = self.ColumnCount;
                }
            }
        },

        prepare: function () {
            var self = this,
                htmlStyles = new HtmlStyles();

            if (self.columns.length !== self.ColumnCount || self.rows.length !== self.RowCount || self.cells.length !== self.RowCount) {
                self.prepareChildren();
            }

            //???? 不用调用 Control.prototype.prepare.call(self);，因为其中的很多任务都不需要
            Control.prototype.prepare.call(self);

            htmlStyles.addCellBorder(self);
            self.blankCellStyle = self.report.viewer.addCustomStyle(htmlStyles);
        },

        assign: function (from) {
            var self = this;

            Control.prototype.assign.call(self, from);

            from.columns.forEach(function (item, index) {
                var obj = new FreeGridColumn(self);
                obj.assign(item);
                obj.pxWidth = item.pxWidth;
                self.columns[index] = obj;
            });

            from.rows.forEach(function (item, index) {
                var obj = new FreeGridRow(self);
                obj.assign(item);
                obj.pxHeight = item.pxHeight;
                self.rows[index] = obj;
            });

            from.cells.forEach(function (rows, irow) {
                rows.forEach(function (item, icol) {
                    var obj = new FreeGridCell(self, irow, icol);
                    obj.assign(item);

                    if (!self.cells[irow]) {
                        self.cells[irow] = [];
                    }

                    self.cells[irow][icol] = obj;
                });
            });

            self.Height = from.Height;
        },

        afterLoad: function (objJson) {
            var self = this,
                report = self.report,
                border = self.Border,
                columns = self.columns = [],
                rows = self.rows = [],
                cells = self.cells = [],
                item,
                jitem,
                i,
                len,
                total;


            Control.prototype.afterLoad.call(self, objJson);

            self.prepareChildren();

            if (objJson.FreeGridColumn) {
                len = objJson.FreeGridColumn.length;
                for (i = 0; i < len; i++) {
                    jitem = objJson.FreeGridColumn[i];
                    columns[jitem.index - 1].loadFromJSON(jitem);
                }
            }

            if (objJson.FreeGridRow) {
                len = objJson.FreeGridRow.length;
                for (i = 0; i < len; i++) {
                    jitem = objJson.FreeGridRow[i];
                    rows[jitem.index - 1].loadFromJSON(jitem);
                }
            }

            //按[row][col]形式存储
            if (objJson.FreeGridCell) {
                len = objJson.FreeGridCell.length;
                for (i = 0; i < len; i++) {
                    jitem = objJson.FreeGridCell[i];
                    --jitem.row;
                    --jitem.col;

                    item = cells[jitem.row][jitem.col] = new FreeGridCell(self, jitem.row, jitem.col);
                    item.loadFromJSON(jitem);
                }
            }

            //计算出每列的宽度像素与总宽度
            len = columns.length;
            total = 0;
            for (i = 0; i < len; i++) {
                item = columns[i];
                item.pxWidth = report.size2Pixel(item.Width);
                total += item.Width;
            }
            self.Width = total + report.pixel2Size(border.getLeftWidth() + border.getRightWidth());

            //计算出每行的高度像素与总高度
            len = rows.length;
            total = 0;
            for (i = 0; i < len; i++) {
                item = rows[i];
                item.pxHeight = report.size2Pixel(item.Height);
                total += item.Height;
            }
            self.Height = total + report.pixel2Size(border.getTopWidth() + border.getBottomWidth());
        },

        generateNormal: function (htmlElement) { //FreeGrid
            var self = this,
                viewer = self.report.viewer,
                htmlTable = new HtmlElement("table", htmlElement),
                colgroupElement = new HtmlElement("colgroup", htmlTable),
                element,
                flags = [],
                flag,
                i,
                len;

            self.Font.font && htmlTable.addClass(viewer.selectFont2(self.Font.font));

            htmlTable.styles.addBorder(self.Border);
            htmlTable.addStyle("border-collapse", "collapse"); //style中必须加上"border-collapse:collapse,这样才能让表格的单元格与表格行列线之间没有空白
            htmlTable.addStyle("width", "100%");
            self.toFillBack() && htmlTable.addBackColorStyle(self.BackColor);

            //<colgroup>
            //    <col style="width: 65%;">
            //    <col style="width: 35%;">
            //</colgroup>
            len = self.ColumnCount;
            flag = 0; //用于记录列的总宽度
            for (i = 0; i < len; i++) {
                flag += self.columns[i].pxWidth;
            }
            for (i = 0; i < len; i++) {
                element = new HtmlElement("col", colgroupElement);
                element.skipend = 1;
                //element.addStyle("width", percentToHtml(self.columns[i].pxWidth * 100 / self.pxRect.Width()));
                element.addStyle("width", percentToHtml(self.columns[i].pxWidth * 100 / flag));
            }

            //按行整理出要显示的单元格 
            //用 RowCount * ColumnCount 这样的二维数组标记单元格的占用状态
            for (i = 0; i < self.RowCount; i++) {
                flag = [];
                flag.length = self.ColumnCount;
                flags.push(flag);
            }

            //标记各个非空白单元格占用的单元格
            self.cells.forEach(function (rowCells, rowIndex) {
                rowCells.forEach(function (cell) {
                    function flagCombinedCell() {
                        var row = cell.row,
                            col,
                            erow = row + cell.RowSpan,
                            ecol = cell.col + cell.ColSpan;

                        for (; row < erow; row++) {
                            for (col = cell.col; col < ecol; col++) {
                                flags[row][col] = 1;
                            }
                        }
                    }

                    (cell.ColSpan > 1 || cell.RowSpan > 1) && flagCombinedCell();
                    flags[cell.row][cell.col] = cell;
                });
            });

            //根据行列格标记信息产生表格行与单元格信息
            flags.forEach(function (flag, rowIndex) {
                var columnCount = self.ColumnCount,
                    col = 0,
                    elementRow = new HtmlElement("tr", htmlTable), //row element
                    cell;

                elementRow.addStyle("height", pixelsToHtml(self.rows[rowIndex].pxHeight));

                do {
                    while (col < columnCount && !flag[col]) { //产生空白单元格
                        cell = new HtmlElement("td", elementRow);
                        cell.addClass(viewer._getCSSName(self.blankCellStyle));
                        col++;
                    };

                    while (col < columnCount && flag[col] === 1) { //1表示是合并的单元格，忽略掉
                        col++;
                    }

                    if (col < columnCount && (cell = flag[col])) { //有定义的单元格，即非空白单元格
                        cell.generate(elementRow);
                        col = cell.col + cell.ColSpan;
                    }
                } while (col < columnCount);
            });
        },

        //com interface
        get AsFreeGrid() {
            return this;
        },
        //[id(130), helpstring("method ColumnAt")] HRESULT ColumnAt([in] LONG ColumnIndex, [out, retval] IGRFreeGridColumn** ppItem); //序号从1开始
        ColumnAt: function (ColumnIndex) {
            var self = this,
                columns = self.columns;

            //if (len != self.ColumnCount) {
            //    columns.length = self.ColumnCount;
            //    while (len--) {
            //        if (!columns[len]) {
            //            columns[len] = new FreeGridColumn(self);
            //        }
            //    }
            //}
            if (columns.length !== self.ColumnCount) {
                self.prepareChildren();
            }

            return columns[ColumnIndex - 1];
        },
        //[id(131), helpstring("method RowAt")] HRESULT RowAt([in] LONG RowIndex, [out, retval] IGRFreeGridRow** ppItem);	//序号从1开始
        RowAt: function (RowIndex) {
            var self = this,
                rows = self.rows;

            if (rows.length !== self.RowCount) {
                self.prepareChildren();
            }

            return rows[RowIndex - 1];
        },
        //[id(132), helpstring("method CellAt")] HRESULT CellAt([in] LONG RowIndex, [in] LONG ColumnIndex, [out, retval] IGRFreeGridCell** ppItem); //序号从1开始
        CellAt: function (RowIndex, ColumnIndex) {
            var self = this,
                cells = self.cells,
                row_cells,
                cell = undefined;

            if (cells.length !== self.RowCount) {
                self.prepareChildren();
            }

            //return (0 < RowIndex && RowIndex <= cells.length) ? cells[RowIndex - 1][ColumnIndex - 1] : undefined;
            if (0 < RowIndex && RowIndex <= self.RowCount && 0 < ColumnIndex && ColumnIndex <= self.ColumnCount) {
                row_cells = cells[--RowIndex];
                cell = row_cells[--ColumnIndex];
                if (!cell) {
                    cell = row_cells[ColumnIndex] = new FreeGridCell(self, RowIndex, ColumnIndex);
                }
            }

            return cell;
        },
        //[id(133), helpstring("method CellByDataName")] HRESULT CellByDataName([in] BSTR DataName, [out, retval] IGRFreeGridCell** ppItem);
        CellByDataName: function (DataName) {
            var self = this,
                cells = self.cells,
                len = cells.length,
                row = len,
                row_cells,
                col,
                cell;

            while (row--) {
                row_cells = cells[row];
                col = row_cells.length;
                while (col--) {
                    cell = row_cells[col];
                    if (cell && cell.DataName === DataName) {
                        return cell;
                    }
                }
            }
            return undefined;
        },
    };
    prototypeCopyExtend(FreeGrid, Control);

    /////////////////////////////////////////////////////////////////////////
    var SectionRoot = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.Visible = true;
        //self.KeepTogether = true;
        self.CanGrow = false;
        self.CanShrink = false;
        self.Height = owner.report.cm2Size(self.defaultHeight()); //0;
        self.BackColor = owner.BackColor; //0xffffff;

        self.FormatScript = "";

        self.Font = new FontWrapper(self.getParentFont());
    };
    SectionRoot.prototype = {
        afterLoad: function (objJson) {
            var self = this,
                report = self.report;

            if (!objJson[self.getJsonMember("BackColor")]) {
                self.BackColor = self.getParentBackColor();
            }
            colorMemberValid(self, "BackColor", report.viewer.alpha.background);

            self.Font.loadFromJSON(objJson.Font, report.isWR);
        },

        prepare: function () {
            var self = this,
                controls = self.Controls;

            self.registerEventClass();

            self.pxHeight = self.report.size2Pixel(self.Height);

            //获取报表节中唯一部件框，且为子报表，且其无数据可隐藏
            self._singleHidableSR = self.getSingleHidableSR();

            //报表节中唯一子报表，则直接调用子报表的生成函数，而不用生成Section相关的html tag
            self._singleSR = controls && controls.Count === 1 && controls.Item(1).ControlType === grenum.ControlType.SubReport;
        },

        unprepare: function () {
            delete self.defaultStyle
        },

        generate: function (parentElement) {
            var self = this;

            self.report.fireSectionFormat(self);

            //因为在 fireSectionFormat 中有可能改变 Height 属性，所以要更新 pxHeight
            //if (self.pxHeight) {
            self.pxHeight = self.report.size2Pixel(self.Height);
            //}

            //分组头尾中的单个子报表(表中表)不能直接生成，其必须产生在 tr 与 td 元素里。根据 Group 属性判断是否为分组头尾
            self.isToGenerate() && (self._singleSR && !self.Group ?
                self.Controls.Item(1).generateContent(parentElement) :
                self.doGenerate(parentElement)); //call virtual function
        },

        defaultHeight: function () { //virtual 返回以CM为单位的默认节高度值
            return grenum.constVar.SEC_H;
        },
        getParentBackColor: function (objJson) { //virtual
            return this.owner.BackColor;
        },
        getParentFont: function () { ////virtual
            return this.owner.Font;
        },
        getSingleHidableSR: function () {
            return undefined;
        },
        isControlPositionClass: function () { //virtual
            return 0; //!this.tableRows;
        },
        isToGenerate: function () {
            var self = this,
                toGenerate = self.Visible && self.Height > 0;

            //唯一且无数据可隐藏的子报表，当其无数据时，对应的报表节也不显示
            function isHidableSRUnempty() {
                var singleHidableSR = self._singleHidableSR,
                    attachedRelationTable = singleHidableSR._relations,
                    ret;

                //如果子报表有主从关系，则要把当前记录集关联到对应的子记录集
                attachedRelationTable && singleHidableSR.attachRelationTable();

                ret = !singleHidableSR.Report.DetailGrid || singleHidableSR.Report.DetailGrid.Recordset.RecordCount;

                attachedRelationTable && singleHidableSR.detachRelationTable();

                return ret;
            }

            if (toGenerate && self._singleHidableSR) {
                toGenerate = isHidableSRUnempty();
            }

            //return self.Visible && self.Height > 0;
            return toGenerate;
        },
    };
    prototypeCopyExtend(SectionRoot, Object);

    var Section = function (owner) {
        var self = this;

        SectionRoot.call(self, owner);

        self.Controls = new Controls(self);
    };
    Section.prototype = {
        children: ["Controls"],

        afterLoad: function (objJson) {
            var self = this;

            SectionRoot.prototype.afterLoad.call(self, objJson);

            self.Controls.loadFromJSON(objJson.Control);
        },

        attachData: function () {
            this.Controls.attachData();
        },

        prepare: function () {
            var self = this,
                controls = self.Controls,
                report = self.report,
                viewer = report.viewer;

            SectionRoot.prototype.prepare.call(self);

            controls.layout();

            (viewer.options.controlPosition !== grenum.controlLayout.absolute) &&
            self.buildTableLayout(report.getReportWidth(), self.pxHeight);

            controls.prepare();

            if (self.tableRows) {
                report.reportFitHeight && calcSectionsHeightPercent(self.tableRows); //计算百分比高度

                self.tableRows.forEach(function (row) {
                    row.defaultStyle = viewer.selectSectionItem(row);
                });
            }
            //else {
            self.defaultStyle = viewer.selectSectionItem(self);
            //}
        },

        //关于 tableRows 的数据结构说明：
        //首先是与行对应的数组，记录了行对应的 section， height 与 cells
        //其中 cells 对应本行的各个部件框信息与空白单元格信息，是一个不定长数组
        buildTableLayout: function (width, height) {
            var self = this,
                viewer = self.report.viewer,
                i,
                visibleControlCount,
                rowsLen,
                colsLen,
                controls, //复制数组,而不是引用，排除掉不可见的
                rowEdges,
                colEdges,
                colByReportTable = self.getTableColEdges,
                mergedColumns = self.getMergedColumns ? self.getMergedColumns() : 0,
                flag,
                flags = [],
                tableRows = [];

            function buildEdges(beginMember, endMember, beginpos, endpos) {
                var len,
                    i,
                    prior,
                    edges = [];

                //产生初始行位置信息
                controls.forEach(function (control) {
                    edges.push({
                        pos: control.pxRect[beginMember],
                        count: 1
                    },
                    {
                        pos: control.pxRect[endMember],
                        count: 1
                    });
                });
                edges.sort(function (first, second) {
                    return first.pos - second.pos;
                });

                //合并掉头部为负的行, 合并掉尾部大于行高的行
                len = edges.length;
                i = 0;
                while (i < len && edges[i].pos < beginpos) {
                    edges[i++] = undefined;
                }
                if (i > 0) {
                    edges.unshift({
                        pos: beginpos,
                        count: i,
                    })
                    ++len;
                }
                if (!isNaN(endpos)) {
                    i = len - 1;
                    while (i >= 0 && edges[i] && edges[i].pos > endpos) {
                        edges[i--] = undefined;
                    }
                    i = len - 1 - i;
                    if (i >= 0) {
                        edges.push({
                            pos: endpos,
                            count: i,
                        })
                    }
                }

                prior = {
                    pos: -98765, //设个不可能出现的值
                };
                edges.forEach(function (row, index) { //合并相同的行
                    if (row) {
                        if (prior.pos === row.pos) {
                            prior.count++;
                            edges[index] = undefined;
                        }
                        else {
                            prior = row;
                        }
                    }
                });

                //合并相邻较近的行
                prior = {
                    pos: -98765, //设个不可能出现的值
                };
                edges.forEach(function (row, index) { //合并相邻较近的行(相隔小于8个点)
                    if (row) {
                        if (row.pos - prior.pos < 8) {
                            if (prior.count > row.count) {
                                prior.count += row.count;
                                edges[index] = undefined;
                            }
                            else {
                                row.count += prior.count
                                edges[i] = undefined;

                                prior = row;
                                i = index;
                            }
                        }
                        else {
                            prior = row;
                            i = index;
                        }
                    }
                });
                edges = edges.filter(function (row) { //去掉合并掉的行
                    return row;
                });

                len = edges.length;
                if (len > 1) {
                    //首尾两行(或列)如接近节边界，则将其设置为节边界
                    //首尾两行(或列)如果不是节边界，则追加边界位置行
                    if (edges[0].pos < beginpos + 4) {
                        edges[0].pos = beginpos;
                    }
                    if (edges[0].pos !== beginpos) {
                        edges.unshift({
                            pos: beginpos,
                            count: 0,
                        });
                        len++;
                    }
                    if (!isNaN(endpos)) {
                        len--;
                        if (endpos - edges[len].pos < 4) {
                            edges[len].pos = endpos;
                        }

                        if (edges[len].pos !== endpos) {
                            edges.push({
                                pos: endpos,
                                count: 0,
                            });
                        }
                    }
                }

                return edges;
            }; //end of buildEdges

            //control的一条边(member)找到匹配的网格线(edge)
            function matchEdge(member, cellmember, edges) {
                var i = 0,
                    len = edges.length;

                controls.sort(function (f, s) {
                    return f.pxRect[member] - s.pxRect[member];
                });

                controls.forEach(function (control) {
                    var pos = control.pxRect[member];

                    while (i < len && edges[i].pos < pos) {
                        i++;
                    };
                    //如果超出了范围(即 i >= len)，或位置更靠近前一个网格线(edge)
                    if (i >= len || (i > 0 && pos - edges[i - 1].pos < edges[i].pos - pos)) {
                        --i;
                    }
                    control.cell[cellmember] = i;
                });
            } //end of matchEdge

            grhelper.GRASSERT((viewer.options.controlPosition !== grenum.controlLayout.absolute), "");

            //排除掉不可见的部件框
            controls = self.Controls.items.filter(function (control) {
                control.cell = { control: control }; //为每个control准备一个cell属性
                return control.Visible;
            });
            visibleControlCount = controls.length;

            rowEdges = buildEdges("top", "bottom", 0, height);
            rowsLen = rowEdges.length - 1; //行数比边界数要少1

            //如果是分组节，而明细网格的列很少，则分组节不按表格的列匹配部件框到单元格
            //此时在生成时，分组节要产生自己的 table 定义
            if (colByReportTable) {
                colEdges = self.getTableColEdges();
                colsLen = colEdges.length - 1;

                if (colsLen < 8) {
                    flag = buildEdges("left", "right", 0, width);
                    if (flag.length > colsLen * 2) {
                        colEdges = flag;
                        colByReportTable = undefined; //取消按明细网格列生成
                    }
                }
            }
            else {
                colEdges = buildEdges("left", "right", 0, width);
            }
            colsLen = colEdges.length - 1; //列数比边界数要少1
            if (!colByReportTable) {
                //根据边界记录各列的宽度
                self.tableCols = [];
                i = 0;
                while (i < colsLen) {
                    self.tableCols.push(colEdges[i + 1].pos - colEdges[i++].pos);
                }
            }

            matchEdge("top", "beginRow", rowEdges);   //control的top找到匹配的行
            matchEdge("bottom", "endRow", rowEdges);  //control的bottom找到匹配的行
            matchEdge("left", "beginCol", colEdges);  //control的left找到匹配的列
            matchEdge("right", "endCol", colEdges);   //control的left找到匹配的列
            controls.forEach(function (control) {
                var cell = control.cell;

                //如果对齐到同一位置，让其伸展为一列或一行，不然此部件框将无法显示
                if (cell.endCol <= cell.beginCol && cell.endCol < colsLen) {
                    cell.endCol++;
                }
                if (cell.endRow <= cell.beginRow && cell.endRow < rowsLen) {
                    cell.endRow++;
                }
            });

            //至此行位置信息产生完，据此生成行信息
            i = 0;
            while (i < rowsLen) {
                tableRows.push({
                    section: self,
                    pxHeight: rowEdges[i + 1].pos - rowEdges[i++].pos,
                    cells: [],
                });
            }

            //去掉 beginRow与endRow相等 或 beginCol与endCol相等 的部件框
            controls = controls.filter(function (control) {
                var cell = control.cell;

                return cell.beginCol < cell.endCol && cell.beginRow < cell.endRow;
            });

            //将部件框按行列排序
            controls.sort(function (f, s) {
                var diffRow = f.cell.beginRow - s.cell.beginRow;

                return diffRow ? diffRow : (f.cell.beginCol - s.cell.beginCol);
            });

            //按行整理出要显示的单元格
            //用rowsLen * colsLen 这样的二维数组标记单元格的占用状态
            for (i = 0; i < rowsLen; i++) {
                flag = [];
                flag.length = colsLen;
                flags.push(flag);
            }

            //标记分组合并列占用的单元格
            mergedColumns &&
            mergedColumns.forEach(function (column) {
                var i = column.index;
                flags.forEach(function (flag) {
                    flag[i] = 1;
                });
            });

            //标记各个control占用的单元格
            i = 0; //这里 i 计数匹配到单元格的部件框个数
            controls.forEach(function (control) {
                var cell = control.cell,
                    flag = flags[cell.beginRow],
                    row,
                    col;

                //如果对应单元格区域被其它的部件框占住，则要让出来
                while (cell.beginCol < cell.endCol && flag[cell.beginCol]) {
                    cell.beginCol++;
                };
                while (cell.endCol > cell.beginCol && flag[cell.endCol - 1]) {
                    cell.endCol--;
                };
                if (cell.beginCol < cell.endCol) {
                    for (row = cell.beginRow; row < cell.endRow; row++) {
                        for (col = cell.beginCol; col < cell.endCol; col++) {
                            flags[row][col] = 1;
                        }
                    }
                    flag[cell.beginCol] = control;
                    i++;
                }
            });

            //如果部件框为自动(auto)布局且无分组列合并，如果匹配到单元格的部件框比例太少(75%)，则不用表格方式
            //反之：匹配率足够，或有合并列，或选项指定必须用 table 方式，则产生表格信息
            if (viewer.options.controlPosition === grenum.controlLayout.table || mergedColumns || (visibleControlCount && (i / visibleControlCount > 0.80))) {
                //根据行列格标记信息产生表格行与单元格信息
                flags.forEach(function (flag, rowIndex) {
                    var beginCol,
                        endCol,
                        cells = tableRows[rowIndex].cells,
                        cell;

                    beginCol = endCol = 0;
                    do {
                        while (endCol < colsLen && !flag[endCol]) {
                            endCol++;
                        };
                        if (beginCol < endCol) { //一个空白单元格
                            cells.push({
                                beginCol: beginCol,
                                endCol: endCol,
                            });
                            beginCol = endCol;
                        }

                        while (endCol < colsLen && flag[endCol] === 1) { //1表示是合并的单元格，忽略掉
                            endCol++;
                        }
                        beginCol = endCol;

                        if (beginCol < colsLen && (cell = flag[beginCol])) { //条件成立表示是部件框的单元格
                            cell = cell.cell;
                            cells.push(cell);

                            beginCol = endCol = cell.endCol;
                        }
                    } while (endCol < colsLen);
                });

                //如果CanShrink，如果一行中的单元格都是可收缩的，则本行为可收缩，其style不要设置 height 属性。
                tableRows.forEach(function (row) {
                    var controlCount = 0,
                        shrinkCount = 0;

                    row.cells.forEach(function (cell) {
                        if (cell.control) {
                            controlCount++;
                            cell.control.CanShrink && shrinkCount++;
                        }
                    });

                    (controlCount && shrinkCount === controlCount) && delete row.pxHeight;
                })

                self.tableRows = tableRows; //行与单元格信息产生完成，将其设置到对象属性中
            }
            else {
                delete self.tableCols;
                delete self.tableRows;

                self.Controls.items.forEach(function (control) {
                    delete control.cell;
                });
            }
        },

        unprepare: function () {
            var self = this;

            SectionRoot.prototype.unprepare.call(self);

            self.Controls.unprepare();
        },

        doGenerate: function (parentElement) { //virtual
            var self = this,
                viewer = self.report.viewer;

            parentElement = new HtmlElement(self.tableRows ? "table" : "div", parentElement);
            self.addElementEventClass(parentElement);
            parentElement.addClass(viewer.selectSection(self));
            if (self.tableRows) {
                parentElement.addStyle("border-collapse", "collapse");

                self.generateTableRows(parentElement);
            }
            else {
                parentElement.addStyle("position", "relative");

                self.Controls.generate(parentElement);
            }
        },

        generateTableRows: function (tableElement, mergingColumns) {
            var self = this,
                owner = self.owner,
                report = self.report,
                detailgrid = owner.RunningDetailGrid,
                viewer = report.viewer,
                reportFitWidth = (self.owner !== report) || report.reportFitWidth, //(self.owner !== report)表示不是报表头与报表尾
                tableCols = self.tableCols,
                totalColWidth = 0,
                colgroupElement,
                colElement;

            if (tableCols) {

                tableCols.forEach(function (col) {
                    totalColWidth += col;
                });

                //2020/01/04 补充实现
                //如果是报表头尾，且最后的列与明细网格基本对齐，则将最后一列的宽度要减去明细网格的左右边框宽度，
                //这样才能保持总的列宽与明细网格保持一致，这样计算出来的列百分比也才一致，让对齐列与明细网格
                //基本一致。但这样处理并未完全正确
                //测试案例见 source\test\grf\basic 中：columnalign.grf(没对齐)，columnalign-small.grf，columnalign-ingroup.grf
                if (owner == self.report && detailgrid) {
                    function adjustLastColWidth() {
                        var tableColLastIndex = tableCols.length - 1,
                            tableColLast = tableCols[tableColLastIndex],
                            detailgridShowingColumns = detailgrid.showingColumns,
                            detailgridColLast,
                            detailgridLRBorderWidth,
                            detailgridBorder = detailgrid.Border;

                        if (detailgridShowingColumns.length > 0) {
                            detailgridColLast = detailgridShowingColumns[detailgridShowingColumns.length - 1],
                            detailgridLRBorderWidth = detailgridBorder.getLeftWidth() + detailgridBorder.getRightWidth();

                            if (Math.abs(tableColLast - detailgridColLast.pxWidth - detailgridLRBorderWidth) < 0.5) {
                                tableCols[tableColLastIndex] -= detailgridLRBorderWidth;
                            }
                        }
                    }

                    adjustLastColWidth();
                }

                colgroupElement = new HtmlElement("colgroup", tableElement);

                //仅当为报表头/尾,且选项为不是适应宽度时才按像素设置列宽。(self.owner === report)表示是报表头/尾
                tableElement.addStyle("width", reportFitWidth ? "100%" : pixelsToHtml(totalColWidth));
                tableCols.forEach(function (col) {
                    colElement = new HtmlElement("col", colgroupElement);
                    colElement.skipend = 1;
                    colElement.addStyle("width", percentToHtml(col * 100 / totalColWidth));
                });
            }

            self.tableRows.forEach(function (row, rowindex) {
                var htmlElement;

                function generateMergingColumn(column) {
                    column.ContentCell.generate(htmlElement);
                    grhelper.GRASSERT(htmlElement.children, "");
                    column.mergingElement = htmlElement.children[htmlElement.children.length - 1];

                    //内容格的字体不能继承至当前节(肯定为分组头)，还有背景色也一样
                    (column.ContentCell.getUsingFont() !== self.getUsingFont()) && column.mergingElement.addClass(viewer.selectFont2(column.ContentCell.getUsingFont()));
                    (column.ContentCell.BackColor !== self.BackColor) && column.mergingElement.addBackColorStyle(column.ContentCell.BackColor);

                    column.mergedHeader.todoMerge = 0;
                };

                htmlElement = new HtmlElement("tr", tableElement);
                htmlElement.addClass(viewer.selectSection(row));

                row.cells.forEach(function (cell) {
                    var tdElement,
                        control = cell.control,
                        span,
                        column;

                    //有合并列,且是输出第一行时,输出此单元格之前的合并列，每输出一列，则丢弃一列
                    if (!rowindex && mergingColumns) {
                        while ((column = mergingColumns[0]) && column.index <= cell.beginCol) {
                            generateMergingColumn(column);
                            mergingColumns.shift(); //丢弃此列
                        }
                    }

                    tdElement = new HtmlElement("td", htmlElement); //当前要输出的单元格

                    span = cell.endCol - cell.beginCol;
                    (span > 1) && tdElement.addAttribute("colspan", span + "");
                    //如果有endRow(endRow肯定大于0)属性,则表示单元格对应Control
                    if (cell.endRow) {
                        span = cell.endRow - cell.beginRow;
                        (span > 1) && tdElement.addAttribute("rowspan", span + "");

                        if (control.Visible) {
                            if (control.ControlType !== grenum.ControlType.FreeGrid) {
                                tdElement.addClass(viewer.selectControl(control));
                                control.Font.font && tdElement.addClass(viewer.selectFont(control.Font.font, control.defaultFontStyle));
                            }
                            else { // FreeGrid 的 相关属性定义在 table 上,只需要设置为无边距即可
                                tdElement.addStyle("padding", "0px");
                            }

                            control.generateInCell(tdElement);
                        }
                    }
                });

                if (!rowindex && mergingColumns) { //输出尚未输出的合并列
                    mergingColumns.forEach(function (column) {
                        generateMergingColumn(column);
                    });
                }
            });
        },

        getRect: function () {
            var self = this;
            return new Rect(0, 0, self.report.getReportWidth(), self.pxHeight);
        },

        getSingleHidableSR: function () {
            var self = this,
                controls = self.Controls.items,
                control = controls[0];

            return controls.length === 1 &&
                control.ControlType === grenum.ControlType.SubReport &&
                control.HideOnRecordsetEmpty ? control : undefined;
        },

        inDynamicRow: function () { //virtual 指示报表节是否在明细网格的分组节中
            return 0;
        },
    };
    prototypeCopyExtend(Section, SectionRoot);

    var ReportHeader = function (owner) {
        var self = this;

        Section.call(self, owner);

        self.Name = "";
    };
    ReportHeader.prototype = {
    };
    prototypeCopyExtend(ReportHeader, Section);

    var ReportFooter = function (owner) {
        var self = this;

        Section.call(self, owner);

        self.Name = "";
    };
    ReportFooter.prototype = {
    };
    prototypeCopyExtend(ReportFooter, Section);

    //var PageHeader = function (owner) {
    //    Section.call(this, owner);
    //};
    //PageHeader.prototype = {
    //};
    //prototypeCopyExtend(PageHeader, Section);

    //var PageFooter = function (owner) {
    //    Section.call(this, owner);
    //};
    //PageFooter.prototype = {
    //};
    //prototypeCopyExtend(PageFooter, Section);

    var ColumnSection = function (owner) {
        var self = this;

        SectionRoot.call(self, owner);

        //[propget, id(50), helpstring("property DetailGrid")] HRESULT DetailGrid([out, retval] IGRDetailGrid** pVal);
        //[propget, id(51), helpstring("property Cursor")] HRESULT Cursor([out, retval] GRDisplayCursor* pVal);
        //[propput, id(51), helpstring("property Cursor")] HRESULT Cursor([in] GRDisplayCursor newVal);
        self.Height = self.report.cm2Size(grenum.constVar.ROW_H);
    };
    ColumnSection.prototype = {
        defaultHeight: function () { //virtual 返回以CM为单位的默认节高度值
            return grenum.constVar.ROW_H;
        },

        //[id(62), helpstring("method LoadCursor")] HRESULT LoadCursorFile([in] BSTR PathFile);
    };
    prototypeCopyExtend(ColumnSection, SectionRoot);

    var ColumnContent = function (owner) {
        var self = this;

        ColumnSection.call(self, owner);

        self.ContentCells = new ColumnContentCells(self);

        self.AlternatingBackColor = self.BackColor;
    };
    ColumnContent.prototype = {
        //children: ["ContentCells"],

        afterLoad: function (objJson) {
            var self = this;

            ColumnSection.prototype.afterLoad.call(self, objJson);

            if (objJson[self.getJsonMember("AlternatingBackColor")]) {
                colorMemberValid(self, "AlternatingBackColor", self.report.viewer.alpha.background);
            }
            else {
                self.AlternatingBackColor = self.BackColor;
            }

            self.ContentCells.loadFromJSON(objJson.ColumnContentCell);
        },

        prepare: function () {
            var self = this,
                viewer = self.report.viewer,
                temp;

            ColumnSection.prototype.prepare.call(self);

            self.defaultStyle = viewer.selectSectionItem(self); //

            if (self.AlternatingBackColor !== self.BackColor) {
                temp = self.BackColor;
                self.BackColor = self.AlternatingBackColor;
                self.altSectionStyle = viewer.selectSectionItem(self);
                self.BackColor = temp;
            }

            self.ContentCells.prepare();
        },

        generate: function (parentElement, recordno) {//这里row代表明细记录号，从0开始
            var self = this;

            self.owner.Recordset.MoveTo(recordno);

            ColumnSection.prototype.generate.call(self, parentElement);
        },

        doGenerate: function (parentElement) { //virtual
            var self = this,
                viewer = self.report.viewer,
                detailgrid = self.owner,
                showingColumns = detailgrid.showingColumns,
                recno = detailgrid.Recordset.RecordNo;
            //htmlElement;

            parentElement = new HtmlElement("tr", parentElement);

            self.addElementEventClass(parentElement);

            parentElement.addAttribute(grconst.ATTR_CONTENT_RECNO, recno + "");

            if (self.altSectionStyle && recno % 2) { //交替色
                self._BackColor = self.BackColor;
                self._defaultStyle = self.defaultStyle;
                self.BackColor = self.AlternatingBackColor;
                self.defaultStyle = self.altSectionStyle;

                parentElement.addClass(viewer.selectSection(self));

                self.BackColor = self._BackColor;
                self.defaultStyle = self._defaultStyle;
            }
            else {
                parentElement.addClass(viewer.selectSection(self));
            }

            if (detailgrid.hasMergedColumn) {
                showingColumns.forEach(function (column) {
                    var ContentCell = column.ContentCell,
                        mergedHeader = column.mergedHeader,
                        controls,
                        index,
                        control;

                    if (mergedHeader) {
                        if (mergedHeader.todoMerge) {
                            if (mergedHeader.SameAsColumn) {
                                ContentCell.generate(parentElement);
                            }
                            else {
                                //对于显示不同列的分组单元格合并，每个列只产生一个对应的部件框内容，根据对其列进行确定
                                controls = mergedHeader.Controls;
                                index = controls.Count;
                                while (index > 0) {
                                    control = controls.Item(index--);
                                    if (control.oAlignColumn === column) {
                                        ContentCell.generateMerge(parentElement, control);
                                        break;
                                    }
                                }
                            }

                            //grhelper.GRASSERT(parentElement.children, "");
                            if (parentElement.children) {
                                column.mergingElement = parentElement.children[parentElement.children.length - 1];
                            }
                        }
                    }
                    else {
                        ContentCell.generate(parentElement);
                    }
                });
            }
            else {
                showingColumns.forEach(function (column) {
                    column.ContentCell.generate(parentElement);
                });
            }

            detailgrid.hasMergedColumn && detailgrid.Groups.forEach(function (group) {
                if (group.Header.todoMerge) {
                    group.Header.todoMerge = 0;
                }
            });
        },

        getSingleHidableSR: function () {
            var self = this,
                cells = self.ContentCells.items,
                len = cells.length,
                i = 0,
                cell,
                controlTotal = 0,
                controlCount = 0,
                control;

            while (i < len) {
                cell = cells[i++];
                if (cell._freeCell) {
                    controlCount = cell.Controls.Count;
                    if (controlCount > 0) {
                        controlTotal += controlCount;
                        if (controlTotal === 1) {
                            control = cell.Controls.Item(1);
                        }
                        else if (controlTotal > 1) {
                            break;
                        }
                    }
                }
                else {
                    break;
                }
            }

            return controlTotal === 1 &&
                control.ControlType === grenum.ControlType.SubReport &&
                control.HideOnRecordsetEmpty ? control : undefined;
        },

        //[id(60), helpstring("method SetCellsBackColor")] HRESULT SetCellsBackColor([in] OLE_COLOR BackColor);
        SetCellsBackColor: function (BackColor) {
            this.ContentCells.forEach(function (cell) {
                cell.BackColor = BackColor;
            });
        },
        //[id(61), helpstring("method SetCellsForeColor")] HRESULT SetCellsForeColor([in] OLE_COLOR ForeColor);
        SetCellsForeColor: function (ForeColor) {
            this.ContentCells.forEach(function (cell) {
                cell.setForeColor(ForeColor);
            });
        },
    };
    prototypeCopyExtend(ColumnContent, ColumnSection);

    var ColumnTitle = function (owner) {
        var self = this;

        ColumnSection.call(self, owner);

        self.TitleCells = new ColumnTitleCells(self);
    };
    ColumnTitle.prototype = {
        afterLoad: function (objJson) {
            var self = this;

            ColumnSection.prototype.afterLoad.call(self, objJson);

            self.TitleCells.loadFromJSON(objJson.ColumnTitleCell);
        },

        prepare: function () {
            var self = this,
                detailgrid = self.owner,
                layer = 0; //指定当前的标题层序号

            function prepareShowing(titleCells) { //准备表格列，标题格的显示信息，返回值为表头层数
                var layerCount = 1;

                titleCells.showingItems = [];

                titleCells.forEach(function (titleCell) {
                    var sublayerCount,
                        showingItems,
                        column;

                    titleCell.layer = layer; //每个标题格记录层序号

                    if (titleCell.GroupTitle) {
                        if (titleCell.Visible) {
                            layer++;
                            sublayerCount = prepareShowing(titleCell.SubTitles) + 1;
                            layer--;

                            showingItems = titleCell.SubTitles.showingItems;
                            if (showingItems.length > 0) {
                                titleCells.showingItems.push(titleCell);

                                if (layerCount < sublayerCount) {
                                    layerCount = sublayerCount;
                                }

                                titleCell.colspan = 0;
                                showingItems.forEach(function (item) {
                                    titleCell.colspan += item.colspan;
                                });
                            }
                        }
                    }
                    else {
                        column = titleCell.Column;
                        if (column.Visible && column.pxWidth > 0) {
                            titleCells.showingItems.push(titleCell);
                            titleCell.colspan = 1;

                            column.pxLeft = detailgrid.columnsTotalWidth;
                            column.index = detailgrid.showingColumns.length;

                            detailgrid.columnsTotalWidth += column.pxWidth;
                            detailgrid.showingColumns.push(column);
                        }
                    }
                });

                return layerCount;
            };

            ColumnSection.prototype.prepare.call(self);

            //考虑多层表头及列的显示顺序
            detailgrid.columnsTotalWidth = 0;  //合计出全部显示列的宽度
            detailgrid.showingColumns = [];
            self.layerCount = prepareShowing(self.TitleCells);
            self.pxHeight /= self.layerCount;

            self.TitleCells.prepare();

            self.defaultStyle = self.report.viewer.selectSectionItem(self);
        },

        unprepare: function () {
        },

        doGenerate: function (parentElement) { //virtual
            var self = this,
                viewer = self.report.viewer,
                htmlElement;

            function generateLayer(showingCells) {
                showingCells.forEach(function (titleCell) {
                    (titleCell.layer === self.generatingLayer) && titleCell.generate(htmlElement);

                    titleCell.GroupTitle && generateLayer(titleCell.SubTitles.showingItems);
                });
            };

            self.pxHeight /= self.layerCount; //SectionRoot::generate中pxHeight会被重置

            //每层(layer)产生一个标题行 
            self.generatingLayer = 0;
            while (self.generatingLayer < self.layerCount) {
                htmlElement = new HtmlElement("tr", parentElement);

                self.addElementEventClass(htmlElement);

                htmlElement.addClass(viewer.selectSection(self));

                generateLayer(self.TitleCells.showingItems);

                self.generatingLayer++;
            }
        },

        FindColumnTitlesOfTitleCell: function (titleCell) {
            function dofind(titleCells, titleCell) {
                var i,
                    len = titleCells.items.length,
                    item,
                    subTitleCells;

                for (i = 0; i < len; i++) {
                    item = titleCells.items[i];
                    if (item !== titleCell) {
                        if (item.GroupTitle && (subTitleCells = dofind(item.SubTitles, titleCell))) {
                            return subTitleCells;
                        }
                    }
                    else {
                        return titleCells;
                    }
                }

                return undefined;
            }

            return dofind(this.TitleCells, titleCell);
        },

        //com interface
        //[id(60), helpstring("method SetCellsBackColor")] HRESULT SetCellsBackColor([in] OLE_COLOR BackColor);
        SetCellsBackColor: function (BackColor) {
            function setBackColor(titleCells) {
                titleCells.forEach(function (cell) {
                    cell.BackColor = BackColor;
                    cell.GroupTitle && setBackColor(cell.SubTitles);
                });
            }

            setBackColor(this.TitleCells);
        },
        //[id(61), helpstring("method SetCellsForeColor")] HRESULT SetCellsForeColor([in] OLE_COLOR ForeColor);
        SetCellsForeColor: function (ForeColor) {
            function setForeColor(titleCells) {
                titleCells.forEach(function (cell) {
                    cell.setForeColor(ForeColor);
                    cell.GroupTitle && setForeColor(cell.SubTitles);
                });
            }

            setForeColor(this.TitleCells);
        },
    };
    prototypeCopyExtend(ColumnTitle, ColumnSection);

    var GroupSection = function (owner) {
        var self = this;

        Section.call(self, owner);

        self.Height = self.report.cm2Size(grenum.constVar.GS_H)
    };
    GroupSection.prototype = {
        generate: function (parentElement, groupItemNo) {
            var self = this,
                group = self.owner;

            group.recordset.MoveTo(groupItemNo);
            group.owner.Recordset.MoveTo((self === group.Header ? group.beginNoField : group.endNoField).Value);

            Section.prototype.generate.call(self, parentElement);
        },

        doGenerate: function (parentElement) { //virtual
            var self = this,
                viewer = self.report.viewer,
                detailgrid = self.owner.owner,
                showingColumns = detailgrid.showingColumns,
                showingColumnsLen = showingColumns.length,
                mergingColumns;

            function setHtmlAttr(element) {
                var group = self.owner,
                    indexAttrName = self === group.Header ? grconst.ATTR_GROUPH_INDEX : grconst.ATTR_GROUPF_INDEX;

                element.addAttribute(grconst.ATTR_GROUP_RECNO, group.recordset.recordNo);
                element.addAttribute(indexAttrName, group.index);
            };

            if (detailgrid.hasMergedColumn) {
                mergingColumns = [];
                showingColumns.forEach(function (column) {
                    //分组尾要生成合并单元，只在报表无明细记录，且前面没有分组头输出才会执行到
                    //分组尾只在最内层分组上考虑
                    //如果是分组尾，则本分组的占据列不能包含
                    column.mergedHeader &&
                    column.mergedHeader.todoMerge &&
                    (self.owner.Footer !== self || (self.owner === detailgrid.Groups.Item(detailgrid.Groups.Count) && column.mergedHeader !== self.owner.Header)) &&
                    mergingColumns.push(column);
                });
                if (!mergingColumns.length) {
                    mergingColumns = undefined;
                }
            }

            if (self.tableRows && !self.tableCols) {  // !self.tableCols 代表是按明细表格的列来生成
                self.generateTableRows(parentElement, mergingColumns);

                //设置后面新增加的几个 tr 元素的 Attr
                parentElement.children.slice(-self.tableRows.length).forEach(function (childElemnent) {
                    self.addElementEventClass(childElemnent);
                    setHtmlAttr(childElemnent);
                });
            }
            else {
                parentElement = new HtmlElement("tr", parentElement);
                parentElement.addClass(viewer.selectSection(self));
                self.addElementEventClass(parentElement);
                setHtmlAttr(parentElement);

                parentElement = new HtmlElement("td", parentElement);
                if (showingColumnsLen > 1) {
                    parentElement.addAttribute("colspan", showingColumnsLen);
                }

                if (self.tableCols) {
                    grhelper.GRASSERT(self.tableRows, "");

                    parentElement = new HtmlElement("table", parentElement);
                    parentElement.addClass(viewer.selectSection(self));
                    parentElement.addStyle("border-collapse", "collapse");

                    self.generateTableRows(parentElement);
                }
                else {
                    parentElement.addStyle("position", "relative");

                    self.Controls.generate(parentElement);
                }
            }
        },

        //prepare: function () {
        //    var self = this;

        //    //self.groupMergedColumns 表示是分组合并列的分组头，其无需执行下面任务
        //    !self.groupMergedColumns && Section.prototype.prepare.call(self);
        //},

        getTableColEdges: function () {
            var columns = this.owner.owner.showingColumns,
                colEdges;

            //生成列位置信息
            colEdges = columns.map(function (column) {
                return {
                    pos: column.pxLeft,
                    count: 1,
                };
            });
            colEdges.push({
                pos: columns[columns.length - 1].pxRight,
                count: 1,
            });

            return colEdges;
        },

        getMergedColumns: function () { //virtual
            var self = this,
                i,
                mergedColumns;

            //找出 mergedColumns
            i = self.owner.index;
            mergedColumns = self.owner.owner.showingColumns.filter(function (column) {
                var header = column.mergedHeader,
                    group,
                    index;

                //是上级分组，或是本分组，且为分组尾，且分组单元格合并包含分组尾
                return header &&
                    ((index = (group = header.owner).index) < i ||
                    (index === i && self === group.Footer && group.Header.IncludeFooter));
            });
            if (mergedColumns.length === 0) {
                mergedColumns = 0;
            }

            return mergedColumns;
        },

        getParentBackColor: function (objJson) { //virtual
            return this.owner.owner.BackColor;
        },
        getParentFont: function () { ////virtual
            return this.owner.owner.Font;
        },
        inDynamicRow: function () { //virtual
            return 1;
        },
    };
    prototypeCopyExtend(GroupSection, Section);

    var GroupHeader = function (owner) {
        var self = this;

        GroupSection.call(self, owner);

        self.OccupiedColumns = "";
        self.OccupyColumn = false;
        self.SameAsColumn = true;
        self.IncludeFooter = false;
        self.VAlign = grenum.OCGroupHeaderVAlign.Top;
    };
    GroupHeader.prototype = {
        afterLoad: function (objJson) {
            var self = this;

            GroupSection.prototype.afterLoad.call(self, objJson);

            enumMemberValid(self, "VAlign", grenum.OCGroupHeaderVAlign);
        },

        prepare: function () {
            var self = this,
                columns;

            //解析出分组单元格合并列,并设置 Column 的 merged 标志属性
            if (self.OccupiedColumns) {
                columns = self.owner.owner.Columns.decodeItems(self.OccupiedColumns);
                columns = columns.filter(function (column) {
                    return column.Visible;
                });

                if (columns.length > 0) {
                    self.groupMergedColumns = columns;
                    columns.forEach(function (column) {
                        column.mergedHeader = self; //表示此列是分组单元格合并列
                        self.owner.owner.hasMergedColumn = 1; //指定明细网格有分组单元格合并
                    });
                }
            }

            //如果是分组合并列的分组头且显示同列，其无需执行下面任务
            !(self.groupMergedColumns && self.SameAsColumn) && GroupSection.prototype.prepare.call(self);
        },

        unprepare: function () {
        },

        generate: function (parentElement, groupItemNo) { //override
            var self = this;

            if (self.groupMergedColumns) { //合并单元格分组头
                self.owner.recordset.MoveTo(groupItemNo);

                self.curItemBegin = parentElement.children ? parentElement.children.length : 0; //记录当前分组的起始行号
                self.todoMerge = 1;  //指定接下来输出的行要输出合并单元格
            }
            else {
                GroupSection.prototype.generate.call(self, parentElement, groupItemNo);
            }
        },

        //com interface
        get Group() {
            return this.owner;
        },
    };
    prototypeCopyExtend(GroupHeader, GroupSection);

    var GroupFooter = function (owner) {
        GroupSection.call(this, owner);
    };
    GroupFooter.prototype = {
        generate: function (parentElement, groupItemNo) { //override
            var self = this,
                header = self.owner.Header,
                groupMergedColumns = header.groupMergedColumns,
                rowspan;

            GroupSection.prototype.generate.call(self, parentElement, groupItemNo);

            if (groupMergedColumns && parentElement.children) {
                rowspan = parentElement.children.length - header.curItemBegin;
                if (!header.IncludeFooter && self.isToGenerate()) {
                    rowspan--;
                }

                (rowspan > 1) && groupMergedColumns.forEach(function (column) {
                    column.mergingElement && column.mergingElement.addAttribute("rowspan", rowspan + "");
                });
            }
        },

        //com interface
        get Group() {
            return this.owner;
        },
    };
    prototypeCopyExtend(GroupFooter, GroupSection);

    /////////////////////////////////////////////////////////////////////////
    var Field = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.FieldType = grenum.FieldType.String;
        self._name = ""; //self.Name = "";
        self._dbFieldName = ""; //self.DBFieldName = "";
        self._tableMember = undefined;
        self.Format = "";
        self.Length = 0;
        self.RTrimBlankChars = false;

        self.GetDisplayTextScript = "";
    };
    Field.prototype = {
        afterLoad: function (objJson) {
            var self = this,
                member;

            member = objJson[self.getJsonMember("Type")]
            if (member) {
                self.FieldType = member;
            }
            member = objJson[self.getJsonMember("Name")]
            if (member) {
                self.Name = member;
            }
            member = objJson[self.getJsonMember("DBFieldName")]
            if (member) {
                self.DBFieldName = member;
            }

            enumMemberValid(self, "FieldType", grenum.FieldType);
        },

        prepare: function () {
            var self = this,
                type = self.FieldType,
                Format = self.Format;

            if (grenum.FieldType.DateTime === type) {
                self.formater = new DateTimeFormatter(Format);
            }
            else if (grenum.FieldType.Boolean === type) {
                self.formater = new BooleanFormatter(Format);
            }
            else if (grenum.FieldType.Integer === type || grenum.FieldType.Float === type || grenum.FieldType.Currency === type) {
                self.formater = new NumericFormatter(Format);
            }
        },

        unprepare: function () {
            var self = this;

            delete self.formater;
            delete self._fts;
            //self._tableMember = undefined;
        },

        isNumeric: function () {
            var type = this.FieldType;

            return type === grenum.FieldType.Integer || type === grenum.FieldType.Float || type === grenum.FieldType.Currency;
        },

        //com interface
        get Value() {
            var self = this,
                record = self.owner.curRecord;

            grhelper.GRASSERT(self._tableMember, "_tableMember is undefined");

            return record ? record[self._tableMember] : undefined;
        },
        set Value(val) {
            var self = this,
                record = self.owner.curRecord;

            grhelper.GRASSERT(self._tableMember, "_tableMember is undefined");

            if (record) {
                if (val !== undefined && val !== null) {
                    switch (self.FieldType) {
                        case grenum.FieldType.Integer:
                        case grenum.FieldType.Float:
                        case grenum.FieldType.Currency:
                            val = +val;
                            break;
                        case grenum.FieldType.Boolean:
                            val = confirmBooleanValue(val);
                            break;
                        case grenum.FieldType.DateTime:
                            val = confirmCloneDateValue(val);
                            break;
                        default:
                            val = val + "";
                            break;
                    }
                }
                else {
                    val = undefined;
                }
                record[self._tableMember] = val;
            }
        },
        get AsBoolean() {
            return confirmBooleanValue(this.Value); //!!this.Value;
        },
        set AsBoolean(val) {
            this.Value = val; //confirmBooleanValue(val); //!!val;
        },
        get AsCurrency() {
            return +this.Value;
        },
        set AsCurrency(val) {
            this.Value = val; //this.Value = +val;
        },
        get AsDateTime() {
            return cloneDate(this.Value); //必须要复制 Date 对象,不然变成对现有对象的引用
        },
        set AsDateTime(val) {
            this.Value = val; //???必须要复制 Date 对象,不然变成对现有对象的引用
        },
        get AsFloat() {
            //必须要返回一个有效的数字值
            var self = this,
                val;

            if (self.IsNull) {
                val = 0;
            }
            else if (grenum.FieldType.DateTime === self.FieldType) {
                var dval = new DateTime();
                dval.value = self.Value;
                val = dval.AsFloat;
            }
            else {
                val = +self.Value;
            }
            return isNaN(val) ? 0 : val;
        },
        set AsFloat(val) {
            var self = this,
                dval;

            if (grenum.FieldType.DateTime === self.FieldType) {
                dval = new DateTime();
                dval.AsFloat = val;
                val = dval.value;
            }
            self.Value = val;
        },
        get AsInteger() {
            return Math.floor(this.AsFloat);
        },
        set AsInteger(val) {
            this.AsFloat = Math.floor(+val);
        },
        get AsString() {
            var self = this;

            return self.IsNull ? "" : self.Value + "";
        },
        set AsString(val) {
            this.Value = val;
        },

        get DisplayText() {
            var self = this,
                type = self.FieldType,
                value = self.Value;

            self.displayTextAssigned = 0;
            if (!self.doingGetDisplayText) {
                self.doingGetDisplayText = 1;
                self.report.fireFieldGetDisplayText(self);
                self.doingGetDisplayText = 0;
            }

            if (self.displayTextAssigned) {
                return self.assignedDisplayText;
            }

            if (self.IsNull) {
                return "";
            }

            if (type === grenum.FieldType.String || type === grenum.FieldType.Binary) {
                return value + "";
            }
            return self.formater.format(value);
        },
        set DisplayText(val) {
            var self = this;

            self.assignedDisplayText = val + "";
            self.displayTextAssigned = 1;
        },
        get IsNull() {
            var val = this.Value;

            return val === undefined || val === null;
        },

        get DataSize() { //为接口兼容而定义
            return 0;
        },
        get DataBuffer() { //为接口兼容而定义
            return undefined;
        },
        get Name() {
            return this._name;
        },
        set Name(val) {
            var self = this;

            if (!self._tableMember || self._tableMember === self._name) {
                self._tableMember = val;
            }
            self._name = val;
        },
        get DBFieldName() {
            return this._name;
        },
        set DBFieldName(val) {
            var self = this;

            self._dbFieldName = val;
            if (val) {
                self._tableMember = val;
            }
        },
        get RunningDBField() {
            var self = this;

            return self._dbFieldName || self._name;
        },

        Clear: function () {
            this.Value = undefined;
        },
        //[id(41), helpstring("method LoadFromFile")] HRESULT LoadFromFile([in] BSTR PathFile);
        //[id(42), helpstring("method LoadFromBinary")] HRESULT LoadFromBinary([in] IGRBinaryObject *pBinaryObject);
    };
    prototypeCopyExtend(Field, Object);

    var Recordset = function (owner) {
        var self = this;

        Object.call(self, owner);

        //self.(SkipQuery, VARIANT_BOOL, FALSE);
        self.QuerySQL = "";

        self.Fields = new Fields(self);

        self.SortAsc = true;
        self.SortCaseSensitive = false;
        self.SortFields = "";
        self.XmlTableName = "";

        self.FetchRecordScript = "";
        self.BeforePostRecordScript = "";
        self.ProcessRecordScript = "";

        self._dataTable = [];
        self.recordNo = 0;
    };
    Recordset.prototype = {
        children: ["Fields"],

        afterLoad: function (objJson) {
            this.Fields.loadFromJSON(objJson.Field);
        },

        attachDataTable: function (dataTable) {
            var self = this;

            self._dataTable = dataTable;
            self.MoveTo(0);
        },

        prepareTableData: function () { //根据字段类型对字段值进行类型规范
            var self = this,
                dt = self._dataTable,
                fields = self.Fields.items,
                recordNo = dt.length,
                indexField = fields.length,
                record,
                field,
                tableMemberValue,
                tableMemberName,
                fts;

            if (DEBUG) {
                while (indexField--) {
                    field = fields[indexField];
                    grhelper.GRASSERT(field._fts === undefined, "Field's _fts  should undefined"); //field._fts 记录各个字段是否需要转换
                    grhelper.GRASSERT(field._tableMember != undefined, "Field's _tableMember should initialized");
                }
            }

            //首先根据字段类型对数据进行类型转换
            while (recordNo--) {
                record = dt[recordNo];

                indexField = fields.length;
                while (indexField--) {
                    field = fields[indexField];
                    fts = field._fts;
                    tableMemberName = field._tableMember;

                    if (fts === undefined) {
                        function matchMemberName(record, fieldName) {
                            if (record.hasOwnProperty(fieldName)) {
                                return fieldName;
                            }
                            fieldName = fieldName.toUpperCase();
                            for (var _name in record) {
                                if (fieldName === _name.toUpperCase()) {
                                    return _name;
                                }
                            }
                            return undefined;
                        }

                        tableMemberName = matchMemberName(record, tableMemberName);
                        if (tableMemberName) {
                            switch (field.FieldType) {
                                case grenum.FieldType.String:
                                    fts = typeof record[tableMemberName] !== "string";
                                    break;
                                case grenum.FieldType.Integer:
                                case grenum.FieldType.Float:
                                case grenum.FieldType.Currency:
                                    fts = typeof record[tableMemberName] !== "number";
                                    break;
                                case grenum.FieldType.Boolean:
                                    fts = typeof record[tableMemberName] !== "boolean";
                                    break;
                                case grenum.FieldType.DateTime:
                                    fts = !Date.prototype.isPrototypeOf(record[tableMemberName]);
                                    break;
                                default: //case grenum.FieldType.Binary:
                                    fts = false;
                                    break;
                            }

                            field._fts = fts;   //记录字段值的数据类型是否需要转换标志
                            field._tableMember = tableMemberName;
                        }
                    }

                    if (tableMemberName) { //2019/05/08 new added
                        //grhelper.GRASSERT(record.hasOwnProperty(tableMemberName), "_dataTable's record must exist field " + tableMemberName);

                        tableMemberValue = record[tableMemberName];
                        //字段值为 null 与 "" 的全部都先转换为 undefined，目的是为了简化后面的字段空值判断
                        if (tableMemberValue === null || tableMemberValue === "") {
                            tableMemberValue = undefined;
                            record[tableMemberName] = tableMemberValue;
                        }

                        //2019/05/08 changed if (fts && (tableMemberValue !== undefined) && record.hasOwnProperty(tableMemberName)) {
                        if (fts && (tableMemberValue !== undefined)) {
                            switch (field.FieldType) {
                                case grenum.FieldType.String:
                                    record[tableMemberName] = tableMemberValue + "";
                                    break;
                                case grenum.FieldType.Integer:
                                case grenum.FieldType.Float:
                                case grenum.FieldType.Currency:
                                    record[tableMemberName] = +tableMemberValue;
                                    break;
                                case grenum.FieldType.Boolean:
                                    record[tableMemberName] = confirmBooleanValue(tableMemberValue);
                                    break;
                                case grenum.FieldType.DateTime:
                                    record[tableMemberName] = confirmDateValue(tableMemberValue);
                                    break;
                            }
                        }
                    }
                }
            }

            self.SortFields && self.Resort(self.SortFields, self.SortAsc, self.SortCaseSensitive);
        },

        prepare: function () {
            var self = this,
                len = self._dataTable.length,
                i = 0;

            self.Fields.prepare();
            self.prepareTableData();

            //执行提交记录前任务
            while (i < len) {
                self.MoveTo(i++);
                self.beforePost();
            }
            self.MoveTo(0);
        },

        unprepare: function () {
            var self = this;

            self.Fields.unprepare();

            self._dataTable = [];
        },

        beforePost: function () {
            var self = this,
                report = self.report,
                BeforePostRecordScript = self.BeforePostRecordScript;

            BeforePostRecordScript && report.executeEventScript(BeforePostRecordScript, "BeforePostRecordScript", self);

            self.isDetailGridRecordset() && report.fireBeforePostRecord();
        },

        decodeFields: function (fieldNames) { //从字段名称序列中解析出字段对象集合,返回值为数组
            return this.Fields.decodeItems(fieldNames);
        },

        isDetailGridRecordset: function () {
            var self = this;

            return self.owner === self.report.DetailGrid;
        },

        isAppendingRecord: function () {
            return this.editStatus === 1;
        },

        keepValue: function () {
            var self = this;

            self.keepedRecord = self.curRecord;
        },

        fieldsKeepedValueChanged: function (byFields) {
            var self = this;

            return byFields.some(function (field) {
                var memberName = field._tableMember,
                    kv = self.keepedRecord[memberName],
                    cv = self.curRecord[memberName];

                //Date 是对象,不能直接进行相等比较，但 Date 可以进行 < 与 > 比较。所以对日期时间类型的字段不能直接用 !== 进行不相等比较
                //还需要考虑空值(undefined)的情况，都不同时为undefined也是判定为不相等
                return kv < cv || cv < kv || ((kv === undefined || cv === undefined) && kv !== cv);
            });
        },

        //如果keepOrigin为真,则不改变_dataTable,而是返回排序后的记录序号,
        //反之则对_dataTable的元素进行重排序,而不会有返回值
        sortRecords: function (sortItems, keepOrigin) {
            var self = this,
                dt = self._dataTable,
                recordCount = dt.length,
                i = 0,
                recordIndexes = [];

            while (i < recordCount) {
                recordIndexes.push(i++);
            }

            if (sortItems.length > 0) {
                sortItems.forEach(function (sortItem) {
                    sortItem.fieldName = sortItem.field._tableMember;
                });

                //根据排序项对记录集数据进行排序
                recordIndexes.sort(function (first, second) {
                    var cmp;

                    sortItems.some(function (sortItem) {
                        //空值小于任何值(undefined)，两个空值相等。只有字符类型才有大小写敏感
                        var fv = dt[first][sortItem.fieldName],
                            sv = dt[second][sortItem.fieldName];

                        if (fv !== undefined && sv !== undefined) {
                            if (sortItem.field.FieldType === grenum.FieldType.String) {
                                if (!sortItem.case) {
                                    fv = fv.toUpperCase();
                                    sv = sv.toUpperCase();
                                }
                                cmp = fv.localeCompare(sv);
                            }
                            else {
                                cmp = (fv < sv) ? -1 : ((sv < fv) ? 1 : 0);
                            }
                        }
                        else {
                            cmp = (fv === undefined && sv === undefined) ? 0 : ((fv === undefined) ? -1 : 1);
                        }
                        if (!sortItem.asc) {
                            cmp = -cmp;
                        }
                        return cmp;
                    });

                    return cmp;
                });
            }

            if (keepOrigin) {
                return recordIndexes;
            }

            //将记录按顺序排列
            i = [];
            recordIndexes.forEach(function (recordNo) {
                i.push(dt[recordNo]);
            });
            self._dataTable = i;

            self.MoveTo(0); //数据重排序之后，记录游标要重新设置
        },

        //com interface
        //[propget, id(2), helpstring("property RecordCount")] HRESULT RecordCount([out, retval] LONG* pVal);
        get RecordCount() {
            var self = this;

            return self._dataTable ? self._dataTable.length : 0;
        },
        //[propget, id(3), helpstring("property RecordNo")] HRESULT RecordNo([out, retval] LONG* pVal);
        get RecordNo() {
            return this.recordNo;
        },

        //[id(25), helpstring("method FieldByName")] HRESULT FieldByName([in] BSTR Name, [out, retval] IGRField** ppField);
        FieldByName: function (name) {
            return this.Fields.itemByName(name);
        },

        //[id(26), helpstring("method FieldByDBName")] HRESULT FieldByDBName([in] BSTR Name, [out, retval] IGRField** ppField);
        FieldByDBName: function (name) {
            var fields = this.Fields.items,
                len = fields.length,
                i;

            name = name.toUpperCase();
            for (i = 0; i < len; i++) {
                if (fields[i].RunningDBField.toUpperCase() === name) {
                    return fields[i];
                }
            }

            return undefined;
        },

        //[id(30), helpstring("method Append")] HRESULT Append: function();
        Append: function () {
            var self = this;

            self.editStatus = 1;
            self.recordNo = self._dataTable.length;
            self.curRecord = {};
        },
        //[id(31), helpstring("method Edit")] HRESULT Edit: function();
        Edit: function () {
            var self = this,
                fields = self.Fields.items,
                i = fields.length,
                field,
                dbFieldName,
                curRecord = self.curRecord,
                clone = {};

            if (self.recordNo >= 0 && self.recordNo < self._dataTable.length) {
                self.editStatus = 2;
                while (i--) {
                    field = fields[i];
                    grhelper.GRASSERT(field._tableMember, "_tableMember is undefined");
                    dbFieldName = field._tableMember;
                    if (curRecord[dbFieldName] !== undefined) {
                        if (field.FieldType === grenum.FieldType.DateTime) {
                            clone[dbFieldName] = confirmCloneDateValue(curRecord[dbFieldName]);
                        }
                        else {
                            clone[dbFieldName] = curRecord[dbFieldName];
                        }
                    }
                }
                self.curRecord = clone;
            }
        },
        //[id(32), helpstring("method Cancel")] HRESULT Cancel: function();
        Cancel: function () {
            var self = this;

            if (self.editStatus) {
                if (self.editStatus === 1) {
                    self.Last();
                }
                else {
                    self.curRecord = self._dataTable[self.recordNo];
                }
                self.editStatus = 0;
            }
        },
        //[id(33), helpstring("method Post")] HRESULT Post: function();
        Post: function () {
            var self = this,
                _dataTable = self._dataTable;

            if (self.editStatus) {
                self.beforePost();

                if (self.editStatus === 1) {
                    _dataTable.push(self.curRecord);
                }
                else {
                    _dataTable[self.recordNo] = self.curRecord;
                }

                self.editStatus = 0;
            }
        },

        //[id(34), helpstring("method First")] HRESULT First: function();
        First: function () {
            this.MoveTo(0);
        },
        //[id(35), helpstring("method Next")] HRESULT Next: function();
        Next: function () {
            var self = this;

            self.MoveTo(self.recordNo + 1);
        },
        //[id(36), helpstring("method Prior")] HRESULT Prior: function();
        Prior: function () {
            var self = this;

            self.MoveTo(self.recordNo - 1);
        },
        //[id(37), helpstring("method Last")] HRESULT Last: function();
        Last: function () {
            var self = this;

            self.MoveTo(self._dataTable.length - 1);
        },
        //[id(38), helpstring("method MoveBy")] HRESULT MoveBy([in] int Delta);
        MoveBy: function (delta) {
            var self = this;

            self.MoveTo(self.recordNo + delta);
        },
        //[id(39), helpstring("method Bof")] HRESULT Bof([out,retval] VARIANT_BOOL* IsBegin);
        Bof: function () {
            var self = this;

            return self.recordNo < 0 || !self._dataTable.length;
        },
        //[id(40), helpstring("method Eof")] HRESULT Eof([out,retval] VARIANT_BOOL* IsEnd);
        Eof: function () {
            var self = this;

            return self.recordNo >= self._dataTable.length;
        },
        //[id(41), helpstring("method MoveTo")] HRESULT MoveTo([in] LONG RecordNo);
        MoveTo: function (recordno) {
            var self = this,
                dt = self._dataTable;

            self.recordNo = recordno; //-1表示记录cursor在BOF，>=_dataTable.length表示在EOF
            self.curRecord = dt[Math.min(Math.max(0, recordno), dt.length - 1)]; //BOF:第一条记录; EOF:最后一条记录
        },
        //[id(43), helpstring("method Empty")] HRESULT Empty: function();
        Empty: function () {
            this.attachDataTable([]);
        },

        //[id(44), helpstring("method AddField")] HRESULT AddField([in] BSTR Name, [in] GRFieldType FieldType, [out,retval] IGRField** ppField);
        AddField: function (name, fieldType) {
            var field = this.Fields.Add();

            field.Name = name;
            field.FieldType = fieldType;
            return field;
        },
        //[id(45), helpstring("method RemoveAllFields")] HRESULT RemoveAllFields: function();
        RemoveAllFields: function () {
            this.Fields.RemoveAll();
        },
        //[id(46), helpstring("method Resort")] HRESULT Resort([in] BSTR Fields, [in] VARIANT_BOOL Ascending, [in] VARIANT_BOOL CaseSensitive, [out, retval] VARIANT_BOOL* pSuccess);
        Resort: function (SortFields, defaultAsc, defaultCase) {
            var self = this,
                sortItems,
                sortItemsLen,
                groupByFields = [];

            function decodeSortFields() { //从字段名称与排序选项序列中解析出字段与选项对象集合,返回值为数组
                var //recordset = this,
                    sortFields = [],
                    items = SortFields.split(";");

                items.forEach(function (sortFieldName) {
                    var sortItem = {}, params;

                    function decodeOption(optionText) {
                        optionText = optionText.trim().toUpperCase();
                        if (optionText === "ASC") {
                            sortItem.asc = true;
                        }
                        else if (optionText === "DESC") {
                            sortItem.asc = false;
                        }
                        else if (optionText === "CASE") {
                            sortItem.case = true;
                        }
                        else if (optionText === "CASEIN") {
                            sortItem.case = false;
                        }
                    };

                    sortFieldName = sortFieldName.trim();
                    params = sortFieldName.split(" ");

                    params[0] = params[0].trim();
                    sortItem.field = self.Fields.Item(params[0]);
                    if (sortItem.field) {
                        sortItem.asc = defaultAsc;
                        sortItem.case = defaultCase;

                        (params.length > 1) && decodeOption(params[1]);
                        (params.length > 2) && decodeOption(params[2]);

                        sortFields.push(sortItem);
                    }
                });

                return sortFields;
            };

            //如果指定了排序字段,对数据重新进行排序
            if (SortFields) {
                sortItems = decodeSortFields();
                sortItemsLen = sortItems.length;
                if (sortItemsLen > 0) {
                    self.report.fireBeforeSort(SortFields, self);

                    //如果是明细网格的记录集，应该把分组的依据字段也加上进行排序，且必须放在前面
                    if (self.isDetailGridRecordset()) {
                        self.owner.Groups.forEach(function (group) {
                            self.decodeFields(group.ByFields).forEach(function (field) {
                                //不加入已经存在的字段
                                (groupByFields.indexOf(field) < 0) && groupByFields.push(field);
                            });
                        });

                        sortItems.forEach(function (sortItem) {
                            var index = groupByFields.indexOf(sortItem.field);
                            if (index < 0) {
                                groupByFields.push(sortItem);
                            }
                            else {
                                groupByFields[index] = sortItem;
                            }
                        });

                        groupByFields.forEach(function (item, index) {
                            if (!item.field) {
                                groupByFields[index] = {
                                    field: item,
                                    asc: defaultAsc,
                                    "case": defaultCase
                                };
                            }
                        });

                        sortItems = groupByFields;
                        sortItemsLen = sortItems.length;
                    }
                }

                self.sortRecords(sortItems, 0);
            }
        },

        //[id(47), helpstring("method SaveDataToXML")] HRESULT SaveDataToXML([out,retval] BSTR *pVal);
        //[id(48), helpstring("method LoadData")] HRESULT LoadData([in] BSTR File, [out,retval] VARIANT_BOOL* pSucceeded);
        //[id(49), helpstring("method LoadDataFromXML")] HRESULT LoadDataFromXML([in] BSTR XMLText, [out,retval] VARIANT_BOOL* pSucceeded);
    };
    prototypeCopyExtend(Recordset, Object);

    var Column = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.Name = "";
        self.Visible = true;
        self.FixedWidth = false;
        self.Width = self.report.cm2Size(grenum.constVar.COL_W);

        //[propget, id(1), helpstring("property TitleCell")] HRESULT TitleCell([out, retval] IGRColumnTitleCell** pVal);
        //[propget, id(2), helpstring("property ContentCell")] HRESULT ContentCell([out, retval] IGRColumnContentCell** pVal);
        //[propget, id(3), helpstring("property Parent")] HRESULT Parent([out, retval] IGRDetailGrid** pVal);
    };
    Column.prototype = {
        prepare: function () {
            var self = this;

            self.pxWidth = self.report.size2Pixel(self.Width);
        },

        get pxRight() {
            var self = this;

            return self.pxLeft + self.pxWidth;
        },
    };
    prototypeCopyExtend(Column, Object);

    var Group = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.Header = new GroupHeader(self);
        self.Footer = new GroupFooter(self);

        self.Name = "";
        self.ByFields = "";
        self.SortSummaryBox = "";
        self.SortAsc = false;

        self.GroupBeginScript = "";
        self.GroupEndScript = "";
    };
    Group.prototype = {
        children: ["Header", "Footer"],

        afterLoad: function (objJson) {
            var self = this;

            self.Header.loadFromJSON(objJson.GroupHeader);
            self.Footer.loadFromJSON(objJson.GroupFooter);
        },

        prepare: function (index) {
            var self = this;

            function createGroupSummaryItems(controls) {
                controls.forEach(function (control) {
                    function createControlSummaryItems(control) {
                        var summaryItems = self.summaryItems,
                            type = control.ControlType;

                        function addSummaryItem(item) {
                            var index,
                                supGroupItem,
                                fieldType,
                                fieldName = summaryItems.length + "",
                                format = "";

                            summaryItems.push(item);

                            //处理统计函数类
                            if (item.SummaryFun) {
                                item.value = 0; //累计(SumAcc)需要在此时将初值置0

                                //组累计需要在上级组中加项目
                                if (item.SummaryFun === grenum.SummaryFun.GroupSumAcc) {
                                    index = self.owner.Groups.indexOf(self);
                                    if (index > 0) {
                                        supGroupItem = new Summary();
                                        supGroupItem.SummaryFun = grenum.constVar.GROUP_SUMACC_INSUP;
                                        supGroupItem.init();

                                        self.owner.Groups.items[index - 1].summaryItems.push(supGroupItem);
                                    }
                                }

                                if (item.displayField) {
                                    fieldType = item.displayField.FieldType;
                                    format = item.displayField.Format;
                                }
                                else {
                                    fieldType = (item.SummaryFun === grenum.SummaryFun.StrMin || item.SummaryFun === grenum.SummaryFun.StrMax) ?
                                        grenum.FieldType.String : grenum.FieldType.Float;

                                    if (item.paramExp) {
                                        //设置上关联字段的format
                                        supGroupItem = item.paramExp.varItems;
                                        if (supGroupItem.length === 1) {
                                            supGroupItem = supGroupItem[0].varField.object;
                                            if (supGroupItem.Format) {
                                                format = supGroupItem.Format;
                                            }
                                        }
                                    }
                                }
                            }
                            else if (item.oParameter) {
                                fieldType = item.oParameter.DataType;
                                format = item.oParameter.Format;
                            }
                            else { //MathFun
                                fieldType = grenum.FieldType.Float;
                            }

                            item.valueField = self.recordset.AddField(fieldName, fieldType);
                            item.valueField.Format = format;
                        }; //end of addSummaryItem

                        if (type === grenum.ControlType.SummaryBox) {
                            addSummaryItem(control);
                        }
                        else if (type === grenum.ControlType.MemoBox) {
                            MemoBox.prototype.getGroupVars.call(control).forEach(function (item) {
                                addSummaryItem(item);
                            });
                        }
                        else if (type === grenum.ControlType.StaticBox) {
                            control.oParameter && addSummaryItem(control);
                        }
                            //else if (type === grenum.ControlType.RichTextBox)
                            //{
                            //}
                        else if (type === grenum.ControlType.FreeGrid) {
                            control.cells.forEach(function (rowcells) {
                                rowcells.forEach(function (cell) {
                                    if (cell.FreeCell) {
                                        createGroupSummaryItems(cell.Controls);
                                    }
                                    else {
                                        createControlSummaryItems(cell);
                                    }
                                });
                            });
                        }
                    };

                    createControlSummaryItems(control);
                });
            };

            self.index = index;

            self.Header.prepare();
            self.Footer.prepare();

            self.oByFields = self.owner.Recordset.decodeFields(self.ByFields);

            if (self.SortSummaryBox) {
                self.sortSummaryBoxObj = self.Footer.Controls.itemByName(self.SortSummaryBox);
                if (!self.sortSummaryBoxObj) {
                    self.sortSummaryBoxObj = self.Header.Controls.itemByName(self.SortSummaryBox);
                }
                if (self.sortSummaryBoxObj && self.sortSummaryBoxObj.ControlType !== grenum.ControlType.SummaryBox) {
                    delete self.sortSummaryBoxObj;
                }
            }

            self.recordset = new Recordset(self);
            self.beginNoField = self.recordset.AddField("b", grenum.FieldType.Integer); //_BgNo
            self.endNoField = self.recordset.AddField("e", grenum.FieldType.Integer);   //_EdNo

            self.groupItemNo = 0; //当前分组项的序号

            self.summaryItems = [];
            createGroupSummaryItems(self.Header.Controls);
            createGroupSummaryItems(self.Footer.Controls);

            self.recordset.prepare();
        },

        unprepare: function () {
        },

        inphaseByDetail: function (recordNo) {
            var self = this,
                recordset = self.recordset;

            if (!recordset.isAppendingRecord() && recordset.RecordCount) {
                while (self.beginNoField.Value > recordNo && !recordset.Bof()) {
                    recordset.Prior();
                }
                while (self.endNoField.Value < recordNo && !recordset.Eof()) {
                    recordset.Next();
                }
            }
        },

        //com interface
        //[propget, id(1), helpstring("property Parent")] HRESULT Parent([out, retval] IGRDetailGrid** pVal);
        get Parent() {
            return this.owner;
        }
    };
    prototypeCopyExtend(Group, Object);


    var DetailGrid = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.FixCols = 0;
        //self.IsCrossTab = false;
        //self.CenterView = false; //TRUE
        self.BackColor = owner.BackColor; //0x00ffffff;
        self.ShowColLine = true;
        self.ShowRowLine = true;

        self.Font = new FontWrapper(owner.Font);
        self.Border = new Border(grenum.BorderStyle.DrawLeft | grenum.BorderStyle.DrawRight | grenum.BorderStyle.DrawTop | grenum.BorderStyle.DrawBottom);
        self.ColLinePen = new Pen();
        self.RowLinePen = new Pen();

        self.Recordset = new Recordset(self);
        self.ColumnContent = new ColumnContent(self);
        self.ColumnTitle = new ColumnTitle(self);

        self.Columns = new Columns(self);
        self.Groups = new Groups(self);
    };
    DetailGrid.prototype = {
        //children: ["Border", "ColLinePen", "RowLinePen", "Recordset", "Columns", "Groups", "ColumnContent", "ColumnTitle"],
        children: ["Border", "ColLinePen", "RowLinePen", "Recordset", "Groups"],

        afterLoad: function (objJson) {
            var self = this,
                alpha = self.report.viewer.alpha,
                isWR = self.report.isWR;

            colorMemberValid(self, "BackColor", alpha.background);

            self.Border.loadFromJSON(objJson.Border, alpha.border, isWR);
            self.ColLinePen.loadFromJSON(objJson.ColLine, alpha.stroke, isWR);
            self.RowLinePen.loadFromJSON(objJson.RowLine, alpha.stroke, isWR);
            self.Font.loadFromJSON(objJson.Font, isWR);

            self.Recordset.loadFromJSON(objJson.Recordset);
            self.Groups.loadFromJSON(objJson.Group);
            self.Columns.loadFromJSON(objJson.Column);
            self.ColumnContent.loadFromJSON(objJson.ColumnContent);
            self.ColumnTitle.loadFromJSON(objJson.ColumnTitle);

            self.IsCrossTab = objJson[self.getJsonMember("IsCrossTab")];
            self.IsCrossTab && self.CrossTab.loadFromJSON(objJson.CrossTab);
        },

        assign: function (from) {
            var self = this;

            Object.prototype.assign.call(self, from);

            self.ColumnContent.assign(from.ColumnContent);
            self.ColumnTitle.assign(from.ColumnTitle);

            function assignColumns(titlecells, fromtitlecells) {
                fromtitlecells.forEach(function (fromtitlecell) {
                    var newobj;

                    if (fromtitlecell.GroupTitle) {
                        newobj = titlecells.AddGroup("", "");
                        newobj.assign(fromtitlecell);
                        assignColumns(newobj.SubTitles, fromtitlecell.SubTitles);
                    }
                    else {
                        newobj = self.Columns.addTo(titlecells);
                        newobj.assign(fromtitlecell.Column);
                        newobj.TitleCell.assign(fromtitlecell);
                        newobj.ContentCell.assign(fromtitlecell.Column.ContentCell);
                    }
                });
            };
            assignColumns(self.ColumnTitle.TitleCells, from.ColumnTitle.TitleCells);

            self.IsCrossTab = from.IsCrossTab;
            self.IsCrossTab && self.CrossTab.assign(from.CrossTab);
        },

        attachData: function () {
            var self = this;

            function doTitleCells(titlecells) {
                titlecells.forEach(function (titlecell) {
                    titlecell.attachData();
                    titlecell.GroupTitle && doTitleCells(titlecell.SubTitles);
                });
            };

            self.Recordset.prepare();

            self.ColumnContent.ContentCells.forEach(function (cell) {
                cell.attachData();
            });
            doTitleCells(self.ColumnTitle.TitleCells);
            self.Groups.forEach(function (group) {
                group.Header.Controls.attachData();
                group.Footer.Controls.attachData();
            });
        },

        buildColumnsOrder: function () {
            var self = this,
                orderedColumns = [];

            function orderColumns(titleCells) {
                titleCells.forEach(function (titleCell) {
                    if (titleCell.GroupTitle) {
                        orderColumns(titleCell.SubTitles);
                    }
                    else {
                        titleCell.Column.orderNo = orderedColumns.length;
                        orderedColumns.push(titleCell.Column);
                    }
                });
            };

            orderColumns(self.ColumnTitle.TitleCells);
            self.Columns.items = orderedColumns;
        },

        beginGroupItem: function (group) {
            var self = this;

            self.rows.push({
                header: group.Header,
                recordNo: group.groupItemNo,
            });

            group.recordset.Append();
            group.beginNoField.Value = self.Recordset.recordNo;
            group.groupRecordCount = 0;

            group.summaryItems.forEach(function (item) {
                item.SummaryFun && item.beginSummaryValue();
            });

            self.report.fireGroupBegin(group); //触发GroupBegin事件
        },

        endGroupItem: function (group) {
            var self = this,
                report = self.report,
                summaryItems = group.summaryItems,
                summaryItemIndex = summaryItems.length,
                summaryItem,
                summaryFun;

            self.rows.push({
                footer: group.Footer,
                recordNo: group.groupItemNo++,
            });

            report.fireGroupEnd(group); //触发GroupEnd事件，必须在后续统计任务之前执行，自定义计算的统计值才能保存到分组的记录集字段中

            summaryItems.forEach(function (item) {
                item.SummaryFun && item.endSummaryValue();
            });
            //将汇总的数据写入到对应字段中。按倒序计算，因为后面的统计项结果有可能被前面的统计项作为参数用到
            while (summaryItemIndex-- > 0) {
                summaryItem = summaryItems[summaryItemIndex];
                summaryFun = summaryItem.SummaryFun;

                if (summaryFun) {
                    if (grenum.constVar.GROUP_SUMACC_INSUP !== summaryFun) {
                        //if (summaryItem.displayField || summaryFun === grenum.SummaryFun.StrMin || summaryFun === grenum.SummaryFun.StrMax) {
                        //    if (summaryItem.stringValue) {
                        //        summaryItem.valueField.AsString = summaryItem.stringValue;
                        //    }
                        //}
                        //else {
                        //    if (summaryItem.value !== undefined) {
                        //        summaryItem.valueField.AsFloat = summaryItem.value;
                        //    }
                        //}
                        if (summaryItem.value !== undefined) {
                            summaryItem.valueField.AsFloat = summaryItem.value;
                        }
                    }
                }
                else if (summaryItem.MathFun) { //MathFun
                    summaryItem.valueField.Value = summaryItem.getAsFloat();
                }
                else { //Parameter
                    summaryItem.valueField.Value = summaryItem.oParameter.Value;
                }
            };

            //交叉表要进行一些处理
            report.DetailGrid.CrossTab && report.DetailGrid.CrossTab.GroupEndProcess(group);

            //提交前一个分组记录
            group.endNoField.Value = Math.min(self.Recordset.recordNo, self.Recordset.RecordCount - 1);
            group.recordset.Post();
        },

        prepare: function () {
            var self = this,
                report = self.report;

            function createGlobalSummaryItems(controls) {
                controls.forEach(function (control) {
                    function createControlSummaryItems(control) { //这里的参数control有可能是真正的 Control，也有可能是 FreeGridCell
                        var globalSummaryItems = self.globalSummaryItems,
                            type = control.ControlType;

                        if (type === grenum.ControlType.SummaryBox) {
                            globalSummaryItems.push(control);
                        }
                        else if (type === grenum.ControlType.MemoBox) {
                            MemoBox.prototype.getGroupVars.call(control).forEach(function (item) {
                                //仅统计函数需要考虑全局统计
                                item.SummaryFun && globalSummaryItems.push(item);
                            });
                        }
                        else if (type === grenum.ControlType.FreeGrid) {
                            control.cells.forEach(function (rowcells) {
                                rowcells.forEach(function (cell) {
                                    if (cell.FreeCell) {
                                        createGlobalSummaryItems(cell.Controls);
                                    }
                                    else {
                                        createControlSummaryItems(cell);
                                    }
                                });
                            });
                        }
                    };

                    createControlSummaryItems(control);
                });
            };

            if (self.CrossTab) {
                self.buildColumnsOrder(); //首先将列按显示顺序排列,并设置序号

                self.CrossTab.prepare();
            }
            else {
                self.Columns.prepare();

                self.ColumnContent.prepare();
                self.ColumnTitle.prepare();

                self.Groups.forEach(function (group, index) {
                    group.prepare(index);
                });

                self.globalSummaryItems = [];
                report.ReportHeaders.items.concat(report.ReportFooters.items).forEach(function (section) {
                    createGlobalSummaryItems(section.Controls);
                });
            }
        }, //end of prepare

        unprepare: function () {
            var self = this;

            self.CrossTab && self.CrossTab.unprepare();

            self.Recordset.unprepare();
        },

        generate: function (parentElement, type) {
            var self = this,
                report = self.report,
                recordset = self.Recordset,
                border = self.Border,
                viewer = report.viewer,
                viewerDetailgrids = viewer._detailgrids,
                onlyTitle = type == "title",
                onlyContent = type == "content",
                htmlTable = new HtmlElement("table", parentElement),
                colgroupElement = new HtmlElement("colgroup", htmlTable),
                tbodyElement;
                //colElement;

            function percentColWidth() {
                var ownerReport = report.ownerReport,
                    fitStyles = report.detailgridResize;

                //如果为 onlyGrow 方式，如果是子报表，必须是报表节中的唯一子报表
                return (fitStyles === grenum.detailgridResize.fitWidth) ||
                    (fitStyles === grenum.detailgridResize.onlyGrow && window.innerWidth && self.width < window.innerWidth &&
                    (!ownerReport || ownerReport.owner._singleSR));
            }

            htmlTable.addClass(grconst.CSS_DG);

            self.Font.font && htmlTable.addClass(viewer.selectFont2(self.Font.font));

            if (onlyTitle) {
                //锁定报头表尾时，明细网格的表头不显示下边框
                border = border.clone();
                border.Styles &= ~grenum.BorderStyle.DrawBottom;
            }
            if (onlyContent) {
                //锁定报头表尾时，明细网格的表体不显示上边框
                border = border.clone();
                border.Styles &= ~grenum.BorderStyle.DrawTop;
            }
            htmlTable.styles.addBorder(border);

            htmlTable.addStyle("border-collapse", "collapse"); //style中必须加上"border-collapse:collapse,这样才能让表格的单元格与表格行列线之间没有空白
            htmlTable.addStyle("width", percentColWidth() ? "100%" : pixelsToHtml(self.width));
            self.toFillBack() && htmlTable.addBackColorStyle(self.BackColor);

            //<colgroup>
            //    <col style="width: 65%;">
            //    <col style="width: 35%;">
            //</colgroup>
            self.showingColumns.forEach(function (column) {
                var colElement = new HtmlElement("col", colgroupElement);
                colElement.skipend = 1;
                colElement.addStyle("width", percentToHtml(column.pxWidth * 100 / self.columnsTotalWidth));
            });

            if (!onlyContent) {
                self.ColumnTitle.generate(new HtmlElement("thead", htmlTable)); //theadElement);
            }

            if (!onlyTitle) {
                //为每个明细网格设置一个唯一的id，并把此明细网格记录到 viewer._detailgrids 中
                htmlTable.addAttribute("id", viewer._getDetailGridID(viewerDetailgrids.length));
                viewerDetailgrids.push(self);

                //如果为主从关系的子报表，记录关联的从表记录集序号
                (recordset._relTblIndex >= 0) && htmlTable.addAttribute("_grrelTblIndex", recordset._relTblIndex);

                tbodyElement = new HtmlElement("tbody", htmlTable),

                self.generatingRowNo = 1;
                self.rows.forEach(function (row, index) {
                    var section;

                    if (row.header) {
                        section = row.header;
                        section.generate(tbodyElement, row.recordNo);
                    }
                    else if (row.footer) {
                        section = row.footer;
                        section.generate(tbodyElement, row.recordNo);
                    }
                    else {
                        section = self.ColumnContent;
                        section.generate(tbodyElement, row); //这里row的值代表明细记录号，从0开始
                    }

                    if (section.Visible && section.Height > 0) {
                        ++self.generatingRowNo;
                    }
                });
            }
        },

        buildRows: function () {
            var detailgrid = this,
                report = detailgrid.report,
                recordset = detailgrid.Recordset,
                groups = detailgrid.Groups.items,
                groupCount = groups.length,
                changedGroupIndex,
                index,
                hasSorted = 0,
                sortedRows;

            function processGroupRecord(group) {
                group.summaryItems.forEach(function (item) {
                    item.SummaryFun && item.summaryCurRecord();
                });

                group.groupRecordCount++;
            };

            function sortBySummaryBox(group) {
                var rows = group.owner.rows,
                    rowslen = rows.length,
                    i,
                    row,
                    sortItem,
                    sortItems = [];

                function sortGroupItems() {
                    var len = sortItems.length,
                        scopeBeginRowNo,
                        rows = group.owner.rows,
                        sortedRows = [];

                    //如果只有一个分组项，则不用排序
                    if (len <= 1) {
                        return;
                    }

                    scopeBeginRowNo = sortItems[0].beginRowNo,

                    //首先求出各个分组项的值，然后进行排序
                    sortItems.forEach(function (item) {
                        group.recordset.MoveTo(item.groupItemNo);
                        item.sortValue = group.sortSummaryBoxObj.valueField.AsFloat; //这里不能用IGRSummaryBox::get_Value，因为其会根据当前明细记录进行同步
                    });
                    sortItems.sort(function (item1, item2) {
                        return group.SortAsc ? item1.sortValue - item2.sortValue : item2.sortValue - item1.sortValue;
                    });

                    //首先根据 SortItems 将 self.Grid.self.RowInfos 对应部分数据复制到 SortedRowInfos，然后再整复制回去
                    sortItems.forEach(function (item) {
                        sortedRows = sortedRows.concat(rows.slice(item.beginRowNo, item.endRowNo));
                    });
                    sortedRows.forEach(function (newrow) {
                        rows[scopeBeginRowNo++] = newrow;
                    });
                };

                i = 0;
                while (i < rowslen) { //for (; ;)//while ( 1 )//(itRow != self.Grid.self.RowInfos.end())
                    sortItem = {}; //分组的开始行与结束行是半闭包形式[beginRowNo, endRowNo)

                    row = rows[i];
                    if (row.footer && row.footer.owner.index < group.index) { //如果是父级分组的分组尾行,则本分组下的分组项进行排序
                        sortGroupItems();
                        sortItems = [];
                        i++;
                    }

                    //找到分组的开始行
                    while (i < rowslen) {
                        row = rows[i++];

                        if (row.header && row.header.owner.index === group.index) {
                            sortItem.beginRowNo = i - 1;
                            sortItem.groupItemNo = row.recordNo;
                            break;
                        }
                    }

                    //找到分组的结束行
                    while (i < rowslen) {
                        row = rows[i++];

                        if (row.footer && row.footer.owner.index === group.index) {
                            sortItem.endRowNo = i;
                            sortItems.push(sortItem);
                            break;
                        }
                    }
                }
                sortGroupItems();
            };

            detailgrid.rows = [];
            detailgrid.globalSummaryItems.forEach(function (item) {
                item.beginSummaryValue();
            });

            recordset.First();
            recordset.keepValue();

            //生成第一个分组的起始信息，即使没有明细数据，也要产生分组//。没有数据时，占列式分组不产生行，不然查询显示不对
            groups.forEach(function (group) {
                detailgrid.beginGroupItem(group);
            });

            //遍历所有记录
            while (!recordset.Eof()) {
                //determine every group value changed or not status and save it
                for (changedGroupIndex = 0; changedGroupIndex < groupCount; changedGroupIndex++) {
                    if (recordset.fieldsKeepedValueChanged(groups[changedGroupIndex].oByFields)) {
                        break;
                    }
                }

                if (changedGroupIndex < groupCount) {  //处理前一个分组, from inner group to outer group
                    recordset.Prior(); //退回到前一个记录，使处理 GroupEnd 事件时处于本分组项的最后一条记录
                    for (index = groupCount - 1; index >= changedGroupIndex; index--) {
                        detailgrid.endGroupItem(groups[index]);
                    }
                    recordset.Next(); //回到当前记录

                    //处理新分组的开始, from outer group to inner group
                    for (index = changedGroupIndex; index < groupCount; index++) {
                        detailgrid.beginGroupItem(groups[index]); //添加当前分组记录
                    }
                }

                //触发ProcessRecord事件, 在事件中可以调用 StartNewGroup 方法,开始一个新分组
                //self.IsInProcessRecord = TRUE;
                report.fireProcessRecord(recordset);
                //self.IsInProcessRecord = FALSE;

                //每个分组处理统计本条记录
                groups.forEach(function (group) {
                    processGroupRecord(group);
                });

                //统计全程记录
                //CGRGroup::SummaryCurRecord(self.GlobalSummaryItems, self.RecordNo, self.Grid.Recordset());
                detailgrid.globalSummaryItems.forEach(function (item) {
                    item.summaryCurRecord();
                });

                detailgrid.rows.push(recordset.recordNo);

                recordset.keepValue();
                recordset.Next();
            }

            //在最后所有记录处理完之后，触发_Fire_ProcessEnd，让事件或脚本可以对自定义分组进行最后的处理
            //self.IsInProcessRecord = TRUE;
            report.fireProcessEnd();
            //self.IsInProcessRecord = FALSE;

            //处理最后分组的结束信息，即使没有明细数据，也要产生分组
            for (index = groupCount - 1; index >= 0; index--) {
                detailgrid.endGroupItem(groups[index]);
            }
            //>>生成分组记录数据, 所有显示行信息

            //CGRGroup::EndSummaryValue(self.GlobalSummaryItems, self.RecordNo);
            detailgrid.globalSummaryItems.forEach(function (item) {
                item.endSummaryValue();
            });

            //<<按统计值对分组进行重新排序
            //bool HasSorted = false;
            groups.forEach(function (group) {
                if (group.sortSummaryBoxObj) {
                    sortBySummaryBox(group);
                    hasSorted = 1;
                }
            });

            //将明细记录集与分组汇总数据记录集的数据按显示顺序重新组织
            if (hasSorted) {
                sortedRows = [];

                index = 0;  //表示明细记录号
                detailgrid.sortedTable = [];

                groups.forEach(function (group) {
                    group.sortedTable = [];
                    group.groupItemNo = 0;
                });

                detailgrid.rows.forEach(function (row) {
                    var group;

                    if (row.header) {
                        group = row.header.owner;

                        group.recordset.MoveTo(row.recordNo);
                        group.recordset.Edit();
                        group.beginNoField.Value = index;

                        row.recordNo = group.groupItemNo;
                    }
                    else if (row.footer) {
                        group = row.footer.owner;

                        group.endNoField.Value = index;
                        group.recordset.Post();
                        group.sortedTable.push(group.recordset._dataTable[row.recordNo]);

                        row.recordNo = group.groupItemNo++;
                    }
                    else {
                        detailgrid.sortedTable.push(recordset._dataTable[row]);
                        row = index++;
                    }
                    sortedRows.push(row);
                });

                detailgrid.rows = sortedRows;

                recordset.attachDataTable(detailgrid.sortedTable);
                delete detailgrid.sortedTable;

                groups.forEach(function (group) {
                    group.recordset.attachDataTable(group.sortedTable);
                    delete group.sortedTable;
                });
            }
        }, //end of buildRows

        //根据HTML tr 元素，同步对应的明细记录集数据与分组记录集数据
        syncTRData: function (trElement) {
            var self = this,
                isGroupHeader = 1,
                group,
                attrVal,
                attrVal2,
                ret = {};

            function recordsetMoveTo(recno) {
                var detailgridElement = trElement.parentNode.parentNode;

                grhelper.GRASSERT(!detailgridElement.hasAttribute("_grrelTblIndex") || self.report.ownerSR, "");

                detailgridElement.hasAttribute("_grrelTblIndex") &&
                self.report.ownerSR.attachRelationTable2(detailgridElement.getAttribute("_grrelTblIndex"));

                self.Recordset.MoveTo(recno);
            }

            if (attrVal = trElement.getAttribute(grconst.ATTR_CONTENT_RECNO)) {
                recordsetMoveTo(attrVal);
                ret.content = self.ColumnContent;
            }
            else if (attrVal = trElement.getAttribute(grconst.ATTR_GROUP_RECNO)) {
                attrVal2 = trElement.getAttribute(grconst.ATTR_GROUPH_INDEX);
                if (!attrVal2) {
                    attrVal2 = trElement.getAttribute(grconst.ATTR_GROUPF_INDEX);
                    isGroupHeader = 0;
                }

                group = ret.group = self.Groups.items[attrVal2];

                group.recordset.MoveTo(attrVal);

                recordsetMoveTo((isGroupHeader ? group.beginNoField : group.endNoField).Value);
            }

            return ret;
        },

        //根据HTML元素，同步对应的明细记录集数据与分组记录集数据
        syncElementData: function (element, targetDetailGrid) {
            var self = this,
                tdDataElement = findDataEventTD(element, targetDetailGrid);

            //findDataEventTD: 找到当前事件的明细网格对应的单元格
            //如果参数 targetDetailGrid 未定义，则找到最上层明细网格对应的单元格
            function findDataEventTD(tdElement, targetDetailGrid) {
                var tagName = tdElement.tagName.toUpperCase(),
                    detailgridElement;

                if (tagName === "TH" || tagName === "TABLE") {
                    return 0;
                }

                //对于表中表，当为响应主表事件时，evt.target是子表中的元素，所以应该逐级朝上找到对应的 td 元素
                do {
                    if (detailgridElement) {
                        tdElement = detailgridElement.parentNode;
                        tagName = tdElement.tagName.toUpperCase();
                        if (tagName === "TH") {
                            return 0;
                        }
                    }

                    while (tagName !== "TD") {
                        tdElement = tdElement.parentNode;
                        if (!tdElement) {
                            return 0;
                        }
                        tagName = tdElement.tagName.toUpperCase();
                        if (tagName === "TH") {
                            return 0;
                        }
                    }
                    grhelper.GRASSERT(tagName === "TD", "tdElement's tagName must be 'TD'");

                    //td->tr->tbody->table
                    detailgridElement = tdElement.parentNode.parentNode.parentNode;

                    grhelper.GRASSERT(detailgridElement.tagName.toUpperCase() === "TABLE", "detailgridElement's tagName must be 'TABLE'");

                    if (!targetDetailGrid && detailgridElement.classList.contains(grconst.CSS_DG)) {
                        break;
                    }
                } while (targetDetailGrid !== detailgridElement)

                return tdElement;
            }

            tdDataElement && self.syncTRData(tdDataElement.parentNode);
        },

        onmousedown: function (evt) {
            var self = this,
                tdSelElement = findTopDGTD();
            //tdDataElement = findDataEventTD();

            function findTopDGTD() { //找到最上层的明细网格对应的单元格
                var tdElement = evt.target,
                    tagName,
                    trElement,
                    isDetailGridTD;

                if (tdElement.tagName.toUpperCase() === "TABLE") {
                    return 0;
                }

                //对于表中表，当为响应主表事件时，evt.target是子表中的元素，所以应该逐级朝上找到对应的 td 元素
                while (!isDetailGridTD) {
                    if (trElement) {
                        tdElement = trElement.parentNode.parentNode.parentNode;
                    }
                    tagName = tdElement.tagName.toUpperCase();
                    if (tagName === "TH") {
                        return 0;
                    }

                    while (tagName !== "TD") {
                        tdElement = tdElement.parentNode;
                        tagName = tdElement.tagName.toUpperCase();
                        if (tagName === "TH") {
                            return 0;
                        }
                    }
                    grhelper.GRASSERT(tagName === "TD", "tdElement's tagName must be 'TD'");

                    //td->tr->tbody->table
                    trElement = tdElement.parentNode;
                    isDetailGridTD = trElement.hasAttribute(grconst.ATTR_CONTENT_RECNO) || trElement.hasAttribute(grconst.ATTR_GROUP_RECNO);
                }
                return tdElement;
            }

            function dosel(tdSelElement) {
                var curSelObj = self.curSelObj,
                    options = self.report.viewer.options,
                    trSelElement = tdSelElement.parentNode,
                    selElement = options.selectionCell ? tdSelElement : trSelElement;

                //改变选中行, 标题行不允许高亮显示
                //如果是表中表，父表的内容行（格）不选中
                //trSelElement.parentNode.parentNode === evt.currentTarget 意味事件表格与点击单元格的明细网格是同一的
                //目前存在单元格如果有背景色，则单元格不能应用上选中色
                if (trSelElement.parentNode.parentNode === evt.currentTarget && options.selectionHighlight) {
                    if (curSelObj === selElement) {
                        selElement.classList.toggle(grconst.CSS_SH);
                    }
                    else {
                        curSelObj && curSelObj.classList.remove(grconst.CSS_SH);
                        selElement.classList.add(grconst.CSS_SH);
                        self.curSelObj = selElement;
                    }
                }
                
                self.clickedCell = tdSelElement;
            }


            //console.log("detailgrid onmousedown id=" + trElement.parentNode.parentNode.id);

            //处理选中
            tdSelElement && dosel(tdSelElement);

            //同步数据记录
            //tdDataElement && dodata(tdDataElement);
            self.syncElementData(evt.target, evt.currentTarget);
        },

        getClickedRow: function () {
            var self = this,
                clickedCell = self.clickedCell,
                trElement,
                isGroupHeader,
                attrVal,
                ret = {};

            if (clickedCell) {
                trElement = clickedCell.parentNode;

                if (attrVal = trElement.getAttribute(grconst.ATTR_CONTENT_RECNO)) {
                    ret.type = "content";
                    ret.recordNo = attrVal;
                }
                else if (attrVal = trElement.getAttribute(grconst.ATTR_GROUP_RECNO)) {
                    isGroupHeader = trElement.hasAttribute(grconst.ATTR_GROUPH_INDEX);
                    ret.type = isGroupHeader ? "groupheader" : "groupfooter";
                    ret.groupIndex = +trElement.getAttribute(isGroupHeader ? grconst.ATTR_GROUPH_INDEX : grconst.ATTR_GROUPF_INDEX)
                }
            }

            return ret;
        },

        //private:
        clearColumns: function () {
            var self = this;

            self.ColumnContent.ContentCells.RemoveAll();
            self.ColumnTitle.TitleCells.RemoveAll();
            self.Columns.RemoveAll();
        },

        get width() {
            var self = this,
                border = self.Border;

            return self.columnsTotalWidth + border.getLeftWidth() + border.getRightWidth();
        },

        _ColumnMoveTo: function (column, newGroupTitleCell) {
            var self = this,
                oldTitleCells = self.ColumnTitle.FindColumnTitlesOfTitleCell(column.TitleCell),
                newTitleCells = newGroupTitleCell ? newGroupTitleCell.SubTitles : self.ColumnTitle.TitleCells;

            self.MoveTitleTo(column.TitleCell, oldTitleCells, newTitleCells, -1);
        },

        MoveTitleTo: function (titlecell, oldTitleCells, newTitleCells, newOrderNo) { //newOrderNo 从0开始
            oldTitleCells.items.splice(oldTitleCells.items.indexOf(titlecell), 1);
            if (newOrderNo < 0) {
                newTitleCells.items.push(titlecell);
            }
            else {
                newTitleCells.items.splice(newOrderNo, 0, titlecell);
            }
        },

        //com interface
        get IsCrossTab() {
            return !!this.CrossTab;
        },
        set IsCrossTab(val) {
            var self = this;

            if (val) {
                if (!self.CrossTab) {
                    self.CrossTab = new CrossTab(self);
                }
            }
            else {
                delete self.CrossTab;
            }
        },

        //[id(60), helpstring("method AddColumn")] HRESULT AddColumn([in] BSTR Name, [in] BSTR Title, BSTR DataField, [in] DOUBLE Width, [out,retval] IGRColumn** ppColumn);
        AddColumn: function (Name, Title, DataField, Width) {
            var column = this.Columns.Add();

            column.Name = Name;
            column.Width = Width;

            column.ContentCell.DataField = DataField;
            column.TitleCell.Text = Title;

            return column;
        },
        //[id(61), helpstring("method ClearColumns")] HRESULT ClearColumns: function();
        ClearColumns: function () {
            this.Columns.RemoveAll();
        },
        //[id(62), helpstring("method FindGroupTitleCell")] HRESULT FindGroupTitleCell([in] BSTR Name, [out,retval] IGRColumnTitleCell** ppTitle);
        FindGroupTitleCell: function (Name) {
            function doFindGroupTitleCell(titleCells) {
                var i,
                    len = titleCells.items.length,
                    item = titleCells.itemByName(Name);

                if (!item) {
                    for (i = 0; i < len; i++) {
                        item = titleCells.items[i];
                        if (item.GroupTitle) {
                            item = doFindGroupTitleCell(item.SubTitles, Name)
                            if (item) {
                                return item;
                            }
                        }
                    }
                }

                return item;
            }

            return doFindGroupTitleCell(this.ColumnTitle.TitleCells, Name);
        },
        //[id(63), helpstring("method AddGroupTitle")] HRESULT AddGroupTitle([in] BSTR Name, [in] BSTR Title, [out,retval] IGRColumnTitleCell** ppTitle);
        AddGroupTitle: function (Name, Title) {
            return this.ColumnTitle.TitleCells.AddGroup(Name, Title);
        },
        //[id(64), helpstring("method ClearGroupTitles")] HRESULT ClearGroupTitles: function();
        ClearGroupTitles: function () {
            var self = this,
                len = self.Columns.Count,
                i,
                titleCells = self.ColumnTitle.TitleCells,
                item,
                newTitleCells = [];

            for (i = 1; i <= len; i++) {
                ColumnMoveToEnd(i);
            }

            //static_cast<CGRColumnTitle *>(self.pColumnTitle.p)->ClearGroupTitleCells();
            len = titleCells.Count;
            for (i = 0; i < len; i++) {
                item = titleCells.items[i];
                !item.GroupTitle && newTitleCells.push(item);
            }
            titleCells.items = newTitleCells;
        },
        //[id(65), helpstring("method ColumnMoveToEnd")] HRESULT ColumnMoveToEnd([in] VARIANT ColumnIndex);
        ColumnMoveToEnd: function (ColumnIndex) {
            var self = this,
                column = self.Columns.Item(ColumnIndex);

            column && sel._ColumnMoveTo(column, undefined);
        },
        //[id(66), helpstring("method ColumnMoveTo")] HRESULT ColumnMoveTo([in] BSTR ColumnName, [in] BSTR NewGroupTitleCellName, [in] LONG NewShowOrderNo);
        ColumnMoveTo: function (ColumnName, NewGroupTitleCellName, NewShowOrderNo) {
            var self = this,
                column = self.Columns.Item(ColumnName),
                titleCell = column ? column.TitleCell : self.FindGroupTitleCell(ColumnName),
                oldTitleCells,
                newGroupTitleCell = NewGroupTitleCellName ? self.FindGroupTitleCell(NewGroupTitleCellName) : undefined,
                newTitleCells = NewGroupTitleCellName ? (newGroupTitleCell ? newGroupTitleCell.SubTitles : undefined) : self.ColumnTitle.TitleCells;

            if (titleCell && newTitleCells) {
                oldTitleCells = self.ColumnTitle.FindColumnTitlesOfTitleCell(titleCell);

                self.MoveTitleTo(titleCell, oldTitleCells, newTitleCells, NewShowOrderNo);
            }
        },

        //[id(67), helpstring("method StartNewGroup")] HRESULT StartNewGroup([in] VARIANT groupindex);
        StartNewGroup: function (groupIndex) {
            var self = this,
                recordset = self.Recordset,
                groups = self.Groups.items,
                groupCount = groups.length,
                group = self.Groups.Item(groupIndex),
                i;

            if (group) {
                //应该先处理前一个分组的结束任务,并触发其 GroupEnd 事件
                recordset.Prior(); //退回到前一个记录，使处理 GroupEnd 事件时处于本分组项的最后一条记录
                for (i = groupCount - 1; i >= group.index; i--) {
                    self.endGroupItem(groups[i]);
                }
                recordset.Next(); //回到当前记录

                for (i = group.index; i < groupCount; i++) {
                    self.beginGroupItem(groups[i]); //添加当前分组记录
                }
            }
        },
        //[id(68), helpstring("method ColumnByShowOrder")] HRESULT ColumnByShowOrder([in] LONG OrderNo, [out,retval] IGRColumn** ppColumn); //序号从0开始
        ColumnByShowOrder: function (OrderNo) {
            var CurOrderNo = 0;

            function DoFindTitleCellByShowOrder(titleCells, CurOrderNo, OrderNo) {
                var i,
                    item,
                    //titleCell,
                    len = titleCells.Count;

                for (i = 0; i < len; i++) {
                    item = titleCells.items[i];
                    if (item.GroupTitle) {
                        item = DoFindTitleCellByShowOrder(item.SubTitles, CurOrderNo, OrderNo);
                        if (item) {
                            return item;
                        }
                    }
                    else {
                        if (CurOrderNo == OrderNo) {
                            return item;
                        }
                        CurOrderNo++;
                    }
                }

                return undefined;
            }

            return DoFindTitleCellByShowOrder(this.ColumnTitle.TitleCells, CurOrderNo, OrderNo);
        },
    };
    prototypeCopyExtend(DetailGrid, Object);

    /////////////////////////////////////////////////////////////////////////
    var Parameter = function (owner) {
        var self = this;

        Object.call(self, owner);

        self.DataType = grenum.ParameterDataType.String; //指示参数的数据类型
        self.Name = "";    //参数的名称
        self.Format = "";  //整数、浮点数、日期时间类型的参数生成输出显示文本的格式串
        self.Value = undefined; //参数的值
        //self.FormatParser: undefined;
    };
    Parameter.prototype = {
        afterLoad: function (objJson) {
            var self = this;

            enumMemberValid(self, "DataType", grenum.ParameterDataType);

            //将载入的数据转换为与self.DataType相对应的数据类型
            (self.Value !== undefined) && self.setValue(self.Value);
        },
        prepare: function () {
            var self = this,
                DataType = self.DataType,
                Format = self.Format;

            if (grenum.ParameterDataType.Integer === DataType || grenum.ParameterDataType.Float === DataType) {
                self.formater = new NumericFormatter(Format);
            }
            else if (grenum.ParameterDataType.DateTime === DataType) {
                self.formater = new DateTimeFormatter(Format);
            }
            else if (grenum.ParameterDataType.Boolean === DataType) {
                self.formater = new BooleanFormatter(Format);
            }
        },
        unprepare: function () {
            delete this.formater
        },
        setValue: function (val) {
            var self = this;

            if (val !== null && val !== undefined) {
                switch (self.DataType) {
                    case grenum.ParameterDataType.Integer:
                        val = Math.floor(+val);
                        break;
                    case grenum.ParameterDataType.Float:
                        val = +val;
                        break;
                    case grenum.ParameterDataType.Boolean:
                        val = confirmBooleanValue(val);
                        break;
                    case grenum.ParameterDataType.DateTime:
                        val = confirmDateValue(val);
                        break;
                    default: //grenum.ParameterDataType.String:
                        val = val + "";
                        break;
                }
            }
            else {
                val = undefined;
            }
            self.Value = val;
        },

        //com interface
        get AsBoolean() {
            return !!this.Value;
        },
        set AsBoolean(val) {
            this.setValue(val);
        },

        get AsDateTime() {
            return confirmCloneDateValue(this.Value);
        },
        set AsDateTime(val) {
            this.setValue(val);
        },

        get AsFloat() {
            var self = this,
                val = self.Value;

            //必须要返回一个有效的数字值
            if (grenum.ParameterDataType.DateTime === self.DataType) {
                var dval = new DateTime();
                dval.value = val;
                val = dval.AsFloat;
            }
            else {
                val = +val;
            }
            return isNaN(val) ? 0 : val;
        },
        set AsFloat(val) {
            var self = this,
                dval;

            if (grenum.ParameterDataType.DateTime === self.DataType) {
                dval = new DateTime();
                dval.AsFloat = val;
                val = dval.value;
            }
            self.setValue(val);
        },
        get AsInteger() {
            return Math.floor(this.AsFloat);
        },
        set AsInteger(val) {
            this.AsFloat = Math.floor(+val);
        },

        get AsString() {
            var val = this.Value;

            return val === undefined ? "" : val + "";
        },
        set AsString(val) {
            this.setValue(val);
        },

        get DisplayText() {
            var self = this,
                val = self.Value;

            if (val === undefined) {
                return "";
            }

            switch (self.DataType) {
                case grenum.ParameterDataType.String:
                    return val + "";
                default:
                    return self.formater.format(val);
            }
        },
        get IsNull() {
            return this.Value === undefined;
        },

        Clear: function () {
            this.Value = undefined;
        },
    };
    prototypeCopyExtend(Parameter, Object);

    /////////////////////////////////////////////////////////////////////////
    var Report = function (viewer, ownerSR) {
        var self = this;

        //grhelper.GRASSERT(viewer, "viewer is undefined");
        viewer = viewer || {
            alpha: {
                background: 1
            }
        };

        self.viewer = viewer;
        self.report = self;
        if (ownerSR) {
            self.ownerSR = ownerSR;
        }

        //self.Version = "";

        //self.BackImage = '';
        //self.DetailGrid = { };
        //self.Font = new Font();
        //self.defaultFont = new Font();
        self.Font = new FontWrapper(undefined)
        self.Font.font = new Font();

        self.Parameters = new Parameters(self);
        self.ReportHeaders = new ReportHeaders(self);
        self.ReportFooters = new ReportFooters(self);

        //self.FloatControls
        //self.ImageList

        //self.ParentReport
        //self.FiringReport
        //self.Graphics

        self.XmlTableName = "";

        self.Unit = grenum.Unit.Cm;
        //self.ScriptType = grenum.ScriptType.JScript;
        self.CodePage = 65001; //UTF-8
        //self.StorageFormat, GRStorageFormat, grsfText);
        //self.TextEncode, GRTextEncodeMode, grtemUTF8);
        //self.DocType, GRDocType, grdtObject);
        self.BackColor = 0x00ffffff | (viewer.alpha.background << 24);
        //self.PageDivideCount, LONG, 1);		
        //self.PageDivideSpacing, DOUBLE, 0.0f);		
        //self.PageDivideLine, VARIANT_BOOL, FALSE);		
        //self.PrintAsDesignPaper, VARIANT_BOOL, TRUE);		//6.0版以前是FALSE
        //self.MonoPrint, VARIANT_BOOL, FALSE);		
        //self.MirrorMargins, VARIANT_BOOL, FALSE);		
        //self.ContinuePrint, VARIANT_BOOL, FALSE);		
        //self.BackImagePreview,VARIANT_BOOL, FALSE);
        //self.BackImagePrint,VARIANT_BOOL, FALSE);
        //self.WatermarkAlignment, GRPictureAlignment, grpaCenter)
        //self.WatermarkSizeMode, GRPictureSizeMode, grpsmClip)
        //self.ShowMoneyDigit, LONG, 12);
        //self.ShowMoneyWidth, DOUBLE, 0.0f);
        //self.ShowMoneyLineColor, OLE_COLOR, grclTeal);
        //self.ShowMoneySepLineColor, OLE_COLOR, grclPurple);
        //self.SkipQuery, VARIANT_BOOL, FALSE);		
        self.QuerySQL = "";

        self.Title = "";
        self.Author = "";
        self.Description = "";

        //Event script
        self.GlobalScript = "";
        self.InitializeScript = "";
        self.ProcessBeginScript = "";
        self.ProcessEndScript = "";
        self.BeforeSortScript = "";

        self.Printer = {
            DesignPaperWidth: 21.0,
            DesignPaperLength: 29.7,
            DesignPaperLeftMargin: 2.5,
            DesignPaperRightMargin: 2.5,
            DesignPaperOrientation: grenum.PaperOrientation.Portrait //"Portrait"
        };
    };
    Report.prototype = {
        //模板数据可以为json string、json object、_WR_格式string
        //不能为url，因为ajax请求为异步的
        load: function (jsonData) {
            var self = this;

            if (typeof jsonData === "string") {
                self.isWR = (jsonData.substr(0, 4) === "_WR_");

                //如果前缀为WEB无限分发版注册标志，则要进行解密还原
                self.isWR && (jsonData = gr.wr.decodeWR(jsonData));

                jsonData = JSON.parse(jsonData);
            }
            self.loadFromJSON(jsonData);
        },

        loadFromJSON: function (objJson) {
            var self = this,
                isWR = self.isWR,
                printer = self.Printer,
                jsonPrinter = objJson.Printer,
                member;

            function printerJsonMember(prop) {
                return jsonPrinter[isWR ? wrPropNameEncode(prop) : prop];
            };

            self.Clear();

            assignJSONMembers(self, objJson);

            colorMemberValid(self, "BackColor", self.viewer.alpha.background);

            self.Font.loadFromJSON(objJson.Font, isWR);

            self.Parameters.loadFromJSON(objJson.Parameter);
            self.ReportHeaders.loadFromJSON(objJson.ReportHeader);
            self.ReportFooters.loadFromJSON(objJson.ReportFooter);

            objJson.DetailGrid && self.InsertDetailGrid().loadFromJSON(objJson.DetailGrid);

            if (jsonPrinter) {
                //两边属性名称不一致，所以要特殊处理
                //if (jsonPrinter.Width) {
                //    printer.DesignPaperWidth = jsonPrinter.Width;
                //}
                member = printerJsonMember("Width"); //objJson.Printer[self.getJsonMember("Width")]
                if (member) {
                    printer.DesignPaperWidth = member;
                }
                //if (jsonPrinter.Height) {
                //    printer.DesignPaperLength = jsonPrinter.Height;
                //}
                member = printerJsonMember("Height"); //objJson.Printer[self.getJsonMember("Height")]
                if (member) {
                    printer.DesignPaperLength = member;
                }
                //if (jsonPrinter.hasOwnProperty("LeftMargin")) { //值有可能为零，所以不能用属性值判断
                //    printer.DesignPaperLeftMargin = jsonPrinter.LeftMargin;
                //}
                member = printerJsonMember("LeftMargin"); //objJson.Printer[self.getJsonMember("LeftMargin")]
                if (member !== undefined) {
                    printer.DesignPaperLeftMargin = member;
                }
                //if (jsonPrinter.hasOwnProperty("RightMargin")) {  //值有可能为零，所以不能用属性值判断
                //    printer.DesignPaperRightMargin = jsonPrinter.RightMargin;
                //}
                member = printerJsonMember("RightMargin"); //objJson.Printer[self.getJsonMember("RightMargin")]
                if (member !== undefined) {
                    printer.DesignPaperRightMargin = member;
                }
                //if (jsonPrinter.Oriention) {
                //    printer.DesignPaperOrientation = grenum.PaperOrientation.Landscape;
                //}
                member = printerJsonMember("Oriention"); //objJson.Printer[self.getJsonMember("Oriention")]
                if (member) {
                    printer.DesignPaperOrientation = grenum.PaperOrientation.Landscape;
                }
                self.Printer = printer; //???这里的 printer 不是对象引用，而是对象复制，所以这里又要进行赋值操作
            }
        },

        generateHtml: function () {
            var self = this,
                htmlTexts = [],
                htmlRoot = {
                    htmlElements: [],

                    addChild: function (childElement) {
                        htmlRoot.htmlElements.push(childElement);
                    },
                };

            function generateHtmlText(htmlTexts, element) {
                if (element) {
                    htmlTexts.push(element.beginText());
                    if (element.children) {
                        element.children.forEach(function (child) {
                            generateHtmlText(htmlTexts, child);
                        });
                    }
                    else {
                        htmlTexts.push(element.innerText);
                    }
                    htmlTexts.push(element.endText());
                    if (DEBUG) { //仅测试用
                        htmlTexts.push("\r\n");
                    }
                }
            };

            grhelper.GRASSERT(!self.ownerSR, "generateHtml must be called by root report");

            self.generate(htmlRoot);

            htmlRoot.htmlElements.forEach(function (element) {
                generateHtmlText(htmlTexts, element);
            });

            //TDD...考虑性能优化: 字符串+ += concat 等多种方式的优劣
            return htmlTexts.join("");
        },

        generate: function (htmlRoot) {
            var self = this,
                viewer = self.viewer,
                fixedHeaderFooter = self.fixedHeaderFooter,
                reportHeaders = self.ReportHeaders,
                reportFooters = self.ReportFooters,
                runningDetailGrid,
                styles,
                fixedSectionDivClass,
                fixedBodyDivClass,
                parentElement;

            if (fixedHeaderFooter) {
                styles = new HtmlStyles();
                styles.add("padding-right", "17px"); //TBD...17px 表头表尾的右边留出垂直滚动条的空间
                fixedSectionDivClass = viewer.addCustomStyle(styles);
                viewer.fixedDivClass = fixedSectionDivClass;

                styles = new HtmlStyles();
                styles.add("overflow-y", "scroll"); //让表体部分超范围部分可以滚动。设置为scroll，滚动条始终显示，而auto只在需要时显示滚动条，右边区域不好确定。
                fixedBodyDivClass = viewer.addCustomStyle(styles);
                viewer.bodyDivClass = fixedBodyDivClass;
            }

            //self.GlobalScript && self.executeEventScript(self.GlobalScript, "GlobalScript", self); //这样做是无效的

            self.fireInitialize();

            !self.ownerSR && self.matchTables();

            self.DetailGrid && self.fireFetchRecord();

            self.fireProcessBegin();

            !self.ownerSR && self.prepare();

            if (self.singleChart) {
                self.singleChart.generateContent(htmlRoot);
            }
            else {
                runningDetailGrid = self.RunningDetailGrid;

                //处理自适应布局任务，仅当没有明细网格时，self.reportFitHeight才会为真，报表头与报表尾占据整个容器的高度
                self.reportFitHeight && calcSectionsHeightPercent(reportHeaders.items.concat(reportFooters.items));

                runningDetailGrid && runningDetailGrid.buildRows(self);

                if (fixedHeaderFooter) {
                    //锁定报头表尾时，整个报表的内容分别生成在3个div中：报表头与明细网格的表头、明细网格的表体、报表尾这三部分

                    //<<生成报表头与明细网格的表头
                    parentElement = new HtmlElement("div", htmlRoot);
                    parentElement.addClass(viewer._getCSSName(fixedSectionDivClass));
                    
                    reportHeaders.generate(parentElement);
                    runningDetailGrid.generate(parentElement, "title");
                    //>>

                    //<<明细网格表体
                    parentElement = new HtmlElement("div", htmlRoot);
                    parentElement.addClass(viewer._getCSSName(fixedBodyDivClass));

                    runningDetailGrid.generate(parentElement, "content");
                    //>>

                    //<<报表尾
                    if (reportFooters.Count) {
                        parentElement = new HtmlElement("div", htmlRoot);
                        parentElement.addClass(viewer._getCSSName(fixedSectionDivClass));

                        reportFooters.generate(parentElement);
                    }
                    //>>
                }
                else {
                    reportHeaders.generate(htmlRoot);

                    runningDetailGrid && runningDetailGrid.generate(htmlRoot);

                    reportFooters.generate(htmlRoot);
                }
            }

            //如果没有明细网格，在其生成过程中会触发 fireProcessEnd
            !runningDetailGrid && self.fireProcessEnd();
        },

        matchTables: function () { //将各个表数据匹配到对应的报表对象
            var self = this,
                tables = self.viewer.tables,
                dataTableInfos = [];

            var DataTableInfo = function (tableName, table) {
                var self = this,
                    fieldNames = self.fieldNames = [],
                    i = Math.min(table.length, 50),
                    record;

                self.tableName = tableName;
                self.table = table;
                self.matchWeight = 0;

                while (i--) {
                    record = table[i];
                    for (var fieldName in record) {
                        fieldName = fieldName.toUpperCase();
                        (fieldNames.indexOf(fieldName) < 0) && fieldNames.push(fieldName);
                    }
                }
            };
            DataTableInfo.prototype = {
                isFullMatched: function () {
                    return this.matchWeight >= 200;
                },
                turnToFullMatched: function (reportTableInfo) {
                    var self = this;
                    self.matchWeight = 200;
                    self.reportTableInfo = reportTableInfo;
                },
                isMatched: function () {
                    return this.matchWeight >= 40;
                },

                get recordCount() {
                    return this.table.length;
                },
            };

            function smartMatchTables(self, dataTableInfos) { //将各个表数据匹配到对应的报表对象
                var i,
                    index,
                    len,
                    len2,
                    reportTableInfo,
                    reportTableInfo2,
                    reportTableInfoTableName,
                    dataTableInfo,
                    reportTableInfos = [],
                    reportTableMatchItems,
                    matchWeight,
                    fields,
                    reportDataNames;

                function initReportTableInfos(report) {
                    var recordset,
                        control,
                        constrolType;

                    function ReportTableInfo(isRecordset, Object) {
                        var self = this;

                        self.isRecordset = isRecordset;
                        self.tableName = Object.XmlTableName;
                        self.object = Object;
                    };

                    if (report) { //如果是子报表的报表对象,则pReport有可能为空
                        reportTableInfos.push(new ReportTableInfo(false, report));

                        report.DetailGrid && reportTableInfos.push(new ReportTableInfo(true, report.DetailGrid.Recordset));

                        control = report.FindFirstControl();
                        while (control) {
                            constrolType = control.ControlType;
                            if (constrolType === grenum.ControlType.Chart) {
                                recordset = control.Recordset;
                                (recordset.Fields.Count > 0) && reportTableInfos.push(new ReportTableInfo(true, recordset));
                            }
                            else if (constrolType === grenum.ControlType.SubReport) {
                                initReportTableInfos(control.Report);
                            }

                            control = report.FindNextControl();
                        }
                    }
                }

                function calcMatchWeight(reportFieldNames, dataTableInfo, isRecordset) {
                    var recordCount = dataTableInfo.recordCount,
                        dataFieldNames = dataTableInfo.fieldNames,
                        Percent = 0;

                    function DoXmlTableCalcMatchWeight(Names, ToMatchNames) {
                        var i,
                            len = Names.length,
                            MatchCount = 0;

                        for (i = 0; i < len; i++) {
                            if (ToMatchNames.indexOf(Names[i]) >= 0) {
                                MatchCount++;
                            }
                        }
                        return (100 * MatchCount) / len;
                    }

                    if (reportFieldNames.length && dataTableInfo.fieldNames.length) {
                        //双方匹配，各占100%，完全匹配返回200
                        Percent = DoXmlTableCalcMatchWeight(reportFieldNames, dataFieldNames);
                        if (!Percent) {
                            return 0;
                        }

                        if (Percent === 100 && reportFieldNames.length === dataFieldNames.length) {
                            Percent = 200;
                        }
                        else {
                            Percent += DoXmlTableCalcMatchWeight(dataFieldNames, reportFieldNames);
                        }

                        Percent += (isRecordset && recordCount > 1) || (!isRecordset && recordCount === 1) ? 5 : -5;
                    }
                    return Percent;
                }

                function isFullMatchWeight(matchWeight) {
                    return (matchWeight >= 200);
                }

                function buildMainFieldNames(report) { //参数，部件框，自由表格中的有数据名称的单元格
                    var index,
                        control,
                        controlType,
                        MainFieldNames = [];

                    index = report.Parameters.items.length;
                    while (index--) {
                        MainFieldNames.push(report.Parameters.items[index].Name.toUpperCase());
                    }

                    control = report.FindFirstControl();
                    while (control) {
                        controlType = control.ControlType;
                        if (controlType === grenum.ControlType.StaticBox || controlType === grenum.ControlType.MemoBox || controlType === grenum.ControlType.PictureBox || controlType === grenum.ControlType.Barcode) {
                            MainFieldNames.push(control.Name.toUpperCase());
                        }
                        else if (controlType === grenum.ControlType.FreeGrid) {
                            control.cells.forEach(function (rows) {
                                rows.forEach(function (cell) {
                                    cell.DataName && MainFieldNames.push(cell.DataName.toUpperCase());
                                });
                            });
                        }

                        control = report.FindNextControl();
                    }

                    return MainFieldNames;
                }

                function getMaxMatchItem(reportTableMatchItems) {
                    var item = reportTableMatchItems[0],
                        i = 1,
                        len = reportTableMatchItems.length;

                    for (; i < len; i++) {
                        if (reportTableMatchItems[i].weight > item.weight) {
                            item = reportTableMatchItems[i];
                        }
                    }

                    return item;
                }

                function createMatchRelation(matchWeight, reportTableInfo, dataTableInfo) {
                    if (dataTableInfo.matchWeight < matchWeight) {
                        //if (dataTableInfo.matchWeight) {
                        //    //解除原来的关系
                        //    //CXmlTableInfo *pOldTableInfo = pReport->XmlTableFindByName(TableName);
                        //    //grhelper.GRASSERT( pOldTableInfo );
                        //    //pOldTableInfo->self.TableName.Empty();
                        //    //dataTableInfo.reportTableInfo = ;
                        //}

                        //pTableInfo->tableName = TableName;
                        dataTableInfo.matchWeight = matchWeight;
                        dataTableInfo.reportTableInfo = reportTableInfo;
                    }
                };

                initReportTableInfos(self);

                //第一遍只匹配记录集对象，或设置了 TableName 的报表数据表
                len = reportTableInfos.length;
                len2 = dataTableInfos.length;
                for (i = 0; i < len; ++i) {
                    reportTableInfo = reportTableInfos[i];
                    reportTableInfoTableName = reportTableInfo.tableName;
                    if (reportTableInfoTableName) {
                        index = 0;
                        while (index < len2) {
                            if (dataTableInfos[index].tableName == reportTableInfoTableName)
                                break;
                            ++index;
                        }
                        if (index < len2) {
                            dataTableInfos[index].turnToFullMatched(reportTableInfo);
                            continue;
                        }
                        reportTableInfo.tableName = ""; //预设名称在XML数据表中没找到，说明预设数据无效
                    }

                    if (reportTableInfo.isRecordset) {
                        fields = reportTableInfo.object.Fields.items;
                        reportDataNames = [];
                        index = 0;
                        len2 = fields.length;
                        while (index < len2) {
                            reportDataNames.push(fields[index++].RunningDBField.toUpperCase());
                        }

                        //这里也要按增序匹配，先定义的表先进行匹配
                        reportTableMatchItems = [];
                        len2 = dataTableInfos.length;
                        index = 0;
                        while (index < len2) {
                            dataTableInfo = dataTableInfos[index++];
                            if (!dataTableInfo.isFullMatched()) {
                                matchWeight = calcMatchWeight(reportDataNames, dataTableInfo, true);

                                if (isFullMatchWeight(matchWeight)) { //完全匹配
                                    createMatchRelation(matchWeight, reportTableInfo, dataTableInfo);
                                    reportTableMatchItems = [];
                                    break;
                                }

                                (matchWeight > 0) && reportTableMatchItems.push({
                                    dataTableInfo: dataTableInfo,
                                    weight: matchWeight
                                });
                            }
                        }
                        if (reportTableMatchItems.length) {
                            index = getMaxMatchItem(reportTableMatchItems);
                            createMatchRelation(index.weight, reportTableInfo, index.dataTableInfo);
                        }
                    }
                }

                //如果表已经全部匹配，则不用进行主报表对象的匹配
                if (dataTableInfos.some(function (item) { return !item.isMatched(); })) {
                    len = reportTableInfos.length;
                    for (i = 0; i < len; ++i) {
                        reportTableInfo = reportTableInfos[i];

                        if (!reportTableInfo.isRecordset && !reportTableInfo.tableName) { //第二遍只匹配报表主对象
                            reportDataNames = buildMainFieldNames(reportTableInfo.object);

                            reportTableMatchItems = [];
                            len2 = dataTableInfos.length;
                            index = 0;
                            while (index < len2) {
                                dataTableInfo = dataTableInfos[index++];
                                if (!dataTableInfo.isFullMatched()) {
                                    matchWeight = calcMatchWeight(reportDataNames, dataTableInfo, false);

                                    if (isFullMatchWeight(matchWeight)) { //完全匹配
                                        createMatchRelation(matchWeight, reportTableInfo, dataTableInfo);
                                        reportTableMatchItems = [];
                                        break;
                                    }

                                    //如果前面匹配是明细记录，本次为主表记录，则尽量不解除原来的匹配关系
                                    reportTableInfo2 = dataTableInfo.reportTableInfo;
                                    (matchWeight > 0)
                                    && (!reportTableInfo2
                                        || (reportTableInfo2.isRecordset && reportTableInfo2.weight + 50 < matchWeight)
                                        || (!reportTableInfo2.isRecordset && reportTableInfo2.weight < matchWeight))
                                    && reportTableMatchItems.push({
                                        dataTableInfo: dataTableInfo,
                                        weight: matchWeight
                                    });
                                }
                            }

                            if (reportTableMatchItems.length) {
                                index = getMaxMatchItem(reportTableMatchItems);
                                createMatchRelation(index.weight, reportTableInfo, index.dataTableInfo);
                            }
                        }
                    }
                }

                len = dataTableInfos.length;
                i = 0;
                while (i < len) {
                    dataTableInfo = dataTableInfos[i++];
                    reportTableInfo = dataTableInfo.reportTableInfo;
                    reportTableInfo && reportTableInfo.object.attachDataTable(dataTableInfo.table);
                }
            };

            for (var tableName in tables) {
                var table = tables[tableName];

                table &&
                table instanceof Array &&
                dataTableInfos.push(new DataTableInfo(tableName, table)); //加上table判断，房子不合规的非集合数据当table对待
            }

            //数据源只有一个表，记录数多于1，且报表有明细网格，则把数据直接设置给明细记录集
            if (dataTableInfos.length === 1 && dataTableInfos[0].recordCount > 1 && self.DetailGrid) {
                self.DetailGrid.Recordset.attachDataTable(dataTableInfos[0].table);
            }
            else {
                smartMatchTables(self, dataTableInfos);
            }
        },

        attachDataTable: function (dataTable) {
            var report = this,
                record = dataTable[0], //报表主队象只应用记录集的第一条记录，通常记录集也只有一条记录
                val,
                item;

            for (var name in record) {
                val = record[name];

                //如果匹配不到同名的参数，就匹配同名的静态框与综合文本框
                item = report.ParameterByName(name);
                if (item) {
                    item.setValue(val);
                }
                else {
                    item = report.ControlByName(name);
                    //图像框的 Text 属性属于get&set类型，hasOwnProperty("Text")返回的false
                    item &&
                    (item.hasOwnProperty("Text") || item.ControlType === grenum.ControlType.PictureBox) &&
                    (item.Text = val + "");
                }
            }
        },

        prepare: function () {
            var self = this,
                printer = self.Printer,
                reportHeaders = self.ReportHeaders,
                reportFooters = self.ReportFooters;

            self._scriptFailed = 0; //指示报表脚本是否出错提示过

            self.designWidth = self.size2Pixel(
                (printer.DesignPaperOrientation === grenum.PaperOrientation.Portrait ? printer.DesignPaperWidth : printer.DesignPaperLength)
                - printer.DesignPaperLeftMargin - printer.DesignPaperRightMargin);

            self.DetailGrid && self.DetailGrid.attachData();
            reportHeaders.attachData();
            reportFooters.attachData();

            self.Parameters.prepare();
            self.DetailGrid && self.DetailGrid.prepare();
            reportHeaders.prepare();
            reportFooters.prepare();

            self._srChildren && self._srChildren.forEach(function (srChild) {
                srChild.Report.prepare();
            });

            if (!self.ownerSR &&
                self.viewer.options.singleChartFill &&
                !self.DetailGrid &&
                (reportHeaders.Count + reportFooters.Count === 1) &&
                (reportHeaders.items[0] || reportFooters.items[0]).Controls.Count === 1) {
                self.singleChart = (reportHeaders.items[0] || reportFooters.items[0]).Controls.items[0];
                if (self.singleChart.ControlType !== grenum.ControlType.Chart) {
                    delete self.singleChart;
                }
            }
        },

        unprepare: function () {
            var self = this;

            self.Parameters.unprepare();

            if (self.DetailGrid) {
                self.DetailGrid.unprepare();

                self.RunningDetailGrid = self.DetailGrid;
            }

            //self.ReportHeaders.unprepare();
            //self.ReportFooters.unprepare();

            delete self._srChildren;
            delete self._has_cb;
            delete self.singleChart;
            delete self.canvasControls;
            //delete self.events;
        },

        getUsingFont: function () {
            return this.Font.font;
        },
        getRunningColumn: function (name) {
            var RunningDetailGrid = this.RunningDetailGrid,
                columns,
                ret;

            if (name && RunningDetailGrid) {
                columns = RunningDetailGrid.Columns;
                ret = columns.itemByName(name);
                if (!ret) {
                    if (name === "(GridLeft)") {
                        ret = columns.Item(1);
                    }
                    else if (name === "(GridRight)") {
                        ret = columns.Item(columns.Count);
                    }
                }
            }
            return ret;
        },
        getReportWidth: function () { //以 pixel 为单位
            var self = this,
                RunningDetailGrid = this.RunningDetailGrid,
                ret = RunningDetailGrid ? RunningDetailGrid.width : 0;


            grhelper.GRASSERT(self.designWidth !== undefined, "designWidth property must be defined");

            //如果明细网格没定义列，则还是要按designWidth布局
            return ret > 48 ? ret : self.designWidth;
        },

        get reportFitHeight() {
            var self = this;

            return !self.RunningDetailGrid && self.viewer.options.reportFitHeight;
        },
        get reportFitWidth() {
            var viewerOption = this.viewer.options;

            return viewerOption.reportFitWidth || viewerOption.fixedHeaderFooter; //当锁定报头表尾时，必须按缩放适应方式进行宽度布局
        },
        get detailgridResize() {
            var viewerOption = this.viewer.options;

            return viewerOption.fixedHeaderFooter ? gr.enum_.detailgridResize.fitWidth : viewerOption.detailgridResize;
        },
        get fixedHeaderFooter() {
            var self = this;

            return self.DetailGrid && self.viewer.options.fixedHeaderFooter; //只有具有明细网格的报表才能锁定报头表尾
        },
        get toFillHolder() {
            var self = this;

            return self.reportFitHeight || self.singleChart;
        },
        get isDynamicSize() {
            var self = this;
                //options = self.viewer.options;

            return self.toFillHolder || self.reportFitWidth || self.detailgridResize;
        },

        //double CGRSystemVarBox::GetSystemVarAsFloat(IGridppReport *pReport, GRSystemVarType systemvar, LONG groupindex) //static
        pixel2Size: function (val) { //PixelsToUnit
            val /= 96; //dpi==96
            if (this.Unit === grenum.Unit.Cm) {
                val *= 2.54;
            }
            return val;
        },
        size2Pixel: function (val) { //UnitToPixels
            if (this.Unit === grenum.Unit.Cm) {
                val /= 2.54;
            }
            return val * 96;  //return Math.round(val * 96); //dpi==96，像素值记录为整数
        },
        cm2Size: function (cms) {  //CmToUnit
            return this.Unit === grenum.Unit.Cm ? cms : cms / 2.54;
        },

        registerCanvas: function (control, cellElement) {
            var self = this,
                canvasElement = new HtmlElement("canvas", cellElement),
                canvasID = uidCanvas();

            grhelper.GRASSERT(!self.ownerSR, "SubReport shouldn't call me");

            canvasElement.addAttribute("id", canvasID);
            if (self.isDynamicSize || !control.pxRect) {
                canvasElement.addStyle("width", "100%");
                canvasElement.addStyle("height", "100%");
                canvasElement.addStyle("display", "block");
            }
            else {
                canvasElement.addAttribute("width", Math.round(control.pxRect.Width()) + "");
                canvasElement.addAttribute("height", Math.round(control.pxRect.Height()) + "");
                //canvasElement.addAttribute("width", Math.floor(control.pxRect.Width()));
                //canvasElement.addAttribute("height", Math.floor(control.pxRect.Height()));
            }

            control.canvasID = canvasID;
            if (!self.canvasControls) {
                self.canvasControls = [];
            }
            self.canvasControls.push(control);
        },
        prepareCanvas: function () {
            var self = this,
                canvasControls = self.canvasControls,
                i = canvasControls.length,
                canvasControl;

            grhelper.GRASSERT(!self.ownerSR, "SubReport shouldn't call me");

            while (i-- > 0) {
                canvasControl = canvasControls[i];
                canvasControl.canvas = document.getElementById(canvasControl.canvasID);

                canvasControl.prepareCanvas && canvasControl.prepareCanvas();
            }
        },
        resizeCanvas: function () {
            var self = this,
                canvasControls = self.canvasControls,
                i = canvasControls.length;

            grhelper.GRASSERT(!self.ownerSR, "SubReport shouldn't call me");

            while (i-- > 0) {
                canvasControls[i].resizeCanvas();
            }
        },
        renderCanvas: function () {
            var self = this,
                canvasControls = self.canvasControls,
                i = canvasControls.length;

            grhelper.GRASSERT(!self.ownerSR, "SubReport shouldn't call me");

            while (i-- > 0) {
                canvasControls[i].drawCanvas(1);
            }
        },

        //event and script process
        executeEventScript: function (scriptText, scriptName, Sender) { //第3个参数名称必须为 Sender,对应到脚本内部的变量
            grhelper.GRASSERT(scriptText, "scriptText is empty");

            gr.script.execEvent(scriptText, scriptName, Sender, this);
        },

        fireInitialize: function () {
            var self = this;

            self.InitializeScript && self.executeEventScript(self.InitializeScript, "InitializeScript", self);

            self.OnInitialize && self.OnInitialize();
        },

        fireFetchRecord: function () {
            var self = this;

            self.FetchRecordScript && self.executeEventScript(self.FetchRecordScript, "FetchRecordScript", self.DetailGrid.Recordset);

            self.OnFetchRecord && self.OnFetchRecord();
        },

        fireBeforePostRecord: function () { //只有明细网格的记录集触发
            var self = this;

            self.OnBeforePostRecord && self.OnBeforePostRecord();
        },

        fireBeforeSort: function (SortFields, Recordset) {
            var self = this;

            self.BeforeSortScript && self.executeEventScript(self.BeforeSortScript, "BeforeSortScript", Recordset);

            //只有明细网格的记录集触发此事件
            self.OnBeforeSort
            && Recordset.isDetailGridRecordset()
            && self.OnBeforeSort();
        },

        //fireRuntimeError: function(ErrorID, ErrorMsg) {
        //    //待完成任务：整项目搜索ShowInformationMsg，确定哪些提示应该触发此事件
        //    //增加 OcurRuntimeError 函数，用于触发 _Fire_RuntimeError 
        //    g_RuntimeErrorProcessed = false;
        //    Fire_RuntimeError(ErrorID, ErrorMsg);
        //    if ( !g_RuntimeErrorProcessed )
        //        GRReuse::ShowInformationMsg(ErrorMsg);
        //},

        fireProcessBegin: function () {
            var self = this;

            self.ProcessBeginScript && self.executeEventScript(self.ProcessBeginScript, "ProcessBeginScript", self);

            self.OnProcessBegin && self.OnProcessBegin();
        },

        fireProcessEnd: function () {
            var self = this;

            self.ProcessEndScript && self.executeEventScript(self.ProcessEndScript, "ProcessEndScript", self);

            self.OnProcessEnd && self.OnProcessEnd();
        },

        fireProcessRecord: function (Recordset) {
            var self = this;

            Recordset.ProcessRecordScript && self.executeEventScript(Recordset.ProcessRecordScript, "ProcessRecordScript", Recordset);

            self.OnProcessRecord && self.OnProcessRecord();
        },

        fireGroupBegin: function (Group) {
            var self = this;

            Group.GroupBeginScript && self.executeEventScript(Group.GroupBeginScript, "GroupBeginScript", Group);

            self.OnGroupBegin && self.OnGroupBegin(Group);
        },

        fireGroupEnd: function (Group) {
            var self = this;

            Group.GroupEndScript && self.executeEventScript(Group.GroupEndScript, "GroupEndScript", Group);

            self.OnGroupEnd && self.OnGroupEnd(Group);
        },

        //fireGeneratePagesBegin: function() {
        //    Fire_GeneratePagesBegin();
        //},
        //fireGeneratePagesEnd: function() {
        //    Fire_GeneratePagesEnd();
        //},
        //firePageProcessRecord: function(Recordset) {
        //    self.executeEventScript(static_cast<CGRRecordset *>(pRecordset)->GetPageProcessRecordScript(), GRPROP_STR_PageProcessRecordScript, pRecordset);
        //    Fire_PageProcessRecord();
        //},
        //firePageStart: function() {
        //    self.executeEventScript(self.PageStartScript, GRPROP_STR_PageStartScript, NULL);
        //    Fire_PageStart();
        //},
        //firePageEnd: function() {
        //    self.executeEventScript(self.PageEndScript, GRPROP_STR_PageEndScript, NULL);
        //    Fire_PageEnd();
        //},

        fireSectionFormat: function (section) {
            var self = this;

            section.FormatScript && self.executeEventScript(section.FormatScript, "FormatScript", section);

            self.OnSectionFormat && self.OnSectionFormat(section);
        },

        fireFieldGetDisplayText: function (sender) {
            var self = this;

            sender.GetDisplayTextScript && self.executeEventScript(sender.GetDisplayTextScript, "FieldGetDisplayTextScript", sender);

            //只有明细网格的记录集的字段触发此事件
            self.OnFieldGetDisplayText
            && self.DetailGrid
            && (self.RunningDetailGrid.Recordset === sender.owner)
            && self.OnFieldGetDisplayText(sender);
        },

        fireTextBoxGetDisplayText: function (sender) {
            var self = this;

            sender.GetDisplayTextScript && self.executeEventScript(sender.GetDisplayTextScript, "TextBoxGetDisplayTextScript", sender);

            self.OnTextBoxGetDisplayText && self.OnTextBoxGetDisplayText(sender);
        },

        fireControlCustomDraw: function (sender) {
            var self = this,
                graphics = self.Graphics,
                fontWrapper = sender.Font,
                font = fontWrapper ? fontWrapper.UsingFont() : 0,
                context = new Context(sender.canvas.getContext("2d"));

            !graphics && (graphics = self.Graphics = new Graphics(self));
            graphics.attach(context);

            font && context.selectFont(font);

            sender.CustomDrawScript && self.executeEventScript(sender.CustomDrawScript, "CustomDrawScript", sender);

            self.OnControlCustomDraw && self.OnControlCustomDraw(sender, graphics);

            font && context.restoreFont();
        },

        fireChartRequestData: function (sender) {
            var self = this;

            //Fire_ChartRequestData(pSender);

            self.OnChartRequestData && self.OnChartRequestData(sender);
        },

        //firePrintBegin: function() {
        //    if ( !self.FiringCurrentEvent )
        //    {
        //        self.FiringCurrentEvent = true;

        //        self.PrintAborted = false;

        //        self.executeEventScript(self.PrintBeginScript, GRPROP_STR_PrintBeginScript, NULL);
        //        Fire_PrintBegin();

        //        self.FiringCurrentEvent = false;
        //    }
        //},
        //firePrintEnd: function() {
        //    Fire_PrintEnd();
        //    self.executeEventScript(self.PrintEndScript, GRPROP_STR_PrintEndScript, NULL);
        //},
        //firePrintPage: function(PageNo) {
        //    Fire_PrintPage(PageNo);
        //    self.executeEventScript(self.PrintPageScript, GRPROP_STR_PrintPageScript, NULL);
        //},
        //fireExportBegin: function(OptionObject) {
        //    self.ExportAborted = false;

        //    g_AppData.SetExportPathSettedByDlg( false );

        //    self.executeEventScript(self.ExportBeginScript, GRPROP_STR_ExportBeginScript, pOptionObject);

        //    Fire_ExportBegin(pOptionObject);
        //},
        //fireExportEnd: function(OptionObject) {
        //    self.executeEventScript(self.ExportEndScript, GRPROP_STR_ExportEndScript, pOptionObject);
        //    Fire_ExportEnd(pOptionObject);
        //},
        //fireShowPreviewWnd: function(PrintViewer) {
        //    self.executeEventScript(self.ShowPreviewWndScript, GRPROP_STR_ShowPreviewWndScript, pPrintViewer);
        //    Fire_ShowPreviewWnd(pPrintViewer);
        //},

        onCheckBoxClick: function (evt) {
            var self = this,
                detailgrid = self.DetailGrid,
                recordset = detailgrid.Recordset,

                cbElement = evt.target,
                cbID = cbElement.id,
                cbChecked = cbElement.checked,
                cbImageIndex = cbChecked ? -1 : -2,
                trElement = cbElement.parentNode.parentNode,

                rowInfo,
                group,
                groupBeginRecNo,
                groupEndRecNo,

                fldName,
                index,
                subCheckboxs,
                subCheckbox,
                isInContent,
                recNo;

            if (detailgrid) {
                rowInfo = detailgrid.syncTRData(trElement);

                fldName = cbElement.getAttribute(grconst.ATTR_FIELD)

                //如果关联有字段，则更新对应字段的值。如果没有，则更新对应PictureBox的ImageIndex属性
                if (fldName) {
                    recordset.Edit();
                    recordset.FieldByName(fldName).AsInteger = cbImageIndex;
                    recordset.Post();
                }
                else {
                    subCheckbox = self.report.ControlByName(cbID);
                    subCheckbox && (subCheckbox.ImageIndex = cbImageIndex);
                }

                if (group = rowInfo.group) { //groupheader or groupfooter
                    groupBeginRecNo = group.beginNoField.AsInteger;
                    groupEndRecNo = group.endNoField.AsInteger;

                    subCheckboxs = document.querySelectorAll("." + grconst.CSS_CB);
                    index = subCheckboxs.length;
                    while (index-- > 0) {
                        subCheckbox = subCheckboxs[index];
                        cbID = subCheckbox.id;
                        isInContent = cbID.substr(0, 3) === "CBC";

                        if (isInContent) {
                            recNo = +cbID.substr(3);
                            if (groupBeginRecNo <= recNo && recNo <= groupEndRecNo) {
                                subCheckbox.checked = cbChecked;

                                fldName = subCheckbox.getAttribute(grconst.ATTR_FIELD)
                                if (fldName) {
                                    recordset.MoveTo(recNo);

                                    recordset.Edit();
                                    recordset.FieldByName(fldName).AsInteger = cbImageIndex;
                                    recordset.Post();
                                }
                            }
                        }

                    };
                }
            }
        },

        get root() {
            var ret = this;

            while (ret.ownerSR) {
                ret = ret.ownerSR.report;
            }
            return ret;
        },

        //com interface
        //[propget, id(1), helpstring("property Version")] HRESULT Version([out, retval] BSTR* pVal);
        get Version() {
            return grconst.VERSION;
        },
        //[propget, id(2), helpstring("property Language")] HRESULT Language([out, retval] LONG* pVal);
        //[propput, id(2), helpstring("property Language")] HRESULT Language([in] LONG newVal);
        //Language属性不用定义
        //[propget, id(11), helpstring("property FloatControls")] HRESULT FloatControls([out, retval] IGRControls** pVal);
        get FloatControls() {
            var self = this;

            if (!self._floatControls) {
                self._floatControls = new Controls(self);
            }
            return self._floatControls;
        },
        //[propget, id(12), helpstring("property ImageList")] HRESULT ImageList([out, retval] IGRImageList** pVal);
        get ImageList() { //为接口兼容而定义
            return {};
        },
        //get Printer() {
        //    if (!self._printer) {
        //        self._printer = {
        //            DesignPaperWidth: 21.0,
        //            DesignPaperLength: 29.7,
        //            DesignPaperLeftMargin: 2.5,
        //            DesignPaperRightMargin: 2.5,
        //            DesignPaperOrientation: grenum.PaperOrientation.Portrait //"Portrait"
        //        };
        //    }
        //    return self._printer;
        //},
        //[propget, id(14), helpstring("property ParentReport")] HRESULT ParentReport([out, retval] IGridppReport** pVal);
        get ParentReport() {
            var self = this;

            return self.ownerSR ? self.ownerSR.Report : undefined;
        },
        //[propget, id(15), helpstring("property FiringReport")] HRESULT FiringReport([out, retval] IGridppReport** pVal);
        //[propget, id(16), helpstring("property Graphics")] HRESULT Graphics([out, retval] IGRGraphics** pVal);
        //[propget, id(17), helpstring("property Utility")] HRESULT Utility([out, retval] IGRUtility** pVal);
        get Utility() {
            return gr.utility;
        },

        //[propget, id(90), helpstring("property Running")] HRESULT Running([out, retval] VARIANT_BOOL* pVal);
        get Running() {
            return !!this.viewer.running;
        },
        //[propget, id(91), helpstring("property DisplayMode")] HRESULT DisplayMode([out, retval] GRReportDisplayMode* pVal);
        get DisplayMode() {
            return 1; //grrdmScreenView
        },
        //[propget, id(92), helpstring("property FirstPass")] HRESULT FirstPass([out, retval] VARIANT_BOOL* pVal);
        //[propget, id(98), helpstring("property IsBlank")] HRESULT IsBlank([out, retval] VARIANT_BOOL* pVal);
        get IsBlank() {
            var self = this;

            return self.DetailGrid && self.PageHeader && self.PageFooter &&
                !self.ReportHeaders.Count && !self.ReportFooters.Count;
        },
        //[propget, id(93), helpstring("property PageBlankHeight")] HRESULT PageBlankHeight([out, retval] DOUBLE* pVal);
        //[propget, id(94), helpstring("property HasFloatControl")] HRESULT HasFloatControl([out, retval] VARIANT_BOOL* pVal);

        ControlByName: function (name) { //如果是自由表格，其单元格的 DataName 属性也参与匹配
            var self = this,
                items,
                i,
                //len,
                group,
                control;

            function findInControls(controls) {
                var items = controls.items,
                    i = items.length,
                    control;

                function findInFreeGridCells(cells) {
                    var i,
                        control,
                        row = cells.length,
                        rowCells,
                        cell;

                    function findInFreeGridCell(cell) {
                        return cell.FreeCell ? findInControls(cell.Controls) : (cell.DataName.toUpperCase() === name ? cell : undefined);
                    }

                    while (row--) {
                        rowCells = cells[row];
                        if (rowCells) {
                            i = rowCells.length;
                            while (i--) {
                                cell = rowCells[i];
                                control = cell ? findInFreeGridCell(cell) : 0;
                                if (control) {
                                    return control;
                                }
                            }
                        }
                    }

                    return undefined;
                }

                while (i--) {
                    control = items[i];

                    if (control.Name.toUpperCase() === name) {
                        return control;
                    }

                    if (control.ControlType === grenum.ControlType.FreeGrid) {
                        control = findInFreeGridCells(control.cells);
                        if (control) {
                            return control;
                        }
                    }
                }

                return undefined;
            }
            function findInCell(cell) {
                return cell.FreeCell ? findInControls(cell.Controls) : undefined;
            }
            function findInTitleCells(titleCells) {
                var titleCell,
                    index = titleCells.items.length,
                    control;

                while (index--) {
                    titleCell = titleCells.items[index];
                    control = findInCell(titleCell);
                    if (titleCell.GroupTitle && !control) {
                        control = findInTitleCells(titleCell.SubTitles)
                    }
                    if (control) {
                        return control;
                    }
                }

                return undefined;
            }
            function findInReportSections(sections) {
                //items = self.ReportHeaders.items;
                var i = sections.length;
                while (i--) {
                    control = findInControls(sections[i].Controls);
                    if (control) {
                        return control;
                    }
                }
            }

            name = name.toUpperCase();

            control = findInReportSections(self.ReportHeaders.items) || findInReportSections(self.ReportFooters.items);
            if (control) {
                return control;
            }

            if (self.DetailGrid) {
                items = self.DetailGrid.Groups.items;
                i = items.length;
                while (i--) {
                    group = items[i];
                    control = findInControls(group.Header.Controls) || findInControls(group.Footer.Controls);
                    if (control) {
                        return control;
                    }
                }

                items = self.DetailGrid.ColumnContent.ContentCells.items;
                i = items.length;
                while (i--) {
                    control = findInCell(items[i]);
                    if (control) {
                        return control;
                    }
                }

                return findInTitleCells(self.DetailGrid.ColumnTitle.TitleCells);
            }

            return undefined;
        },
        ColumnByName: function (name) {
            var self = this;

            if (self.DetailGrid) {
                return self.DetailGrid.Columns.itemByName(name);
            }
            return undefined;
        },
        FieldByName: function (name) {
            return this.RunningFieldByName(name);
        },
        FieldByDBName: function (name) {
            var detailgrid = this.RunningDetailGrid;

            return detailgrid ? detailgrid.Recordset.FieldByDBName(name) : undefined;
        },
        ParameterByName: function (name) {
            return this.Parameters.itemByName(name);
        },
        FindFirstControl: function () {
            var self = this,
                i,
                len,
                detailGrid = self.DetailGrid,
                group,
                controls = [];
            //control;

            function concatCellControls(cell) {
                if (cell.FreeCell) {
                    controls = controls.concat(cell.Controls.items);
                }
            }
            function concatTitleCellsControls(titleCells) {
                titleCells.forEach(function (titleCell) {
                    concatCellControls(titleCell);
                    titleCell.GroupTitle && concatTitleCellsControls(titleCell.SubTitles)
                });
            }

            len = self.ReportHeaders.Count;
            for (i = 0; i < len; i++) {
                controls = controls.concat(self.ReportHeaders.items[i].Controls.items);
            }

            len = self.ReportFooters.Count;
            for (i = 0; i < len; i++) {
                controls = controls.concat(self.ReportFooters.items[i].Controls.items);
            }

            if (detailGrid) {
                len = detailGrid.Groups.Count;
                for (i = 0; i < len; i++) {
                    group = detailGrid.Groups.items[i];
                    controls = controls.concat(group.Header.Controls.items);
                    controls = controls.concat(group.Footer.Controls.items);
                }

                detailGrid.ColumnContent.ContentCells.forEach(function (contentCell) {
                    concatCellControls(contentCell);
                });
                concatTitleCellsControls(detailGrid.ColumnTitle.TitleCells);
            }

            if (controls.length > 0) {
                self.findControls = controls;
                self.findControlIndex = -1;
            }

            return self.FindNextControl();
        },
        FindNextControl: function () {
            var self = this;

            if (self.findControls) {
                ++self.findControlIndex;
                if (self.findControlIndex >= self.findControls.length) {
                    delete self.findControls;
                    delete self.findControlIndex;
                }
            }

            return self.findControls ? self.findControls[self.findControlIndex] : undefined;
        },
        RunningFieldByName: function (name) {
            var detailgrid = this.RunningDetailGrid;

            return detailgrid ? detailgrid.Recordset.FieldByName(name) : undefined;
        },

        PixelsToUnit: function (pixels) {
            return this.pixel2Size(pixels);
        },
        UnitToPixels: function (units) {
            return this.size2Pixel(units);
        },
        SystemVarValue: function (systemvar) {
            return this.SystemVarValue2(systemvar, 0);
        },
        SystemVarValue2: function (systemvar, groupindex) {
            var self = this,
                value,
                runningDetailGrid = self.RunningDetailGrid,
                recordset,
                group;

            if (systemvar === grenum.SystemVarType.CurrentDateTime) {
                value = new Date();
            }
            else if (runningDetailGrid) {
                recordset = runningDetailGrid.Recordset;

                switch (systemvar) {
                    case grenum.SystemVarType.RecordNo:
                        value = recordset.RecordNo + 1;
                        break;
                    case grenum.SystemVarType.RecordCount:
                        value = recordset.RecordCount;
                        break;
                    case grenum.SystemVarType.RowNo:
                        value = runningDetailGrid.generatingRowNo;
                        break;
                    default: //grenum.SystemVarType.GroupNo grenum.SystemVarType.GroupCount grenum.SystemVarType.GroupNo grenum.SystemVarType.GroupCount
                        group = runningDetailGrid.Groups.items[groupindex - 1];
                        if (group) {
                            if (systemvar === grenum.SystemVarType.GroupCount) {
                                value = group.recordset.RecordCount;
                            }
                            else {
                                group.inphaseByDetail(recordset.RecordNo);

                                if (systemvar === grenum.SystemVarType.GroupNo) {
                                    //如果分组记录在新增中，表示分组还在生成过程中，则取其记录个数
                                    value = group.recordset.isAppendingRecord() ? group.recordset.RecordCount : group.recordset.RecordNo;
                                }
                                else if (systemvar === grenum.SystemVarType.GroupRowNo) {
                                    value = recordset.RecordNo - group.beginNoField.Value;
                                }
                                else { //grenum.SystemVarType.GroupRowCount
                                    value = group.endNoField.Value - group.beginNoField.Value;
                                }
                                value++;
                            }
                        }
                        break;
                }
            }

            return value;
        },

        AddParameter: function (name, datatype) {
            var p = this.Parameters.Add();

            p.Name = name;
            p.DataType = datatype;

            return p;
        },
        InsertDetailGrid: function () {
            var self = this;

            if (!self.DetailGrid) {
                self.DetailGrid = new DetailGrid(self);
                self.RunningDetailGrid = self.DetailGrid;
            }
            return self.DetailGrid;
        },
        InsertPageHeader: function () { //为接口兼容而定义
            return new ReportHeader(this);
        },
        InsertPageFooter: function () { //为接口兼容而定义
            return new ReportHeader(this);
        },
        Clear: function () {
            var self = this;

            Report.call(self, self.viewer);

            self.DeleteDetailGrid();
        },
        DeleteDetailGrid: function () {
            var self = this;

            self.DetailGrid = undefined;
            self.RunningDetailGrid = undefined;
        },
        DeletePageHeader: function () { //为接口兼容而定义
        },
        DeletePageFooter: function () { //为接口兼容而定义
        },

        ////>>Load and save method
    };
    //prototypeCopyExtend(Report, Object);

    //{{END CODE}}

    gr.dom.uidCanvas = uidCanvas;

    gr.dom.FontWrapper = FontWrapper;
    gr.dom.HtmlStyles = HtmlStyles;
    gr.dom.HtmlElement = HtmlElement;

    gr.dom.Collection = Collection;
    gr.dom.Object = Object;
    gr.dom.CanvasBox = CanvasBox;
    gr.dom.DetailGrid = DetailGrid;
    gr.dom.FieldBox = FieldBox;
    gr.dom.Recordset = Recordset;

    gr.dom.Report = Report;

})();