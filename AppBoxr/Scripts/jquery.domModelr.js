/*
* domModelr, v. 0.0.1
* Created by Tim Heckel 2013
* Licensed under the MIT.
*/

(function ($) {

    "use strict";

    var methods = {
        init: function () {
            //nothing to init
        },
        build: function () {
            var _self = $(this);

            //get all TOP level models
            var _models = [], _top = _self.find(":*[data-model]:first").get().concat(_self.find(":*[data-model]:first").siblings(":*[data-model]").get());
            locals.iterator.segments = [];

            //build out the rest of the model by iterating over the top level
            $.each(_top, function () {

                //get the model name and always attach any ids
                var _mod = $(this), _name = _mod.data("model"), _obj = {};
                _obj[_name] = { _id: _mod.data("id") || "" };

                //hydrate this level's properties
                locals.iterator.props(_mod, _obj[_name]);

                //attach top level segment
                locals.iterator.segments.push({ n: _name, o: _obj[_name] });

                //kick-off child modeling
                locals.iterator.model(_mod, _obj[_name]);

                //save the model
                _models.push(_obj);
            });

            return { models: _models };
        },
        populate: function (model, reset) {
            var _self = $(this), parent = _self.data("model");
            var _puff = function (model) {
                for (var m in model) {
                    var _ele = _self.find(":*[data-model='" + m + "']");
                    if (m === "_id") {
                        reset ? _self.removeData("id") : _self.data("id", model[m]);
                    }
                    else if (_ele.length === 0) {
                        //this is not a nested model, could be a property...
                        _ele = _self.find(":*[data-property='" + m + "']");
                        switch (_ele.attr("type")) {
                            case "radio":
                            case "checkbox":
                                _ele[0].checked = model[m];
                                break;
                            default:
                                if (reset) _ele.val("");
                                else _ele.val(model[m])
                                break;
                        }
                    } else {
                        _puff(model[m]);
                    }
                }
            };
            _puff(model);
        }
    };

    var locals = {
        iterator: {
            segments: []
            , model: function (dom, obj) {
                dom.find(":*[data-model]").each(function () {
                    var _prop = $(this), _name = _prop.data("model");

                    var _parn = _prop.parents(":*[data-model]:first").data("model"), _parent = _.detect(locals.iterator.segments, function (so) { return so.n === _parn });
                    if (_parent) { //explicit here for simplicity sake...
                        obj = _parent.o;
                        obj[_name] = {};
                        obj = obj[_name];
                    } else {
                        obj[_name] = {};
                        obj = obj[_name];
                    }

                    //add this segment
                    locals.iterator.segments.push({ n: _name, o: obj });

                    //hydrate this level's properties
                    locals.iterator.props(_prop, obj);

                    //recurse through the DOM dynamically building child models
                    locals.iterator.model(_prop, obj);
                });
            }
            , props: function (_prop, obj) {
                var _props = [], _pmodel = _prop.data("model");
                _prop.find(":*[data-property]").each(function () {
                    if ($(this).parents(":*[data-model]:first").data("model") === _pmodel) {
                        _props.push($(this));
                    }
                });

                $.each(_props, function () {
                    var _prp = $(this).data("property"), _typ = $(this).attr("type");

                    var _val = $(this).val() || "";
                    if (_typ === "radio" || _typ === "checkbox")
                        _val = this[0].checked;

                    if (_prp.indexOf("[]") > -1) {
                        obj[_prp] = [_val];
                    } else {
                        obj[_prp] = _val;
                    }
                });
            }
        }
    };

    $.fn.domModelr = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.domModelr');
        }
    };

})(jQuery);