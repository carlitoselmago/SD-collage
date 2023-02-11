(function ($) {
  $.fn.panZoom = function (options) {
    // Set default options
    var settings = $.extend({
      scale: 1.1,
      zoomIn: true,
      zoomOut: true,
    }, options);

    var $element = $(this);
    var $box=$("#users");
    var $parent = $element.parent();
    var $zoomIn = settings.zoomIn;
    var $zoomOut = settings.zoomOut;
    var $scale = settings.scale;

    $element.css({
      'position': 'absolute',
      'cursor': 'move',
     // 'width':800,
      'top':100,
      'left':100
    });

    $box.css({
      'position': 'absolute',
     });

    var startX, startY, startLeft, startTop;
    var bstartLeft, bstartTop;

    $parent.on('mousedown', function (e) {
      startX = e.pageX;
      startY = e.pageY;
      startLeft = parseInt($element.css('left'));
      startTop = parseInt($element.css('top'));

      bstartLeft = parseInt($box.css('left'));
      bstartTop = parseInt($box.css('top'));

      $parent.on('mousemove', function (e) {
        $element.css({
          'left': startLeft + e.pageX - startX,
          'top': startTop + e.pageY - startY
        });
        $box.css({
          'left': bstartLeft + e.pageX - startX,
          'top': bstartTop + e.pageY - startY
        });
      });

      return false;
    });

    $parent.on('mouseup', function () {
      $parent.off('mousemove');
    });

    $parent.on('mousewheel', function (e) {
      if (e.originalEvent.wheelDelta / 120 > 0 && $zoomIn) {
        $element.css({
          'width': $element.width() * $scale,
          'height': $element.height() * $scale,
          'left': $element.position().left - ($element.width() * ($scale - 1)) / 2,
          'top': $element.position().top - ($element.height() * ($scale - 1)) / 2
        });
        $box.css({
          'width': $box.width() * $scale,
          'height': $box.height() * $scale,
          'left': $box.position().left - ($box.width() * ($scale - 1)) / 2,
          'top': $box.position().top - ($box.height() * ($scale - 1)) / 2
        });
      } else if (e.originalEvent.wheelDelta / 120 < 0 && $zoomOut) {
        $element.css({
          'width': $element.width() / $scale,
          'height': $element.height() / $scale,
          'left': $element.position().left + ($element.width() * ($scale - 1)) / 2,
          'top': $element.position().top + ($element.height() * ($scale - 1)) / 2
        });
         $box.css({
          'width': $box.width() / $scale,
          'height': $box.height() / $scale,
          'left': $box.position().left + ($box.width() * ($scale - 1)) / 2,
          'top':$box.position().top + ($box.height() * ($scale - 1)) / 2
        });
      }
    });

    return this;
  };
}(jQuery));