var FixmeError = require('./errors').FixmeError;
var utils = require('../utils');

var i = 0;

function uniq() {
    return 'uniq' + (i++);
}

function Primitive(bemjson, parent) {
    this.parent = parent;
    var _this = this;

    allElements.push(this);
    this._id = uniq();

    if (!Primitive.isPrimitive(bemjson)) {
        this._params = this._extractParams(bemjson);
        this._mods = utils.extend({}, bemjson.mods || {});

        this._content = this._extractContent(bemjson.content);

        if (!this._content) {
            this._children = this._extractChildren(bemjson.content);
        }
    } else {
        throw new FixmeError('Plain types in bemjson not implemented yet');
    }

    this._attrs = utils.extend({}, bemjson.attrs || {});
    this._attrs['data-blox'] = this._id;

    this._bindings = this._extractBindings(bemjson.bind);
    this._models = require('../vars').models;
    this._bindings.forEach(function(binding) {
        var model = this._models[binding];

        if (!model) {
            throw new Error('No model such was supplied: ' + binding);
        }

        model.on('change', function(model) {
            if (utils.isSameObjects(this._previousModelChanged, model.changed)) {
                return;
            }

            this._previousModelChanged = model.changed;
            this.repaint();
        }, this);
    }, this);

    // TODO
    this._previousModelChanged = {};

    var showIf = bemjson.showIf;

    this.isShown = typeof showIf === 'function'
        ? function() {
            return this.wasShown = Boolean(showIf.apply(null, _this._getModelsByBindings()));
        }
        : function() {
            return this.wasShown = true;
        };
}

/**
    *
    * Вида:
    * {
    *     bind,
    *     content
    * }
    */
Primitive.primitiveToBemjson = function(data) {
    // в целях отладки
    if (!Primitive.isPrimitive(data)) {
        throw new TypeError('Not a primitive ' + data + ' ' + JSON.stringify(data));
    }

    if (utils.isPlainObject(data)) {
        return data;
    } else {
        return {
            content: data
        };
    }
};

Primitive.isPrimitive = function(bemjson) {
    if (bemjson) {
        if (typeof bemjson === 'string') {
            return true;
        } else {
            if (utils.isPlainObject(bemjson) && !bemjson.elem && !bemjson.block) {
                return true;
            }
            return false;
        }
    } else {
        return true;
    }
};

Primitive.prototype = {
    constructor: Primitive,

    toBemjson: function() {
        return this._content.apply(null, this._bindings);
    },

    _extractBindings: function(bindings) {
        if (typeof bindings === 'string') {
            return bindings.split(' ');
        }

        return bindings || [];
    },

    _getAttrs: function() {
        return this._attrs;
    },

    // TODO rename getModels?
    _getModelsByBindings: function() {
        return this._bindings.map(function(binding) {
            // TODO
            return this._models[binding];
        }, this);
    },

    getPreviousSibling: function() {
        var prevBlock = allElements[allElements.indexOf(this) - 1];

        if (prevBlock && prevBlock.parent === this.parent) {
            return prevBlock;
        }

        return null;
    },

    _extractParams: function(bemjson) {
        var ignoreParams = [
            'block',
            'elem',
            'mods',
            'content',
            'attrs'
        ];

        var result = {};

        Object.keys(bemjson).forEach(function(param) {
            if (ignoreParams.indexOf(param) === -1) {
                result[param] = bemjson[param];
            }
        });

        return result;
    },

    _extractContent: function(content) {
        // TODO isPrimitive
        if (content === null
                || content === undefined
                || typeof content === 'string'
                || typeof content === 'number'
            ) {
            return function() {
                return content;
            }
        }
        return typeof content === 'function'
            ? content
            : null;
    },

    _extractChildren: function(bemjson) {
        var parent = this;
        var bem = require('./');

        if (utils.isPlainObject(bemjson)) {
            return bem.createBemObject(bemjson, parent);
        } else if (Array.isArray(bemjson)) {
            return bemjson.map(function(child) {
                return bem.createBemObject(child, parent);
            });
        }

        throw new TypeError('Uknown type of bemjson: ' + bemjson);
    },

    getDomElement: function() {
        return adapter('[data-blox=%id]'.replace('%id', this._id));
    }
};

console.log('haha');
console.log(Primitive.prototype, '123');
module.exports = Primitive;
