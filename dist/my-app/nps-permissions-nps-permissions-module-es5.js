function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }

function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }

function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }

function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }

function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }

function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }

function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }

function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }

function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }

(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["nps-permissions-nps-permissions-module"], {
  /***/
  "./src/app/nps-permissions/components/approval-timeline.component.ts":
  /*!***************************************************************************!*\
    !*** ./src/app/nps-permissions/components/approval-timeline.component.ts ***!
    \***************************************************************************/

  /*! exports provided: NpsApprovalTimelineComponent */

  /***/
  function _src_app_npsPermissions_components_approvalTimelineComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsApprovalTimelineComponent", function () {
      return NpsApprovalTimelineComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_stepper__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/material/stepper */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/stepper.js");

    function NpsApprovalTimelineComponent_div_0_mat_step_2_ng_template_1_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](0);
      }

      if (rf & 2) {
        var s_r4 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]().$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate3"](" \u05E9\u05DC\u05D1 ", s_r4.stepOrder, " - ", s_r4.approverName || s_r4.approverEmployeeId, " (", s_r4.status, ") ");
      }
    }

    function NpsApprovalTimelineComponent_div_0_mat_step_2_p_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipe"](2, "date");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var s_r4 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]().$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipeBind2"](2, 1, s_r4.actionUtc, "short"));
      }
    }

    function NpsApprovalTimelineComponent_div_0_mat_step_2_p_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var s_r4 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]().$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](s_r4.comments);
      }
    }

    function NpsApprovalTimelineComponent_div_0_mat_step_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-step", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](1, NpsApprovalTimelineComponent_div_0_mat_step_2_ng_template_1_Template, 1, 3, "ng-template", 6);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsApprovalTimelineComponent_div_0_mat_step_2_p_2_Template, 3, 4, "p", 7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsApprovalTimelineComponent_div_0_mat_step_2_p_3_Template, 2, 1, "p", 7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var s_r4 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("completed", s_r4.status === "Approved")("editable", false);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", s_r4.actionUtc);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", s_r4.comments);
      }
    }

    function NpsApprovalTimelineComponent_div_0_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-vertical-stepper", 3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsApprovalTimelineComponent_div_0_mat_step_2_Template, 4, 4, "mat-step", 4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r0 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("linear", false);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx_r0.steps);
      }
    }

    function NpsApprovalTimelineComponent_ng_template_1_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D0\u05D9\u05DF \u05E9\u05DC\u05D1\u05D9\u05DD");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    var NpsApprovalTimelineComponent = /*#__PURE__*/_createClass(function NpsApprovalTimelineComponent() {
      _classCallCheck(this, NpsApprovalTimelineComponent);
    });

    NpsApprovalTimelineComponent.ɵfac = function NpsApprovalTimelineComponent_Factory(t) {
      return new (t || NpsApprovalTimelineComponent)();
    };

    NpsApprovalTimelineComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsApprovalTimelineComponent,
      selectors: [["app-nps-approval-timeline"]],
      inputs: {
        steps: "steps"
      },
      decls: 3,
      vars: 2,
      consts: [["class", "timeline-wrap", 4, "ngIf", "ngIfElse"], ["empty", ""], [1, "timeline-wrap"], [3, "linear"], [3, "completed", "editable", 4, "ngFor", "ngForOf"], [3, "completed", "editable"], ["matStepLabel", ""], [4, "ngIf"], [1, "timeline-empty"]],
      template: function NpsApprovalTimelineComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](0, NpsApprovalTimelineComponent_div_0_Template, 3, 2, "div", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](1, NpsApprovalTimelineComponent_ng_template_1_Template, 2, 0, "ng-template", null, 1, _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplateRefExtractor"]);
        }

        if (rf & 2) {
          var _r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.steps == null ? null : ctx.steps.length)("ngIfElse", _r1);
        }
      },
      directives: [_angular_common__WEBPACK_IMPORTED_MODULE_1__["NgIf"], _angular_material_stepper__WEBPACK_IMPORTED_MODULE_2__["MatVerticalStepper"], _angular_common__WEBPACK_IMPORTED_MODULE_1__["NgForOf"], _angular_material_stepper__WEBPACK_IMPORTED_MODULE_2__["MatStep"], _angular_material_stepper__WEBPACK_IMPORTED_MODULE_2__["MatStepLabel"]],
      pipes: [_angular_common__WEBPACK_IMPORTED_MODULE_1__["DatePipe"]],
      styles: [".timeline-wrap[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  border-radius: 12px;\n  padding: 10px;\n  background: var(--nps-surface);\n  box-shadow: var(--nps-shadow-soft);\n}\n\n.timeline-empty[_ngcontent-%COMP%] {\n  border: 1px dashed var(--nps-border);\n  border-radius: 12px;\n  padding: 16px;\n  background: var(--nps-surface-soft);\n  color: var(--nps-muted);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsApprovalTimelineComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-approval-timeline',
          templateUrl: './approval-timeline.component.html',
          styleUrls: ['./approval-timeline.component.scss']
        }]
      }], null, {
        steps: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"]
        }]
      });
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/components/permission-matrix.component.ts":
  /*!***************************************************************************!*\
    !*** ./src/app/nps-permissions/components/permission-matrix.component.ts ***!
    \***************************************************************************/

  /*! exports provided: NpsPermissionMatrixComponent */

  /***/
  function _src_app_npsPermissions_components_permissionMatrixComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsPermissionMatrixComponent", function () {
      return NpsPermissionMatrixComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_expansion__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/material/expansion */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/expansion.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");

    function NpsPermissionMatrixComponent_ng_container_1_mat_expansion_panel_2_div_8_Template(rf, ctx) {
      if (rf & 1) {
        var _r9 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "span");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "mat-checkbox", 12);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("change", function NpsPermissionMatrixComponent_ng_container_1_mat_expansion_panel_2_div_8_Template_mat_checkbox_change_3_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var row_r7 = ctx.$implicit;

          var ctx_r8 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](3);

          return ctx_r8.toggle(row_r7.PermissionID, $event.checked);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var row_r7 = ctx.$implicit;

        var ctx_r6 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](row_r7.PermissionName);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("checked", ctx_r6.isGranted(row_r7.PermissionID));
      }
    }

    function NpsPermissionMatrixComponent_ng_container_1_mat_expansion_panel_2_Template(rf, ctx) {
      if (rf & 1) {
        var _r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-expansion-panel", 6);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-expansion-panel-header");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-panel-title");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "div", 7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "mat-checkbox", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("change", function NpsPermissionMatrixComponent_ng_container_1_mat_expansion_panel_2_Template_mat_checkbox_change_5_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r11);

          var card_r5 = ctx.$implicit;

          var ctx_r10 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](2);

          return ctx_r10.toggleCard(card_r5, $event.checked);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](6, " \u05D1\u05D7\u05E8 \u05D4\u05DB\u05DC ");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "div", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsPermissionMatrixComponent_ng_container_1_mat_expansion_panel_2_div_8_Template, 4, 2, "div", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var card_r5 = ctx.$implicit;

        var ctx_r3 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](card_r5.ActionSubject);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("checked", ctx_r3.isCardAllSelected(card_r5))("indeterminate", ctx_r3.isCardPartiallySelected(card_r5));

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", card_r5.Permissions);
      }
    }

    function NpsPermissionMatrixComponent_ng_container_1_div_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 13);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05DC\u05D4\u05E6\u05D2\u05D4 \u05E2\u05D1\u05D5\u05E8 \u05D4\u05D4\u05E7\u05E9\u05E8 \u05E9\u05E0\u05D1\u05D7\u05E8.");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionMatrixComponent_ng_container_1_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](0);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-accordion", 3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsPermissionMatrixComponent_ng_container_1_mat_expansion_panel_2_Template, 9, 4, "mat-expansion-panel", 4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsPermissionMatrixComponent_ng_container_1_div_3_Template, 2, 0, "div", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();
      }

      if (rf & 2) {
        var ctx_r0 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx_r0.permissionCards)("ngForTrackBy", ctx_r0.trackCard);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", !(ctx_r0.permissionCards == null ? null : ctx_r0.permissionCards.length));
      }
    }

    function NpsPermissionMatrixComponent_ng_template_2_th_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 21);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D4\u05E8\u05E9\u05D0\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionMatrixComponent_ng_template_2_td_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var row_r18 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](row_r18.PermissionName);
      }
    }

    function NpsPermissionMatrixComponent_ng_template_2_th_5_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 21);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D5\u05E8\u05E9\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionMatrixComponent_ng_template_2_td_6_Template(rf, ctx) {
      if (rf & 1) {
        var _r21 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-checkbox", 12);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("change", function NpsPermissionMatrixComponent_ng_template_2_td_6_Template_mat_checkbox_change_1_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r21);

          var row_r19 = ctx.$implicit;

          var ctx_r20 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](2);

          return ctx_r20.toggle(row_r19.PermissionID, $event.checked);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var row_r19 = ctx.$implicit;

        var ctx_r15 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("checked", ctx_r15.isGranted(row_r19.PermissionID));
      }
    }

    function NpsPermissionMatrixComponent_ng_template_2_tr_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 23);
      }
    }

    function NpsPermissionMatrixComponent_ng_template_2_tr_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 24);
      }
    }

    var _c0 = function _c0() {
      return [];
    };

    function NpsPermissionMatrixComponent_ng_template_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "table", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](1, 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsPermissionMatrixComponent_ng_template_2_th_2_Template, 2, 0, "th", 16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsPermissionMatrixComponent_ng_template_2_td_3_Template, 2, 1, "td", 17);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](4, 18);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](5, NpsPermissionMatrixComponent_ng_template_2_th_5_Template, 2, 0, "th", 16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](6, NpsPermissionMatrixComponent_ng_template_2_td_6_Template, 2, 1, "td", 17);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsPermissionMatrixComponent_ng_template_2_tr_7_Template, 1, 0, "tr", 19);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsPermissionMatrixComponent_ng_template_2_tr_8_Template, 1, 0, "tr", 20);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r2 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx_r2.permissions || _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpureFunction0"](3, _c0));

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx_r2.cols);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx_r2.cols);
      }
    }

    var NpsPermissionMatrixComponent = /*#__PURE__*/function () {
      function NpsPermissionMatrixComponent() {
        _classCallCheck(this, NpsPermissionMatrixComponent);

        this.preferCards = false;
        this.matrixChange = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.cols = ['name', 'grant'];
        this.map = new Map();
      }

      return _createClass(NpsPermissionMatrixComponent, [{
        key: "ngOnChanges",
        value: function ngOnChanges(changes) {
          if (changes.profilePermissions || changes.permissionCards) {
            this.rebuildMapFromInputs();
          }
        }
      }, {
        key: "rebuildMapFromInputs",
        value: function rebuildMapFromInputs() {
          var _this = this;

          this.map.clear();

          if (this.profilePermissions && this.profilePermissions.length) {
            this.profilePermissions.forEach(function (p) {
              return _this.map.set(p.PermissionID, p.IsGranted);
            });
            return;
          }

          (this.permissionCards || []).forEach(function (card) {
            return (card.Permissions || []).forEach(function (perm) {
              return _this.map.set(perm.PermissionID, !!perm.IsGranted);
            });
          });
        }
      }, {
        key: "isGranted",
        value: function isGranted(PermissionID) {
          return !!this.map.get(PermissionID);
        }
      }, {
        key: "toggle",
        value: function toggle(PermissionID, checked) {
          this.map.set(PermissionID, checked);
          this.emitAll();
        }
      }, {
        key: "isCardAllSelected",
        value: function isCardAllSelected(card) {
          var _this2 = this;

          var rows = (card === null || card === void 0 ? void 0 : card.Permissions) || [];

          if (!rows.length) {
            return false;
          }

          return rows.every(function (row) {
            return _this2.isGranted(row.PermissionID);
          });
        }
      }, {
        key: "isCardPartiallySelected",
        value: function isCardPartiallySelected(card) {
          var _this3 = this;

          var rows = (card === null || card === void 0 ? void 0 : card.Permissions) || [];

          if (!rows.length) {
            return false;
          }

          var selectedCount = rows.reduce(function (acc, row) {
            return acc + (_this3.isGranted(row.PermissionID) ? 1 : 0);
          }, 0);
          return selectedCount > 0 && selectedCount < rows.length;
        }
      }, {
        key: "toggleCard",
        value: function toggleCard(card, checked) {
          var _this4 = this;

          var rows = (card === null || card === void 0 ? void 0 : card.Permissions) || [];
          rows.forEach(function (row) {
            return _this4.map.set(row.PermissionID, checked);
          });
          this.emitAll();
        }
      }, {
        key: "trackCard",
        value: function trackCard(index, card) {
          return "".concat(card.ActionID, "_").concat(card.ActionSubject || '', "_").concat(index);
        }
      }, {
        key: "emitAll",
        value: function emitAll() {
          var _this5 = this;

          var ids = this.permissionCards && this.permissionCards.length ? this.permissionCards.reduce(function (acc, card) {
            (card.Permissions || []).forEach(function (perm) {
              return acc.push(perm.PermissionID);
            });
            return acc;
          }, []) : (this.permissions || []).map(function (p) {
            return p.PermissionID;
          });
          var uniqueIds = Array.from(new Set(ids));
          var list = [];
          uniqueIds.forEach(function (permissionID) {
            list.push({
              PermissionID: permissionID,
              IsGranted: !!_this5.map.get(permissionID)
            });
          });
          this.matrixChange.emit(list);
        }
      }]);
    }();

    NpsPermissionMatrixComponent.ɵfac = function NpsPermissionMatrixComponent_Factory(t) {
      return new (t || NpsPermissionMatrixComponent)();
    };

    NpsPermissionMatrixComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsPermissionMatrixComponent,
      selectors: [["app-nps-permission-matrix"]],
      inputs: {
        permissions: "permissions",
        permissionCards: "permissionCards",
        profilePermissions: "profilePermissions",
        preferCards: "preferCards"
      },
      outputs: {
        matrixChange: "matrixChange"
      },
      features: [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵNgOnChangesFeature"]],
      decls: 4,
      vars: 2,
      consts: [[1, "matrix-wrap"], [4, "ngIf", "ngIfElse"], ["flatPermissionsMatrix", ""], ["multi", "true", 1, "cards-accordion"], ["class", "action-panel", 4, "ngFor", "ngForOf", "ngForTrackBy"], ["class", "cards-empty", 4, "ngIf"], [1, "action-panel"], [1, "card-select-all"], [3, "checked", "indeterminate", "change"], [1, "permission-list"], ["class", "permission-row", 4, "ngFor", "ngForOf"], [1, "permission-row"], [3, "checked", "change"], [1, "cards-empty"], ["mat-table", "", 1, "mat-elevation-z1", "full-width", 3, "dataSource"], ["matColumnDef", "name"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "grant"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsPermissionMatrixComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](1, NpsPermissionMatrixComponent_ng_container_1_Template, 4, 3, "ng-container", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsPermissionMatrixComponent_ng_template_2_Template, 9, 4, "ng-template", null, 2, _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplateRefExtractor"]);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          var _r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.preferCards || (ctx.permissionCards == null ? null : ctx.permissionCards.length))("ngIfElse", _r1);
        }
      },
      directives: [_angular_common__WEBPACK_IMPORTED_MODULE_1__["NgIf"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_2__["MatAccordion"], _angular_common__WEBPACK_IMPORTED_MODULE_1__["NgForOf"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_2__["MatExpansionPanel"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_2__["MatExpansionPanelHeader"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_2__["MatExpansionPanelTitle"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_3__["MatCheckbox"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_4__["MatRow"]],
      styles: [".matrix-wrap[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  border-radius: 12px;\n  overflow: hidden;\n  background: var(--nps-surface);\n  box-shadow: var(--nps-shadow-soft);\n}\n\n.full-width[_ngcontent-%COMP%] {\n  width: 100%;\n}\n\n.cards-accordion[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 12px;\n}\n\n.action-panel[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  border-radius: 8px;\n  box-shadow: none !important;\n}\n\n.permission-list[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 8px;\n}\n\n.permission-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  border-bottom: 1px solid var(--nps-border-soft, #ececec);\n  padding-bottom: 6px;\n}\n\n.cards-empty[_ngcontent-%COMP%] {\n  padding: 0 12px 12px;\n  color: var(--nps-text-muted, #666);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsPermissionMatrixComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-permission-matrix',
          templateUrl: './permission-matrix.component.html',
          styleUrls: ['./permission-matrix.component.scss']
        }]
      }], null, {
        permissions: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"]
        }],
        permissionCards: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"]
        }],
        profilePermissions: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"]
        }],
        preferCards: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"]
        }],
        matrixChange: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"]
        }]
      });
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/components/request-status-badge.component.ts":
  /*!******************************************************************************!*\
    !*** ./src/app/nps-permissions/components/request-status-badge.component.ts ***!
    \******************************************************************************/

  /*! exports provided: NpsRequestStatusBadgeComponent */

  /***/
  function _src_app_npsPermissions_components_requestStatusBadgeComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsRequestStatusBadgeComponent", function () {
      return NpsRequestStatusBadgeComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_material_chips__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/material/chips */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/chips.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");

    var NpsRequestStatusBadgeComponent = /*#__PURE__*/function () {
      function NpsRequestStatusBadgeComponent() {
        _classCallCheck(this, NpsRequestStatusBadgeComponent);
      }

      return _createClass(NpsRequestStatusBadgeComponent, [{
        key: "color",
        get: function get() {
          switch ((this.status || '').toLowerCase()) {
            case 'approved':
              return 'primary';

            case 'rejected':
              return 'warn';

            case 'pending':
              return 'accent';

            default:
              return undefined;
          }
        }
      }, {
        key: "statusClass",
        get: function get() {
          switch ((this.status || '').toLowerCase()) {
            case 'approved':
              return 'status-approved';

            case 'rejected':
              return 'status-rejected';

            case 'pending':
              return 'status-pending';

            default:
              return 'status-default';
          }
        }
      }]);
    }();

    NpsRequestStatusBadgeComponent.ɵfac = function NpsRequestStatusBadgeComponent_Factory(t) {
      return new (t || NpsRequestStatusBadgeComponent)();
    };

    NpsRequestStatusBadgeComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsRequestStatusBadgeComponent,
      selectors: [["app-nps-request-status-badge"]],
      inputs: {
        status: "status"
      },
      decls: 2,
      vars: 2,
      consts: [["selected", "", 1, "nps-status-chip", 3, "ngClass"]],
      template: function NpsRequestStatusBadgeComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-chip", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngClass", ctx.statusClass);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx.status || "-");
        }
      },
      directives: [_angular_material_chips__WEBPACK_IMPORTED_MODULE_1__["MatChip"], _angular_common__WEBPACK_IMPORTED_MODULE_2__["NgClass"]],
      styles: [".nps-status-chip[_ngcontent-%COMP%] {\n  font-weight: 600;\n  border-radius: 999px;\n  padding-inline: 8px;\n}\n\n.status-approved[_ngcontent-%COMP%] {\n  background: var(--nps-success-bg) !important;\n  color: var(--nps-success-text) !important;\n}\n\n.status-rejected[_ngcontent-%COMP%] {\n  background: var(--nps-danger-bg) !important;\n  color: var(--nps-danger-text) !important;\n}\n\n.status-pending[_ngcontent-%COMP%] {\n  background: var(--nps-warning-bg) !important;\n  color: var(--nps-warning-text) !important;\n}\n\n.status-default[_ngcontent-%COMP%] {\n  background: var(--nps-surface-soft) !important;\n  color: var(--nps-text) !important;\n}"],
      changeDetection: 0
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsRequestStatusBadgeComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-request-status-badge',
          templateUrl: './request-status-badge.component.html',
          styleUrls: ['./request-status-badge.component.scss'],
          changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectionStrategy"].OnPush
        }]
      }], null, {
        status: [{
          type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"]
        }]
      });
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/nps-permissions-routing.module.ts":
  /*!*******************************************************************!*\
    !*** ./src/app/nps-permissions/nps-permissions-routing.module.ts ***!
    \*******************************************************************/

  /*! exports provided: NpsPermissionsRoutingModule */

  /***/
  function _src_app_npsPermissions_npsPermissionsRoutingModuleTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsPermissionsRoutingModule", function () {
      return NpsPermissionsRoutingModule;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _pages_nps_audit_page_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ./pages/nps-audit-page.component */
    "./src/app/nps-permissions/pages/nps-audit-page.component.ts");
    /* harmony import */


    var _pages_nps_actions_page_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! ./pages/nps-actions-page.component */
    "./src/app/nps-permissions/pages/nps-actions-page.component.ts");
    /* harmony import */


    var _pages_nps_dashboard_page_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! ./pages/nps-dashboard-page.component */
    "./src/app/nps-permissions/pages/nps-dashboard-page.component.ts");
    /* harmony import */


    var _pages_nps_employee_assignments_page_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! ./pages/nps-employee-assignments-page.component */
    "./src/app/nps-permissions/pages/nps-employee-assignments-page.component.ts");
    /* harmony import */


    var _pages_nps_my_approvals_page_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! ./pages/nps-my-approvals-page.component */
    "./src/app/nps-permissions/pages/nps-my-approvals-page.component.ts");
    /* harmony import */


    var _pages_nps_my_requests_page_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! ./pages/nps-my-requests-page.component */
    "./src/app/nps-permissions/pages/nps-my-requests-page.component.ts");
    /* harmony import */


    var _pages_nps_permissions_admin_page_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! ./pages/nps-permissions-admin-page.component */
    "./src/app/nps-permissions/pages/nps-permissions-admin-page.component.ts");
    /* harmony import */


    var _pages_nps_profile_edit_page_component__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! ./pages/nps-profile-edit-page.component */
    "./src/app/nps-permissions/pages/nps-profile-edit-page.component.ts");
    /* harmony import */


    var _pages_nps_profiles_page_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! ./pages/nps-profiles-page.component */
    "./src/app/nps-permissions/pages/nps-profiles-page.component.ts");
    /* harmony import */


    var _pages_nps_request_detail_page_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! ./pages/nps-request-detail-page.component */
    "./src/app/nps-permissions/pages/nps-request-detail-page.component.ts");
    /* harmony import */


    var _pages_nps_requests_page_component__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! ./pages/nps-requests-page.component */
    "./src/app/nps-permissions/pages/nps-requests-page.component.ts");
    /* harmony import */


    var _pages_nps_rules_page_component__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! ./pages/nps-rules-page.component */
    "./src/app/nps-permissions/pages/nps-rules-page.component.ts");
    /* harmony import */


    var _nps_shell_component__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! ./nps-shell.component */
    "./src/app/nps-permissions/nps-shell.component.ts");

    var routes = [{
      path: '',
      component: _nps_shell_component__WEBPACK_IMPORTED_MODULE_14__["NpsShellComponent"],
      children: [{
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }, {
        path: 'dashboard',
        component: _pages_nps_dashboard_page_component__WEBPACK_IMPORTED_MODULE_4__["NpsDashboardPageComponent"]
      }, {
        path: 'profiles',
        component: _pages_nps_profiles_page_component__WEBPACK_IMPORTED_MODULE_10__["NpsProfilesPageComponent"]
      }, {
        path: 'profiles/new',
        component: _pages_nps_profile_edit_page_component__WEBPACK_IMPORTED_MODULE_9__["NpsProfileEditPageComponent"],
        data: {
          profileMode: 'create'
        }
      }, {
        path: 'profiles/:id/edit',
        component: _pages_nps_profile_edit_page_component__WEBPACK_IMPORTED_MODULE_9__["NpsProfileEditPageComponent"],
        data: {
          profileMode: 'edit'
        }
      }, {
        path: 'profile-rules',
        component: _pages_nps_rules_page_component__WEBPACK_IMPORTED_MODULE_13__["NpsRulesPageComponent"]
      }, {
        path: 'employee-assignments',
        component: _pages_nps_employee_assignments_page_component__WEBPACK_IMPORTED_MODULE_5__["NpsEmployeeAssignmentsPageComponent"]
      }, {
        path: 'actions',
        component: _pages_nps_actions_page_component__WEBPACK_IMPORTED_MODULE_3__["NpsActionsPageComponent"]
      }, {
        path: 'permissions',
        component: _pages_nps_permissions_admin_page_component__WEBPACK_IMPORTED_MODULE_8__["NpsPermissionsAdminPageComponent"]
      }, {
        path: 'requests',
        component: _pages_nps_requests_page_component__WEBPACK_IMPORTED_MODULE_12__["NpsRequestsPageComponent"]
      }, {
        path: 'requests/:id',
        component: _pages_nps_request_detail_page_component__WEBPACK_IMPORTED_MODULE_11__["NpsRequestDetailPageComponent"]
      }, {
        path: 'my-approvals',
        component: _pages_nps_my_approvals_page_component__WEBPACK_IMPORTED_MODULE_6__["NpsMyApprovalsPageComponent"]
      }, {
        path: 'my-requests',
        component: _pages_nps_my_requests_page_component__WEBPACK_IMPORTED_MODULE_7__["NpsMyRequestsPageComponent"]
      }, {
        path: 'audit',
        component: _pages_nps_audit_page_component__WEBPACK_IMPORTED_MODULE_2__["NpsAuditPageComponent"]
      }]
    }];

    var NpsPermissionsRoutingModule = /*#__PURE__*/_createClass(function NpsPermissionsRoutingModule() {
      _classCallCheck(this, NpsPermissionsRoutingModule);
    });

    NpsPermissionsRoutingModule.ɵmod = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineNgModule"]({
      type: NpsPermissionsRoutingModule
    });
    NpsPermissionsRoutingModule.ɵinj = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineInjector"]({
      factory: function NpsPermissionsRoutingModule_Factory(t) {
        return new (t || NpsPermissionsRoutingModule)();
      },
      imports: [[_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"].forChild(routes)], _angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]]
    });

    (function () {
      (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵsetNgModuleScope"](NpsPermissionsRoutingModule, {
        imports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]],
        exports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]]
      });
    })();
    /*@__PURE__*/


    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsPermissionsRoutingModule, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"],
        args: [{
          imports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"].forChild(routes)],
          exports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]]
        }]
      }], null, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/nps-permissions.module.ts":
  /*!***********************************************************!*\
    !*** ./src/app/nps-permissions/nps-permissions.module.ts ***!
    \***********************************************************/

  /*! exports provided: NpsPermissionsModule */

  /***/
  function _src_app_npsPermissions_npsPermissionsModuleTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsPermissionsModule", function () {
      return NpsPermissionsModule;
    });
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_material_chips__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/chips */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/chips.js");
    /* harmony import */


    var _angular_material_expansion__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/material/expansion */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/expansion.js");
    /* harmony import */


    var _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/material/autocomplete */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/autocomplete.js");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_material_list__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! @angular/material/list */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/list.js");
    /* harmony import */


    var _angular_material_select__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! @angular/material/select */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/select.js");
    /* harmony import */


    var _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! @angular/material/sidenav */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/sidenav.js");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_material_stepper__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(
    /*! @angular/material/stepper */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/stepper.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _angular_material_tabs__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(
    /*! @angular/material/tabs */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/tabs.js");
    /* harmony import */


    var _angular_material_toolbar__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(
    /*! @angular/material/toolbar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/toolbar.js");
    /* harmony import */


    var _components_approval_timeline_component__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(
    /*! ./components/approval-timeline.component */
    "./src/app/nps-permissions/components/approval-timeline.component.ts");
    /* harmony import */


    var _components_permission_matrix_component__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(
    /*! ./components/permission-matrix.component */
    "./src/app/nps-permissions/components/permission-matrix.component.ts");
    /* harmony import */


    var _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(
    /*! ./components/request-status-badge.component */
    "./src/app/nps-permissions/components/request-status-badge.component.ts");
    /* harmony import */


    var _nps_permissions_routing_module__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(
    /*! ./nps-permissions-routing.module */
    "./src/app/nps-permissions/nps-permissions-routing.module.ts");
    /* harmony import */


    var _nps_shell_component__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(
    /*! ./nps-shell.component */
    "./src/app/nps-permissions/nps-shell.component.ts");
    /* harmony import */


    var _pages_nps_audit_page_component__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(
    /*! ./pages/nps-audit-page.component */
    "./src/app/nps-permissions/pages/nps-audit-page.component.ts");
    /* harmony import */


    var _pages_nps_actions_page_component__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(
    /*! ./pages/nps-actions-page.component */
    "./src/app/nps-permissions/pages/nps-actions-page.component.ts");
    /* harmony import */


    var _pages_nps_dashboard_page_component__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(
    /*! ./pages/nps-dashboard-page.component */
    "./src/app/nps-permissions/pages/nps-dashboard-page.component.ts");
    /* harmony import */


    var _pages_nps_employee_assignments_page_component__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(
    /*! ./pages/nps-employee-assignments-page.component */
    "./src/app/nps-permissions/pages/nps-employee-assignments-page.component.ts");
    /* harmony import */


    var _pages_nps_my_approvals_page_component__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(
    /*! ./pages/nps-my-approvals-page.component */
    "./src/app/nps-permissions/pages/nps-my-approvals-page.component.ts");
    /* harmony import */


    var _pages_nps_my_requests_page_component__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(
    /*! ./pages/nps-my-requests-page.component */
    "./src/app/nps-permissions/pages/nps-my-requests-page.component.ts");
    /* harmony import */


    var _pages_nps_permissions_admin_page_component__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(
    /*! ./pages/nps-permissions-admin-page.component */
    "./src/app/nps-permissions/pages/nps-permissions-admin-page.component.ts");
    /* harmony import */


    var _pages_nps_profile_edit_page_component__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(
    /*! ./pages/nps-profile-edit-page.component */
    "./src/app/nps-permissions/pages/nps-profile-edit-page.component.ts");
    /* harmony import */


    var _pages_nps_profiles_page_component__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(
    /*! ./pages/nps-profiles-page.component */
    "./src/app/nps-permissions/pages/nps-profiles-page.component.ts");
    /* harmony import */


    var _pages_nps_request_detail_page_component__WEBPACK_IMPORTED_MODULE_34__ = __webpack_require__(
    /*! ./pages/nps-request-detail-page.component */
    "./src/app/nps-permissions/pages/nps-request-detail-page.component.ts");
    /* harmony import */


    var _pages_nps_requests_page_component__WEBPACK_IMPORTED_MODULE_35__ = __webpack_require__(
    /*! ./pages/nps-requests-page.component */
    "./src/app/nps-permissions/pages/nps-requests-page.component.ts");
    /* harmony import */


    var _pages_nps_rules_page_component__WEBPACK_IMPORTED_MODULE_36__ = __webpack_require__(
    /*! ./pages/nps-rules-page.component */
    "./src/app/nps-permissions/pages/nps-rules-page.component.ts");

    var NpsPermissionsModule = /*#__PURE__*/_createClass(function NpsPermissionsModule() {
      _classCallCheck(this, NpsPermissionsModule);
    });

    NpsPermissionsModule.ɵmod = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({
      type: NpsPermissionsModule
    });
    NpsPermissionsModule.ɵinj = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({
      factory: function NpsPermissionsModule_Factory(t) {
        return new (t || NpsPermissionsModule)();
      },
      imports: [[_angular_common__WEBPACK_IMPORTED_MODULE_0__["CommonModule"], _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormsModule"], _nps_permissions_routing_module__WEBPACK_IMPORTED_MODULE_23__["NpsPermissionsRoutingModule"], _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_14__["MatSidenavModule"], _angular_material_toolbar__WEBPACK_IMPORTED_MODULE_19__["MatToolbarModule"], _angular_material_list__WEBPACK_IMPORTED_MODULE_12__["MatListModule"], _angular_material_button__WEBPACK_IMPORTED_MODULE_3__["MatButtonModule"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardModule"], _angular_material_table__WEBPACK_IMPORTED_MODULE_17__["MatTableModule"], _angular_material_tabs__WEBPACK_IMPORTED_MODULE_18__["MatTabsModule"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__["MatFormFieldModule"], _angular_material_input__WEBPACK_IMPORTED_MODULE_11__["MatInputModule"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_8__["MatAutocompleteModule"], _angular_material_select__WEBPACK_IMPORTED_MODULE_13__["MatSelectModule"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_5__["MatCheckboxModule"], _angular_material_chips__WEBPACK_IMPORTED_MODULE_6__["MatChipsModule"], _angular_material_stepper__WEBPACK_IMPORTED_MODULE_16__["MatStepperModule"], _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_15__["MatSnackBarModule"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_10__["MatIconModule"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_7__["MatExpansionModule"]]]
    });

    (function () {
      (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](NpsPermissionsModule, {
        declarations: [_nps_shell_component__WEBPACK_IMPORTED_MODULE_24__["NpsShellComponent"], _pages_nps_dashboard_page_component__WEBPACK_IMPORTED_MODULE_27__["NpsDashboardPageComponent"], _pages_nps_profiles_page_component__WEBPACK_IMPORTED_MODULE_33__["NpsProfilesPageComponent"], _pages_nps_profile_edit_page_component__WEBPACK_IMPORTED_MODULE_32__["NpsProfileEditPageComponent"], _pages_nps_rules_page_component__WEBPACK_IMPORTED_MODULE_36__["NpsRulesPageComponent"], _pages_nps_employee_assignments_page_component__WEBPACK_IMPORTED_MODULE_28__["NpsEmployeeAssignmentsPageComponent"], _pages_nps_actions_page_component__WEBPACK_IMPORTED_MODULE_26__["NpsActionsPageComponent"], _pages_nps_permissions_admin_page_component__WEBPACK_IMPORTED_MODULE_31__["NpsPermissionsAdminPageComponent"], _pages_nps_requests_page_component__WEBPACK_IMPORTED_MODULE_35__["NpsRequestsPageComponent"], _pages_nps_request_detail_page_component__WEBPACK_IMPORTED_MODULE_34__["NpsRequestDetailPageComponent"], _pages_nps_my_approvals_page_component__WEBPACK_IMPORTED_MODULE_29__["NpsMyApprovalsPageComponent"], _pages_nps_my_requests_page_component__WEBPACK_IMPORTED_MODULE_30__["NpsMyRequestsPageComponent"], _pages_nps_audit_page_component__WEBPACK_IMPORTED_MODULE_25__["NpsAuditPageComponent"], _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_22__["NpsRequestStatusBadgeComponent"], _components_approval_timeline_component__WEBPACK_IMPORTED_MODULE_20__["NpsApprovalTimelineComponent"], _components_permission_matrix_component__WEBPACK_IMPORTED_MODULE_21__["NpsPermissionMatrixComponent"]],
        imports: [_angular_common__WEBPACK_IMPORTED_MODULE_0__["CommonModule"], _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormsModule"], _nps_permissions_routing_module__WEBPACK_IMPORTED_MODULE_23__["NpsPermissionsRoutingModule"], _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_14__["MatSidenavModule"], _angular_material_toolbar__WEBPACK_IMPORTED_MODULE_19__["MatToolbarModule"], _angular_material_list__WEBPACK_IMPORTED_MODULE_12__["MatListModule"], _angular_material_button__WEBPACK_IMPORTED_MODULE_3__["MatButtonModule"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardModule"], _angular_material_table__WEBPACK_IMPORTED_MODULE_17__["MatTableModule"], _angular_material_tabs__WEBPACK_IMPORTED_MODULE_18__["MatTabsModule"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__["MatFormFieldModule"], _angular_material_input__WEBPACK_IMPORTED_MODULE_11__["MatInputModule"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_8__["MatAutocompleteModule"], _angular_material_select__WEBPACK_IMPORTED_MODULE_13__["MatSelectModule"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_5__["MatCheckboxModule"], _angular_material_chips__WEBPACK_IMPORTED_MODULE_6__["MatChipsModule"], _angular_material_stepper__WEBPACK_IMPORTED_MODULE_16__["MatStepperModule"], _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_15__["MatSnackBarModule"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_10__["MatIconModule"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_7__["MatExpansionModule"]]
      });
    })();
    /*@__PURE__*/


    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](NpsPermissionsModule, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"],
        args: [{
          declarations: [_nps_shell_component__WEBPACK_IMPORTED_MODULE_24__["NpsShellComponent"], _pages_nps_dashboard_page_component__WEBPACK_IMPORTED_MODULE_27__["NpsDashboardPageComponent"], _pages_nps_profiles_page_component__WEBPACK_IMPORTED_MODULE_33__["NpsProfilesPageComponent"], _pages_nps_profile_edit_page_component__WEBPACK_IMPORTED_MODULE_32__["NpsProfileEditPageComponent"], _pages_nps_rules_page_component__WEBPACK_IMPORTED_MODULE_36__["NpsRulesPageComponent"], _pages_nps_employee_assignments_page_component__WEBPACK_IMPORTED_MODULE_28__["NpsEmployeeAssignmentsPageComponent"], _pages_nps_actions_page_component__WEBPACK_IMPORTED_MODULE_26__["NpsActionsPageComponent"], _pages_nps_permissions_admin_page_component__WEBPACK_IMPORTED_MODULE_31__["NpsPermissionsAdminPageComponent"], _pages_nps_requests_page_component__WEBPACK_IMPORTED_MODULE_35__["NpsRequestsPageComponent"], _pages_nps_request_detail_page_component__WEBPACK_IMPORTED_MODULE_34__["NpsRequestDetailPageComponent"], _pages_nps_my_approvals_page_component__WEBPACK_IMPORTED_MODULE_29__["NpsMyApprovalsPageComponent"], _pages_nps_my_requests_page_component__WEBPACK_IMPORTED_MODULE_30__["NpsMyRequestsPageComponent"], _pages_nps_audit_page_component__WEBPACK_IMPORTED_MODULE_25__["NpsAuditPageComponent"], _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_22__["NpsRequestStatusBadgeComponent"], _components_approval_timeline_component__WEBPACK_IMPORTED_MODULE_20__["NpsApprovalTimelineComponent"], _components_permission_matrix_component__WEBPACK_IMPORTED_MODULE_21__["NpsPermissionMatrixComponent"]],
          imports: [_angular_common__WEBPACK_IMPORTED_MODULE_0__["CommonModule"], _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormsModule"], _nps_permissions_routing_module__WEBPACK_IMPORTED_MODULE_23__["NpsPermissionsRoutingModule"], _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_14__["MatSidenavModule"], _angular_material_toolbar__WEBPACK_IMPORTED_MODULE_19__["MatToolbarModule"], _angular_material_list__WEBPACK_IMPORTED_MODULE_12__["MatListModule"], _angular_material_button__WEBPACK_IMPORTED_MODULE_3__["MatButtonModule"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardModule"], _angular_material_table__WEBPACK_IMPORTED_MODULE_17__["MatTableModule"], _angular_material_tabs__WEBPACK_IMPORTED_MODULE_18__["MatTabsModule"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__["MatFormFieldModule"], _angular_material_input__WEBPACK_IMPORTED_MODULE_11__["MatInputModule"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_8__["MatAutocompleteModule"], _angular_material_select__WEBPACK_IMPORTED_MODULE_13__["MatSelectModule"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_5__["MatCheckboxModule"], _angular_material_chips__WEBPACK_IMPORTED_MODULE_6__["MatChipsModule"], _angular_material_stepper__WEBPACK_IMPORTED_MODULE_16__["MatStepperModule"], _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_15__["MatSnackBarModule"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_10__["MatIconModule"], _angular_material_expansion__WEBPACK_IMPORTED_MODULE_7__["MatExpansionModule"]]
        }]
      }], null, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/nps-shell.component.ts":
  /*!********************************************************!*\
    !*** ./src/app/nps-permissions/nps-shell.component.ts ***!
    \********************************************************/

  /*! exports provided: NpsShellComponent */

  /***/
  function _src_app_npsPermissions_npsShellComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsShellComponent", function () {
      return NpsShellComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/material/sidenav */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/sidenav.js");
    /* harmony import */


    var _angular_cdk_bidi__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/cdk/bidi */
    "./node_modules/@angular/cdk/__ivy_ngcc__/fesm2015/bidi.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");
    /* harmony import */


    var _angular_material_list__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/list */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/list.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_toolbar__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/material/toolbar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/toolbar.js");

    var _c0 = function _c0(a0) {
      return {
        exact: a0
      };
    };

    function NpsShellComponent_a_12_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "a", 12);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-icon", 13);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "span", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var item_r1 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("routerLink", item_r1.path)("routerLinkActiveOptions", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpureFunction1"](4, _c0, !!item_r1.exact));

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](item_r1.icon);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](item_r1.label);
      }
    }

    var NpsShellComponent = /*#__PURE__*/function () {
      function NpsShellComponent(router) {
        _classCallCheck(this, NpsShellComponent);

        this.router = router;
        this.navItems = [{
          path: '/nps-permissions/dashboard',
          label: 'לוח בקרה',
          icon: 'space_dashboard',
          exact: true
        }, {
          path: '/nps-permissions/profiles',
          label: 'פרופילים',
          icon: 'badge'
        }, {
          path: '/nps-permissions/actions',
          label: 'קבוצות',
          icon: 'widgets'
        }, {
          path: '/nps-permissions/permissions',
          label: 'פעולות',
          icon: 'lock'
        }, {
          path: '/nps-permissions/profile-rules',
          label: 'כללי פרופיל',
          icon: 'rule'
        }, {
          path: '/nps-permissions/employee-assignments',
          label: 'שיוכי עובדים',
          icon: 'assignment_ind'
        }, {
          path: '/nps-permissions/requests',
          label: 'בקשות',
          icon: 'assignment'
        }, {
          path: '/nps-permissions/my-approvals',
          label: 'אישורים שלי',
          icon: 'how_to_reg'
        }, {
          path: '/nps-permissions/my-requests',
          label: 'הבקשות שלי',
          icon: 'fact_check'
        }, {
          path: '/nps-permissions/audit',
          label: 'יומן ביקורת',
          icon: 'history'
        }];
      }

      return _createClass(NpsShellComponent, [{
        key: "currentPageLabel",
        get: function get() {
          var url = this.router.url || '';
          var match = this.navItems.find(function (item) {
            return url.startsWith(item.path);
          });
          return (match === null || match === void 0 ? void 0 : match.label) || 'ניהול הרשאות NPS';
        }
      }]);
    }();

    NpsShellComponent.ɵfac = function NpsShellComponent_Factory(t) {
      return new (t || NpsShellComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_1__["Router"]));
    };

    NpsShellComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsShellComponent,
      selectors: [["app-nps-shell"]],
      decls: 25,
      vars: 2,
      consts: [["dir", "rtl", "lang", "he", 1, "nps-shell"], ["mode", "side", "opened", "", "disableClose", "", 1, "nps-nav"], [1, "nps-nav-header"], [1, "nps-nav-icon-wrap"], ["mat-list-item", "", "routerLinkActive", "active", 3, "routerLink", "routerLinkActiveOptions", 4, "ngFor", "ngForOf"], [1, "nps-topbar"], [1, "nps-topbar-title-block"], [1, "nps-topbar-title"], [1, "nps-topbar-subtitle"], [1, "spacer"], [1, "nps-topbar-chip"], [1, "nps-content"], ["mat-list-item", "", "routerLinkActive", "active", 3, "routerLink", "routerLinkActiveOptions"], ["matListItemIcon", ""], ["matListItemTitle", ""]],
      template: function NpsShellComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-sidenav-container", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-sidenav", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "div", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "div", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "mat-icon");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](5, "verified_user");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "div");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "h2");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](8, "\u05D4\u05E8\u05E9\u05D0\u05D5\u05EA NPS");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](9, "p");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](10, "\u05DE\u05E2\u05E8\u05DB\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05D0\u05D7\u05D9\u05D5\u05EA");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](11, "mat-nav-list");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](12, NpsShellComponent_a_12_Template, 5, 6, "a", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](13, "mat-sidenav-content");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "mat-toolbar", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](15, "div", 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](16, "span", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](18, "span", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](19, "Nursing Permission System");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](20, "span", 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](21, "span", 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](22, "NPS");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](23, "div", 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](24, "router-outlet");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](12);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.navItems);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx.currentPageLabel);
        }
      },
      directives: [_angular_material_sidenav__WEBPACK_IMPORTED_MODULE_2__["MatSidenavContainer"], _angular_cdk_bidi__WEBPACK_IMPORTED_MODULE_3__["Dir"], _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_2__["MatSidenav"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_4__["MatIcon"], _angular_material_list__WEBPACK_IMPORTED_MODULE_5__["MatNavList"], _angular_common__WEBPACK_IMPORTED_MODULE_6__["NgForOf"], _angular_material_sidenav__WEBPACK_IMPORTED_MODULE_2__["MatSidenavContent"], _angular_material_toolbar__WEBPACK_IMPORTED_MODULE_7__["MatToolbar"], _angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterOutlet"], _angular_material_list__WEBPACK_IMPORTED_MODULE_5__["MatListItem"], _angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterLinkWithHref"], _angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterLinkActive"]],
      styles: ["[_nghost-%COMP%] {\n  display: block;\n  direction: rtl;\n  --nps-bg: #f5f7fb;\n  --nps-surface: #ffffff;\n  --nps-surface-soft: #f8fafc;\n  --nps-border: #dbe3ef;\n  --nps-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);\n  --nps-shadow-soft: 0 4px 14px rgba(15, 23, 42, 0.05);\n  --nps-text: #1e293b;\n  --nps-muted: #64748b;\n  --nps-primary: #2563eb;\n  --nps-success-bg: #ecfdf3;\n  --nps-success-text: #166534;\n  --nps-warning-bg: #fff7ed;\n  --nps-warning-text: #9a3412;\n  --nps-danger-bg: #fef2f2;\n  --nps-danger-text: #b91c1c;\n}\n\n.nps-shell[_ngcontent-%COMP%] {\n  height: calc(100vh - 0px);\n  direction: rtl;\n  background: var(--nps-bg);\n}\n\n.nps-nav[_ngcontent-%COMP%] {\n  width: 260px;\n  border-left: 1px solid var(--nps-border);\n  background: var(--nps-surface);\n  box-shadow: var(--nps-shadow);\n}\n\n.nps-nav-header[_ngcontent-%COMP%] {\n  position: sticky;\n  top: 0;\n  z-index: 2;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 18px 16px;\n  border-bottom: 1px solid var(--nps-border);\n  background: var(--nps-surface);\n}\n\n.nps-nav-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 17px;\n  font-weight: 700;\n  color: var(--nps-text);\n}\n\n.nps-nav-header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 4px 0 0;\n  color: var(--nps-muted);\n  font-size: 12px;\n}\n\n.nps-nav-icon-wrap[_ngcontent-%COMP%] {\n  display: grid;\n  place-items: center;\n  width: 38px;\n  height: 38px;\n  border-radius: 10px;\n  color: #fff;\n  background: linear-gradient(135deg, #1d4ed8, #3b82f6);\n}\n\nmat-nav-list[_ngcontent-%COMP%] {\n  padding: 10px;\n}\n\na[mat-list-item][_ngcontent-%COMP%] {\n  margin-bottom: 4px;\n  border-radius: 10px;\n  color: var(--nps-text);\n  transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;\n}\n\na[mat-list-item][_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%] {\n  color: #94a3b8;\n}\n\na[mat-list-item][_ngcontent-%COMP%]:hover {\n  background: #eef4ff;\n  transform: translateX(-1px);\n}\n\na[mat-list-item].active[_ngcontent-%COMP%] {\n  background: #e8f0ff;\n  color: #0f4cc9;\n  font-weight: 600;\n}\n\na[mat-list-item].active[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%] {\n  color: var(--nps-primary);\n}\n\n.nps-topbar[_ngcontent-%COMP%] {\n  position: sticky;\n  top: 0;\n  z-index: 3;\n  height: 64px;\n  padding: 0 18px;\n  border-bottom: 1px solid var(--nps-border);\n  background: rgba(255, 255, 255, 0.95);\n  -webkit-backdrop-filter: blur(8px);\n          backdrop-filter: blur(8px);\n}\n\n.nps-topbar-title-block[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.nps-topbar-title[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 700;\n  color: var(--nps-text);\n  line-height: 1.1;\n}\n\n.nps-topbar-subtitle[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--nps-muted);\n}\n\n.nps-topbar-chip[_ngcontent-%COMP%] {\n  border: 1px solid #bfdbfe;\n  border-radius: 999px;\n  padding: 4px 10px;\n  color: #1d4ed8;\n  background: #eff6ff;\n  font-size: 12px;\n  font-weight: 600;\n}\n\n.nps-content[_ngcontent-%COMP%] {\n  padding: 20px;\n  max-width: 1320px;\n  margin: 0 auto;\n}\n\n.spacer[_ngcontent-%COMP%] {\n  flex: 1;\n}\n\n@media (max-width: 1100px) {\n  .nps-nav[_ngcontent-%COMP%] {\n    width: 232px;\n  }\n\n  .nps-content[_ngcontent-%COMP%] {\n    padding: 14px;\n  }\n}\n\n@media (max-width: 820px) {\n  .nps-topbar[_ngcontent-%COMP%] {\n    height: auto;\n    min-height: 58px;\n    padding: 8px 12px;\n  }\n\n  .nps-topbar-title[_ngcontent-%COMP%] {\n    font-size: 16px;\n  }\n\n  .nps-topbar-chip[_ngcontent-%COMP%] {\n    display: none;\n  }\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsShellComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-shell',
          templateUrl: './nps-shell.component.html',
          styleUrls: ['./nps-shell.component.scss']
        }]
      }], function () {
        return [{
          type: _angular_router__WEBPACK_IMPORTED_MODULE_1__["Router"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-actions-page.component.ts":
  /*!*********************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-actions-page.component.ts ***!
    \*********************************************************************/

  /*! exports provided: NpsActionsPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsActionsPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsActionsPageComponent", function () {
      return NpsActionsPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! rxjs */
    "./node_modules/rxjs/_esm2015/index.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_select__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/material/select */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/select.js");
    /* harmony import */


    var _angular_material_core__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! @angular/material/core */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");

    function NpsActionsPageComponent_mat_option_33_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var d_r16 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", d_r16.DepartnentCode);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate2"](" ", d_r16.DepartnentDescripton, " (", d_r16.DepartnentCode, ") ");
      }
    }

    function NpsActionsPageComponent_p_36_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p", 26);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" \u05E9\u05D9\u05D5\u05DA \u05E0\u05D5\u05DB\u05D7\u05D9 \u05DC\u05DE\u05D7\u05DC\u05E7\u05D4: ", ctx_r1.departmentLabel(ctx_r1.selectedDepartmentCode), " ");
      }
    }

    function NpsActionsPageComponent_th_39_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_td_40_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r17 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r17.ActionID);
      }
    }

    function NpsActionsPageComponent_th_42_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E7\u05D1\u05D5\u05E6\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_td_43_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r18 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r18.ActionSubject);
      }
    }

    function NpsActionsPageComponent_th_45_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D9\u05D5\u05DF");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_td_46_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r19 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r19.Sort);
      }
    }

    function NpsActionsPageComponent_th_48_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_td_49_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-icon", 29);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r20 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r20.IsActive ? "check_circle" : "cancel");
      }
    }

    function NpsActionsPageComponent_th_51_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E9\u05D9\u05D5\u05DA \u05DC\u05DE\u05D7\u05DC\u05E7\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_td_52_Template(rf, ctx) {
      if (rf & 1) {
        var _r23 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-checkbox", 30);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("change", function NpsActionsPageComponent_td_52_Template_mat_checkbox_change_1_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r23);

          var r_r21 = ctx.$implicit;

          var ctx_r22 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r22.toggleAttached(r_r21.ActionID, $event.checked);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r21 = ctx.$implicit;

        var ctx_r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("disabled", !ctx_r11.selectedDepartmentCode)("checked", ctx_r11.isAttached(r_r21.ActionID));
      }
    }

    function NpsActionsPageComponent_th_54_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_td_55_Template(rf, ctx) {
      if (rf & 1) {
        var _r26 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 31);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsActionsPageComponent_td_55_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r26);

          var r_r24 = ctx.$implicit;

          var ctx_r25 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r25.editAction(r_r24);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "edit");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsActionsPageComponent_tr_56_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 32);
      }
    }

    function NpsActionsPageComponent_tr_57_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 33);
      }
    }

    var NpsActionsPageComponent = /*#__PURE__*/function () {
      function NpsActionsPageComponent(api, snack) {
        _classCallCheck(this, NpsActionsPageComponent);

        this.api = api;
        this.snack = snack;
        this.actions = [];
        this.departments = [];
        this.selectedDepartmentCode = '';
        this.attachedActionIds = new Set();
        this.cols = ['ActionID', 'ActionSubject', 'Sort', 'IsActive', 'Attach', 'Actions'];
        this.form = {
          ActionID: null,
          ActionSubject: '',
          Sort: 0,
          IsActive: true
        };
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsActionsPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          this.reloadData();
        }
      }, {
        key: "reloadData",
        value: function reloadData() {
          var _this6 = this;

          Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["forkJoin"])({
            actions: this.api.getActions(this.employee_id),
            departments: this.api.getDepartments(this.employee_id)
          }).subscribe(function (_ref) {
            var actions = _ref.actions,
                departments = _ref.departments;
            _this6.actions = (actions || []).slice().sort(function (a, b) {
              var _a, _b;

              return ((_a = a.Sort) !== null && _a !== void 0 ? _a : 0) - ((_b = b.Sort) !== null && _b !== void 0 ? _b : 0) || a.ActionID - b.ActionID;
            });
            _this6.departments = departments || [];

            if (_this6.selectedDepartmentCode) {
              _this6.loadDepartmentAttachments();
            }
          });
        }
      }, {
        key: "saveAction",
        value: function saveAction() {
          var _this7 = this;

          var _a;

          var subject = (this.form.ActionSubject || '').trim();

          if (!subject) {
            this.snack.open('נא למלא שם קבוצה', 'סגור', {
              duration: 3000
            });
            return;
          }

          var body = {
            ActionSubject: subject,
            IsActive: this.form.IsActive,
            Sort: (_a = this.form.Sort) !== null && _a !== void 0 ? _a : 0
          };

          if (this.form.ActionID == null) {
            this.api.postAction(this.employee_id, body).subscribe(function () {
              _this7.snack.open('הקבוצה נוספה', 'סגור', {
                duration: 2000
              });

              _this7.resetForm();

              _this7.reloadData();
            });
            return;
          }

          this.api.putAction(this.employee_id, this.form.ActionID, body).subscribe(function () {
            _this7.snack.open('הקבוצה עודכנה', 'סגור', {
              duration: 2000
            });

            _this7.resetForm();

            _this7.reloadData();
          });
        }
      }, {
        key: "editAction",
        value: function editAction(action) {
          var _a;

          this.form = {
            ActionID: action.ActionID,
            ActionSubject: action.ActionSubject || '',
            Sort: (_a = action.Sort) !== null && _a !== void 0 ? _a : 0,
            IsActive: action.IsActive
          };
        }
      }, {
        key: "resetForm",
        value: function resetForm() {
          this.form = {
            ActionID: null,
            ActionSubject: '',
            Sort: 0,
            IsActive: true
          };
        }
      }, {
        key: "onDepartmentChange",
        value: function onDepartmentChange() {
          this.loadDepartmentAttachments();
        }
      }, {
        key: "loadDepartmentAttachments",
        value: function loadDepartmentAttachments() {
          var _this8 = this;

          if (!this.selectedDepartmentCode) {
            this.attachedActionIds = new Set();
            return;
          }

          this.api.getDepartmentActions(this.employee_id, this.selectedDepartmentCode).subscribe(function (rows) {
            _this8.attachedActionIds = new Set((rows || []).filter(function (r) {
              return r.IsActive;
            }).map(function (r) {
              return r.ActionIDFK;
            }));
          });
        }
      }, {
        key: "isAttached",
        value: function isAttached(actionId) {
          return this.attachedActionIds.has(actionId);
        }
      }, {
        key: "toggleAttached",
        value: function toggleAttached(actionId, checked) {
          if (checked) {
            this.attachedActionIds.add(actionId);
            return;
          }

          this.attachedActionIds["delete"](actionId);
        }
      }, {
        key: "saveDepartmentAttachments",
        value: function saveDepartmentAttachments() {
          var _this9 = this;

          if (!this.selectedDepartmentCode) {
            this.snack.open('בחרו מחלקה לפני שמירה', 'סגור', {
              duration: 2500
            });
            return;
          }

          var actionIds = Array.from(this.attachedActionIds.values());
          this.api.putDepartmentActions(this.employee_id, this.selectedDepartmentCode, actionIds).subscribe(function () {
            _this9.snack.open('שיוך הקבוצות למחלקה נשמר', 'סגור', {
              duration: 2000
            });

            _this9.loadDepartmentAttachments();
          });
        }
      }, {
        key: "departmentLabel",
        value: function departmentLabel(code) {
          var d = this.departments.find(function (x) {
            return x.DepartnentCode === code;
          });
          return d ? "".concat(d.DepartnentDescripton, " (").concat(d.DepartnentCode, ")") : code;
        }
      }]);
    }();

    NpsActionsPageComponent.ɵfac = function NpsActionsPageComponent_Factory(t) {
      return new (t || NpsActionsPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__["MatSnackBar"]));
    };

    NpsActionsPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsActionsPageComponent,
      selectors: [["app-nps-actions-page"]],
      decls: 58,
      vars: 12,
      consts: [[1, "form-card"], [1, "form-row"], ["appearance", "outline"], ["matInput", "", 3, "ngModel", "ngModelChange"], ["matInput", "", "type", "number", 3, "ngModel", "ngModelChange"], [3, "ngModel", "ngModelChange"], [1, "actions"], ["mat-raised-button", "", "color", "primary", 3, "click"], ["mat-button", "", "type", "button", 3, "click"], ["appearance", "outline", 1, "dept-select"], [3, "ngModel", "ngModelChange", "selectionChange"], [3, "value"], [3, "value", 4, "ngFor", "ngForOf"], ["mat-raised-button", "", "color", "accent", "type", "button", 3, "click"], ["class", "attach-hint", 4, "ngIf"], ["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "ActionID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "ActionSubject"], ["matColumnDef", "Sort"], ["matColumnDef", "IsActive"], ["matColumnDef", "Attach"], ["matColumnDef", "Actions"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], [1, "attach-hint"], ["mat-header-cell", ""], ["mat-cell", ""], ["color", "primary"], [3, "disabled", "checked", "change"], ["mat-icon-button", "", "color", "primary", 3, "click"], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsActionsPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-card", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "mat-card-title");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "mat-card-content");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "div", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "mat-form-field", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](8, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](9, "\u05E9\u05DD \u05E7\u05D1\u05D5\u05E6\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "input", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsActionsPageComponent_Template_input_ngModelChange_10_listener($event) {
            return ctx.form.ActionSubject = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](11, "mat-form-field", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](13, "\u05DE\u05D9\u05D5\u05DF");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "input", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsActionsPageComponent_Template_input_ngModelChange_14_listener($event) {
            return ctx.form.Sort = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](15, "mat-checkbox", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsActionsPageComponent_Template_mat_checkbox_ngModelChange_15_listener($event) {
            return ctx.form.IsActive = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](16, "\u05E4\u05E2\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](17, "div", 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](18, "button", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsActionsPageComponent_Template_button_click_18_listener() {
            return ctx.saveAction();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](20, "button", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsActionsPageComponent_Template_button_click_20_listener() {
            return ctx.resetForm();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](21, "\u05E0\u05E7\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](22, "mat-card", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](23, "mat-card-title");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](24, "\u05E9\u05D9\u05D5\u05DA \u05E7\u05D1\u05D5\u05E6\u05D5\u05EA \u05DC\u05DE\u05D7\u05DC\u05E7\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](25, "mat-card-content");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](26, "div", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](27, "mat-form-field", 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](28, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](29, "\u05DE\u05D7\u05DC\u05E7\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](30, "mat-select", 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsActionsPageComponent_Template_mat_select_ngModelChange_30_listener($event) {
            return ctx.selectedDepartmentCode = $event;
          })("selectionChange", function NpsActionsPageComponent_Template_mat_select_selectionChange_30_listener() {
            return ctx.onDepartmentChange();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](31, "mat-option", 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](32, "\u05D1\u05D7\u05E8\u05D5 \u05DE\u05D7\u05DC\u05E7\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](33, NpsActionsPageComponent_mat_option_33_Template, 2, 3, "mat-option", 12);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](34, "button", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsActionsPageComponent_Template_button_click_34_listener() {
            return ctx.saveDepartmentAttachments();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](35, "\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05D5\u05DB\u05D9\u05DD");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](36, NpsActionsPageComponent_p_36_Template, 2, 1, "p", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](37, "table", 15);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](38, 16);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](39, NpsActionsPageComponent_th_39_Template, 2, 0, "th", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](40, NpsActionsPageComponent_td_40_Template, 2, 1, "td", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](41, 19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](42, NpsActionsPageComponent_th_42_Template, 2, 0, "th", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](43, NpsActionsPageComponent_td_43_Template, 2, 1, "td", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](44, 20);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](45, NpsActionsPageComponent_th_45_Template, 2, 0, "th", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](46, NpsActionsPageComponent_td_46_Template, 2, 1, "td", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](47, 21);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](48, NpsActionsPageComponent_th_48_Template, 2, 0, "th", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](49, NpsActionsPageComponent_td_49_Template, 3, 1, "td", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](50, 22);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](51, NpsActionsPageComponent_th_51_Template, 2, 0, "th", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](52, NpsActionsPageComponent_td_52_Template, 2, 2, "td", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](53, 23);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](54, NpsActionsPageComponent_th_54_Template, 2, 0, "th", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](55, NpsActionsPageComponent_td_55_Template, 4, 0, "td", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](56, NpsActionsPageComponent_tr_56_Template, 1, 0, "tr", 24);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](57, NpsActionsPageComponent_tr_57_Template, 1, 0, "tr", 25);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx.form.ActionID == null ? "\u05E7\u05D1\u05D5\u05E6\u05D4 \u05D7\u05D3\u05E9\u05D4" : "\u05E2\u05E8\u05D9\u05DB\u05EA \u05E7\u05D1\u05D5\u05E6\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.ActionSubject);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.Sort);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.IsActive);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx.form.ActionID == null ? "\u05D4\u05D5\u05E1\u05E3 \u05E7\u05D1\u05D5\u05E6\u05D4" : "\u05E9\u05DE\u05D5\u05E8 \u05E7\u05D1\u05D5\u05E6\u05D4", " ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.selectedDepartmentCode);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", "");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.departments);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.selectedDepartmentCode);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.actions);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCard"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardTitle"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardContent"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_5__["MatFormField"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_5__["MatLabel"], _angular_material_input__WEBPACK_IMPORTED_MODULE_6__["MatInput"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["DefaultValueAccessor"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["NgControlStatus"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["NgModel"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["NumberValueAccessor"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_8__["MatCheckbox"], _angular_material_button__WEBPACK_IMPORTED_MODULE_9__["MatButton"], _angular_material_select__WEBPACK_IMPORTED_MODULE_10__["MatSelect"], _angular_material_core__WEBPACK_IMPORTED_MODULE_11__["MatOption"], _angular_common__WEBPACK_IMPORTED_MODULE_12__["NgForOf"], _angular_common__WEBPACK_IMPORTED_MODULE_12__["NgIf"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatCell"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatRow"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.form-card[_ngcontent-%COMP%] {\n  margin-bottom: 12px;\n}\n\n.form-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 12px;\n}\n\n.dept-select[_ngcontent-%COMP%] {\n  min-width: 320px;\n}\n\n.actions[_ngcontent-%COMP%] {\n  margin-top: 8px;\n}\n\n.attach-hint[_ngcontent-%COMP%] {\n  margin-top: 10px;\n  color: var(--nps-text-muted, #666);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsActionsPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-actions-page',
          templateUrl: './nps-actions-page.component.html',
          styleUrls: ['./nps-actions-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]
        }, {
          type: _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__["MatSnackBar"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-audit-page.component.ts":
  /*!*******************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-audit-page.component.ts ***!
    \*******************************************************************/

  /*! exports provided: NpsAuditPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsAuditPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsAuditPageComponent", function () {
      return NpsAuditPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");

    function NpsAuditPageComponent_th_4_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsAuditPageComponent_td_5_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r12 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r12.AuditID);
      }
    }

    function NpsAuditPageComponent_th_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D1\u05E6\u05E2");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsAuditPageComponent_td_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r13 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r13.ActorEmployeeID);
      }
    }

    function NpsAuditPageComponent_th_10_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsAuditPageComponent_td_11_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r14 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r14.ActionCode);
      }
    }

    function NpsAuditPageComponent_th_13_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D9\u05E9\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsAuditPageComponent_td_14_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r15 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate2"]("", r_r15.EntityType, " ", r_r15.EntityID, "");
      }
    }

    function NpsAuditPageComponent_th_16_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D5\u05E2\u05D3");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsAuditPageComponent_td_17_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipe"](2, "date");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r16 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipeBind2"](2, 1, r_r16.CreatedUTC, "short"));
      }
    }

    function NpsAuditPageComponent_tr_18_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 12);
      }
    }

    function NpsAuditPageComponent_tr_19_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 13);
      }
    }

    var NpsAuditPageComponent = /*#__PURE__*/function () {
      function NpsAuditPageComponent(api) {
        _classCallCheck(this, NpsAuditPageComponent);

        this.api = api;
        this.rows = [];
        this.cols = ['AuditID', 'ActorEmployeeID', 'ActionCode', 'EntityType', 'CreatedUTC'];
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsAuditPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this10 = this;

          this.api.getAudit(this.employee_id || '', '', 0, 200).subscribe(function (r) {
            return _this10.rows = r;
          });
        }
      }]);
    }();

    NpsAuditPageComponent.ɵfac = function NpsAuditPageComponent_Factory(t) {
      return new (t || NpsAuditPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]));
    };

    NpsAuditPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsAuditPageComponent,
      selectors: [["app-nps-audit-page"]],
      decls: 20,
      vars: 3,
      consts: [["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "AuditID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "ActorEmployeeID"], ["matColumnDef", "ActionCode"], ["matColumnDef", "EntityType"], ["matColumnDef", "CreatedUTC"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsAuditPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D9\u05D5\u05DE\u05DF \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "table", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](3, 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](4, NpsAuditPageComponent_th_4_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](5, NpsAuditPageComponent_td_5_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](6, 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsAuditPageComponent_th_7_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsAuditPageComponent_td_8_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](9, 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](10, NpsAuditPageComponent_th_10_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](11, NpsAuditPageComponent_td_11_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](12, 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](13, NpsAuditPageComponent_th_13_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](14, NpsAuditPageComponent_td_14_Template, 2, 2, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](15, 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](16, NpsAuditPageComponent_th_16_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](17, NpsAuditPageComponent_td_17_Template, 3, 4, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](18, NpsAuditPageComponent_tr_18_Template, 1, 0, "tr", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](19, NpsAuditPageComponent_tr_19_Template, 1, 0, "tr", 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.rows);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](16);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_2__["MatRow"]],
      pipes: [_angular_common__WEBPACK_IMPORTED_MODULE_3__["DatePipe"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.full[_ngcontent-%COMP%] {\n  width: 100%;\n  border-radius: 12px;\n  overflow: hidden;\n}\n\n.nps-table[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  box-shadow: var(--nps-shadow-soft);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsAuditPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-audit-page',
          templateUrl: './nps-audit-page.component.html',
          styleUrls: ['./nps-audit-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-dashboard-page.component.ts":
  /*!***********************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-dashboard-page.component.ts ***!
    \***********************************************************************/

  /*! exports provided: NpsDashboardPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsDashboardPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsDashboardPageComponent", function () {
      return NpsDashboardPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");

    function NpsDashboardPageComponent_div_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-card", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-card-title");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "\u05EA\u05D5\u05E8 \u05DE\u05D7\u05DC\u05E7\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "mat-card-content");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "mat-card", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "mat-card-title");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](8, "\u05D1\u05E7\u05E9\u05D5\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](9, "mat-card-content");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](11, "mat-card", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "mat-card-title");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](13, "\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05E9\u05DC\u05D9");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "mat-card-content");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](16, "mat-card", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](17, "mat-card-title");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](18, "\u05D4\u05D1\u05E7\u05E9\u05D5\u05EA \u05E9\u05DC\u05D9");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](19, "mat-card-content");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](20);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r0 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r0.summary.pendingQueueCount);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r0.summary.pendingRequestsCount);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r0.summary.myPendingApprovalsCount);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r0.summary.myPendingRequestsCount);
      }
    }

    function NpsDashboardPageComponent_p_6_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p", 6);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r1.queueMsg);
      }
    }

    var NpsDashboardPageComponent = /*#__PURE__*/function () {
      function NpsDashboardPageComponent(api) {
        _classCallCheck(this, NpsDashboardPageComponent);

        this.api = api;
        this.busy = false;
        this.queueMsg = '';
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsDashboardPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this11 = this;

          this.api.getDashboardSummary(this.employee_id || '').subscribe(function (s) {
            return _this11.summary = s;
          });
        }
      }, {
        key: "runQueue",
        value: function runQueue() {
          var _this12 = this;

          this.busy = true;
          this.api.processQueue(this.employee_id || '', 50).subscribe(function (r) {
            _this12.queueMsg = JSON.stringify(r);
            _this12.busy = false;

            _this12.api.getDashboardSummary(_this12.employee_id || '').subscribe(function (s) {
              return _this12.summary = s;
            });
          }, function () {
            return _this12.busy = false;
          });
        }
      }]);
    }();

    NpsDashboardPageComponent.ɵfac = function NpsDashboardPageComponent_Factory(t) {
      return new (t || NpsDashboardPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]));
    };

    NpsDashboardPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsDashboardPageComponent,
      selectors: [["app-nps-dashboard-page"]],
      decls: 7,
      vars: 3,
      consts: [["class", "grid", 4, "ngIf"], [1, "actions"], ["mat-raised-button", "", "color", "primary", 3, "disabled", "click"], ["class", "queue-msg", 4, "ngIf"], [1, "grid"], [1, "kpi-card"], [1, "queue-msg"]],
      template: function NpsDashboardPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DC\u05D5\u05D7 \u05D1\u05E7\u05E8\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsDashboardPageComponent_div_2_Template, 21, 4, "div", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "div", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "button", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsDashboardPageComponent_Template_button_click_4_listener() {
            return ctx.runQueue();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](5, "\u05E2\u05D9\u05D1\u05D5\u05D3 \u05EA\u05D5\u05E8");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](6, NpsDashboardPageComponent_p_6_Template, 2, 1, "p", 3);
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.summary);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("disabled", ctx.busy);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.queueMsg);
        }
      },
      directives: [_angular_common__WEBPACK_IMPORTED_MODULE_2__["NgIf"], _angular_material_button__WEBPACK_IMPORTED_MODULE_3__["MatButton"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCard"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardTitle"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardContent"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: 16px;\n  margin-bottom: 16px;\n}\n\n.kpi-card[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  border-radius: 12px;\n  box-shadow: var(--nps-shadow-soft);\n}\n\n.kpi-card[_ngcontent-%COMP%]   mat-card-title[_ngcontent-%COMP%] {\n  color: var(--nps-muted);\n  font-size: 14px;\n}\n\n.kpi-card[_ngcontent-%COMP%]   mat-card-content[_ngcontent-%COMP%] {\n  font-size: 28px;\n  font-weight: 700;\n  color: var(--nps-text);\n}\n\n.actions[_ngcontent-%COMP%] {\n  margin-top: 8px;\n}\n\n.queue-msg[_ngcontent-%COMP%] {\n  margin-top: 10px;\n  color: var(--nps-muted);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsDashboardPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-dashboard-page',
          templateUrl: './nps-dashboard-page.component.html',
          styleUrls: ['./nps-dashboard-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-employee-assignments-page.component.ts":
  /*!**********************************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-employee-assignments-page.component.ts ***!
    \**********************************************************************************/

  /*! exports provided: NpsEmployeeAssignmentsPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsEmployeeAssignmentsPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsEmployeeAssignmentsPageComponent", function () {
      return NpsEmployeeAssignmentsPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! @angular/material/autocomplete */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/autocomplete.js");
    /* harmony import */


    var _angular_material_select__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! @angular/material/select */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/select.js");
    /* harmony import */


    var _angular_material_core__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! @angular/material/core */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");

    function NpsEmployeeAssignmentsPageComponent_div_18_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 20);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D8\u05D5\u05E2\u05DF\u2026");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D6\u05D4\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r27 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r27.assignmentId);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_5_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E2\u05D5\u05D1\u05D3");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_6_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r28 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r28.employeeId);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_9_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r29 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r29.ProfileName || r_r29.ProfileID);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_11_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DB\u05DC\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_12_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r30 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r30.ruleId != null ? r_r30.ruleId : "\u2014");
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_14_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D1\u05E7\u05E9\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_15_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r31 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r31.sourceRequestID != null ? r_r31.sourceRequestID : "\u2014");
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_17_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E0\u05D5\u05DB\u05D7\u05D9");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_18_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r32 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r32.isActive ? "\u05DB\u05DF" : "\u05DC\u05D0");
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_20_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E1\u05D8\u05D8\u05D5\u05E1");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_21_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r33 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r33.assignmentStatus || "\u2014");
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_23_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05EA\u05D0\u05E8\u05D9\u05DA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_24_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipe"](2, "date");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r34 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipeBind2"](2, 1, r_r34.effectiveFromUtc, "short"));
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_th_26_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 35);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E2\u05D3 \u05EA\u05D0\u05E8\u05D9\u05DA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_td_27_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 36);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipe"](2, "date");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r35 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r35.effectiveToUtc ? _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵpipeBind2"](2, 1, r_r35.effectiveToUtc, "short") : "\u2014");
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_tr_28_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 37);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_tr_29_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 38);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_table_19_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "table", 21);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](1, 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsEmployeeAssignmentsPageComponent_table_19_th_2_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsEmployeeAssignmentsPageComponent_table_19_td_3_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](4, 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](5, NpsEmployeeAssignmentsPageComponent_table_19_th_5_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](6, NpsEmployeeAssignmentsPageComponent_table_19_td_6_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](7, 26);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsEmployeeAssignmentsPageComponent_table_19_th_8_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](9, NpsEmployeeAssignmentsPageComponent_table_19_td_9_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](10, 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](11, NpsEmployeeAssignmentsPageComponent_table_19_th_11_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](12, NpsEmployeeAssignmentsPageComponent_table_19_td_12_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](13, 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](14, NpsEmployeeAssignmentsPageComponent_table_19_th_14_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](15, NpsEmployeeAssignmentsPageComponent_table_19_td_15_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](16, 29);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](17, NpsEmployeeAssignmentsPageComponent_table_19_th_17_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](18, NpsEmployeeAssignmentsPageComponent_table_19_td_18_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](19, 30);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](20, NpsEmployeeAssignmentsPageComponent_table_19_th_20_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](21, NpsEmployeeAssignmentsPageComponent_table_19_td_21_Template, 2, 1, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](22, 31);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](23, NpsEmployeeAssignmentsPageComponent_table_19_th_23_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](24, NpsEmployeeAssignmentsPageComponent_table_19_td_24_Template, 3, 4, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](25, 32);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](26, NpsEmployeeAssignmentsPageComponent_table_19_th_26_Template, 2, 0, "th", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](27, NpsEmployeeAssignmentsPageComponent_table_19_td_27_Template, 3, 4, "td", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](28, NpsEmployeeAssignmentsPageComponent_table_19_tr_28_Template, 1, 0, "tr", 33);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](29, NpsEmployeeAssignmentsPageComponent_table_19_tr_29_Template, 1, 0, "tr", 34);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx_r1.assignments);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx_r1.cols);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx_r1.cols);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_p_20_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p", 39);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D0\u05D9\u05DF \u05E8\u05E9\u05D5\u05DE\u05D5\u05EA \u05DC\u05D4\u05E6\u05D2\u05D4 \u05D0\u05D5 \u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05E6\u05E4\u05D5\u05EA \u05D1\u05E8\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D2\u05DC\u05D5\u05D1\u05DC\u05D9\u05EA.");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsEmployeeAssignmentsPageComponent_mat_option_36_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 18);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var e_r37 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", e_r37);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate3"](" ", e_r37.FirstName, " ", e_r37.LastName, " (", e_r37.EmployeeID, ") ");
      }
    }

    function NpsEmployeeAssignmentsPageComponent_mat_option_41_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 18);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var p_r38 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", p_r38.ProfileID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](p_r38.ProfileName);
      }
    }

    function NpsEmployeeAssignmentsPageComponent_mat_option_48_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 18);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r39 = ctx.$implicit;

        var ctx_r6 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", r_r39.RuleID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r6.ruleOptionLabel(r_r39));
      }
    }

    var NpsEmployeeAssignmentsPageComponent = /*#__PURE__*/function () {
      function NpsEmployeeAssignmentsPageComponent(api, snack) {
        _classCallCheck(this, NpsEmployeeAssignmentsPageComponent);

        this.api = api;
        this.snack = snack;
        this.assignments = [];
        this.cols = ['assignmentId', 'employeeId', 'profile', 'ruleId', 'requestId', 'current', 'status', 'from', 'to'];
        this.activeOnly = false;
        this.busy = false;
        this.profiles = [];
        this.allRuleRows = [];
        this.formEmployeeId = null;
        this.formEmployeeInput = '';
        this.formProfileId = null;
        /** null = פרופיל בלבד (ללא RuleID); אחרת מזהה כלל מ־EP_NursePermissionProfileRules */

        this.formRuleId = null;
        this.employeeSearchRows = [];
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsEmployeeAssignmentsPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this13 = this;

          this.reloadList();
          this.api.getProfiles(this.employee_id).subscribe(function (p) {
            return _this13.profiles = p;
          });
          this.api.getProfileRules(this.employee_id).subscribe(function (r) {
            return _this13.allRuleRows = r;
          });
        }
      }, {
        key: "reloadList",
        value: function reloadList() {
          var _this14 = this;

          this.busy = true;
          this.api.getAssignments(this.employee_id, undefined, this.activeOnly).subscribe(function (rows) {
            _this14.assignments = rows || [];
            _this14.busy = false;
          }, function () {
            _this14.busy = false;
            _this14.assignments = [];

            _this14.snack.open('לא ניתן לטעון את הרשימה (דרושה הרשאת מנהל כללית)', 'סגור', {
              duration: 4000
            });
          });
        }
      }, {
        key: "rulesForSelectedProfile",
        value: function rulesForSelectedProfile() {
          var pid = this.formProfileId;

          if (pid == null) {
            return [];
          }

          var m = new Map();

          var _iterator = _createForOfIteratorHelper(this.allRuleRows),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var row = _step.value;
              var rid = row.RuleID;

              if (row.ProfileID === pid && rid != null && !m.has(rid)) {
                m.set(rid, row);
              }
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }

          return Array.from(m.values()).sort(function (a, b) {
            return (a.RuleID || 0) - (b.RuleID || 0);
          });
        }
      }, {
        key: "ruleOptionLabel",
        value: function ruleOptionLabel(r) {
          var edu = r.EducationID != null && String(r.EducationID) !== '' ? "\u05D4\u05E9\u05DB\u05DC\u05D4:".concat(r.EducationID) : 'כללי';
          var spec = r.SpecialtyID != null && String(r.SpecialtyID) !== '' ? "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA:".concat(r.SpecialtyID) : '';
          var parts = [r.RuleID != null ? "#".concat(r.RuleID) : '', r.DepartnentCode || '', edu, spec].filter(Boolean);
          return parts.join(' · ') || "\u05DB\u05DC\u05DC ".concat(r.RuleID);
        }
      }, {
        key: "onEmployeeInput",
        value: function onEmployeeInput() {
          var _this15 = this;

          var t = (this.formEmployeeInput || '').trim();

          if (t.length < 2) {
            this.employeeSearchRows = [];

            if (!t) {
              this.formEmployeeId = null;
            }

            return;
          }

          this.api.getEmployees(this.employee_id, t, '', 0, 30).subscribe(function (rows) {
            return _this15.employeeSearchRows = rows;
          });
        }
      }, {
        key: "selectEmployee",
        value: function selectEmployee(e) {
          this.formEmployeeId = e.EmployeeID;
          this.formEmployeeInput = "".concat(e.FirstName, " ").concat(e.LastName, " (#").concat(e.EmployeeID, ")");
          this.employeeSearchRows = [];
        }
      }, {
        key: "onProfileChange",
        value: function onProfileChange() {
          this.formRuleId = null;
        }
      }, {
        key: "submitApply",
        value: function submitApply() {
          var _this16 = this;

          if (this.formEmployeeId == null || this.formProfileId == null) {
            this.snack.open('בחרו עובד ופרופיל', 'סגור', {
              duration: 2500
            });
            return;
          }

          this.busy = true;
          this.api.applyEmployeeProfileAssignment(this.employee_id, {
            employeeId: this.formEmployeeId,
            profileId: this.formProfileId,
            ruleId: this.formRuleId
          }).subscribe(function () {
            _this16.snack.open('השיוך עודכן', 'סגור', {
              duration: 2000
            });

            _this16.busy = false;

            _this16.reloadList();
          }, function () {
            _this16.busy = false;

            _this16.snack.open('שמירה נכשלה (בדקו התאמת פרופיל–כלל או הרשאות)', 'סגור', {
              duration: 4500
            });
          });
        }
      }]);
    }();

    NpsEmployeeAssignmentsPageComponent.ɵfac = function NpsEmployeeAssignmentsPageComponent_Factory(t) {
      return new (t || NpsEmployeeAssignmentsPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_2__["MatSnackBar"]));
    };

    NpsEmployeeAssignmentsPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsEmployeeAssignmentsPageComponent,
      selectors: [["app-nps-employee-assignments-page"]],
      decls: 52,
      vars: 15,
      consts: [[1, "page-intro"], [1, "toolbar-card"], [1, "toolbar-row"], [3, "ngModel", "ngModelChange", "change"], ["mat-stroked-button", "", "type", "button", 3, "disabled", "click"], ["class", "loading-hint", 4, "ngIf"], ["mat-table", "", "class", "mat-elevation-z2 full-table", 3, "dataSource", 4, "ngIf"], ["class", "empty-hint", 4, "ngIf"], [1, "form-card"], [1, "form-hint"], ["appearance", "outline", 1, "wide"], ["matInput", "", "placeholder", "\u05E9\u05DD \u05D0\u05D5 \u05DE\u05D6\u05D4\u05D4\u2026", 3, "ngModel", "matAutocomplete", "ngModelChange"], [3, "optionSelected"], ["empAuto", "matAutocomplete"], [3, "value", 4, "ngFor", "ngForOf"], ["appearance", "outline"], ["placeholder", "\u05D1\u05D7\u05E8\u05D5", 3, "ngModel", "ngModelChange"], [3, "ngModel", "disabled", "ngModelChange"], [3, "value"], ["mat-raised-button", "", "color", "primary", "type", "button", 3, "disabled", "click"], [1, "loading-hint"], ["mat-table", "", 1, "mat-elevation-z2", "full-table", 3, "dataSource"], ["matColumnDef", "assignmentId"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "employeeId"], ["matColumnDef", "profile"], ["matColumnDef", "ruleId"], ["matColumnDef", "requestId"], ["matColumnDef", "current"], ["matColumnDef", "status"], ["matColumnDef", "from"], ["matColumnDef", "to"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-header-row", ""], ["mat-row", ""], [1, "empty-hint"]],
      template: function NpsEmployeeAssignmentsPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E9\u05D9\u05D5\u05DB\u05D9 \u05E2\u05D5\u05D1\u05D3\u05D9\u05DD \u05DC\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D5\u05DC\u05DB\u05DC\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "p", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, " \u05E8\u05E9\u05D9\u05DE\u05EA \u05E9\u05D5\u05E8\u05D5\u05EA \u05DE\u05BE");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "code");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](5, "EP_NursePermissionEmployeeProfileAssignments");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](6, ". \u05D4\u05D7\u05DC\u05EA \u05E9\u05D9\u05D5\u05DA \u05D7\u05D3\u05E9\u05D4 \u05E1\u05D5\u05D2\u05E8\u05EA \u05D0\u05EA \u05D4\u05E9\u05D9\u05D5\u05DA \u05D4\u05E4\u05E2\u05D9\u05DC \u05D4\u05E7\u05D5\u05D3\u05DD \u05DC\u05E2\u05D5\u05D1\u05D3 \u05D5\u05DE\u05D5\u05E1\u05D9\u05E4\u05D4 \u05E9\u05D5\u05E8\u05D4 \u05D7\u05D3\u05E9\u05D4 (\u05DB\u05DE\u05D5 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05E7\u05E9\u05D4), \u05DC\u05E4\u05D9 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D5\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9\u05EA \u05DC\u05E4\u05D9 \u05DB\u05DC\u05DC \u05DE\u05BE ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "code");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](8, "EP_NursePermissionProfileRules");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](9, ".\n");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "mat-card", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](11, "mat-card-content", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "mat-checkbox", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsEmployeeAssignmentsPageComponent_Template_mat_checkbox_ngModelChange_12_listener($event) {
            return ctx.activeOnly = $event;
          })("change", function NpsEmployeeAssignmentsPageComponent_Template_mat_checkbox_change_12_listener() {
            return ctx.reloadList();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](13, "\u05E8\u05E7 \u05E9\u05D9\u05D5\u05DB\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD (IsCurrent)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "button", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsEmployeeAssignmentsPageComponent_Template_button_click_14_listener() {
            return ctx.reloadList();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](15, "mat-icon");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](16, "refresh");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](17, " \u05E8\u05E2\u05E0\u05DF ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](18, NpsEmployeeAssignmentsPageComponent_div_18_Template, 2, 0, "div", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](19, NpsEmployeeAssignmentsPageComponent_table_19_Template, 30, 3, "table", 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](20, NpsEmployeeAssignmentsPageComponent_p_20_Template, 2, 0, "p", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](21, "mat-card", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](22, "mat-card-title");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](23, "\u05D4\u05D7\u05DC\u05EA \u05E9\u05D9\u05D5\u05DA (\u05DE\u05E0\u05D4\u05DC)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](24, "mat-card-content");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](25, "p", 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](26, "\u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05DE\u05D7\u05DC\u05D9\u05E4\u05D4 \u05D0\u05EA \u05D4\u05E9\u05D9\u05D5\u05DA ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](27, "strong");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](28, "\u05D4\u05E4\u05E2\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](29, " \u05E9\u05DC \u05D4\u05E2\u05D5\u05D1\u05D3. \u05D0\u05DD \u05E0\u05D1\u05D7\u05E8 \u05DB\u05DC\u05DC \u2014 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05E9\u05E0\u05D1\u05D7\u05E8.");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](30, "mat-form-field", 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](31, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](32, "\u05D7\u05D9\u05E4\u05D5\u05E9 \u05E2\u05D5\u05D1\u05D3");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](33, "input", 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsEmployeeAssignmentsPageComponent_Template_input_ngModelChange_33_listener($event) {
            return ctx.formEmployeeInput = $event;
          })("ngModelChange", function NpsEmployeeAssignmentsPageComponent_Template_input_ngModelChange_33_listener() {
            return ctx.onEmployeeInput();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](34, "mat-autocomplete", 12, 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("optionSelected", function NpsEmployeeAssignmentsPageComponent_Template_mat_autocomplete_optionSelected_34_listener($event) {
            return ctx.selectEmployee($event.option.value);
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](36, NpsEmployeeAssignmentsPageComponent_mat_option_36_Template, 2, 4, "mat-option", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](37, "mat-form-field", 15);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](38, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](39, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](40, "mat-select", 16);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsEmployeeAssignmentsPageComponent_Template_mat_select_ngModelChange_40_listener($event) {
            return ctx.formProfileId = $event;
          })("ngModelChange", function NpsEmployeeAssignmentsPageComponent_Template_mat_select_ngModelChange_40_listener() {
            return ctx.onProfileChange();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](41, NpsEmployeeAssignmentsPageComponent_mat_option_41_Template, 2, 2, "mat-option", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](42, "mat-form-field", 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](43, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](44, "\u05DB\u05DC\u05DC (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](45, "mat-select", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsEmployeeAssignmentsPageComponent_Template_mat_select_ngModelChange_45_listener($event) {
            return ctx.formRuleId = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](46, "mat-option", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](47, "\u05DC\u05DC\u05D0 \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05DB\u05DC\u05DC (RuleID \u05E8\u05D9\u05E7)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](48, NpsEmployeeAssignmentsPageComponent_mat_option_48_Template, 2, 2, "mat-option", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](49, "div");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](50, "button", 19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsEmployeeAssignmentsPageComponent_Template_button_click_50_listener() {
            return ctx.submitApply();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](51, " \u05D4\u05D7\u05DC \u05E9\u05D9\u05D5\u05DA ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          var _r3 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](35);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](12);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.activeOnly);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("disabled", ctx.busy);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.busy && ctx.assignments.length === 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.assignments.length > 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", !ctx.busy && ctx.assignments.length === 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.formEmployeeInput)("matAutocomplete", _r3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.employeeSearchRows);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.formProfileId);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.profiles);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.formRuleId)("disabled", ctx.formProfileId == null);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", null);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.rulesForSelectedProfile());

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("disabled", ctx.busy);
        }
      },
      directives: [_angular_material_card__WEBPACK_IMPORTED_MODULE_3__["MatCard"], _angular_material_card__WEBPACK_IMPORTED_MODULE_3__["MatCardContent"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_4__["MatCheckbox"], _angular_forms__WEBPACK_IMPORTED_MODULE_5__["NgControlStatus"], _angular_forms__WEBPACK_IMPORTED_MODULE_5__["NgModel"], _angular_material_button__WEBPACK_IMPORTED_MODULE_6__["MatButton"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_7__["MatIcon"], _angular_common__WEBPACK_IMPORTED_MODULE_8__["NgIf"], _angular_material_card__WEBPACK_IMPORTED_MODULE_3__["MatCardTitle"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__["MatFormField"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_9__["MatLabel"], _angular_material_input__WEBPACK_IMPORTED_MODULE_10__["MatInput"], _angular_forms__WEBPACK_IMPORTED_MODULE_5__["DefaultValueAccessor"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_11__["MatAutocompleteTrigger"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_11__["MatAutocomplete"], _angular_common__WEBPACK_IMPORTED_MODULE_8__["NgForOf"], _angular_material_select__WEBPACK_IMPORTED_MODULE_12__["MatSelect"], _angular_material_core__WEBPACK_IMPORTED_MODULE_13__["MatOption"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_14__["MatRow"]],
      pipes: [_angular_common__WEBPACK_IMPORTED_MODULE_8__["DatePipe"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 10px;\n  font-size: 26px;\n  color: var(--nps-text);\n}\n\n.page-intro[_ngcontent-%COMP%] {\n  margin: 0 0 16px;\n  max-width: 900px;\n  font-size: 14px;\n  color: var(--nps-text-muted, #555);\n  line-height: 1.5;\n}\n\n.toolbar-card[_ngcontent-%COMP%] {\n  margin-bottom: 16px;\n  max-width: 960px;\n}\n\n.toolbar-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  flex-wrap: wrap;\n}\n\n.full-table[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 1200px;\n  margin-bottom: 24px;\n}\n\n.loading-hint[_ngcontent-%COMP%], .empty-hint[_ngcontent-%COMP%] {\n  margin: 12px 0;\n  color: var(--nps-text-muted, #666);\n}\n\n.form-card[_ngcontent-%COMP%] {\n  max-width: 720px;\n  margin-top: 8px;\n}\n\n.form-hint[_ngcontent-%COMP%] {\n  margin: 0 0 16px;\n  font-size: 14px;\n  color: var(--nps-text-muted, #666);\n}\n\nmat-form-field.wide[_ngcontent-%COMP%] {\n  display: block;\n  max-width: 420px;\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsEmployeeAssignmentsPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-employee-assignments-page',
          templateUrl: './nps-employee-assignments-page.component.html',
          styleUrls: ['./nps-employee-assignments-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]
        }, {
          type: _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_2__["MatSnackBar"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-my-approvals-page.component.ts":
  /*!**************************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-my-approvals-page.component.ts ***!
    \**************************************************************************/

  /*! exports provided: NpsMyApprovalsPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsMyApprovalsPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsMyApprovalsPageComponent", function () {
      return NpsMyApprovalsPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");

    function NpsMyApprovalsPageComponent_th_4_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyApprovalsPageComponent_td_5_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r8 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r8.RequestID);
      }
    }

    function NpsMyApprovalsPageComponent_th_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E2\u05D5\u05D1\u05D3");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyApprovalsPageComponent_td_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r9 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r9.EmployeeID);
      }
    }

    function NpsMyApprovalsPageComponent_th_10_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyApprovalsPageComponent_td_11_Template(rf, ctx) {
      if (rf & 1) {
        var _r12 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsMyApprovalsPageComponent_td_11_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r12);

          var r_r10 = ctx.$implicit;

          var ctx_r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r11.go(r_r10.RequestID);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "visibility");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyApprovalsPageComponent_tr_12_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 11);
      }
    }

    function NpsMyApprovalsPageComponent_tr_13_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 12);
      }
    }

    var NpsMyApprovalsPageComponent = /*#__PURE__*/function () {
      function NpsMyApprovalsPageComponent(api, router) {
        _classCallCheck(this, NpsMyApprovalsPageComponent);

        this.api = api;
        this.router = router;
        this.rows = [];
        this.cols = ['RequestID', 'EmployeeID', 'Actions'];
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsMyApprovalsPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this17 = this;

          this.api.getMyApprovals(this.employee_id || '').subscribe(function (r) {
            return _this17.rows = r;
          });
        }
      }, {
        key: "go",
        value: function go(id) {
          this.router.navigate(['/nps-permissions/requests', id]);
        }
      }]);
    }();

    NpsMyApprovalsPageComponent.ɵfac = function NpsMyApprovalsPageComponent_Factory(t) {
      return new (t || NpsMyApprovalsPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]));
    };

    NpsMyApprovalsPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsMyApprovalsPageComponent,
      selectors: [["app-nps-my-approvals-page"]],
      decls: 14,
      vars: 3,
      consts: [["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "RequestID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "EmployeeID"], ["matColumnDef", "Actions"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-icon-button", "", "color", "primary", 3, "click"], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsMyApprovalsPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05E9\u05DC\u05D9 (\u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "table", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](3, 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](4, NpsMyApprovalsPageComponent_th_4_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](5, NpsMyApprovalsPageComponent_td_5_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](6, 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsMyApprovalsPageComponent_th_7_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsMyApprovalsPageComponent_td_8_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](9, 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](10, NpsMyApprovalsPageComponent_th_10_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](11, NpsMyApprovalsPageComponent_td_11_Template, 4, 0, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](12, NpsMyApprovalsPageComponent_tr_12_Template, 1, 0, "tr", 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](13, NpsMyApprovalsPageComponent_tr_13_Template, 1, 0, "tr", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.rows);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatCell"], _angular_material_button__WEBPACK_IMPORTED_MODULE_4__["MatButton"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_5__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatRow"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.full[_ngcontent-%COMP%] {\n  width: 100%;\n  border-radius: 12px;\n  overflow: hidden;\n}\n\n.nps-table[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  box-shadow: var(--nps-shadow-soft);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsMyApprovalsPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-my-approvals-page',
          templateUrl: './nps-my-approvals-page.component.html',
          styleUrls: ['./nps-my-approvals-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]
        }, {
          type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-my-requests-page.component.ts":
  /*!*************************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-my-requests-page.component.ts ***!
    \*************************************************************************/

  /*! exports provided: NpsMyRequestsPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsMyRequestsPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsMyRequestsPageComponent", function () {
      return NpsMyRequestsPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! ../components/request-status-badge.component */
    "./src/app/nps-permissions/components/request-status-badge.component.ts");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");

    function NpsMyRequestsPageComponent_th_4_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyRequestsPageComponent_td_5_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r8 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r8.RequestID);
      }
    }

    function NpsMyRequestsPageComponent_th_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E1\u05D8\u05D8\u05D5\u05E1");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyRequestsPageComponent_td_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](1, "app-nps-request-status-badge", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r9 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("status", r_r9.Status);
      }
    }

    function NpsMyRequestsPageComponent_th_10_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyRequestsPageComponent_td_11_Template(rf, ctx) {
      if (rf & 1) {
        var _r12 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsMyRequestsPageComponent_td_11_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r12);

          var r_r10 = ctx.$implicit;

          var ctx_r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r11.go(r_r10.RequestID);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "visibility");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsMyRequestsPageComponent_tr_12_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 12);
      }
    }

    function NpsMyRequestsPageComponent_tr_13_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 13);
      }
    }

    var NpsMyRequestsPageComponent = /*#__PURE__*/function () {
      function NpsMyRequestsPageComponent(api, router) {
        _classCallCheck(this, NpsMyRequestsPageComponent);

        this.api = api;
        this.router = router;
        this.rows = [];
        this.cols = ['RequestID', 'Status', 'Actions'];
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsMyRequestsPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this18 = this;

          this.api.getMyRequests(this.employee_id || '').subscribe(function (r) {
            return _this18.rows = r;
          });
        }
      }, {
        key: "go",
        value: function go(id) {
          this.router.navigate(['/nps-permissions/requests', id]);
        }
      }]);
    }();

    NpsMyRequestsPageComponent.ɵfac = function NpsMyRequestsPageComponent_Factory(t) {
      return new (t || NpsMyRequestsPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]));
    };

    NpsMyRequestsPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsMyRequestsPageComponent,
      selectors: [["app-nps-my-requests-page"]],
      decls: 14,
      vars: 3,
      consts: [["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "RequestID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "Status"], ["matColumnDef", "Actions"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], [3, "status"], ["mat-icon-button", "", "color", "primary", 3, "click"], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsMyRequestsPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D4\u05D1\u05E7\u05E9\u05D5\u05EA \u05E9\u05DC\u05D9");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "table", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](3, 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](4, NpsMyRequestsPageComponent_th_4_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](5, NpsMyRequestsPageComponent_td_5_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](6, 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsMyRequestsPageComponent_th_7_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsMyRequestsPageComponent_td_8_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](9, 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](10, NpsMyRequestsPageComponent_th_10_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](11, NpsMyRequestsPageComponent_td_11_Template, 4, 0, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](12, NpsMyRequestsPageComponent_tr_12_Template, 1, 0, "tr", 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](13, NpsMyRequestsPageComponent_tr_13_Template, 1, 0, "tr", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.rows);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatCell"], _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_4__["NpsRequestStatusBadgeComponent"], _angular_material_button__WEBPACK_IMPORTED_MODULE_5__["MatButton"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_6__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatRow"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.full[_ngcontent-%COMP%] {\n  width: 100%;\n  border-radius: 12px;\n  overflow: hidden;\n}\n\n.nps-table[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  box-shadow: var(--nps-shadow-soft);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsMyRequestsPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-my-requests-page',
          templateUrl: './nps-my-requests-page.component.html',
          styleUrls: ['./nps-my-requests-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]
        }, {
          type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-permissions-admin-page.component.ts":
  /*!*******************************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-permissions-admin-page.component.ts ***!
    \*******************************************************************************/

  /*! exports provided: NpsPermissionsAdminPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsPermissionsAdminPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsPermissionsAdminPageComponent", function () {
      return NpsPermissionsAdminPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! rxjs */
    "./node_modules/rxjs/_esm2015/index.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_select__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/material/select */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/select.js");
    /* harmony import */


    var _angular_material_core__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/material/core */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");

    function NpsPermissionsAdminPageComponent_mat_option_21_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 6);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var a_r15 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", a_r15.ActionID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](a_r15.ActionSubject);
      }
    }

    function NpsPermissionsAdminPageComponent_th_31_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_td_32_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r16 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r16.PermissionID);
      }
    }

    function NpsPermissionsAdminPageComponent_th_34_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E9\u05DD \u05D4\u05E8\u05E9\u05D0\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_td_35_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r17 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r17.PermissionName);
      }
    }

    function NpsPermissionsAdminPageComponent_th_37_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05EA\u05D9\u05D0\u05D5\u05E8");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_td_38_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r18 = ctx.$implicit;

        var ctx_r6 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r6.rowDescription(r_r18));
      }
    }

    function NpsPermissionsAdminPageComponent_th_40_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E7\u05D1\u05D5\u05E6\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_td_41_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r19 = ctx.$implicit;

        var ctx_r8 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r8.actionLabel(r_r19.ActionIDFK));
      }
    }

    function NpsPermissionsAdminPageComponent_th_43_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_td_44_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-icon", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r20 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r20.IsActive ? "check_circle" : "cancel");
      }
    }

    function NpsPermissionsAdminPageComponent_th_46_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_td_47_Template(rf, ctx) {
      if (rf & 1) {
        var _r23 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsPermissionsAdminPageComponent_td_47_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r23);

          var r_r21 = ctx.$implicit;

          var ctx_r22 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r22.editPermission(r_r21);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "edit");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsPermissionsAdminPageComponent_tr_48_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 26);
      }
    }

    function NpsPermissionsAdminPageComponent_tr_49_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 27);
      }
    }

    var NpsPermissionsAdminPageComponent = /*#__PURE__*/function () {
      function NpsPermissionsAdminPageComponent(api, snack) {
        _classCallCheck(this, NpsPermissionsAdminPageComponent);

        this.api = api;
        this.snack = snack;
        this.permissions = [];
        this.actions = [];
        this.cols = ['PermissionID', 'PermissionName', 'Description', 'Action', 'IsActive', 'Actions'];
        this.form = {
          PermissionID: null,
          PermissionName: '',
          PermissionDescription: '',
          IsActive: true,
          ActionIDFK: ''
        };
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsPermissionsAdminPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          this.reloadData();
        }
      }, {
        key: "reloadData",
        value: function reloadData() {
          var _this19 = this;

          Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["forkJoin"])({
            permissions: this.api.getPermissions(this.employee_id),
            actions: this.api.getActions(this.employee_id)
          }).subscribe(function (_ref2) {
            var permissions = _ref2.permissions,
                actions = _ref2.actions;
            _this19.permissions = permissions || [];
            _this19.actions = (actions || []).slice().sort(function (a, b) {
              var _a, _b;

              return ((_a = a.Sort) !== null && _a !== void 0 ? _a : 0) - ((_b = b.Sort) !== null && _b !== void 0 ? _b : 0) || a.ActionID - b.ActionID;
            });
          });
        }
      }, {
        key: "savePermission",
        value: function savePermission() {
          var _this20 = this;

          var name = (this.form.PermissionName || '').trim();

          if (!name) {
            this.snack.open('נא למלא שם הרשאה', 'סגור', {
              duration: 3000
            });
            return;
          }

          if (!this.form.ActionIDFK) {
            this.snack.open('נא לבחור קבוצה להרשאה', 'סגור', {
              duration: 3000
            });
            return;
          }

          var body = {
            PermissionName: name,
            PermissionDescription: this.form.PermissionDescription || '',
            IsActive: this.form.IsActive,
            ActionIDFK: this.form.ActionIDFK
          };

          if (this.form.PermissionID == null) {
            this.api.postPermission(this.employee_id, body).subscribe(function () {
              _this20.snack.open('ההרשאה נוספה', 'סגור', {
                duration: 2000
              });

              _this20.resetForm();

              _this20.reloadData();
            });
            return;
          }

          this.api.putPermission(this.employee_id, this.form.PermissionID, body).subscribe(function () {
            _this20.snack.open('ההרשאה עודכנה', 'סגור', {
              duration: 2000
            });

            _this20.resetForm();

            _this20.reloadData();
          });
        }
      }, {
        key: "editPermission",
        value: function editPermission(row) {
          var _a, _b;

          var description = (_b = (_a = row.Description) !== null && _a !== void 0 ? _a : row.PermissionDescription) !== null && _b !== void 0 ? _b : '';
          this.form = {
            PermissionID: row.PermissionID,
            PermissionName: row.PermissionName || '',
            PermissionDescription: description,
            IsActive: row.IsActive,
            ActionIDFK: row.ActionIDFK ? String(row.ActionIDFK) : null
          };
        }
      }, {
        key: "resetForm",
        value: function resetForm() {
          this.form = {
            PermissionID: null,
            PermissionName: '',
            PermissionDescription: '',
            IsActive: true,
            ActionIDFK: null
          };
        }
      }, {
        key: "actionLabel",
        value: function actionLabel(actionIDFK) {
          if (!actionIDFK) {
            return '—';
          }

          var actionId = String(actionIDFK);
          var action = this.actions.find(function (x) {
            return String(x.ActionID) === actionId;
          });
          return action ? action.ActionSubject : actionId;
        }
      }, {
        key: "rowDescription",
        value: function rowDescription(row) {
          var _a, _b;

          return (_b = (_a = row.Description) !== null && _a !== void 0 ? _a : row.PermissionDescription) !== null && _b !== void 0 ? _b : '';
        }
      }]);
    }();

    NpsPermissionsAdminPageComponent.ɵfac = function NpsPermissionsAdminPageComponent_Factory(t) {
      return new (t || NpsPermissionsAdminPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__["MatSnackBar"]));
    };

    NpsPermissionsAdminPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsPermissionsAdminPageComponent,
      selectors: [["app-nps-permissions-admin-page"]],
      decls: 50,
      vars: 11,
      consts: [[1, "form-card"], [1, "form-row"], ["appearance", "outline"], ["matInput", "", 3, "ngModel", "ngModelChange"], ["appearance", "outline", 1, "wide"], [3, "ngModel", "ngModelChange"], [3, "value"], [3, "value", 4, "ngFor", "ngForOf"], [1, "actions"], ["mat-raised-button", "", "color", "primary", 3, "click"], ["mat-button", "", "type", "button", 3, "click"], ["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "PermissionID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "PermissionName"], ["matColumnDef", "Description"], ["matColumnDef", "Action"], ["matColumnDef", "IsActive"], ["matColumnDef", "Actions"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["color", "primary"], ["mat-icon-button", "", "color", "primary", 3, "click"], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsPermissionsAdminPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D4\u05E8\u05E9\u05D0\u05D5\u05EA");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-card", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "mat-card-title");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "mat-card-content");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "div", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "mat-form-field", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](8, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](9, "\u05E9\u05DD \u05D4\u05E8\u05E9\u05D0\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "input", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsPermissionsAdminPageComponent_Template_input_ngModelChange_10_listener($event) {
            return ctx.form.PermissionName = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](11, "mat-form-field", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](13, "\u05EA\u05D9\u05D0\u05D5\u05E8");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "input", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsPermissionsAdminPageComponent_Template_input_ngModelChange_14_listener($event) {
            return ctx.form.PermissionDescription = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](15, "mat-form-field", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](16, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](17, "\u05E7\u05D1\u05D5\u05E6\u05D4 \u05DC\u05E9\u05D9\u05D5\u05DA");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](18, "mat-select", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsPermissionsAdminPageComponent_Template_mat_select_ngModelChange_18_listener($event) {
            return ctx.form.ActionIDFK = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](19, "mat-option", 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](20, "\u05D1\u05D7\u05E8\u05D5 \u05E7\u05D1\u05D5\u05E6\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](21, NpsPermissionsAdminPageComponent_mat_option_21_Template, 2, 2, "mat-option", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](22, "mat-checkbox", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsPermissionsAdminPageComponent_Template_mat_checkbox_ngModelChange_22_listener($event) {
            return ctx.form.IsActive = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](23, "\u05E4\u05E2\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](24, "div", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](25, "button", 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsPermissionsAdminPageComponent_Template_button_click_25_listener() {
            return ctx.savePermission();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](26);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](27, "button", 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsPermissionsAdminPageComponent_Template_button_click_27_listener() {
            return ctx.resetForm();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](28, "\u05E0\u05E7\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](29, "table", 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](30, 12);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](31, NpsPermissionsAdminPageComponent_th_31_Template, 2, 0, "th", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](32, NpsPermissionsAdminPageComponent_td_32_Template, 2, 1, "td", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](33, 15);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](34, NpsPermissionsAdminPageComponent_th_34_Template, 2, 0, "th", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](35, NpsPermissionsAdminPageComponent_td_35_Template, 2, 1, "td", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](36, 16);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](37, NpsPermissionsAdminPageComponent_th_37_Template, 2, 0, "th", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](38, NpsPermissionsAdminPageComponent_td_38_Template, 2, 1, "td", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](39, 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](40, NpsPermissionsAdminPageComponent_th_40_Template, 2, 0, "th", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](41, NpsPermissionsAdminPageComponent_td_41_Template, 2, 1, "td", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](42, 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](43, NpsPermissionsAdminPageComponent_th_43_Template, 2, 0, "th", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](44, NpsPermissionsAdminPageComponent_td_44_Template, 3, 1, "td", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](45, 19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](46, NpsPermissionsAdminPageComponent_th_46_Template, 2, 0, "th", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](47, NpsPermissionsAdminPageComponent_td_47_Template, 4, 0, "td", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](48, NpsPermissionsAdminPageComponent_tr_48_Template, 1, 0, "tr", 20);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](49, NpsPermissionsAdminPageComponent_tr_49_Template, 1, 0, "tr", 21);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx.form.PermissionID == null ? "\u05D4\u05E8\u05E9\u05D0\u05D4 \u05D7\u05D3\u05E9\u05D4" : "\u05E2\u05E8\u05D9\u05DB\u05EA \u05D4\u05E8\u05E9\u05D0\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.PermissionName);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.PermissionDescription);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.ActionIDFK);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", null);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.actions);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.form.IsActive);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx.form.PermissionID == null ? "\u05D4\u05D5\u05E1\u05E3 \u05D4\u05E8\u05E9\u05D0\u05D4" : "\u05E9\u05DE\u05D5\u05E8 \u05D4\u05E8\u05E9\u05D0\u05D4", " ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.permissions);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCard"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardTitle"], _angular_material_card__WEBPACK_IMPORTED_MODULE_4__["MatCardContent"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_5__["MatFormField"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_5__["MatLabel"], _angular_material_input__WEBPACK_IMPORTED_MODULE_6__["MatInput"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["DefaultValueAccessor"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["NgControlStatus"], _angular_forms__WEBPACK_IMPORTED_MODULE_7__["NgModel"], _angular_material_select__WEBPACK_IMPORTED_MODULE_8__["MatSelect"], _angular_material_core__WEBPACK_IMPORTED_MODULE_9__["MatOption"], _angular_common__WEBPACK_IMPORTED_MODULE_10__["NgForOf"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_11__["MatCheckbox"], _angular_material_button__WEBPACK_IMPORTED_MODULE_12__["MatButton"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatCell"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_13__["MatRow"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.form-card[_ngcontent-%COMP%] {\n  margin-bottom: 12px;\n}\n\n.form-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 12px;\n}\n\n.wide[_ngcontent-%COMP%] {\n  min-width: 280px;\n}\n\n.actions[_ngcontent-%COMP%] {\n  margin-top: 8px;\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsPermissionsAdminPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-permissions-admin-page',
          templateUrl: './nps-permissions-admin-page.component.html',
          styleUrls: ['./nps-permissions-admin-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]
        }, {
          type: _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__["MatSnackBar"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-profile-edit-page.component.ts":
  /*!**************************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-profile-edit-page.component.ts ***!
    \**************************************************************************/

  /*! exports provided: NpsProfileEditPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsProfileEditPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsProfileEditPageComponent", function () {
      return NpsProfileEditPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! rxjs */
    "./node_modules/rxjs/_esm2015/index.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_select__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/material/select */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/select.js");
    /* harmony import */


    var _angular_material_core__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! @angular/material/core */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");

    function NpsProfileEditPageComponent_mat_card_2_mat_option_17_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var d_r5 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", d_r5.DepartnentCode);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate2"](" ", d_r5.DepartnentDescripton, " (", d_r5.DepartnentCode, ") ");
      }
    }

    function NpsProfileEditPageComponent_mat_card_2_mat_option_24_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var e_r6 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", e_r6.EducationID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](e_r6.EducationSubject);
      }
    }

    function NpsProfileEditPageComponent_mat_card_2_mat_option_31_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var s_r7 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", s_r7.SpecialtyID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](s_r7.Speciality);
      }
    }

    function NpsProfileEditPageComponent_mat_card_2_Template(rf, ctx) {
      if (rf & 1) {
        var _r9 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-card", 2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-card-content");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-form-field", 3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "mat-label");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, "\u05E9\u05DD \u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "input", 4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_input_ngModelChange_5_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r8 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r8.profile.ProfileName = $event;
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "mat-form-field", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](7, "mat-label");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](8, "\u05EA\u05D9\u05D0\u05D5\u05E8 \u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](9, "input", 4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_input_ngModelChange_9_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r10 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r10.profile.Description = $event;
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "div", 6);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](11, "mat-form-field", 3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "mat-label");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](13, "\u05DE\u05D7\u05DC\u05E7\u05D4 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "mat-select", 7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_mat_select_ngModelChange_14_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r11.profile.DepartnentCode = $event;
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](15, "mat-option", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](16, "(\u05DB\u05DC\u05DC\u05D9 \u2014 \u05DC\u05DC\u05D0 \u05DE\u05D7\u05DC\u05E7\u05D4)");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](17, NpsProfileEditPageComponent_mat_card_2_mat_option_17_Template, 2, 3, "mat-option", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](18, "mat-form-field", 3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](19, "mat-label");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](20, "\u05D4\u05E9\u05DB\u05DC\u05D4 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](21, "mat-select", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_mat_select_ngModelChange_21_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r12 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r12.profile.EducationID = $event;
        })("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_mat_select_ngModelChange_21_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r13 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r13.onProfileEducationChange();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](22, "mat-option", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](23, "(\u05DB\u05DC\u05DC\u05D9)");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](24, NpsProfileEditPageComponent_mat_card_2_mat_option_24_Template, 2, 2, "mat-option", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](25, "mat-form-field", 3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](26, "mat-label");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](27, "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](28, "mat-select", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_mat_select_ngModelChange_28_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r14 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r14.profile.SpecialityID = $event;
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](29, "mat-option", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](30, "(\u05DB\u05DC\u05DC\u05D9)");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](31, NpsProfileEditPageComponent_mat_card_2_mat_option_31_Template, 2, 2, "mat-option", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](32, "p", 12);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](33, "\u05E9\u05D3\u05D5\u05EA \u05D4\u05E7\u05E9\u05E8 \u05DE\u05E9\u05DE\u05E9\u05D9\u05DD \u05DC\u05E1\u05D9\u05E0\u05D5\u05DF \u05D5\u05D4\u05EA\u05D0\u05DE\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC; \u05D4\u05E9\u05D0\u05E8\u05D5 \"\u05DB\u05DC\u05DC\u05D9\" \u05DC\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05DB\u05DC\u05DC\u05D9.");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](34, "mat-checkbox", 13);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsProfileEditPageComponent_mat_card_2_Template_mat_checkbox_ngModelChange_34_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r15 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r15.profile.IsActive = $event;
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](35, "\u05E4\u05E2\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](36, "div", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](37, "button", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsProfileEditPageComponent_mat_card_2_Template_button_click_37_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r9);

          var ctx_r16 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r16.saveMeta();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](38, "\u05E9\u05DE\u05D5\u05E8 \u05E4\u05E8\u05D8\u05D9\u05DD");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r0 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r0.profile.ProfileName);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r0.profile.Description);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r0.profile.DepartnentCode);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx_r0.departments);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r0.profile.EducationID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx_r0.educations);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r0.profile.SpecialityID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx_r0.profileSpecialties);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r0.profile.IsActive);
      }
    }

    function NpsProfileEditPageComponent_p_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p", 16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, " \u05DC\u05E2\u05E8\u05D9\u05DB\u05EA \u05DE\u05D8\u05E8\u05D9\u05E6\u05EA \u05D4\u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05E2\u05D1\u05D5\u05E8 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D6\u05D4, \u05E2\u05D1\u05E8\u05D5 \u05DC\u05BE ");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "a", 17);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "\u05DB\u05DC\u05DC\u05D9 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, " \u05D5\u05D1\u05D7\u05E8\u05D5 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05EA\u05D7\u05EA \"\u05DE\u05D8\u05E8\u05D9\u05E6\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05DC\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC\".\n");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    var NpsProfileEditPageComponent = /*#__PURE__*/function () {
      function NpsProfileEditPageComponent(route, router, api, snack) {
        _classCallCheck(this, NpsProfileEditPageComponent);

        this.route = route;
        this.router = router;
        this.api = api;
        this.snack = snack;
        this.profile = null;
        this.isNew = false;
        this.departments = [];
        this.educations = [];
        this.profileSpecialties = [];
        this.id = null;
        this.employee_id = localStorage.getItem('ID') || '';
        this.specialtiesRequestSerial = 0;
      }

      return _createClass(NpsProfileEditPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this21 = this;

          this.loadLookups();
          Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["combineLatest"])([this.route.data, this.route.paramMap]).subscribe(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 2),
                data = _ref4[0],
                params = _ref4[1];

            _this21.isNew = data.profileMode === 'create';

            if (_this21.isNew) {
              _this21.id = null;

              _this21.initNewProfile();
            } else {
              var sid = params.get('id');

              if (!sid) {
                return;
              }

              _this21.id = +sid;

              _this21.loadExisting();
            }
          });
        }
      }, {
        key: "loadLookups",
        value: function loadLookups() {
          var _this22 = this;

          Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["forkJoin"])({
            departments: this.api.getDepartments(this.employee_id || ''),
            educations: this.api.getEducations(this.employee_id || '')
          }).subscribe(function (_ref5) {
            var departments = _ref5.departments,
                educations = _ref5.educations;
            _this22.departments = departments;
            _this22.educations = educations;
          });
        }
      }, {
        key: "initNewProfile",
        value: function initNewProfile() {
          this.profile = {
            ProfileID: 0,
            ProfileName: '',
            Description: '',
            IsActive: true,
            Priority: 0,
            DepartnentCode: '',
            EducationID: '',
            SpecialityID: ''
          };
          this.profileSpecialties = [];
        }
      }, {
        key: "loadExisting",
        value: function loadExisting() {
          var _this23 = this;

          if (this.id == null || !Number.isFinite(this.id)) {
            return;
          }

          this.api.getProfile(this.employee_id || '', this.id).subscribe(function (profile) {
            _this23.profile = Object.assign({}, profile);

            _this23.normalizeProfileContextFields();

            _this23.loadProfileSpecialties();
          });
        }
        /** Normalize API keys if serializer uses different casing. */

      }, {
        key: "normalizeProfileContextFields",
        value: function normalizeProfileContextFields() {
          if (!this.profile) {
            return;
          }

          var p = this.profile;

          if (this.profile.DepartnentCode == null && p['departnentCode'] != null) {
            this.profile.DepartnentCode = String(p['departnentCode']);
          }

          if (this.profile.EducationID == null && p['educationID'] != null) {
            this.profile.EducationID = String(p['educationID']);
          }

          if (this.profile.SpecialityID == null && p['specialityID'] != null) {
            this.profile.SpecialityID = String(p['specialityID']);
          }

          if (this.profile.DepartnentCode != null && this.profile.DepartnentCode !== '') {
            this.profile.DepartnentCode = String(this.profile.DepartnentCode);
          } else {
            this.profile.DepartnentCode = '';
          }

          if (this.profile.EducationID != null && this.profile.EducationID !== '') {
            this.profile.EducationID = String(this.profile.EducationID);
          } else {
            this.profile.EducationID = '';
          }

          if (this.profile.SpecialityID != null && this.profile.SpecialityID !== '') {
            this.profile.SpecialityID = String(this.profile.SpecialityID);
          } else {
            this.profile.SpecialityID = '';
          }
        }
      }, {
        key: "onProfileEducationChange",
        value: function onProfileEducationChange() {
          if (!this.profile) {
            return;
          }

          this.profile.SpecialityID = '';
          this.loadProfileSpecialties();
        }
      }, {
        key: "loadProfileSpecialties",
        value: function loadProfileSpecialties() {
          var _this24 = this;

          if (!this.profile) {
            return;
          }

          var edu = (this.profile.EducationID || '').trim();
          var serial = ++this.specialtiesRequestSerial;
          this.api.getSpecialties(this.employee_id || '', edu).subscribe(function (list) {
            if (serial !== _this24.specialtiesRequestSerial) {
              return;
            }

            _this24.profileSpecialties = list || [];
          });
        }
      }, {
        key: "writeBody",
        value: function writeBody() {
          var _a;

          if (!this.profile) {
            return null;
          }

          return {
            name: this.profile.ProfileName,
            description: this.profile.Description || '',
            isActive: this.profile.IsActive,
            priority: (_a = this.profile.Priority) !== null && _a !== void 0 ? _a : 0,
            departnentCode: (this.profile.DepartnentCode || '').trim() || null,
            educationID: (this.profile.EducationID || '').trim() || null,
            specialityID: (this.profile.SpecialityID || '').trim() || null
          };
        }
      }, {
        key: "saveMeta",
        value: function saveMeta() {
          var _this25 = this;

          var body = this.writeBody();

          if (!body || !this.profile) {
            return;
          }

          if (!String(body.name || '').trim()) {
            this.snack.open('נא למלא שם פרופיל', 'סגור', {
              duration: 3000
            });
            return;
          }

          if (this.isNew) {
            this.api.postProfile(this.employee_id || '', body).subscribe(function (r) {
              _this25.snack.open('נשמר', 'סגור', {
                duration: 2000
              });

              _this25.router.navigate(['/nps-permissions/profiles', r.ProfileID, 'edit']);
            });
            return;
          }

          if (this.id == null) {
            return;
          }

          this.api.putProfile(this.employee_id || '', this.id, body).subscribe(function () {
            return _this25.snack.open('נשמר', 'סגור', {
              duration: 2000
            });
          });
        }
      }]);
    }();

    NpsProfileEditPageComponent.ɵfac = function NpsProfileEditPageComponent_Factory(t) {
      return new (t || NpsProfileEditPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_2__["ActivatedRoute"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_3__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_4__["MatSnackBar"]));
    };

    NpsProfileEditPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsProfileEditPageComponent,
      selectors: [["app-nps-profile-edit-page"]],
      decls: 4,
      vars: 3,
      consts: [["class", "meta-card", 4, "ngIf"], ["class", "perms-hint", 4, "ngIf"], [1, "meta-card"], ["appearance", "outline"], ["matInput", "", 3, "ngModel", "ngModelChange"], ["appearance", "outline", 1, "wide"], [1, "context-row"], ["name", "profileDept", 3, "ngModel", "ngModelChange"], [3, "value"], [3, "value", 4, "ngFor", "ngForOf"], ["name", "profileEdu", 3, "ngModel", "ngModelChange"], ["name", "profileSpec", 3, "ngModel", "ngModelChange"], [1, "context-hint"], [3, "ngModel", "ngModelChange"], [1, "actions"], ["mat-raised-button", "", "color", "primary", 3, "click"], [1, "perms-hint"], ["routerLink", "/nps-permissions/profile-rules"]],
      template: function NpsProfileEditPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsProfileEditPageComponent_mat_card_2_Template, 39, 12, "mat-card", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsProfileEditPageComponent_p_3_Template, 5, 0, "p", 1);
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx.isNew ? "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D7\u05D3\u05E9" : "\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.profile);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.profile && !ctx.isNew);
        }
      },
      directives: [_angular_common__WEBPACK_IMPORTED_MODULE_5__["NgIf"], _angular_material_card__WEBPACK_IMPORTED_MODULE_6__["MatCard"], _angular_material_card__WEBPACK_IMPORTED_MODULE_6__["MatCardContent"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__["MatFormField"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__["MatLabel"], _angular_material_input__WEBPACK_IMPORTED_MODULE_8__["MatInput"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["DefaultValueAccessor"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["NgControlStatus"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["NgModel"], _angular_material_select__WEBPACK_IMPORTED_MODULE_10__["MatSelect"], _angular_material_core__WEBPACK_IMPORTED_MODULE_11__["MatOption"], _angular_common__WEBPACK_IMPORTED_MODULE_5__["NgForOf"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_12__["MatCheckbox"], _angular_material_button__WEBPACK_IMPORTED_MODULE_13__["MatButton"], _angular_router__WEBPACK_IMPORTED_MODULE_2__["RouterLinkWithHref"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\nh2[_ngcontent-%COMP%] {\n  margin: 20px 0 12px;\n  color: var(--nps-text);\n}\n\n.meta-card[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  border-radius: 12px;\n  box-shadow: var(--nps-shadow-soft);\n}\n\nmat-form-field[_ngcontent-%COMP%] {\n  margin-inline-end: 12px;\n}\n\n.wide[_ngcontent-%COMP%] {\n  min-width: 280px;\n}\n\n.context-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-start;\n  gap: 0 12px;\n  margin-top: 4px;\n}\n\n.context-hint[_ngcontent-%COMP%] {\n  margin: 0 0 12px;\n  max-width: 640px;\n  font-size: 13px;\n  color: var(--nps-text-muted, #666);\n  line-height: 1.45;\n}\n\n.actions[_ngcontent-%COMP%] {\n  margin-top: 12px;\n}\n\n.perms-hint[_ngcontent-%COMP%] {\n  margin-top: 16px;\n  max-width: 520px;\n  font-size: 14px;\n  color: var(--nps-text-muted, #666);\n  line-height: 1.5;\n}\n\n.perms-hint[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--nps-accent, #1565c0);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsProfileEditPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-profile-edit-page',
          templateUrl: './nps-profile-edit-page.component.html',
          styleUrls: ['./nps-profile-edit-page.component.scss']
        }]
      }], function () {
        return [{
          type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["ActivatedRoute"]
        }, {
          type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]
        }, {
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_3__["NpsBaseApiService"]
        }, {
          type: _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_4__["MatSnackBar"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-profiles-page.component.ts":
  /*!**********************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-profiles-page.component.ts ***!
    \**********************************************************************/

  /*! exports provided: NpsProfilesPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsProfilesPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsProfilesPageComponent", function () {
      return NpsProfilesPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! rxjs */
    "./node_modules/rxjs/_esm2015/index.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");

    function NpsProfilesPageComponent_th_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r16 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r16.ProfileID);
      }
    }

    function NpsProfilesPageComponent_th_10_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E9\u05DD");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_11_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r17 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r17.ProfileName);
      }
    }

    function NpsProfilesPageComponent_th_13_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05EA\u05D9\u05D0\u05D5\u05E8");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_14_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r18 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r18.Description);
      }
    }

    function NpsProfilesPageComponent_th_16_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D7\u05DC\u05E7\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_17_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r19 = ctx.$implicit;

        var ctx_r7 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r7.deptLabel(r_r19.DepartnentCode));
      }
    }

    function NpsProfilesPageComponent_th_19_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D4\u05E9\u05DB\u05DC\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_20_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r20 = ctx.$implicit;

        var ctx_r9 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r9.educationLabel(r_r20.EducationID));
      }
    }

    function NpsProfilesPageComponent_th_22_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_23_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r21 = ctx.$implicit;

        var ctx_r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r11.specialtyLabel(r_r21.SpecialityID));
      }
    }

    function NpsProfilesPageComponent_th_25_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 14);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_td_26_Template(rf, ctx) {
      if (rf & 1) {
        var _r24 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 15);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsProfilesPageComponent_td_26_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r24);

          var r_r22 = ctx.$implicit;

          var ctx_r23 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r23.edit(r_r22.ProfileID);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "edit");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "button", 16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsProfilesPageComponent_td_26_Template_button_click_4_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r24);

          var r_r22 = ctx.$implicit;

          var ctx_r25 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r25.view(r_r22.ProfileID);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](6, "visibility");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsProfilesPageComponent_tr_27_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 17);
      }
    }

    function NpsProfilesPageComponent_tr_28_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 18);
      }
    }

    var NpsProfilesPageComponent = /*#__PURE__*/function () {
      function NpsProfilesPageComponent(api, router) {
        _classCallCheck(this, NpsProfilesPageComponent);

        this.api = api;
        this.router = router;
        this.profiles = [];
        this.cols = ['ProfileID', 'ProfileName', 'Description', 'DepartnentCode', 'EducationID', 'SpecialityID', 'Actions'];
        this.departments = [];
        this.educations = [];
        this.specialties = [];
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsProfilesPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this26 = this;

          Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["forkJoin"])({
            profiles: this.api.getProfiles(this.employee_id || ''),
            departments: this.api.getDepartments(this.employee_id || ''),
            educations: this.api.getEducations(this.employee_id || ''),
            specialties: this.api.getSpecialties(this.employee_id || '', '')
          }).subscribe(function (_ref6) {
            var profiles = _ref6.profiles,
                departments = _ref6.departments,
                educations = _ref6.educations,
                specialties = _ref6.specialties;
            _this26.profiles = (profiles || []).map(function (p) {
              return _this26.normalizeProfileListRow(p);
            });
            _this26.departments = departments;
            _this26.educations = educations;
            _this26.specialties = specialties || [];
          });
        }
      }, {
        key: "normalizeProfileListRow",
        value: function normalizeProfileListRow(p) {
          var _a, _b, _c;

          var x = p;
          var dept = (_a = p.DepartnentCode) !== null && _a !== void 0 ? _a : x['departnentCode'];
          var edu = (_b = p.EducationID) !== null && _b !== void 0 ? _b : x['educationID'];
          var spec = (_c = p.SpecialityID) !== null && _c !== void 0 ? _c : x['specialityID'];
          return Object.assign(Object.assign({}, p), {
            DepartnentCode: dept != null && String(dept).trim() !== '' ? String(dept) : '',
            EducationID: edu != null && String(edu).trim() !== '' ? String(edu) : '',
            SpecialityID: spec != null && String(spec).trim() !== '' ? String(spec) : ''
          });
        }
      }, {
        key: "deptLabel",
        value: function deptLabel(code) {
          if (code == null || String(code).trim() === '') {
            return '—';
          }

          var c = String(code);
          var d = this.departments.find(function (x) {
            return x.DepartnentCode === c;
          });
          return d ? d.DepartnentDescripton : c;
        }
      }, {
        key: "educationLabel",
        value: function educationLabel(id) {
          if (id == null || String(id).trim() === '') {
            return '—';
          }

          var s = String(id);
          var e = this.educations.find(function (x) {
            return x.EducationID === s;
          });
          return e ? e.EducationSubject : s;
        }
      }, {
        key: "specialtyLabel",
        value: function specialtyLabel(id) {
          if (id == null || String(id).trim() === '') {
            return '—';
          }

          var sid = String(id);
          var sp = this.specialties.find(function (x) {
            return x.SpecialtyID === sid;
          });
          return sp ? sp.Speciality : sid;
        }
      }, {
        key: "edit",
        value: function edit(id) {
          this.router.navigate(['/nps-permissions/profiles', id, 'edit']);
        }
      }, {
        key: "view",
        value: function view(id) {
          this.router.navigate(['/nps-permissions/profiles', id, 'view']);
        }
      }, {
        key: "create",
        value: function create() {
          this.router.navigate(['/nps-permissions/profiles/new']);
        }
      }]);
    }();

    NpsProfilesPageComponent.ɵfac = function NpsProfilesPageComponent_Factory(t) {
      return new (t || NpsProfilesPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_3__["Router"]));
    };

    NpsProfilesPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsProfilesPageComponent,
      selectors: [["app-nps-profiles-page"]],
      decls: 29,
      vars: 3,
      consts: [[1, "actions-row"], ["mat-raised-button", "", "color", "primary", 3, "click"], ["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "ProfileID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "ProfileName"], ["matColumnDef", "Description"], ["matColumnDef", "DepartnentCode"], ["matColumnDef", "EducationID"], ["matColumnDef", "SpecialityID"], ["matColumnDef", "Actions"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-icon-button", "", "color", "primary", 3, "click"], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsProfilesPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC\u05D9\u05DD");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "div", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "button", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsProfilesPageComponent_Template_button_click_3_listener() {
            return ctx.create();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D7\u05D3\u05E9");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "table", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](6, 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsProfilesPageComponent_th_7_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsProfilesPageComponent_td_8_Template, 2, 1, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](9, 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](10, NpsProfilesPageComponent_th_10_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](11, NpsProfilesPageComponent_td_11_Template, 2, 1, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](12, 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](13, NpsProfilesPageComponent_th_13_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](14, NpsProfilesPageComponent_td_14_Template, 2, 1, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](15, 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](16, NpsProfilesPageComponent_th_16_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](17, NpsProfilesPageComponent_td_17_Template, 2, 1, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](18, 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](19, NpsProfilesPageComponent_th_19_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](20, NpsProfilesPageComponent_td_20_Template, 2, 1, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](21, 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](22, NpsProfilesPageComponent_th_22_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](23, NpsProfilesPageComponent_td_23_Template, 2, 1, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](24, 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](25, NpsProfilesPageComponent_th_25_Template, 2, 0, "th", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](26, NpsProfilesPageComponent_td_26_Template, 7, 0, "td", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](27, NpsProfilesPageComponent_tr_27_Template, 1, 0, "tr", 12);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](28, NpsProfilesPageComponent_tr_28_Template, 1, 0, "tr", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.profiles);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](22);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_button__WEBPACK_IMPORTED_MODULE_4__["MatButton"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatCell"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_6__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_5__["MatRow"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.actions-row[_ngcontent-%COMP%] {\n  margin-bottom: 12px;\n}\n\n.full[_ngcontent-%COMP%] {\n  width: 100%;\n  border-radius: 12px;\n  overflow: hidden;\n}\n\n.nps-table[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  box-shadow: var(--nps-shadow-soft);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsProfilesPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-profiles-page',
          templateUrl: './nps-profiles-page.component.html',
          styleUrls: ['./nps-profiles-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]
        }, {
          type: _angular_router__WEBPACK_IMPORTED_MODULE_3__["Router"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-request-detail-page.component.ts":
  /*!****************************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-request-detail-page.component.ts ***!
    \****************************************************************************/

  /*! exports provided: NpsRequestDetailPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsRequestDetailPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsRequestDetailPageComponent", function () {
      return NpsRequestDetailPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _components_approval_timeline_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! ../components/approval-timeline.component */
    "./src/app/nps-permissions/components/approval-timeline.component.ts");
    /* harmony import */


    var _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! ../components/request-status-badge.component */
    "./src/app/nps-permissions/components/request-status-badge.component.ts");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");

    function NpsRequestDetailPageComponent_app_nps_request_status_badge_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "app-nps-request-status-badge", 4);
      }

      if (rf & 2) {
        var ctx_r0 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("status", ctx_r0.detail.Status);
      }
    }

    function NpsRequestDetailPageComponent_div_6_Template(rf, ctx) {
      if (rf & 1) {
        var _r3 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-form-field", 6);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-label");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "\u05D4\u05E2\u05E8\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "input", 7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsRequestDetailPageComponent_div_6_Template_input_ngModelChange_4_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r3);

          var ctx_r2 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r2.comments = $event;
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "div");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "button", 8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRequestDetailPageComponent_div_6_Template_button_click_6_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r3);

          var ctx_r4 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r4.approve();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](7, "\u05D0\u05E9\u05E8");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](8, "button", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRequestDetailPageComponent_div_6_Template_button_click_8_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r3);

          var ctx_r5 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r5.reject();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](9, "\u05D3\u05D7\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx_r1.comments);
      }
    }

    var NpsRequestDetailPageComponent = /*#__PURE__*/function () {
      function NpsRequestDetailPageComponent(route, api, snack) {
        _classCallCheck(this, NpsRequestDetailPageComponent);

        this.route = route;
        this.api = api;
        this.snack = snack;
        this.comments = '';
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsRequestDetailPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this27 = this;

          this.route.params.subscribe(function (p) {
            _this27.id = +p.id;

            _this27.load();
          });
        }
      }, {
        key: "load",
        value: function load() {
          var _this28 = this;

          this.api.getRequest(this.employee_id || '', this.id).subscribe(function (d) {
            return _this28.detail = d;
          });
        }
      }, {
        key: "approve",
        value: function approve() {
          var _this29 = this;

          this.api.approveRequest(this.employee_id || '', this.id, this.comments).subscribe(function () {
            _this29.snack.open('אושר', 'סגור', {
              duration: 2000
            });

            _this29.load();
          }, function (e) {
            var _a;

            return _this29.snack.open(((_a = e.error) === null || _a === void 0 ? void 0 : _a.message) || 'שגיאה', 'סגור', {
              duration: 4000
            });
          });
        }
      }, {
        key: "reject",
        value: function reject() {
          var _this30 = this;

          this.api.rejectRequest(this.employee_id || '', this.id, this.comments).subscribe(function () {
            _this30.snack.open('נדחה', 'סגור', {
              duration: 2000
            });

            _this30.load();
          }, function (e) {
            var _a;

            return _this30.snack.open(((_a = e.error) === null || _a === void 0 ? void 0 : _a.message) || 'שגיאה', 'סגור', {
              duration: 4000
            });
          });
        }
      }]);
    }();

    NpsRequestDetailPageComponent.ɵfac = function NpsRequestDetailPageComponent_Factory(t) {
      return new (t || NpsRequestDetailPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_1__["ActivatedRoute"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__["MatSnackBar"]));
    };

    NpsRequestDetailPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsRequestDetailPageComponent,
      selectors: [["app-nps-request-detail-page"]],
      decls: 7,
      vars: 6,
      consts: [[3, "status", 4, "ngIf"], [1, "meta-line"], [3, "steps"], ["class", "actions", 4, "ngIf"], [3, "status"], [1, "actions"], ["appearance", "outline", 1, "wide"], ["matInput", "", 3, "ngModel", "ngModelChange"], ["mat-raised-button", "", "color", "primary", 3, "click"], ["mat-stroked-button", "", "color", "warn", 3, "click"]],
      template: function NpsRequestDetailPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsRequestDetailPageComponent_app_nps_request_status_badge_2_Template, 1, 1, "app-nps-request-status-badge", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "p", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](5, "app-nps-approval-timeline", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](6, NpsRequestDetailPageComponent_div_6_Template, 10, 1, "div", 3);
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"]("\u05D1\u05E7\u05E9\u05D4 #", ctx.detail == null ? null : ctx.detail.RequestID, "");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.detail);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate2"]("\u05E2\u05D5\u05D1\u05D3: ", ctx.detail == null ? null : ctx.detail.EmployeeID, " \xB7 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC: ", ctx.detail == null ? null : ctx.detail.TargetProfileName, "");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("steps", ctx.detail == null ? null : ctx.detail.steps);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", (ctx.detail == null ? null : ctx.detail.Status) === "Pending");
        }
      },
      directives: [_angular_common__WEBPACK_IMPORTED_MODULE_4__["NgIf"], _components_approval_timeline_component__WEBPACK_IMPORTED_MODULE_5__["NpsApprovalTimelineComponent"], _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_6__["NpsRequestStatusBadgeComponent"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__["MatFormField"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__["MatLabel"], _angular_material_input__WEBPACK_IMPORTED_MODULE_8__["MatInput"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["DefaultValueAccessor"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["NgControlStatus"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["NgModel"], _angular_material_button__WEBPACK_IMPORTED_MODULE_10__["MatButton"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 10px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.meta-line[_ngcontent-%COMP%] {\n  margin: 10px 0 14px;\n  color: var(--nps-muted);\n}\n\n.actions[_ngcontent-%COMP%] {\n  margin-top: 16px;\n  border: 1px solid var(--nps-border);\n  border-radius: 12px;\n  background: var(--nps-surface);\n  box-shadow: var(--nps-shadow-soft);\n  padding: 14px;\n}\n\n.wide[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 400px;\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsRequestDetailPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-request-detail-page',
          templateUrl: './nps-request-detail-page.component.html',
          styleUrls: ['./nps-request-detail-page.component.scss']
        }]
      }], function () {
        return [{
          type: _angular_router__WEBPACK_IMPORTED_MODULE_1__["ActivatedRoute"]
        }, {
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_2__["NpsBaseApiService"]
        }, {
          type: _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_3__["MatSnackBar"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-requests-page.component.ts":
  /*!**********************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-requests-page.component.ts ***!
    \**********************************************************************/

  /*! exports provided: NpsRequestsPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsRequestsPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsRequestsPageComponent", function () {
      return NpsRequestsPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! ../components/request-status-badge.component */
    "./src/app/nps-permissions/components/request-status-badge.component.ts");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");

    function NpsRequestsPageComponent_th_4_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "#");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRequestsPageComponent_td_5_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r10 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r10.RequestID);
      }
    }

    function NpsRequestsPageComponent_th_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E2\u05D5\u05D1\u05D3");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRequestsPageComponent_td_8_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r11 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r11.EmployeeID);
      }
    }

    function NpsRequestsPageComponent_th_10_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E1\u05D8\u05D8\u05D5\u05E1");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRequestsPageComponent_td_11_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](1, "app-nps-request-status-badge", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r12 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("status", r_r12.Status);
      }
    }

    function NpsRequestsPageComponent_th_13_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRequestsPageComponent_td_14_Template(rf, ctx) {
      if (rf & 1) {
        var _r15 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 10);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 12);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRequestsPageComponent_td_14_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r15);

          var r_r13 = ctx.$implicit;

          var ctx_r14 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r14.open(r_r13.RequestID);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "visibility");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRequestsPageComponent_tr_15_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 13);
      }
    }

    function NpsRequestsPageComponent_tr_16_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 14);
      }
    }

    var NpsRequestsPageComponent = /*#__PURE__*/function () {
      function NpsRequestsPageComponent(api, router) {
        _classCallCheck(this, NpsRequestsPageComponent);

        this.api = api;
        this.router = router;
        this.rows = [];
        this.cols = ['RequestID', 'EmployeeID', 'Status', 'Actions'];
        this.employee_id = localStorage.getItem('ID');
      }

      return _createClass(NpsRequestsPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this31 = this;

          this.api.getRequests(this.employee_id || '', '', 0, 100).subscribe(function (r) {
            return _this31.rows = r;
          });
        }
      }, {
        key: "open",
        value: function open(id) {
          this.router.navigate(['/nps-permissions/requests', id]);
        }
      }]);
    }();

    NpsRequestsPageComponent.ɵfac = function NpsRequestsPageComponent_Factory(t) {
      return new (t || NpsRequestsPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]));
    };

    NpsRequestsPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsRequestsPageComponent,
      selectors: [["app-nps-requests-page"]],
      decls: 17,
      vars: 3,
      consts: [["mat-table", "", 1, "mat-elevation-z2", "full", "nps-table", 3, "dataSource"], ["matColumnDef", "RequestID"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "EmployeeID"], ["matColumnDef", "Status"], ["matColumnDef", "Actions"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], [3, "status"], ["mat-icon-button", "", "color", "primary", 3, "click"], ["mat-header-row", ""], ["mat-row", ""]],
      template: function NpsRequestsPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05D1\u05E7\u05E9\u05D5\u05EA (\u05DE\u05E0\u05D4\u05DC)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "table", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](3, 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](4, NpsRequestsPageComponent_th_4_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](5, NpsRequestsPageComponent_td_5_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](6, 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsRequestsPageComponent_th_7_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](8, NpsRequestsPageComponent_td_8_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](9, 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](10, NpsRequestsPageComponent_th_10_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](11, NpsRequestsPageComponent_td_11_Template, 2, 1, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](12, 6);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](13, NpsRequestsPageComponent_th_13_Template, 2, 0, "th", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](14, NpsRequestsPageComponent_td_14_Template, 4, 0, "td", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](15, NpsRequestsPageComponent_tr_15_Template, 1, 0, "tr", 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](16, NpsRequestsPageComponent_tr_16_Template, 1, 0, "tr", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx.rows);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx.cols);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx.cols);
        }
      },
      directives: [_angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatCell"], _components_request_status_badge_component__WEBPACK_IMPORTED_MODULE_4__["NpsRequestStatusBadgeComponent"], _angular_material_button__WEBPACK_IMPORTED_MODULE_5__["MatButton"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_6__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_3__["MatRow"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\n.full[_ngcontent-%COMP%] {\n  width: 100%;\n  border-radius: 12px;\n  overflow: hidden;\n}\n\n.nps-table[_ngcontent-%COMP%] {\n  border: 1px solid var(--nps-border);\n  box-shadow: var(--nps-shadow-soft);\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsRequestsPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-requests-page',
          templateUrl: './nps-requests-page.component.html',
          styleUrls: ['./nps-requests-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_1__["NpsBaseApiService"]
        }, {
          type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/pages/nps-rules-page.component.ts":
  /*!*******************************************************************!*\
    !*** ./src/app/nps-permissions/pages/nps-rules-page.component.ts ***!
    \*******************************************************************/

  /*! exports provided: NpsRulesPageComponent */

  /***/
  function _src_app_npsPermissions_pages_npsRulesPageComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsRulesPageComponent", function () {
      return NpsRulesPageComponent;
    });
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! rxjs */
    "./node_modules/rxjs/_esm2015/index.js");
    /* harmony import */


    var rxjs_operators__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! rxjs/operators */
    "./node_modules/rxjs/_esm2015/operators/index.js");
    /* harmony import */


    var _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! ../services/nps-base-api.service */
    "./src/app/nps-permissions/services/nps-base-api.service.ts");
    /* harmony import */


    var _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! @angular/material/snack-bar */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/snack-bar.js");
    /* harmony import */


    var _angular_common__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! @angular/common */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/common.js");
    /* harmony import */


    var _angular_material_card__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! @angular/material/card */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/card.js");
    /* harmony import */


    var _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! @angular/material/form-field */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/form-field.js");
    /* harmony import */


    var _angular_material_input__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! @angular/material/input */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/input.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/__ivy_ngcc__/fesm2015/forms.js");
    /* harmony import */


    var _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! @angular/material/autocomplete */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/autocomplete.js");
    /* harmony import */


    var _angular_material_core__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! @angular/material/core */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! @angular/material/checkbox */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/checkbox.js");
    /* harmony import */


    var _angular_material_button__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! @angular/material/button */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/button.js");
    /* harmony import */


    var _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! @angular/material/icon */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/icon.js");
    /* harmony import */


    var _angular_material_table__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(
    /*! @angular/material/table */
    "./node_modules/@angular/material/__ivy_ngcc__/fesm2015/table.js");
    /* harmony import */


    var _components_permission_matrix_component__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(
    /*! ../components/permission-matrix.component */
    "./src/app/nps-permissions/components/permission-matrix.component.ts");

    function NpsRulesPageComponent_div_2_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 20);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2, "info");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "span");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, "\u05D0\u05D9\u05DF \u05DB\u05DC\u05DC\u05D9\u05DD \u05DE\u05D5\u05D2\u05D3\u05E8\u05D9\u05DD. \u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 \u05DB\u05DC\u05DC \u05D7\u05D3\u05E9 \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05D4\u05D8\u05D5\u05E4\u05E1 \u05DC\u05DE\u05D8\u05D4.");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRulesPageComponent_div_3_th_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 32);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRulesPageComponent_div_3_td_4_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 33);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r24 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r24.ProfileName);
      }
    }

    function NpsRulesPageComponent_div_3_th_6_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 32);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E7\u05D1\u05D5\u05E6\u05EA \u05E4\u05E2\u05D5\u05DC\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRulesPageComponent_div_3_td_7_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 33);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r25 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r25.ActionSubject);
      }
    }

    function NpsRulesPageComponent_div_3_th_9_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 32);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DB\u05DE\u05D5\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05DE\u05D0\u05D5\u05E9\u05E8\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRulesPageComponent_div_3_td_10_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 33);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r26 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](r_r26.GrantedPermissionsCount);
      }
    }

    function NpsRulesPageComponent_div_3_th_12_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 32);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05E2\u05E8\u05D9\u05DB\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRulesPageComponent_div_3_td_13_Template(rf, ctx) {
      if (rf & 1) {
        var _r29 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 33);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 34);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_div_3_td_13_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r29);

          var r_r27 = ctx.$implicit;

          var ctx_r28 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](2);

          return ctx_r28.editSummaryRule(r_r27);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "edit");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r27 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("disabled", !r_r27.RuleID || !r_r27.ProfileID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵattribute"]("aria-label", "\u05E2\u05E8\u05D9\u05DB\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05DC\u05DB\u05DC\u05DC " + (r_r27.ProfileName || ""));
      }
    }

    function NpsRulesPageComponent_div_3_th_15_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "th", 32);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DE\u05D7\u05D9\u05E7\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }
    }

    function NpsRulesPageComponent_div_3_td_16_Template(rf, ctx) {
      if (rf & 1) {
        var _r32 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "td", 33);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "button", 34);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_div_3_td_16_Template_button_click_1_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r32);

          var r_r30 = ctx.$implicit;

          var ctx_r31 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"](2);

          return ctx_r31.removeSummaryRule(r_r30);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "mat-icon");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "delete");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var r_r30 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("disabled", !r_r30.RuleID);
      }
    }

    function NpsRulesPageComponent_div_3_tr_17_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 35);
      }
    }

    function NpsRulesPageComponent_div_3_tr_18_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](0, "tr", 36);
      }
    }

    function NpsRulesPageComponent_div_3_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 21);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "table", 22);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](2, 23);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsRulesPageComponent_div_3_th_3_Template, 2, 0, "th", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](4, NpsRulesPageComponent_div_3_td_4_Template, 2, 1, "td", 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](5, 26);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](6, NpsRulesPageComponent_div_3_th_6_Template, 2, 0, "th", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](7, NpsRulesPageComponent_div_3_td_7_Template, 2, 1, "td", 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](8, 27);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](9, NpsRulesPageComponent_div_3_th_9_Template, 2, 0, "th", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](10, NpsRulesPageComponent_div_3_td_10_Template, 2, 1, "td", 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](11, 28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](12, NpsRulesPageComponent_div_3_th_12_Template, 2, 0, "th", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](13, NpsRulesPageComponent_div_3_td_13_Template, 4, 2, "td", 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](14, 29);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](15, NpsRulesPageComponent_div_3_th_15_Template, 2, 0, "th", 24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](16, NpsRulesPageComponent_div_3_td_16_Template, 4, 1, "td", 25);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](17, NpsRulesPageComponent_div_3_tr_17_Template, 1, 0, "tr", 30);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](18, NpsRulesPageComponent_div_3_tr_18_Template, 1, 0, "tr", 31);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("dataSource", ctx_r1.rules);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matHeaderRowDef", ctx_r1.cols);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("matRowDefColumns", ctx_r1.cols);
      }
    }

    function NpsRulesPageComponent_mat_card_4_Template(rf, ctx) {
      if (rf & 1) {
        var _r35 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-card", 37);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "mat-card-title");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "mat-card-content");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "p", 38);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](5, " \u05D4\u05E9\u05DE\u05D9\u05E8\u05D4 \u05DE\u05E2\u05D3\u05DB\u05E0\u05EA \u05D0\u05EA \u05DB\u05DC \u05D4\u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05E9\u05DC \u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC ");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "strong");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](7);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](8, " \u05D1\u05DB\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA, \u05DC\u05D0 \u05E8\u05E7 \u05E2\u05D1\u05D5\u05E8 \u05E9\u05D5\u05E8\u05EA \u05D4\u05DB\u05DC\u05DC \u05D4\u05D6\u05D5. ");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](9, "div", 39);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "div", 40);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](11, "\u05D4\u05E7\u05E9\u05E8 \u05D4\u05DB\u05DC\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "ul", 41);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](13, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](15, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](17, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](18, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](19, "\u05DE\u05D7\u05DC\u05E7\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](20);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](21, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](22, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](23, "\u05D4\u05E9\u05DB\u05DC\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](24);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](25, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](26, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](27, "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](28);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](29, "app-nps-permission-matrix", 43);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("matrixChange", function NpsRulesPageComponent_mat_card_4_Template_app_nps_permission_matrix_matrixChange_29_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r35);

          var ctx_r34 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r34.onEditMatrix($event);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](30, "div", 44);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](31, "button", 45);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_mat_card_4_Template_button_click_31_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r35);

          var ctx_r36 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r36.saveEditRuleMatrix();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](32, "\u05E9\u05DE\u05D5\u05E8 \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](33, "button", 46);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_mat_card_4_Template_button_click_33_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r35);

          var ctx_r37 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r37.cancelEditRule();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](34, "\u05D1\u05D9\u05D8\u05D5\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var ctx_r2 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"]("\u05E2\u05E8\u05D9\u05DB\u05EA \u05DE\u05D8\u05E8\u05D9\u05E6\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u2014 \u05DB\u05DC\u05DC ", ctx_r2.profileName(ctx_r2.editingRule.ProfileID), "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](5);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](ctx_r2.profileName(ctx_r2.editingRule.ProfileID));

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](9);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r2.profileName(ctx_r2.editingRule.ProfileID), "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r2.deptLabel(ctx_r2.editingRule), "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r2.educationLabel(ctx_r2.editingRule.EducationID), "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r2.specialtyLabel(ctx_r2.ruleSpecialtyId(ctx_r2.editingRule)), "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("permissions", ctx_r2.perms)("permissionCards", ctx_r2.editMatrixCards)("profilePermissions", ctx_r2.editPp)("preferCards", true);
      }
    }

    function NpsRulesPageComponent_mat_option_15_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var p_r38 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", p_r38.ProfileID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](p_r38.ProfileName);
      }
    }

    function NpsRulesPageComponent_mat_option_22_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var d_r39 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", d_r39.DepartnentCode);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate2"](" ", d_r39.DepartnentDescripton, " (", d_r39.DepartnentCode, ") ");
      }
    }

    function NpsRulesPageComponent_mat_option_31_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var e_r40 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", e_r40.EducationID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](e_r40.EducationSubject);
      }
    }

    function NpsRulesPageComponent_mat_option_40_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "mat-option", 11);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
      }

      if (rf & 2) {
        var s_r41 = ctx.$implicit;

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", s_r41.SpecialtyID);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate"](s_r41.Speciality);
      }
    }

    function NpsRulesPageComponent_ng_container_54_Template(rf, ctx) {
      if (rf & 1) {
        var _r43 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵgetCurrentView"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerStart"](0);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](1, "div", 39);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](2, "div", 40);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](3, "\u05D4\u05E7\u05E9\u05E8 \u05D4\u05DB\u05DC\u05DC \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](4, "ul", 41);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](7, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](9, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](11, "\u05DE\u05D7\u05DC\u05E7\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](12);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](13, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](14, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](15, "\u05D4\u05E9\u05DB\u05DC\u05D4");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](16);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](17, "li");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](18, "span", 42);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](19, "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](20);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](21, "app-nps-permission-matrix", 43);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("matrixChange", function NpsRulesPageComponent_ng_container_54_Template_app_nps_permission_matrix_matrixChange_21_listener($event) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r43);

          var ctx_r42 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r42.onMatrix($event);
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](22, "div", 44);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](23, "button", 45);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_ng_container_54_Template_button_click_23_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r43);

          var ctx_r44 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r44.saveMatrixPerms();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](24, "\u05E9\u05DE\u05D5\u05E8 \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](25, "button", 46);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_ng_container_54_Template_button_click_25_listener() {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵrestoreView"](_r43);

          var ctx_r45 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

          return ctx_r45.cancelMatrixAttachment();
        });

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](26, "\u05D1\u05D8\u05DC \u05E6\u05E8\u05E3");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementContainerEnd"]();
      }

      if (rf & 2) {
        var ctx_r11 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵnextContext"]();

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](8);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r11.profileInput || "\u2014", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r11.deptInput || "\u2014", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r11.eduInput || "\u2014", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtextInterpolate1"](" ", ctx_r11.specInput || "\u2014", "");

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("permissions", ctx_r11.perms)("permissionCards", ctx_r11.matrixCards)("profilePermissions", ctx_r11.pp)("preferCards", true);
      }
    }
    /** Sentinel for mat-option "כללי" rows (distinct from real DB ids). */


    var NPS_GENERAL = '__nps_general__';

    var NpsRulesPageComponent = /*#__PURE__*/function () {
      function NpsRulesPageComponent(api, snack) {
        _classCallCheck(this, NpsRulesPageComponent);

        this.api = api;
        this.snack = snack;
        this.generalToken = NPS_GENERAL;
        this.rules = [];
        this.profiles = [];
        this.departments = [];
        this.educations = [];
        /** All specialties (no filter) — used to resolve names in the rules table. */

        this.specialtyLookup = [];
        /** Specialties for the “new rule” form; loaded from the server when an education is chosen. */

        this.formSpecialties = [];
        this.cols = ['profileName', 'actionSubject', 'grantedCount', 'edit', 'del'];
        this.newRule = {
          ProfileID: null,
          DepartnentCode: '',
          EducationID: '',
          SpecialtyID: '',
          IsActive: true
        };
        /** Bound to autocomplete inputs (display / filter text). */

        this.profileInput = '';
        this.deptInput = '';
        this.eduInput = '';
        this.specInput = '';
        /** Permission matrix: shown only after “attach”, scoped visually to full rule context (saved per profile on server). */

        this.perms = [];
        this.matrixCards = [];
        this.pp = [];
        this.matrixAttached = false;
        /** Snapshot when user attached; if rule fields diverge, matrix is cleared. */

        this.attachedContext = null;
        this.matrix = [];
        /** Table row edit: separate state from new-rule attach flow. */

        this.editingRule = null;
        this.editMatrixCards = [];
        this.editPp = [];
        this.editMatrix = [];
        /** Ignores stale responses when education changes quickly. */

        this.specialtiesRequestSerial = 0;
        this.employee_id = localStorage.getItem('ID') || '';
      }

      return _createClass(NpsRulesPageComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          var _this32 = this;

          Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["forkJoin"])({
            profiles: this.api.getProfiles(this.employee_id),
            departments: this.api.getDepartments(this.employee_id),
            educations: this.api.getEducations(this.employee_id),
            specialtyLookup: this.api.getSpecialties(this.employee_id, ''),
            permissions: this.api.getPermissions(this.employee_id)
          }).subscribe(function (_ref7) {
            var profiles = _ref7.profiles,
                departments = _ref7.departments,
                educations = _ref7.educations,
                specialtyLookup = _ref7.specialtyLookup,
                permissions = _ref7.permissions;
            _this32.profiles = profiles;
            _this32.departments = departments;
            _this32.educations = educations;
            _this32.specialtyLookup = specialtyLookup;
            _this32.perms = permissions.filter(function (z) {
              return z.IsActive;
            });

            _this32.loadFormSpecialties();
          });
          this.reload();
        }
      }, {
        key: "filteredProfiles",
        get: function get() {
          var q = (this.profileInput || '').trim().toLowerCase();

          if (!q) {
            return this.profiles;
          }

          return this.profiles.filter(function (p) {
            return p.ProfileName.toLowerCase().includes(q) || String(p.ProfileID).includes(q);
          });
        }
      }, {
        key: "filteredDepartments",
        get: function get() {
          var q = (this.deptInput || '').trim().toLowerCase();

          if (!q) {
            return this.departments;
          }

          return this.departments.filter(function (d) {
            return (d.DepartnentDescripton || '').toLowerCase().includes(q) || (d.DepartnentCode || '').toLowerCase().includes(q);
          });
        }
      }, {
        key: "filteredEducations",
        get: function get() {
          var q = (this.eduInput || '').trim().toLowerCase();

          if (!q) {
            return this.educations;
          }

          return this.educations.filter(function (e) {
            return e.EducationSubject.toLowerCase().includes(q) || String(e.EducationID).includes(q) || e.EducationSubject && e.EducationSubject.toLowerCase().includes(q);
          });
        }
        /**
         * Loads specialties for the new-rule form: server filter by `educationId`, or full catalog when education is “כללי”.
         */

      }, {
        key: "loadFormSpecialties",
        value: function loadFormSpecialties() {
          var _this33 = this;

          if (this.newRule.EducationID == null) {
            this.formSpecialties = this.specialtyLookup.length ? _toConsumableArray(this.specialtyLookup) : [];
            this.pruneSpecialtyIfInvalid();
            return;
          }

          var educationId = String(this.newRule.EducationID);
          var serial = ++this.specialtiesRequestSerial;
          this.api.getSpecialties(this.employee_id, educationId).subscribe(function (list) {
            if (serial !== _this33.specialtiesRequestSerial) {
              return;
            }

            _this33.formSpecialties = list;

            _this33.pruneSpecialtyIfInvalid();
          });
        }
      }, {
        key: "pruneSpecialtyIfInvalid",
        value: function pruneSpecialtyIfInvalid() {
          var _this34 = this;

          var fe = this.formSpecialties;

          if (this.newRule.SpecialtyID != null && !fe.some(function (s) {
            return s.SpecialtyID === String(_this34.newRule.SpecialtyID);
          })) {
            this.newRule.SpecialtyID = null;
            this.specInput = '';
          }
        }
      }, {
        key: "filteredSpecialtiesForAutocomplete",
        get: function get() {
          var base = this.formSpecialties;
          var q = (this.specInput || '').trim().toLowerCase();

          if (!q) {
            return base;
          }

          return base.filter(function (s) {
            return s.Speciality.toLowerCase().includes(q) || String(s.SpecialtyID).includes(q) || s.SpecialtyCode && s.SpecialtyCode.toLowerCase().includes(q);
          });
        }
        /** Profile + department + education + specialty (כללי counts as chosen). */

      }, {
        key: "canAttachPermissionMatrix",
        value: function canAttachPermissionMatrix() {
          var _a, _b;

          if (this.newRule.ProfileID == null || !String(this.newRule.DepartnentCode || '').trim()) {
            return false;
          }

          var eduOk = ((_a = this.eduInput) === null || _a === void 0 ? void 0 : _a.trim().length) > 0;
          var specOk = ((_b = this.specInput) === null || _b === void 0 ? void 0 : _b.trim().length) > 0;
          return eduOk && specOk;
        }
        /** Loads the matrix when the rule context is complete. Pass `true` to show validation snack (e.g. legacy manual trigger). */

      }, {
        key: "attachPermissionMatrix",
        value: function attachPermissionMatrix() {
          var _this35 = this;

          var showValidationSnack = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

          var _a, _b;

          if (!this.canAttachPermissionMatrix()) {
            if (showValidationSnack) {
              this.snack.open('מלאו פרופיל, מחלקה, השכלה והתמחות (או כללי) ואז צרפו את המטריצה', 'סגור', {
                duration: 3500
              });
            }

            return;
          }

          var pid = this.newRule.ProfileID;

          if (pid == null) {
            return;
          }

          this.clearEditRule();
          this.matrixAttached = true;
          this.attachedContext = this.captureRuleContext();
          this.matrix = [];
          this.api.getProfilePermissionsByRuleContext(this.employee_id, {
            ProfileID: pid,
            departmentCode: String(this.newRule.DepartnentCode || ''),
            EducationID: (_a = this.newRule.EducationID) !== null && _a !== void 0 ? _a : null,
            SpecialtyID: (_b = this.newRule.SpecialtyID) !== null && _b !== void 0 ? _b : null
          }).subscribe(function (x) {
            _this35.matrixCards = x || [];
            _this35.pp = _this35.flattenCardsToProfilePermissions(_this35.matrixCards, pid);
          });
        }
        /** Opens the matrix as soon as all required fields are set; skips redundant refetch for the same context. */

      }, {
        key: "tryAutoAttachPermissionMatrix",
        value: function tryAutoAttachPermissionMatrix() {
          if (!this.canAttachPermissionMatrix() || this.editingRule != null) {
            return;
          }

          var cur = this.captureRuleContext();

          if (this.matrixAttached && this.attachedContext && this.contextsEqual(this.attachedContext, cur)) {
            return;
          }

          this.attachPermissionMatrix(false);
        }
      }, {
        key: "cancelMatrixAttachment",
        value: function cancelMatrixAttachment() {
          this.clearMatrixAttachment();
        }
      }, {
        key: "captureRuleContext",
        value: function captureRuleContext() {
          return {
            profileId: this.newRule.ProfileID,
            departmentCode: String(this.newRule.DepartnentCode || ''),
            educationId: this.newRule.EducationID,
            specialtyId: this.newRule.SpecialtyID
          };
        }
      }, {
        key: "contextsEqual",
        value: function contextsEqual(a, b) {
          return a.profileId === b.profileId && a.departmentCode === b.departmentCode && a.educationId === b.educationId && a.specialtyId === b.specialtyId;
        }
      }, {
        key: "maybeInvalidateMatrixAttachment",
        value: function maybeInvalidateMatrixAttachment() {
          if (!this.matrixAttached || !this.attachedContext) {
            return;
          }

          var cur = this.captureRuleContext();

          if (!this.contextsEqual(this.attachedContext, cur)) {
            this.clearMatrixAttachment();
            this.snack.open('שיניתם את הקשר — מטריצת ההרשאות מתעדכנת', 'סגור', {
              duration: 3000
            });
          }
        }
      }, {
        key: "clearMatrixAttachment",
        value: function clearMatrixAttachment() {
          this.matrixAttached = false;
          this.attachedContext = null;
          this.matrixCards = [];
          this.pp = [];
          this.matrix = [];
        }
      }, {
        key: "flattenCardsToProfilePermissions",
        value: function flattenCardsToProfilePermissions(cards, profileId) {
          var list = [];
          (cards || []).forEach(function (card) {
            (card.Permissions || []).forEach(function (perm) {
              list.push({
                ProfileID: profileId,
                PermissionID: perm.PermissionID,
                IsGranted: !!perm.IsGranted
              });
            });
          });
          return list;
        }
      }, {
        key: "ensureRuleForContext",
        value: function ensureRuleForContext(profileID, departmentCode, educationID, specialtyID) {
          var isActive = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;
          return this.api.postProfileRule(this.employee_id, {
            ProfileID: profileID,
            departmentCode: String(departmentCode || ''),
            EducationID: educationID,
            SpecialtyID: specialtyID,
            isActive: isActive
          }).pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_2__["map"])(function () {
            return void 0;
          }));
        }
      }, {
        key: "onMatrix",
        value: function onMatrix(v) {
          this.matrix = v;
        }
      }, {
        key: "onEditMatrix",
        value: function onEditMatrix(v) {
          this.editMatrix = v;
        }
      }, {
        key: "startEditRule",
        value: function startEditRule(r) {
          var _this36 = this;

          this.clearMatrixAttachment();
          this.editingRule = r;
          this.editMatrixCards = [];
          this.editMatrix = [];
          this.api.getProfilePermissionsByRuleContext(this.employee_id, {
            ProfileID: r.ProfileID,
            departmentCode: String(r.DepartnentCode || r.DepartmentCode || ''),
            EducationID: String(r.EducationID),
            SpecialtyID: String(this.ruleSpecialtyId(r))
          }).subscribe(function (cards) {
            _this36.editMatrixCards = cards || [];
            _this36.editPp = _this36.flattenCardsToProfilePermissions(_this36.editMatrixCards, r.ProfileID);
          });
        }
      }, {
        key: "cancelEditRule",
        value: function cancelEditRule() {
          this.clearEditRule();
        }
      }, {
        key: "clearEditRule",
        value: function clearEditRule() {
          this.editingRule = null;
          this.editMatrixCards = [];
          this.editPp = [];
          this.editMatrix = [];
        }
      }, {
        key: "saveEditRuleMatrix",
        value: function saveEditRuleMatrix() {
          var _this37 = this;

          if (this.editingRule == null) {
            return;
          }

          var rule = this.editingRule;
          var pid = rule.ProfileID;
          var fallback = this.editMatrixCards.length ? this.flattenCardsToProfilePermissions(this.editMatrixCards, pid) : this.editPp;
          var body = this.editMatrix.length ? this.editMatrix : fallback.map(function (x) {
            return {
              PermissionID: x.PermissionID,
              IsGranted: x.IsGranted
            };
          });
          this.ensureRuleForContext(pid, String(rule.DepartnentCode || rule.DepartmentCode || ''), String(rule.EducationID), String(this.ruleSpecialtyId(rule)), true).pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_2__["switchMap"])(function () {
            return _this37.api.putProfilePermissions(_this37.employee_id, pid, body);
          })).subscribe(function () {
            return _this37.snack.open('הרשאות נשמרו', 'סגור', {
              duration: 2000
            });
          });
        }
      }, {
        key: "saveMatrixPerms",
        value: function saveMatrixPerms() {
          var _this38 = this;

          if (!this.matrixAttached || this.newRule.ProfileID == null) {
            return;
          }

          var pid = this.newRule.ProfileID;
          var body = this.matrix.length ? this.matrix : this.flattenCardsToProfilePermissions(this.matrixCards, pid).map(function (x) {
            return {
              PermissionID: x.PermissionID,
              IsGranted: x.IsGranted
            };
          });
          this.ensureRuleForContext(pid, this.newRule.DepartnentCode, this.newRule.EducationID, this.newRule.SpecialtyID, this.newRule.IsActive).pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_2__["switchMap"])(function () {
            return _this38.api.putProfilePermissions(_this38.employee_id, pid, body);
          })).subscribe(function () {
            _this38.snack.open('הרשאות נשמרו', 'סגור', {
              duration: 2000
            });

            _this38.reload();

            _this38.clearMatrixAttachment();
          }, function (error) {
            _this38.snack.open('אירעה שגיאה בשמירת הרשאות', 'סגור', {
              duration: 2000
            });
          });
        }
      }, {
        key: "onProfileInput",
        value: function onProfileInput() {
          if (!this.profileInput) {
            this.newRule.ProfileID = null;
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "onDeptInput",
        value: function onDeptInput() {
          var _a;

          if (!((_a = this.deptInput) === null || _a === void 0 ? void 0 : _a.trim())) {
            this.newRule.DepartnentCode = '';
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "onEduInput",
        value: function onEduInput() {
          var _a;

          if (!((_a = this.eduInput) === null || _a === void 0 ? void 0 : _a.trim())) {
            this.newRule.EducationID = null;
            this.loadFormSpecialties();
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "onSpecInput",
        value: function onSpecInput() {
          if (!this.specInput) {
            this.newRule.SpecialtyID = null;
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "selectProfile",
        value: function selectProfile(id) {
          var p = this.profiles.find(function (x) {
            return x.ProfileID === id;
          });

          if (p) {
            this.newRule.ProfileID = id;
            this.newRule.DepartnentCode = p.DepartnentCode;
            this.newRule.EducationID = p.EducationID;
            this.newRule.SpecialtyID = p.SpecialityID;
            this.profileInput = p.ProfileName;
            this.selectDepartment(p.DepartnentCode);
            this.selectEducation(p.EducationID);
            this.selectSpecialty(p.SpecialityID);
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "selectDepartment",
        value: function selectDepartment(code) {
          var d = this.departments.find(function (x) {
            return x.DepartnentCode === code;
          });

          if (d) {
            this.newRule.DepartnentCode = code;
            this.deptInput = d.DepartnentDescripton;
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "selectEducation",
        value: function selectEducation(value) {
          if (value === NPS_GENERAL) {
            this.newRule.EducationID = null;
            this.eduInput = '(כללי)';
          } else {
            var idStr = String(value);
            var n = Number(idStr);
            this.newRule.EducationID = String(Number.isFinite(n) ? n : null);
            var e = this.educations.find(function (x) {
              return x.EducationID === idStr;
            });
            this.eduInput = e ? e.EducationSubject : '';
          }

          this.loadFormSpecialties();
          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "selectSpecialty",
        value: function selectSpecialty(value) {
          if (value === NPS_GENERAL) {
            this.newRule.SpecialtyID = null;
            this.specInput = '(כללי)';
          } else {
            var idStr = String(value);
            var n = Number(idStr);
            this.newRule.SpecialtyID = String(Number.isFinite(n) ? n : null);
            var s = this.formSpecialties.find(function (x) {
              return x.SpecialtyID == idStr;
            });
            this.specInput = s ? s.Speciality : '';
          }

          this.maybeInvalidateMatrixAttachment();
          this.tryAutoAttachPermissionMatrix();
        }
      }, {
        key: "reload",
        value: function reload() {
          var _this39 = this;

          this.api.getProfileRules(this.employee_id).subscribe(function (r) {
            return _this39.rules = r;
          });
        }
      }, {
        key: "profileName",
        value: function profileName(pid) {
          var p = this.profiles.find(function (x) {
            return x.ProfileID === pid;
          });
          return p ? p.ProfileName : String(pid);
        }
      }, {
        key: "deptLabel",
        value: function deptLabel(r) {
          var code = r.DepartnentCode || r.DepartmentCode || '';
          var d = this.departments.find(function (x) {
            return x.DepartnentCode === code;
          });
          return d ? d.DepartnentDescripton : code;
        }
      }, {
        key: "educationLabel",
        value: function educationLabel(id) {
          if (id == null) {
            return 'כללי';
          }

          var e = this.educations.find(function (x) {
            return x.EducationID === String(id);
          });
          return e ? e.EducationSubject : String(id);
        }
      }, {
        key: "ruleSpecialtyId",
        value: function ruleSpecialtyId(r) {
          var _a;

          return (_a = r.SpecialtyID) !== null && _a !== void 0 ? _a : r.SpecialtyId;
        }
      }, {
        key: "specialtyLabel",
        value: function specialtyLabel(id) {
          if (id == null) {
            return 'כללי';
          }

          var s = this.specialtyLookup.find(function (x) {
            return x.SpecialtyID === String(id);
          });
          return s ? s.Speciality : String(id);
        }
      }, {
        key: "toNullableNumber",
        value: function toNullableNumber(value) {
          if (value == null || value === '') {
            return null;
          }

          var n = Number(value);
          return Number.isFinite(n) ? n : null;
        }
      }, {
        key: "summaryToRule",
        value: function summaryToRule(row) {
          var ruleId = this.toNullableNumber(row.RuleID);
          var profileId = this.toNullableNumber(row.ProfileID);

          if (ruleId == null || profileId == null) {
            return null;
          }

          var educationId = this.toNullableNumber(row.EducationID);
          var specialtyId = this.toNullableNumber(row.SpecialtyID);
          return {
            RuleID: ruleId,
            ProfileID: profileId,
            DepartnentCode: row.DepartnentCode || '',
            EducationID: educationId == null ? undefined : educationId,
            SpecialtyID: specialtyId == null ? undefined : specialtyId,
            IsActive: true,
            EffectiveFrom: '',
            EffectiveTo: '',
            RuleDescription: ''
          };
        }
      }, {
        key: "editSummaryRule",
        value: function editSummaryRule(row) {
          var fullRule = this.summaryToRule(row);

          if (!fullRule) {
            this.snack.open('אין מזהה כלל לשורת הסיכום הזו', 'סגור', {
              duration: 2500
            });
            return;
          }

          this.startEditRule(fullRule);
        }
      }, {
        key: "removeSummaryRule",
        value: function removeSummaryRule(row) {
          var ruleId = this.toNullableNumber(row.RuleID);

          if (ruleId == null) {
            this.snack.open('אין מזהה כלל לשורת הסיכום הזו', 'סגור', {
              duration: 2500
            });
            return;
          }

          this.remove(ruleId);
        }
      }, {
        key: "add",
        value: function add() {
          var _this40 = this;

          if (this.newRule.ProfileID == null || !String(this.newRule.DepartnentCode || '').trim()) {
            this.snack.open('בחרו פרופיל ומחלקה', 'סגור', {
              duration: 2500
            });
            return;
          }

          this.api.postProfileRule(this.employee_id, {
            ProfileID: this.newRule.ProfileID,
            departmentCode: this.newRule.DepartnentCode,
            EducationID: this.newRule.EducationID,
            SpecialtyID: this.newRule.SpecialtyID,
            isActive: this.newRule.IsActive
          }).subscribe(function () {
            _this40.snack.open('נוסף', 'סגור', {
              duration: 2000
            });

            _this40.reload();

            _this40.resetNewRuleForm();
          });
        }
      }, {
        key: "resetNewRuleForm",
        value: function resetNewRuleForm() {
          this.newRule = {
            ProfileID: null,
            DepartnentCode: '',
            EducationID: null,
            SpecialtyID: null,
            IsActive: true
          };
          this.profileInput = '';
          this.deptInput = '';
          this.eduInput = '';
          this.specInput = '';
          this.loadFormSpecialties();
          this.clearMatrixAttachment();
        }
      }, {
        key: "remove",
        value: function remove(id) {
          var _this41 = this;

          var _a;

          if (((_a = this.editingRule) === null || _a === void 0 ? void 0 : _a.RuleID) === id) {
            this.clearEditRule();
          }

          this.api.deleteProfileRule(this.employee_id, id).subscribe(function () {
            return _this41.reload();
          });
        }
      }]);
    }();

    NpsRulesPageComponent.ɵfac = function NpsRulesPageComponent_Factory(t) {
      return new (t || NpsRulesPageComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_3__["NpsBaseApiService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdirectiveInject"](_angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_4__["MatSnackBar"]));
    };

    NpsRulesPageComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: NpsRulesPageComponent,
      selectors: [["app-nps-rules-page"]],
      decls: 55,
      vars: 19,
      consts: [["class", "empty-banner", "role", "status", 4, "ngIf"], ["class", "rules-table-wrap", 4, "ngIf"], ["class", "form-card edit-rule-matrix-card", 4, "ngIf"], [1, "form-card"], ["appearance", "outline"], ["matInput", "", "placeholder", "\u05D4\u05E7\u05DC\u05D3 \u05DC\u05D7\u05D9\u05E4\u05D5\u05E9\u2026", 3, "ngModel", "matAutocomplete", "ngModelChange"], ["autoActiveFirstOption", "", 3, "optionSelected"], ["profileAuto", "matAutocomplete"], [3, "value", 4, "ngFor", "ngForOf"], ["deptAuto", "matAutocomplete"], ["eduAuto", "matAutocomplete"], [3, "value"], ["specAuto", "matAutocomplete"], [3, "ngModel", "ngModelChange"], [1, "form-actions-row"], ["mat-raised-button", "", "color", "primary", 3, "click"], [1, "matrix-divider"], [1, "matrix-section-title", "inline"], [1, "matrix-hint"], [4, "ngIf"], ["role", "status", 1, "empty-banner"], [1, "rules-table-wrap"], ["mat-table", "", 1, "mat-elevation-z2", "full", 3, "dataSource"], ["matColumnDef", "profileName"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "actionSubject"], ["matColumnDef", "grantedCount"], ["matColumnDef", "edit"], ["matColumnDef", "del"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", 4, "matRowDef", "matRowDefColumns"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-icon-button", "", "type", "button", 3, "disabled", "click"], ["mat-header-row", ""], ["mat-row", ""], [1, "form-card", "edit-rule-matrix-card"], [1, "edit-matrix-warning"], [1, "rule-context-summary", "mat-elevation-z1"], [1, "rule-context-title"], [1, "rule-context-list"], [1, "k"], [3, "permissions", "permissionCards", "profilePermissions", "preferCards", "matrixChange"], [1, "matrix-actions"], ["mat-raised-button", "", "color", "accent", "type", "button", 3, "click"], ["mat-button", "", "type", "button", 3, "click"]],
      template: function NpsRulesPageComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "h1");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "\u05DB\u05DC\u05DC\u05D9 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](2, NpsRulesPageComponent_div_2_Template, 5, 0, "div", 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](3, NpsRulesPageComponent_div_3_Template, 19, 3, "div", 1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](4, NpsRulesPageComponent_mat_card_4_Template, 35, 10, "mat-card", 2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](5, "mat-card", 3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](6, "mat-card-title");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](7, "\u05DB\u05DC\u05DC \u05D7\u05D3\u05E9");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](8, "mat-card-content");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](9, "mat-form-field", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](10, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](11, "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](12, "input", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_12_listener($event) {
            return ctx.profileInput = $event;
          })("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_12_listener() {
            return ctx.onProfileInput();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](13, "mat-autocomplete", 6, 7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("optionSelected", function NpsRulesPageComponent_Template_mat_autocomplete_optionSelected_13_listener($event) {
            return ctx.selectProfile($event.option.value);
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](15, NpsRulesPageComponent_mat_option_15_Template, 2, 2, "mat-option", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](16, "mat-form-field", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](17, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](18, "\u05DE\u05D7\u05DC\u05E7\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](19, "input", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_19_listener($event) {
            return ctx.deptInput = $event;
          })("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_19_listener() {
            return ctx.onDeptInput();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](20, "mat-autocomplete", 6, 9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("optionSelected", function NpsRulesPageComponent_Template_mat_autocomplete_optionSelected_20_listener($event) {
            return ctx.selectDepartment($event.option.value);
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](22, NpsRulesPageComponent_mat_option_22_Template, 2, 3, "mat-option", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](23, "mat-form-field", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](24, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](25, "\u05D4\u05E9\u05DB\u05DC\u05D4");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](26, "input", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_26_listener($event) {
            return ctx.eduInput = $event;
          })("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_26_listener() {
            return ctx.onEduInput();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](27, "mat-autocomplete", 6, 10);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("optionSelected", function NpsRulesPageComponent_Template_mat_autocomplete_optionSelected_27_listener($event) {
            return ctx.selectEducation($event.option.value);
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](29, "mat-option", 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](30, "(\u05DB\u05DC\u05DC\u05D9)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](31, NpsRulesPageComponent_mat_option_31_Template, 2, 2, "mat-option", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](32, "mat-form-field", 4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](33, "mat-label");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](34, "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](35, "input", 5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_35_listener($event) {
            return ctx.specInput = $event;
          })("ngModelChange", function NpsRulesPageComponent_Template_input_ngModelChange_35_listener() {
            return ctx.onSpecInput();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](36, "mat-autocomplete", 6, 12);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("optionSelected", function NpsRulesPageComponent_Template_mat_autocomplete_optionSelected_36_listener($event) {
            return ctx.selectSpecialty($event.option.value);
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](38, "mat-option", 11);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](39, "(\u05DB\u05DC\u05DC\u05D9)");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](40, NpsRulesPageComponent_mat_option_40_Template, 2, 2, "mat-option", 8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](41, "mat-checkbox", 13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("ngModelChange", function NpsRulesPageComponent_Template_mat_checkbox_ngModelChange_41_listener($event) {
            return ctx.newRule.IsActive = $event;
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](42, "\u05E4\u05E2\u05D9\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](43, "div", 14);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](44, "button", 15);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵlistener"]("click", function NpsRulesPageComponent_Template_button_click_44_listener() {
            return ctx.add();
          });

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](45, "\u05D4\u05D5\u05E1\u05E3 \u05DB\u05DC\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](46, "hr", 16);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](47, "h2", 17);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](48, "\u05DE\u05D8\u05E8\u05D9\u05E6\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05DC\u05E4\u05D9 \u05D4\u05E7\u05E9\u05E8 \u05D4\u05DB\u05DC\u05DC");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](49, "p", 18);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](50, " \u05DE\u05DC\u05D0\u05D5 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC, \u05DE\u05D7\u05DC\u05E7\u05D4, \u05D4\u05E9\u05DB\u05DC\u05D4 \u05D5\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA (\u05D0\u05D5 ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](51, "strong");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](52, "\u05DB\u05DC\u05DC\u05D9");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](53, ") \u2014 \u05DE\u05D8\u05E8\u05D9\u05E6\u05EA \u05D4\u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05EA\u05D5\u05E6\u05D2 \u05DB\u05D0\u05DF \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA. \u05D4\u05D4\u05E8\u05E9\u05D0\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5\u05EA \u05D1\u05E9\u05E8\u05EA \u05DC\u05E4\u05D9 \u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC; \u05DB\u05D0\u05DF \u05DE\u05D5\u05E6\u05D2 \u05D4\u05E7\u05E9\u05E8 \u05D4\u05DE\u05DC\u05D0 \u05E9\u05DC \u05D4\u05DB\u05DC\u05DC. ");

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtemplate"](54, NpsRulesPageComponent_ng_container_54_Template, 27, 8, "ng-container", 19);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        }

        if (rf & 2) {
          var _r3 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](14);

          var _r5 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](21);

          var _r7 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](28);

          var _r9 = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵreference"](37);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.rules.length === 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.rules.length > 0);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.editingRule);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](8);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.profileInput)("matAutocomplete", _r3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.filteredProfiles);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.deptInput)("matAutocomplete", _r5);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.filteredDepartments);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.eduInput)("matAutocomplete", _r7);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", ctx.generalToken);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.filteredEducations);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](4);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.specInput)("matAutocomplete", _r9);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](3);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("value", ctx.generalToken);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](2);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngForOf", ctx.filteredSpecialtiesForAutocomplete);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](1);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngModel", ctx.newRule.IsActive);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵadvance"](13);

          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵproperty"]("ngIf", ctx.matrixAttached);
        }
      },
      directives: [_angular_common__WEBPACK_IMPORTED_MODULE_5__["NgIf"], _angular_material_card__WEBPACK_IMPORTED_MODULE_6__["MatCard"], _angular_material_card__WEBPACK_IMPORTED_MODULE_6__["MatCardTitle"], _angular_material_card__WEBPACK_IMPORTED_MODULE_6__["MatCardContent"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__["MatFormField"], _angular_material_form_field__WEBPACK_IMPORTED_MODULE_7__["MatLabel"], _angular_material_input__WEBPACK_IMPORTED_MODULE_8__["MatInput"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["DefaultValueAccessor"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_10__["MatAutocompleteTrigger"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["NgControlStatus"], _angular_forms__WEBPACK_IMPORTED_MODULE_9__["NgModel"], _angular_material_autocomplete__WEBPACK_IMPORTED_MODULE_10__["MatAutocomplete"], _angular_common__WEBPACK_IMPORTED_MODULE_5__["NgForOf"], _angular_material_core__WEBPACK_IMPORTED_MODULE_11__["MatOption"], _angular_material_checkbox__WEBPACK_IMPORTED_MODULE_12__["MatCheckbox"], _angular_material_button__WEBPACK_IMPORTED_MODULE_13__["MatButton"], _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__["MatIcon"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatTable"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatColumnDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatHeaderCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatCellDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatHeaderRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatRowDef"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatHeaderCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatCell"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatHeaderRow"], _angular_material_table__WEBPACK_IMPORTED_MODULE_15__["MatRow"], _components_permission_matrix_component__WEBPACK_IMPORTED_MODULE_16__["NpsPermissionMatrixComponent"]],
      styles: ["h1[_ngcontent-%COMP%] {\n  margin: 0 0 14px;\n  font-size: 28px;\n  color: var(--nps-text);\n}\n\nh2.matrix-section-title[_ngcontent-%COMP%] {\n  margin: 32px 0 8px;\n  font-size: 20px;\n  color: var(--nps-text);\n}\n\nh2.matrix-section-title.inline[_ngcontent-%COMP%] {\n  margin-top: 20px;\n}\n\n.matrix-hint[_ngcontent-%COMP%] {\n  margin: 0 0 12px;\n  color: var(--nps-text-muted, #666);\n  font-size: 14px;\n}\n\n.full[_ngcontent-%COMP%] {\n  width: 100%;\n  border-radius: 12px;\n  overflow: hidden;\n  border: 1px solid var(--nps-border);\n  box-shadow: var(--nps-shadow-soft);\n}\n\n.rules-table-wrap[_ngcontent-%COMP%] {\n  max-height: 400px;\n  overflow: auto;\n  margin-bottom: 8px;\n}\n\n.empty-banner[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 12px;\n  padding: 12px 16px;\n  margin-bottom: 16px;\n  border-radius: 4px;\n  background: #e3f2fd;\n  color: #0d47a1;\n  border: 1px solid #90caf9;\n}\n\n.empty-banner[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n\n.form-card[_ngcontent-%COMP%] {\n  margin-top: 24px;\n  max-width: 960px;\n  border: 1px solid var(--nps-border);\n  border-radius: 12px;\n  box-shadow: var(--nps-shadow-soft);\n  padding-bottom: 100px;\n}\n\n.edit-rule-matrix-card[_ngcontent-%COMP%] {\n  border-color: var(--nps-accent, #1565c0);\n  border-width: 1px;\n}\n\n.edit-matrix-warning[_ngcontent-%COMP%] {\n  margin: 0 0 16px;\n  padding: 10px 12px;\n  border-radius: 8px;\n  background: #fff8e1;\n  color: #5d4037;\n  font-size: 14px;\n  line-height: 1.5;\n}\n\n.form-actions-row[_ngcontent-%COMP%] {\n  margin-top: 12px;\n}\n\n.matrix-divider[_ngcontent-%COMP%] {\n  margin: 24px 0 0;\n  border: none;\n  border-top: 1px solid var(--nps-border);\n}\n\n.rule-context-summary[_ngcontent-%COMP%] {\n  margin-bottom: 16px;\n  padding: 12px 16px;\n  border-radius: 8px;\n  background: var(--nps-surface-elevated, #f5f5f5);\n  border: 1px solid var(--nps-border);\n}\n\n.rule-context-title[_ngcontent-%COMP%] {\n  font-weight: 600;\n  margin-bottom: 8px;\n  color: var(--nps-text);\n}\n\n.rule-context-list[_ngcontent-%COMP%] {\n  margin: 0;\n  padding-inline-start: 18px;\n  line-height: 1.6;\n  color: var(--nps-text);\n}\n\n.rule-context-list[_ngcontent-%COMP%]   .k[_ngcontent-%COMP%] {\n  display: inline-block;\n  min-width: 5.5em;\n  color: var(--nps-text-muted, #666);\n  font-weight: 500;\n}\n\n.matrix-actions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 12px;\n  margin-top: 12px;\n}\n\n.matrix-actions-top[_ngcontent-%COMP%] {\n  margin-bottom: 12px;\n}\n\nmat-form-field.wide[_ngcontent-%COMP%] {\n  min-width: 280px;\n  width: 100%;\n  max-width: 420px;\n}"]
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](NpsRulesPageComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
          selector: 'app-nps-rules-page',
          templateUrl: './nps-rules-page.component.html',
          styleUrls: ['./nps-rules-page.component.scss']
        }]
      }], function () {
        return [{
          type: _services_nps_base_api_service__WEBPACK_IMPORTED_MODULE_3__["NpsBaseApiService"]
        }, {
          type: _angular_material_snack_bar__WEBPACK_IMPORTED_MODULE_4__["MatSnackBar"]
        }];
      }, null);
    })();
    /***/

  },

  /***/
  "./src/app/nps-permissions/services/nps-base-api.service.ts":
  /*!******************************************************************!*\
    !*** ./src/app/nps-permissions/services/nps-base-api.service.ts ***!
    \******************************************************************/

  /*! exports provided: NpsBaseApiService */

  /***/
  function _src_app_npsPermissions_services_npsBaseApiServiceTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "NpsBaseApiService", function () {
      return NpsBaseApiService;
    });
    /* harmony import */


    var _angular_common_http__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! @angular/common/http */
    "./node_modules/@angular/common/__ivy_ngcc__/fesm2015/http.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
    /* harmony import */


    var rxjs_operators__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! rxjs/operators */
    "./node_modules/rxjs/_esm2015/operators/index.js");
    /* harmony import */


    var src_environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! src/environments/environment */
    "./src/environments/environment.ts");
    /**
     * NPS calls RFC `WebService.asmx/<MethodName>` with JSON body (ASP.NET AJAX shape `{ d: ... }`).
     * Set `environment.npsUserId` to the signed-in EP EmployeeID string.
     */


    var NpsBaseApiService = /*#__PURE__*/function () {
      function NpsBaseApiService(http) {
        _classCallCheck(this, NpsBaseApiService);

        this.http = http;
      }

      return _createClass(NpsBaseApiService, [{
        key: "jsonHeaders",
        value: function jsonHeaders() {
          return {
            headers: new _angular_common_http__WEBPACK_IMPORTED_MODULE_0__["HttpHeaders"]({
              'Content-Type': 'application/json; charset=utf-8'
            })
          };
        }
        /** Base: `.../WebService.asmx/` */

      }, {
        key: "wsBase",
        value: function wsBase() {
          var u = src_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].url || '';
          return u.endsWith('/') ? u : "".concat(u, "/");
        }
      }, {
        key: "methodUrl",
        value: function methodUrl(name) {
          return "".concat(this.wsBase()).concat(name);
        }
      }, {
        key: "userId",
        value: function userId() {
          return src_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].npsUserId != null && String(src_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].npsUserId).length > 0 ? String(src_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].npsUserId) : '';
        }
        /** Unwraps ASP.NET ScriptService `{ d: T }` when present. */

      }, {
        key: "unwrap",
        value: function unwrap() {
          return function (r) {
            var x = r;
            return x && x.d !== undefined ? x.d : r;
          };
        }
      }, {
        key: "post",
        value: function post(method, body) {
          var uid = this.userId();

          if (!uid) {
            console.warn('NPS: set environment.npsUserId (EP EmployeeID) for WebService calls.');
          }

          return this.http.post(this.methodUrl(method), Object.assign({
            user_id: uid
          }, body), this.jsonHeaders()).pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_2__["map"])(this.unwrap()));
        }
      }, {
        key: "normalizeEducationRow",
        value: function normalizeEducationRow(raw) {
          var _a, _b, _c;

          var id = (_a = raw.EducationID) !== null && _a !== void 0 ? _a : raw.educationID;
          return {
            EducationID: id,
            EducationSubject: String((_c = (_b = raw.EducationSubject) !== null && _b !== void 0 ? _b : raw.educationSubject) !== null && _c !== void 0 ? _c : '')
          };
        }
      }, {
        key: "normalizeSpecialtyRow",
        value: function normalizeSpecialtyRow(raw) {
          var _a, _b, _c, _d, _e, _f, _g;

          var sid = (_a = raw.SpecialtyID) !== null && _a !== void 0 ? _a : raw.specialtyID;
          var eid = (_b = raw.EducationID) !== null && _b !== void 0 ? _b : raw.educationID;
          return {
            SpecialtyID: String(sid),
            EducationID: eid === undefined || eid === null ? null : eid,
            Speciality: String((_d = (_c = raw.Speciality) !== null && _c !== void 0 ? _c : raw.speciality) !== null && _d !== void 0 ? _d : ''),
            SpecialtyCode: (_e = raw.SpecialtyCode) !== null && _e !== void 0 ? _e : raw.specialtyCode,
            IsActive: (_g = (_f = raw.IsActive) !== null && _f !== void 0 ? _f : raw.isActive) !== null && _g !== void 0 ? _g : true
          };
        }
      }, {
        key: "profileDto",
        value: function profileDto(body) {
          var _a, _b, _c, _d, _e;

          return {
            name: body.name,
            description: (_a = body.description) !== null && _a !== void 0 ? _a : '',
            isActive: body.isActive,
            priority: (_b = body.priority) !== null && _b !== void 0 ? _b : 0,
            // Match C# `NpsProfileBodyDto` property names (PascalCase).
            DepartnentCode: (_c = body.departnentCode) !== null && _c !== void 0 ? _c : '',
            EducationID: (_d = body.educationID) !== null && _d !== void 0 ? _d : '',
            SpecialityID: (_e = body.specialityID) !== null && _e !== void 0 ? _e : ''
          };
        }
      }, {
        key: "actionDto",
        value: function actionDto(body) {
          var _a;

          return {
            ActionSubject: body.ActionSubject,
            IsActive: body.IsActive,
            Sort: (_a = body.Sort) !== null && _a !== void 0 ? _a : 0
          };
        }
      }, {
        key: "getDashboardSummary",
        value: function getDashboardSummary(employee_id) {
          return this.post('NpsGetDashboardSummary', {
            user_id: employee_id || ''
          });
        }
      }, {
        key: "getEmployees",
        value: function getEmployees(user_id, q, DepartnentCode) {
          var skip = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
          var take = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 50;
          return this.post('NpsGetEmployees', {
            user_id: user_id || '',
            q: q || '',
            DepartnentCode: DepartnentCode || '',
            skip: skip,
            take: take
          });
        }
      }, {
        key: "getEmployee",
        value: function getEmployee(user_id, id) {
          return this.post('NpsGetEmployee', {
            user_id: user_id || '',
            employeeId: id
          });
        }
      }, {
        key: "getEmployeeEducations",
        value: function getEmployeeEducations(user_id, id) {
          return this.post('NpsGetEmployeeEducations', {
            user_id: user_id || '',
            employeeId: id
          });
        }
      }, {
        key: "getEmployeeCurrentProfile",
        value: function getEmployeeCurrentProfile(user_id, id) {
          return this.post('NpsGetEmployeeCurrentProfile', {
            user_id: user_id || '',
            employeeId: id
          });
        }
      }, {
        key: "getEmployeeRequests",
        value: function getEmployeeRequests(user_id, id) {
          return this.post('NpsGetEmployeeRequests', {
            user_id: user_id || '',
            employeeId: id
          });
        }
      }, {
        key: "getEmployeeAssignments",
        value: function getEmployeeAssignments(user_id, id) {
          return this.post('NpsGetEmployeeAssignments', {
            user_id: user_id || '',
            employeeId: id,
            skip: 0,
            take: 100
          });
        }
      }, {
        key: "resolveEmployeeProfile",
        value: function resolveEmployeeProfile(user_id, id) {
          return this.post('NpsResolveEmployeeProfile', {
            user_id: user_id || '',
            employeeId: id
          });
        }
      }, {
        key: "createEmployeeRequest",
        value: function createEmployeeRequest(user_id, id) {
          return this.post('NpsCreateEmployeeRequest', {
            user_id: user_id || '',
            employeeId: id
          });
        }
      }, {
        key: "getEducations",
        value: function getEducations(user_id) {
          return this.post('NpsGetEducations', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "getSpecialties",
        value: function getSpecialties(user_id, educationId) {
          return this.post('NpsGetSpecialties', {
            user_id: user_id || '',
            educationId: educationId || ''
          });
        }
      }, {
        key: "getPermissions",
        value: function getPermissions(user_id) {
          return this.post('NpsGetPermissions', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "getActions",
        value: function getActions(user_id) {
          return this.post('NpsGetActions', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "getDepartmentActions",
        value: function getDepartmentActions(user_id, DepartnentCode) {
          return this.post('NpsGetDepartmentActions', {
            user_id: user_id || '',
            DepartnentCode: DepartnentCode || ''
          });
        }
      }, {
        key: "putDepartmentActions",
        value: function putDepartmentActions(user_id, DepartnentCode, actionIds) {
          return this.post('NpsPutDepartmentActions', {
            user_id: user_id || '',
            DepartnentCode: DepartnentCode || '',
            body: actionIds || []
          });
        }
      }, {
        key: "getProfiles",
        value: function getProfiles(user_id) {
          return this.post('NpsGetProfiles', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "getProfile",
        value: function getProfile(user_id, id) {
          return this.post('NpsGetProfile', {
            user_id: user_id || '',
            id: id
          });
        }
      }, {
        key: "getProfilePermissions",
        value: function getProfilePermissions(user_id, id) {
          return this.post('NpsGetProfilePermissions', {
            user_id: user_id || '',
            id: id
          });
        }
      }, {
        key: "getProfilePermissionsByRuleContext",
        value: function getProfilePermissionsByRuleContext(user_id, body) {
          return this.post('NpsGetProfilePermissionsByRuleContext', {
            user_id: user_id || '',
            body: {
              ProfileID: body.ProfileID,
              departmentCode: body.departmentCode,
              EducationID: body.EducationID,
              SpecialtyID: body.SpecialtyID
            }
          });
        }
      }, {
        key: "putProfilePermissions",
        value: function putProfilePermissions(user_id, id, body) {
          return this.post('NpsPutProfilePermissions', {
            user_id: user_id || '',
            id: id,
            body: body
          });
        }
      }, {
        key: "getProfileRules",
        value: function getProfileRules(user_id) {
          return this.post('NpsGetProfileRules', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "getRequests",
        value: function getRequests(user_id, status) {
          var skip = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
          var take = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 50;
          return this.post('NpsGetRequests', {
            user_id: user_id || '',
            status: status || '',
            skip: skip,
            take: take
          });
        }
      }, {
        key: "getRequest",
        value: function getRequest(user_id, id) {
          return this.post('NpsGetRequest', {
            user_id: user_id || '',
            RequestID: id
          });
        }
      }, {
        key: "getMyApprovals",
        value: function getMyApprovals(user_id) {
          return this.post('NpsGetMyApprovals', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "getMyRequests",
        value: function getMyRequests(user_id) {
          return this.post('NpsGetMyRequests', {
            user_id: user_id || ''
          });
        }
      }, {
        key: "approveRequest",
        value: function approveRequest(user_id, id, comments) {
          return this.post('NpsApproveRequest', {
            user_id: user_id || '',
            RequestID: id,
            body: {
              comments: comments || ''
            }
          });
        }
      }, {
        key: "rejectRequest",
        value: function rejectRequest(user_id, id, comments) {
          return this.post('NpsRejectRequest', {
            user_id: user_id || '',
            RequestID: id,
            body: {
              comments: comments || ''
            }
          });
        }
      }, {
        key: "getAssignments",
        value: function getAssignments(user_id, employeeId) {
          var activeOnly = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
          return this.post('NpsGetAssignments', {
            user_id: user_id || '',
            employeeId: employeeId != null ? String(employeeId) : '',
            activeOnly: activeOnly,
            skip: 0,
            take: 100
          });
        }
      }, {
        key: "applyEmployeeProfileAssignment",
        value: function applyEmployeeProfileAssignment(user_id, body) {
          return this.post('NpsApplyEmployeeProfileAssignment', {
            user_id: user_id || '',
            body: {
              employeeId: body.employeeId,
              profileId: body.profileId,
              ruleId: body.ruleId
            }
          });
        }
      }, {
        key: "getAudit",
        value: function getAudit(user_id, entityType) {
          var skip = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
          var take = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
          return this.post('NpsGetAudit', {
            user_id: user_id || '',
            entityType: entityType || '',
            skip: skip,
            take: take
          });
        }
      }, {
        key: "processQueue",
        value: function processQueue(user_id) {
          var maxItems = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 50;
          return this.post('NpsProcessQueue', {
            user_id: user_id || '',
            maxItems: maxItems
          });
        }
      }, {
        key: "postProfile",
        value: function postProfile(user_id, body) {
          return this.post('NpsPostProfile', {
            user_id: user_id || '',
            body: this.profileDto(body)
          });
        }
      }, {
        key: "putProfile",
        value: function putProfile(user_id, id, body) {
          return this.post('NpsPutProfile', {
            user_id: user_id || '',
            id: id,
            body: this.profileDto(body)
          });
        }
      }, {
        key: "postEducation",
        value: function postEducation(user_id, body) {
          return this.post('NpsPostEducation', {
            user_id: user_id || '',
            body: body
          });
        }
      }, {
        key: "putEducation",
        value: function putEducation(user_id, id, body) {
          return this.post('NpsPutEducation', {
            user_id: user_id || '',
            id: id,
            body: body
          });
        }
      }, {
        key: "postSpecialty",
        value: function postSpecialty(user_id, body) {
          return this.post('NpsPostSpecialty', {
            user_id: user_id || '',
            body: body
          });
        }
      }, {
        key: "putSpecialty",
        value: function putSpecialty(user_id, id, body) {
          return this.post('NpsPutSpecialty', {
            user_id: user_id || '',
            SpecialtyID: id,
            body: body
          });
        }
      }, {
        key: "postPermission",
        value: function postPermission(user_id, body) {
          var dto = {
            PermissionName: body.PermissionName,
            PermissionDescription: body.PermissionDescription,
            IsActive: body.IsActive,
            ActionIDFK: body.ActionIDFK
          };
          return this.post('NpsPostPermission', {
            user_id: user_id || '',
            body: dto
          });
        }
      }, {
        key: "putPermission",
        value: function putPermission(user_id, id, body) {
          var dto = {
            PermissionName: body.PermissionName,
            PermissionDescription: body.PermissionDescription,
            IsActive: body.IsActive,
            ActionIDFK: body.ActionIDFK
          };
          return this.post('NpsPutPermission', {
            user_id: user_id || '',
            PermissionID: id,
            body: dto
          });
        }
      }, {
        key: "postAction",
        value: function postAction(user_id, body) {
          return this.post('NpsPostAction', {
            user_id: user_id || '',
            body: this.actionDto(body)
          });
        }
      }, {
        key: "putAction",
        value: function putAction(user_id, id, body) {
          return this.post('NpsPutAction', {
            user_id: user_id || '',
            id: id,
            body: this.actionDto(body)
          });
        }
      }, {
        key: "postProfileRule",
        value: function postProfileRule(user_id, body) {
          var dto = {
            ProfileID: body.ProfileID,
            departmentCode: body.departmentCode,
            EducationID: body.EducationID,
            SpecialtyID: body.SpecialtyID,
            isActive: body.isActive
          };
          return this.post('NpsPostProfileRule', {
            user_id: user_id || '',
            body: dto
          });
        }
      }, {
        key: "putProfileRule",
        value: function putProfileRule(user_id, id, body) {
          var dto = {
            ProfileID: body.ProfileID,
            departmentCode: body.departmentCode,
            EducationID: body.EducationID,
            specialtyId: body.specialtyId,
            isActive: body.isActive
          };
          return this.post('NpsPutProfileRule', {
            user_id: user_id || '',
            id: id,
            body: dto
          });
        }
      }, {
        key: "deleteProfileRule",
        value: function deleteProfileRule(user_id, id) {
          return this.post('NpsDeleteProfileRule', {
            user_id: user_id || '',
            id: id
          });
        }
      }, {
        key: "getDepartments",
        value: function getDepartments(user_id) {
          return this.post('NpsGetDepartments', {
            user_id: user_id || ''
          });
        }
      }]);
    }();

    NpsBaseApiService.ɵfac = function NpsBaseApiService_Factory(t) {
      return new (t || NpsBaseApiService)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](_angular_common_http__WEBPACK_IMPORTED_MODULE_0__["HttpClient"]));
    };

    NpsBaseApiService.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({
      token: NpsBaseApiService,
      factory: NpsBaseApiService.ɵfac,
      providedIn: 'root'
    });
    /*@__PURE__*/

    (function () {
      _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](NpsBaseApiService, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"],
        args: [{
          providedIn: 'root'
        }]
      }], function () {
        return [{
          type: _angular_common_http__WEBPACK_IMPORTED_MODULE_0__["HttpClient"]
        }];
      }, null);
    })();
    /***/

  }
}]);