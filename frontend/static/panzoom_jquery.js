(function ($) {
  $.fn.panZoom = function (options) {
    // Set default options
    var settings = $.extend({
      scale: 1.1,
      zoomIn: true,
      zoomOut: true,
      initialScale:1.5,
      onstop: function () { }
    }, options);

    var $element = $(this);
    var $parent = $element.parent();
    var $zoomIn = settings.zoomIn;
    var $zoomOut = settings.zoomOut;
    var $scale = settings.scale;
    var currentScale = 0.3;
    var currentTranslate = { x: 0, y: 0 };

    var parentWidth = $parent.width();
    var parentHeight = $parent.height();

    // Center the element on the screen
    var elementWidth = $element.width();
    var elementHeight = $element.height();
    var fitToScreenScale = (Math.min(parentWidth / elementWidth, parentHeight / elementHeight) / settings.initialScale);
    currentScale = fitToScreenScale;
    console.log(parentHeight);

    $element.css({
      'position': 'absolute',
      'cursor': 'move',
      'transform': 'translate(0px, 0px) scale(' + currentScale + ')'
    });

    // Center the element on the screen
    elementWidth = $element[0].getBoundingClientRect().width;
    elementHeight = $element[0].getBoundingClientRect().height;
    currentTranslate.x = (parentWidth - elementWidth) / 2;
    currentTranslate.y = (parentHeight - elementHeight) / 2;

    $element.css({
      'position': 'absolute',
      'cursor': 'move',
      'transform': 'translate(' + currentTranslate.x + 'px, ' + currentTranslate.y + 'px) scale(' + currentScale + ')'
    });

    var startX, startY;
    var lastDist, currentDist, scaleDiff;

    $parent.on('mousedown touchstart', function (e) {
      e.preventDefault();
      if (e.type === 'mousedown' && e.target !== $("#prompter")[0]) {
        startX = e.pageX;
        startY = e.pageY;

        $parent.on('mousemove', function (e) {
          currentTranslate.x += e.pageX - startX;
          currentTranslate.y += e.pageY - startY;
          startX = e.pageX;
          startY = e.pageY;
          $element.css({
            'transform': 'translate(' + currentTranslate.x + 'px, ' + currentTranslate.y + 'px) scale(' + currentScale + ')'
          });
        });
      } else if (e.type === 'touchstart' && e.touches.length === 1 && e.target !== $("#prompter")[0]) {
        startX = e.touches[0].pageX;
        startY = e.touches[0].pageY;

        $parent.on('touchmove', function (e) {
          currentTranslate.x += e.touches[0].pageX - startX;
          currentTranslate.y += e.touches[0].pageY - startY;
          startX = e.touches[0].pageX;
          startY = e.touches[0].pageY;
          $element.css({
            'transform': 'translate(' + currentTranslate.x + 'px, ' + currentTranslate.y + 'px) scale(' + currentScale + ')'
          });
        });

        $parent.on('touchmove', function (e) {
          if (e.touches.length === 2) {
            var touch1 = e.touches[0];
            var touch2 = e.touches[1];
            var touchDistance = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
            var zoom = touchDistance / lastTouchDistance;
            currentScale *= zoom;
            currentTranslate.x = currentTranslate.x * zoom + (1 - zoom) * (touch1.pageX + touch2.pageX) / 2;
            currentTranslate.y = currentTranslate.y * zoom + (1 - zoom) * (touch1.pageY + touch2.pageY) / 2;
            $element.css({
              'transform': 'translate(' + currentTranslate.x + 'px, ' + currentTranslate.y + 'px) scale(' + currentScale + ')'
            });
            lastTouchDistance = touchDistance;
          }
        });
      }
    });

    $parent.on('mouseup touchend', function () {
      $parent.off('mousemove touchmove');
      settings.onstop.call($parent);
    });

    var lastTouchDistance = 0;

    $parent.on('touchstart', function (e) {
      if (e.touches.length === 2) {
        var touch1 = e.touches[0];
        var touch2 = e.touches[1];
        lastTouchDistance = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
      }
    });
    
    $parent.on('touchend', function () {
      $parent.off('touchmove');
      settings.onstop.call($parent);
    });


    $parent.on('wheel', function (e) {
      var zoom = e.originalEvent.wheelDelta / 120 > 0 ? $scale : 1 / $scale;
      if ((zoom > 1 && $zoomIn) || (zoom < 1 && $zoomOut)) {
        currentScale *= zoom;
        currentTranslate.x = currentTranslate.x * zoom + (1 - zoom) * e.pageX;
        currentTranslate.y = currentTranslate.y * zoom + (1 - zoom) * e.pageY;
        $element.css({
          'transform': 'translate(' + currentTranslate.x + 'px, ' + currentTranslate.y + 'px) scale(' + currentScale + ')'
        });
      }
    });

    return this;
  };
}(jQuery));