'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('readable-stream'),
    Duplex = _require.Duplex;

var endOfStream = require('end-of-stream');
var once = require('once');
var noop = function noop() {};

var IGNORE_SUBSTREAM = {};

var ObjectMultiplex = function (_Duplex) {
  _inherits(ObjectMultiplex, _Duplex);

  function ObjectMultiplex() {
    var _opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ObjectMultiplex);

    var opts = Object.assign({}, _opts, {
      objectMode: true
    });

    var _this = _possibleConstructorReturn(this, (ObjectMultiplex.__proto__ || Object.getPrototypeOf(ObjectMultiplex)).call(this, opts));

    _this._substreams = {};
    return _this;
  }

  _createClass(ObjectMultiplex, [{
    key: 'createStream',
    value: function createStream(name) {
      // validate name
      if (!name) throw new Error('ObjectMultiplex - name must not be empty');
      if (this._substreams[name]) throw new Error('ObjectMultiplex - Substream for name "${name}" already exists');

      // create substream
      var substream = new Substream({ parent: this, name: name });
      this._substreams[name] = substream;

      // listen for parent stream to end
      anyStreamEnd(this, function (err) {
        substream.destroy(err);
      });

      return substream;
    }

    // ignore streams (dont display orphaned data warning)

  }, {
    key: 'ignoreStream',
    value: function ignoreStream(name) {
      // validate name
      if (!name) throw new Error('ObjectMultiplex - name must not be empty');
      if (this._substreams[name]) throw new Error('ObjectMultiplex - Substream for name "${name}" already exists');
      // set
      this._substreams[name] = IGNORE_SUBSTREAM;
    }

    // stream plumbing

  }, {
    key: '_read',
    value: function _read() {}
  }, {
    key: '_write',
    value: function _write(chunk, encoding, callback) {
      // parse message
      var name = chunk.name;
      var data = chunk.data;
      if (!name) {
        console.warn('ObjectMultiplex - malformed chunk without name "' + chunk + '"');
        return callback();
      }

      // get corresponding substream
      var substream = this._substreams[name];
      if (!substream) {
        console.warn('ObjectMultiplex - orphaned data for stream "' + name + '"');
        return callback();
      }

      // push data into substream
      if (substream !== IGNORE_SUBSTREAM) {
        substream.push(data);
      }

      callback();
    }
  }]);

  return ObjectMultiplex;
}(Duplex);

var Substream = function (_Duplex2) {
  _inherits(Substream, _Duplex2);

  function Substream(_ref) {
    var parent = _ref.parent,
        name = _ref.name;

    _classCallCheck(this, Substream);

    var _this2 = _possibleConstructorReturn(this, (Substream.__proto__ || Object.getPrototypeOf(Substream)).call(this, {
      objectMode: true
    }));

    _this2._parent = parent;
    _this2._name = name;
    return _this2;
  }

  _createClass(Substream, [{
    key: '_read',
    value: function _read() {}
  }, {
    key: '_write',
    value: function _write(chunk, enc, callback) {
      this._parent.push({
        name: this._name,
        data: chunk
      });
      callback();
    }
  }]);

  return Substream;
}(Duplex);

module.exports = ObjectMultiplex;

// util

function anyStreamEnd(stream, _cb) {
  var cb = once(_cb);
  endOfStream(stream, { readable: false }, cb);
  endOfStream(stream, { writable: false }, cb);
}
