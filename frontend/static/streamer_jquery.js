(function ($) {
  $.fn.streamer = function(options) {
    var settings = $.extend({
      watchClass: "towatch",
      triggerClass: "trigger",
      maxTime: 5,
      scaleFactor: 2,
      transitionDuration: 5000
    }, options);

    var zoomOnElement = function($element) {
      if (!$element.length) return;

      var viewportWidth = $(window).width();
      var viewportHeight = $(window).height();
      var elementOffset = $element.offset();
      var elementWidth = $element.outerWidth();
      var elementHeight = $element.outerHeight();
      var elementCenterX = elementOffset.left + elementWidth / 2;
      var elementCenterY = elementOffset.top + elementHeight / 2;
      
      // Calculate the difference between the element's center and the viewport's center
      var deltaX = viewportWidth / 2 - elementCenterX;
      var deltaY = viewportHeight / 2 - elementCenterY;

      // Adjust for scale
      deltaX *= settings.scaleFactor;
      deltaY *= settings.scaleFactor;

      // Adjust the element's position to center it, factoring in the scale
      var scaleTransform = "scale(" + settings.scaleFactor + ")";
      var translateTransform = "translate(" + deltaX + "px, " + deltaY + "px)";
      var combinedTransform = translateTransform + " " + scaleTransform;

      $element.css({
        transition: `transform ${settings.transitionDuration}ms ease`,
        transform: combinedTransform
      });

      // Reset zoom after maxTime, if needed
      setTimeout(function() {
        $element.css({
          transform: 'none'
        });
      }, settings.maxTime * 1000);
    };

    // Initial call to zoom on elements with the trigger class
    $(document).on('DOMNodeInserted', function(e) {
      if ($(e.target).hasClass(settings.watchClass)) {
        var $newElement = $(e.target);
        zoomOnElement($newElement);
      }
    });

    // Example usage: Manually trigger zoom on the first element
    // This is a starting point; adapt as needed for your project's requirements
    var $firstElement = $("." + settings.watchClass).first();
    if ($firstElement.length) {
      zoomOnElement($firstElement);
    }
  };
}(jQuery));
