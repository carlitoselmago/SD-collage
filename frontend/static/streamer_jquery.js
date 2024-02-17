(function ($) {
  $.fn.streamer = function(options) {
    var settings = $.extend({
      triggerClass: "trigger",
      maxTime: 5, // seconds
      scaleFactor: 2,
      transitionDuration: 5000 // milliseconds
    }, options);

    return this.each(function() {
      var $parent = $(this);
      var originalTransform = $parent.css("transform") || 'none';

      function calculateZoomAndPosition($element) {
        var parentOffset = $parent.offset();
        var elementOffset = $element.offset();
        var translateX = ((parentOffset.left + ($parent.width() / 2)) - (elementOffset.left + ($element.width() / 2))) * settings.scaleFactor;
        var translateY = ((parentOffset.top + ($parent.height() / 2)) - (elementOffset.top + ($element.height() / 2))) * settings.scaleFactor;

        return {
          translateX: -translateX / settings.scaleFactor,
          translateY: -translateY / settings.scaleFactor,
          scale: settings.scaleFactor
        };
      }

      function zoomOnElement($element) {
        var { translateX, translateY, scale } = calculateZoomAndPosition($element);

        $parent.css({
          transition: `transform ${settings.transitionDuration}ms ease`,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`
        });
      }

      function zoomOut() {
        $parent.css({
          transition: `transform ${settings.transitionDuration}ms ease`,
          transform: originalTransform
        });
      }

      // Event delegation for dynamically added elements
      $(document).on('click', `.${settings.triggerClass}`, function() {
        if ($(this).closest($parent).length) { // Ensure the clicked element is a child of the parent
          zoomOnElement($(this));
        }
      });

      // Automatic zoom out after a set duration
      setInterval(function() {
        zoomOut();
      }, settings.maxTime * 1000 + settings.transitionDuration);

    });
  };
}(jQuery));
