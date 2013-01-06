/*
* v 0.0.1
* Created by Tim Heckel, 2012 
* Licensed under the MIT.
*/

(function ($, window) {
    "use strict";

    if (typeof ($.signalR) !== "function") {
        throw new Error("AppBoxr: SignalR not found. Please ensure SignalR is referenced to use AppBoxr.");
    }

    if (typeof ($("<div/>").domModelr) !== "function") {
        throw new Error("AppBoxr: jquery.domModelr not found. Please ensure jquery.domModelr is referenced to use AppBoxr.");
    }

    if (typeof ($("<div/>").signalRamp) !== "function") {
        throw new Error("AppBoxr: jquery.signalRamp not found. Please ensure jquery.signalRamp is referenced to use AppBoxr.");
    }

    var _appBoxr = function (_options) {

        var _self = this;

        if (!(_self instanceof _appBoxr))
            return new _appBoxr(_options);

        //defaults
        var options = {
            appId: ''
            , callbacks: {
                bridgeInitialized: null
                , bridgeStarted: null
                , sendingData: null
                , receivingData: null
            }
            , bridge: null
            , queries: []
            , localize: { on: false }
            , syncUI: false
        }

        $.extend(options, _options);

        function init() {
            $(document).signalRamp({
                proxyName: options.appId
                , url: options.url
                , callbacks: {
                    dataSend: function (pkg, done) {
                        //TODO: change the process based on more criteria (don't always save the full model)
                        //var _page = locals.assembleModel();
                        //pkg.appBoxr = { process: "SAVE", models: _page.models };
                        //done();
                        if (options.callbacks.sendingData) {
                            options.callbacks.sendingData.apply(this, [pkg, function () {
                                options.syncUI && done();
                            } ]);
                        } else {
                            options.syncUI && done();
                        }
                    }
                    , dataReceive: function (pkg) {
                        options.callbacks.receivingData && options.callbacks.receivingData.apply(this, [pkg]);
                        //TODO: Check result of sync
                    }
                    , bridgeInitialized: function (bridge, done) {
                        options.bridge = bridge;

                        options.bridge.on('process', function (originalRequest, results) {
                            _self.call("processResult", originalRequest, results);
                        });

                        if (options.callbacks.bridgeInitialized)
                            options.callbacks.bridgeInitialized(bridge, done);
                        else
                            done();
                    }
                    , bridgeStarted: function (proxyName, bridge) {
                        options.callbacks.bridgeStarted && options.callbacks.bridgeStarted(proxyName, bridge);

                        //now init the templates
                        _self.call("initTemplates");
                    }
                }
            });
        };

        //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
        function _guid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }).substring(0, 7);
        };

        function _populate(_container, model, reset) {
            _container.domModelr("populate", model, reset);
            options.syncUI && $(document).signalRamp("rewire");
        };

        var processes = [];
        var methods = {
            processResult: function (request, results) {
                //var pcb = _.detect(processes, function (p) { return p.id === request.appBoxr.id; });

                switch (request.appBoxr.process.top) {
                    case "GET":
                        switch (request.appBoxr.process.sub) {
                            case "POPULATE":
                                var _container = $(":*[data-model='" + request.appBoxr.queries[0].collection + "']");
                                _populate(_container, results[0].results[0]);
                                break;
                            case "BIND":
                                _self.call("bindTemplates", results);
                                break;
                        }
                        break;
                    case "SAVE":

                        //auto rebinding and resetting of the UI
                        var opts = request.appBoxr.process.opts;

                        if (opts.rebindTemplates) {
                            _self.call("initTemplates");
                        }

                        if (opts.resetUI) {
                            var _actual = request.appBoxr.models;
                            for (var mm = 0; mm < _actual.length; mm++) {
                                var ctr = $(":*[data-model='" + _actual[mm].collection + "']");
                                ctr.removeData("id");
                                _populate(ctr, _actual[mm].model, true);
                            }
                        }
                        break;
                    case "DELETE":
                        _self.call("initTemplates");
                        break;
                }

                //pcb.cb.apply(this, [results]);
                //processes = _.reject(processes, function (p) { return p.id === pcb.id; });
            },
            get: function (_opts) {
                var opts = {
                    queries: []
                    , cb: null
                    , recipients: "ALL"
                    , processType: ''
                };

                $.extend(opts, _opts);

                var _pkg = { clientId: $(document).signalRamp("option", "clientId"), recipients: opts.recipients }, pid = _guid();
                $.extend(_pkg, { appBoxr: { id: pid, process: { top: "GET", sub: opts.processType }, queries: opts.queries} });
                processes.push({ id: pid, cb: opts.cb });
                options.bridge.invoke("process", _pkg);
            },
            save: function (_opts) {

                //defaults
                var opts = {
                    models: [] //list of collections to save (can be empty to save everything on the page)
                    , cb: null
                    , recipients: "ALL"
                    , resetUI: true
                    , rebindTemplates: true
                };

                $.extend(opts, _opts);

                var m = $(document).domModelr("build");
                var _actual = m.models;

                //is there any filtering of the assembled models?
                var _actual = _.filter(m.models, function (mx) { return _.any(opts.models, function (om) { return mx[om]; }) });

                //attach collection name and explicitly specify model/collection
                _actual = _.map(_actual, function (mox) { return { model: mox[_.keys(mox)[0]], collection: _.keys(mox)[0]} });

                //wrap the callback with additional options
                //for auto rebinding and resetting of the UI
                var _wrap = function () {
                    if (opts.rebindTemplates) {
                        _self.call("initTemplates");
                    }
                    if (opts.resetUI) {
                        for (var mm = 0; mm < _actual.length; mm++) {
                            var _container = $(":*[data-model='" + _actual[mm].collection + "']");
                            _container.removeData("id");
                            _populate(_container, _actual[mm].model, true);
                        }
                    }
                    opts.cb && opts.cb();
                };

                var _pkg = { clientId: $(document).signalRamp("option", "clientId"), recipients: opts.recipients }, pid = _guid();
                $.extend(_pkg, { appBoxr: { id: pid, process: { top: "SAVE", sub: "", opts: opts }, models: _actual} });
                processes.push({ id: pid, cb: _wrap });
                options.bridge.invoke("process", _pkg);

            },
            del: function (_opts) {
                //defaults
                var opts = {
                    ids: [] //list of ids to delete
                    , model: '' //instead of ids, you can send the model name and the currently loaded id will be grabbed
                    , cb: null
                    , recipients: "ALL"
                };

                $.extend(opts, _opts);

                if (opts.model === "") {
                    throw new Error("You must provide a model name!");
                }

                if (opts.ids.length === 0 && opts.model === "") {
                    throw new Error("You must provide either an array of ids or models to delete!");
                }

                if (opts.ids.length === 0) {
                    opts.ids.push($(":*[data-model='" + opts.model + "']").data("id"));
                }

                var _pkg = { clientId: $(document).signalRamp("option", "clientId"), recipients: opts.recipients }, pid = _guid();
                $.extend(_pkg, { appBoxr: { id: pid, process: { top: "DELETE", sub: "", opts: opts }, ids: opts.ids, collection: opts.model} });
                //processes.push({ id: pid, cb: _wrap });
                options.bridge.invoke("process", _pkg);

            },
            bindTemplates: function (results) {
                $(".appboxrData").remove();
                $.each(results, function () {
                    var ele = $("#" + this.contextid), source = ele.html(), p = ele.parent(), template = Handlebars.compile(source);
                    var _div = $("<div/>").addClass("appboxrData");
                    p.append(_div);
                    $.each(this.results, function () {
                        var _self = this, _html = $(template(_self));
                        _div.append(_html);
                        var targ = $(_.detect(_html, function (d) { return $(d).data("model-target") !== undefined; }));
                        if (options.localize.on) {
                            targ.data("object", _self);
                        } else {
                            targ.data("object", _self._id);
                        }
                    });
                });

                //wire targets
                $(":*[data-model-target]").unbind();
                $(":*[data-model-target]").click(function () {
                    var tt = $(this);
                    var _container = $(["#", tt.data("model-target")].join('')), _collection = _container.data("model");
                    if (options.localize.on) {
                        var _model = _self.data("object");
                        _populate(_container, _model);
                    } else {
                        var id = tt.data("object");
                        _self.call("get", {
                            queries: [{ query: { _id: id }, collection: _collection}]
                            , cb: function (results) {
                                _populate(_container, results[0].results[0]);
                            }
                            , recipients: options.syncUI ? "ALL" : "SELF"
                            , processType: "POPULATE"
                        });
                    }
                });
            },
            initTemplates: function () {
                var _retrievables = [];
                $(":*[data-model-template]").each(function () {
                    var _id = _guid(), t = $(this), ob = t.data("model-orderby") || "", obd = t.data("model-orderby-direction") || "", obs = ob ? ["{", ob.toString(), ":", (obd === "desc" ? "-1" : "1"), "}"].join("") : "";
                    _retrievables.push({ name: t.data("model-template"), orderby: obs, id: _id, templ: t.text() });
                    t.attr({ id: _id }).hide();
                });

                var _queries = [];
                $.each(_retrievables, function () {
                    var _parent = this.name, props = [], ob = this.orderby;

                    //TODO: fix so this really does pull only required fields for templating...currently pulls the entire object down
                    /*
                    $.each(this.templ.split("{{"), function () {
                    if (this.indexOf("}}") > -1) {
                    props.push($.trim(this.replace(/}}/gi, "")));
                    }
                    });
                    props = [];
                    */

                    _queries.push({ contextid: this.id, collection: _parent, fields: props, orderby: ob });
                });

                _self.call("get", {
                    queries: _queries
                    , cb: function (results) {
                        _self.call("bindTemplates", results);
                    }
                    , processType: "BIND"
                    , recipients: "SELF"
                });
            }
        };

        _self.call = function (method) {
            if (methods[method]) {
                return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
            } else {
                $.error('Method ' + method + ' does not exist on appBoxr!');
            }
        };

        init();
    };

    window.AppBoxr = _appBoxr;

})(jQuery, window);