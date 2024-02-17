(function ($) {
  $.fn.streamer = function(options) {
    var settings = $.extend({
      watchClass: "towatch",
      triggerClass: "trigger",
      maxTime: 5,
      scaleFactor: 2,
      transitionDuration: 5000
    }, options);

    return this.each(function() {
      var $parent = $(this);
      var originalTransform = $parent.css("transform");
      var currentIndex = -1;
      var timeoutId = null;

      function zoomOnElement(index) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        var $elements = $parent.find("." + settings.triggerClass);
        if ($elements.length === 0) {
          zoomOut();
          return;
        }

        index = index % $elements.length;
        currentIndex = index;

        var $element = $($elements[index]);
        var elemOffset = $element.offset();
        var parentOffset = $parent.offset();
        var parentCenter = { x: $parent.width() / 2, y: $parent.height() / 2 };
        var elemCenter = {
          x: elemOffset.left - parentOffset.left + $element.width() / 2,
          y: elemOffset.top - parentOffset.top + $element.height() / 2
        };

        var translateX = parentCenter.x - elemCenter.x;
        var translateY = parentCenter.y - elemCenter.y;

        $parent.css({
          transition: "transform " + settings.transitionDuration + "ms ease",
          transform: "translate(" + translateX + "px, " + translateY + "px) scale(" + settings.scaleFactor + ")"
        });

        timeoutId = setTimeout(function () {
          zoomOnElement(currentIndex + 1);
        }, settings.maxTime * 1000);
      }

      function zoomOut() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        $parent.css({
          transition: "transform " + settings.transitionDuration + "ms ease",
          transform: originalTransform
        });
      }

      $parent.on('click', '.' + settings.triggerClass, function() {
        var index = $(this).index('.' + settings.triggerClass);
        zoomOnElement(index);
      });

      // Initial zoom to first element if exists
      if ($parent.find('.' + settings.triggerClass).length) {
        zoomOnElement(0);
      }
    });
  };
}(jQuery));
