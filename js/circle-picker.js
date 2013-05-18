﻿/** 
 * @license SmallColorPicker v1.0.0 | (c) 2013 Antelle | https://github.com/antelle/small-color-picker/blob/master/MIT-LICENSE.txt
 */

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

(function($, document, window, undefined) {

    "use strict";

    window.SmallColorPicker = window.SmallColorPicker || {};

    /**
     * ColorPicker default options.
     */
    SmallColorPicker.defaults = {
        placement: {
            position: "absolute",
            top: "0",
            left: "0",
            parent: null
        },
        colors: {
            colorOld: null,
            colorNew: "#ff0000"
        },
        texts: {
            ok: "OK",
            cancel: "Cancel"
        },
        behavior: {
            hideOnSelect: true
        },
        events: {
            ok: null,
            cancel: null
        }
    };

    /**
     * Circle color picker.
     * @param opts - Options, see SmallColorPicker.defaults as example
     * @constructor
     */
    SmallColorPicker.CirclePicker = function(opts) {
        var _opts = $.extend(true, {}, SmallColorPicker.defaults, opts);
        var _color = new SmallColorPicker.Color(_opts.colors.colorNew);
        var _colorOld = new SmallColorPicker.Color(_opts.colors.colorOld);
        var _dom;
        var _domProps;
        var _squareRotation = 0;
        var _transforms = {};
        var _lastUserSquareX, _lastUserSquareY;
        var _browserFeatures;

        /**
         * Initializes color picker before first control show.
         */
        function initialize() {
            detectBrowserFeatures();
            assertBrowserIsSupported();
            createElements();
            bindEvents();
            getStyleProps();
        }

        /**
         * Detects browser features.
         */
        function detectBrowserFeatures() {
            _browserFeatures = {
                redrawBug: navigator.userAgent.indexOf("Safari") != -1,
                borderRadius: "borderRadius" in document.body.style
            }
        }

        /**
         * Asserts we can use color picker
         * @throws {string} Will throw an error if the browser is not supported
         */
        function assertBrowserIsSupported() {
            if (!_browserFeatures.borderRadius) {
                throw "Browser is not supported";
            }
        }

        /**
         * Created DOM elements.
         * Initializes _dom variable.
         */
        function createElements() {
            _dom = {};
            _dom.el = 
                $("<div></div>")
                    .appendTo(_opts.placement.parent || document.body)
                    .addClass("s-c-p")
                    .css({
                        position: _opts.placement.position,
                        left: _opts.placement.left,
                        top: _opts.placement.top
                    });
            if (_dom.el.css("position") == "static")
                _dom.el.css("position", "relative");
            _dom.circle = $("<div></div>")
                .appendTo(_dom.el)
                .addClass("s-c-p-circle");
            _dom.innerCircle = $("<div></div>")
                .appendTo(_dom.circle)
                .addClass("s-c-p-circle-inner");
            _dom.circleMark = $("<div></div>")
                .appendTo(_dom.circle)
                .addClass("s-c-p-circle-mark");
            _dom.square = $("<canvas></canvas>")
                .appendTo(_dom.el)
                .addClass("s-c-p-square");
            _dom.squareMark = $("<div></div>")
                .appendTo(_dom.el)
                .addClass("s-c-p-square-mark");
            _dom.square.attr({ width: _dom.square.width(), height: _dom.square.height() });
            _dom.colorOld = $("<div></div>")
                .appendTo(_dom.el)
                .addClass("s-c-p-color s-c-p-color-old");
            _dom.colorNew = $("<div></div>")
                .appendTo(_dom.el)
                .addClass("s-c-p-color s-c-p-color-new");
            _dom.sampleOld = $("<div></div>")
                .appendTo(_dom.el)
                .addClass("s-c-p-sample s-c-p-sample-old")
                .text(_opts.texts.cancel);
            _dom.sampleNew = $("<div></div>")
                .appendTo(_dom.el)
                .addClass("s-c-p-sample s-c-p-sample-new")
                .text(_opts.texts.ok);
        }

        /**
         * Fills properties from DOM elements. Used to cache them, should be called each time after element is shown.
         */
        function getStyleProps() {
            _domProps = {
                globalSelectionMode: $(document.body).css("user-select"),
                squareWidth: _dom.square.width(),
                circleWidth: _dom.circle.width(),
                elWidth: _dom.el.width()
            }
        }

        /**
         * Binds events to DOM elements.
         */
        function bindEvents() {
            _dom.circle.on("mousedown", handleCircleMouseDown);
            _dom.square
                .on("mousedown", handleSquareMouseDown)
                .on("selectstart", function(e) { e.preventDefault(); });
            _dom.sampleNew.click(function() {
                if (_opts.behavior.hideOnSelect) {
                    hide();
                    _colorOld = _color;
                }
                if (_opts.events.ok)
                    _opts.events.ok(_color.toHex());
            });
            _dom.sampleOld.click(function() {
                if (_opts.behavior.hideOnSelect)
                    hide();
                if (_opts.events.cancel)
                    _opts.events.cancel(_colorOld.toHex());
            });
        }

        /**
         * User clicked on circle: begin changing color hue.
         * @param e
         */
        function handleCircleMouseDown(e) {
            e.preventDefault();
            processCircleColorChangeEvent(e.pageX, e.pageY);
            toggleGlobalSelection(false);
            $(document)
                .on("mousemove", handleDocumentMouseMoveForCircle)
                .one("mouseup", handleDocumentMouseUp);
        }

        /**
         * User clicked on square: begins changing color saturation and value.
         * @param e
         */
        function handleSquareMouseDown(e) {
            e.preventDefault();
            processSquareColorChangeEvent(e.pageX, e.pageY);
            toggleGlobalSelection(false);
            $(document)
                .on("mousemove", handleDocumentMouseMoveForSquare)
                .one("mouseup", handleDocumentMouseUp);
        }

        /**
         * Mouse is moved in hue changing mode.
         * @param e
         */
        function handleDocumentMouseMoveForCircle(e) {
            processCircleColorChangeEvent(e.pageX, e.pageY);
        }

        /**
         * Mouse is moved in saturation-value changing mode.
         * @param e
         */
        function handleDocumentMouseMoveForSquare(e) {
            processSquareColorChangeEvent(e.pageX, e.pageY);
        }

        /**
         * Mouse is up: finishes color change.
         */
        function handleDocumentMouseUp() {
            toggleGlobalSelection(true);
            $(document)
                .off("mousemove", handleDocumentMouseMoveForCircle)
                .off("mousemove", handleDocumentMouseMoveForSquare);
        }

        /**
         * Processes color hue change.
         * @param {number} x - PageX
         * @param {number} y - PageY
         */
        function processCircleColorChangeEvent(x, y) {
            var offs = _dom.circle.offset();
            var hue = getHueByCircleCoords(x - offs.left, y - offs.top);
            _color.hue(hue);
            var baseColor = new SmallColorPicker.Color().setHsv(hue, 100, 100);
            displaySquareColor(baseColor.toHex());
            displayNewColorSample();
            moveCircleMark(hue);
            moveSquareMark();
        }

        /**
         * Processes color saturation-value change.
         * @param {number} x - PageX
         * @param {number} y - PageY
         */
        function processSquareColorChangeEvent(x, y) {
            if (!_transforms.fw) {
                var offs = _dom.circle.offset();
                var radius = _domProps.circleWidth/2;
                var squareSize = _domProps.squareWidth/2;

                _transforms.fw = new SmallColorPicker.Transforms.Translate2D(-offs.left - radius, -offs.top - radius)
                    .chain(new SmallColorPicker.Transforms.Rotate2D(-_squareRotation))
                    .chain(new SmallColorPicker.Transforms.Translate2D(squareSize, squareSize));
            }
            var transformed = _transforms.fw.apply([x, y]);

            x = Math.max(0, Math.min(_domProps.squareWidth - 1, transformed[0]));
            y = Math.max(0, Math.min(_domProps.squareWidth - 1, transformed[1]));
            _color = getColorBySquareCoords(x, y);
            displayNewColorSample();
            moveSquareMark(x, y);
        }

        /**
         * Enables or disabled global text selection.
         * @param {boolean} enabled
         */
        function toggleGlobalSelection(enabled) {
            $(document.body).css({ webkitUserSelect: enabled ? _domProps.globalSelectionMode : "none" });
        }

        /**
         * Converts coordinates to color hue.
         * @param {number} x - X offset from circle left
         * @param {number} y - Y offset from circle top
         * @returns {number} - Calculated color hue
         */
        function getHueByCircleCoords(x, y) {
            var size = _domProps.circleWidth;
            x -= size/2;
            y -= size/2;
            var tg = Math.atan2(x, y);
            return 180 - tg/Math.PI/2*360;
        }

        /**
         * Converts coordinates to color, adjusting its saturation and value.
         * @param {number} x - X offset from square left
         * @param {number} y - Y offset from square top
         * @returns {SmallColorPicker.Color} - Color with calculated saturation and value.
         */
        function getColorBySquareCoords(x, y) {
            var canvas = _dom.square[0];
            var ctx = canvas.getContext("2d");
            var pix = ctx.getImageData(x, y, 1, 1).data;
            return new SmallColorPicker.Color().setRgb(pix[0], pix[1], pix[2]);
        }

        /**
         * Updates old color sample and description.
         */
        function displayOldColorSample() {
            _dom.colorOld[0].innerHTML = _colorOld === null ? "" : _colorOld.toHex();
            setSampleColor(_dom.sampleOld, _colorOld === null ? new SmallColorPicker.Color(0x999999) : _colorOld, "old")
        }

        /**
         * Updates new color sample and description.
         */
        function displayNewColorSample() {
            _dom.colorNew[0].innerHTML = _color.toHex();
            setSampleColor(_dom.sampleNew, _color, "new");
        }

        /**
         * Updates color sample and description.
         * @param {jQuery} el - Color sample element
         * @param {SmallColorPicker.Color} color - Sample color
         * @param {string} name - "new" or "old"; used to cache properties for speed
         */
        function setSampleColor(el, color, name) {
            var v = color.toHsv().v;
            el[0].style.backgroundColor = color.toHex();
            if (!_domProps.colorSamplesLight) {
                _domProps.colorSamplesLight = {};
            }
            if (v > 80) {
                if (_domProps.colorSamplesLight[name] !== true) {
                    _domProps.colorSamplesLight[name] = true;
                    el.addClass("s-c-p-light");
                }
            } else {
                if (_domProps.colorSamplesLight[name] !== false) {
                    _domProps.colorSamplesLight[name] = false;
                    el.removeClass("s-c-p-light");
                }
            }
        }

        /**
         * Draws gradient on square for selected color hue.
         * @param {string} baseColor - Base color HTML hex representation
         */
        function displaySquareColor(baseColor) {
            var col = new SmallColorPicker.Color(baseColor);
            var hue = col.hue();

            var canvas = _dom.square[0];
            var size = canvas.width;
            var ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, size, size);
            
            var imageData = ctx.createImageData(size, size);
            var data = imageData.data;
            for (var s = 0; s < size; s++) {
                for (var v = 0; v < size; v++) {
                    col.setHsv(hue, Math.round(s*100/(size - 1)), Math.round(v*100/(size - 1)));
                    var offset = ((size - v - 1)*size + s)*4;
                    data[offset] = col.r();
                    data[offset + 1] = col.g();
                    data[offset + 2] = col.b();
                    data[offset + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

        /**
         * Moves mark on circle to correspond color hue.
         * @param {number} [userHue] - Hue; if undefined, hue from _color will be used
         */
        function moveCircleMark(userHue) {
            var hue = userHue === undefined ? _color.hue() : userHue;
            var angle = hue/180*Math.PI;
            var width = _domProps.circleWidth;
            var angleOffset = 0.025;
            var attr = {
                transform: "rotate(" + angle + "rad)",
                left: width/2 - width*Math.sin(-angle + angleOffset)/2,
                top: width/2 - width*Math.cos(-angle + angleOffset)/2
            };
            _dom.circleMark.css(attr);
            _squareRotation = angle - Math.PI/4;
            _transforms = {};
            _dom.square.css({ transform: "rotate(" + _squareRotation + "rad)" });
        }

        /**
         * Moves mark on square to correspond color saturation and value.
         * Coordinates of user click are used to improve movement smoothness.
         * @param {number} [userX] - X coordinate of user click
         * @param {number} [userY] - Y coordinate of user click
         */
        function moveSquareMark(userX, userY) {
            var width = _domProps.squareWidth;
            var hsv = _color.toHsv();
            var x = 0;
            var y = 0;
            if (userX !== undefined)
                _lastUserSquareX = userX;
            if (userY !== undefined)
                _lastUserSquareY = userY;
            if (_lastUserSquareX !== undefined && _lastUserSquareY !== undefined /*&& hsv.s === 0 && hsv.v === 0*/) {
                x += _lastUserSquareX;
                y += _lastUserSquareY;
            } else {
                x += ~~(hsv.s*width/100);
                y += width - ~~(hsv.v*width/100);
                x = Math.max(0, Math.min(width - 1, x));
                y = Math.max(0, Math.min(width - 1, y));
            }

            if (!_transforms.rev) {
                var squareSize = _domProps.squareWidth/2;
                var elSize = _domProps.elWidth/2;

                _transforms.rev = new SmallColorPicker.Transforms.Translate2D(-squareSize, -squareSize)
                    .chain(new SmallColorPicker.Transforms.Rotate2D(_squareRotation))
                    .chain(new SmallColorPicker.Transforms.Translate2D(elSize - 3, elSize - 3));
            }

            var transformed = _transforms.rev.apply([x, y]);

            var style = _dom.squareMark[0].style;
            style.left = transformed[0] + "px";
            style.top = transformed[1] + "px";
            adjustSquareMarkColor();
        }

        /**
         * Sets square mark color to dark or bright, based of perceived brightness of underlying pixels.
         * Used to ensure the square mark is dark on light pixels and vice versa.
         */
        function adjustSquareMarkColor() {
            var isLight = _color.getPerceivedBrightness() > 125;
            if (_domProps.isSqMaskLight === isLight)
                return;
            _domProps.isSqMaskLight = isLight;
            var borderColor = new SmallColorPicker.Color().setHsv(0, 0, isLight ? 40 : 90);
            _dom.squareMark[0].style.borderColor = borderColor.toHex();
            // force redraw element in Safari
            forceRedrawElement(_dom.squareMark[0]);
        }

        /**
         * Redraws element; this is used to overcome a bug in Safari: element border is not redrawn in some cases.
         * see http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
         * @param {HTMLElement} el - Element
         */
        function forceRedrawElement(el) {
            if (!_browserFeatures.redrawBug)
                return;
            el.style.display = "inline-block";
            //noinspection BadExpressionStatementJS
            el.offsetHeight;
            el.style.display = "block";
        }

        /**
         * Moves circle and square marks.
         */
        function moveMarks() {
            moveCircleMark();
            moveSquareMark();
        }

        /**
         * Hides color picker.
         */
        function hide() {
            _dom.el.hide();
        }

        /**
         * Hides or shows color picker.
         */
        this.toggle = function() {
            if (_dom && _dom.el && _dom.el.is(":visible"))
                this.hide();
            else
                this.show();
        };

        /**
         * Shows color picker.
         */
        this.show = function() {
            if (!_dom) {
                initialize();
            }
            displaySquareColor(_color.toHex());
            displayOldColorSample();
            displayNewColorSample();
            moveMarks();
            _dom.el.show();
            getStyleProps();
        };

        /**
         * Hides color picker.
         */
        this.hide = hide;

        /**
         * Sets old and new colors.
         * @param {string} [color] - New color HTML hex representation; undefined = don't change.
         * @param {string} [colorOld] - Old color HTML hex representation; undefined = don't change; null = set to no old color.
         */
        this.setColors = function(color, colorOld) {
            if (color !== undefined)
                _color = new SmallColorPicker.Color(color);
            if (colorOld !== undefined)
                _colorOld = colorOld === null ? null : new SmallColorPicker.Color(colorOld);
            if (_dom && _dom.el && _dom.el.is(":visible")) {
                this.show();
            }
        };
    };

})(window.jQuery, document, window);
