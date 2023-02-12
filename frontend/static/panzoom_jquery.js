(function ($) {
  $.fn.panZoom = function (options) {
    // Set default options
    var settings = $.extend({
      scale: 1.1,
      zoomIn: true,
      zoomOut: true,
      onstop: function() {}
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

    // Fit-to-screen scale calculation
    var fitToScreenScale = (Math.min(parentWidth / elementWidth, parentHeight / elementHeight)/1.5);
    // Set the current scale to fit-to-screen scale
    console.log(fitToScreenScale);
    currentScale = fitToScreenScale;
    $element.css({
      'position': 'absolute',
      'cursor': 'move',
      'transform': 'translate(0px, 0px) scale(' + currentScale + ')'
    });

  // Center the element on the screen
   elementWidth = $element[0].getBoundingClientRect().width;
   elementHeight = $element[0].getBoundingClientRect().height;
    
    currentTranslate.x = (parentWidth - elementWidth) / 2;
    currentTranslate.y = ((parentHeight-($("#inputs").height())*2) - elementHeight) / 2;


    $element.css({
      'position': 'absolute',
      'cursor': 'move',
      'transform': 'translate(' + currentTranslate.x + 'px, ' + currentTranslate.y + 'px) scale(' + currentScale + ')'
    });

    var startX, startY;

    $parent.on('mousedown', function (e) {
     
      if (e.target!==$("#prompter")[0]){
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
      }
    });

    $parent.on('mouseup', function () {
      $parent.off('mousemove');
      settings.onstop.call($parent);
    });

    $parent.on('mousewheel', function (e) {
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