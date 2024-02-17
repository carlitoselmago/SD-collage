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
      var timeoutId = null;

      var zoomOnElement = function(index) {
        if (timeoutId) clearTimeout(timeoutId);

        var $elements = $("." + settings.watchClass); // Use the document scope if elements are not strictly children of $parent
        if ($elements.length === 0) {
          zoomOut();
          return;
        }

        if (index < 0 || index >= $elements.length) {
          index = 0; // Reset index to 0 if out of bounds
        }

        var $element = $($elements[index]);
        var elementOffset = $element.offset();

        // Calculate the viewport center
        var viewportCenterX = $(window).width() / 2;
        var viewportCenterY = $(window).height() / 2;

        // Calculate the target element's center position
        var elementCenterX = elementOffset.left + $element.outerWidth() / 2;
        var elementCenterY = elementOffset.top + $element.outerHeight() / 2;

        // Determine the translation needed to align the element's center with the viewport's center
        var translateX = viewportCenterX - elementCenterX;
        var translateY = viewportCenterY - elementCenterY;

        // Adjust translation to account for the scale factor
        translateX = translateX * settings.scaleFactor - (translateX - viewportCenterX) * (settings.scaleFactor - 1);
        translateY = translateY * settings.scaleFactor - (translateY - viewportCenterY) * (settings.scaleFactor - 1);

        $('html, body').animate({
          scrollTop: $element.offset().top - ($(window).height() - $element.outerHeight()) / 2,
          scrollLeft: $element.offset().left - ($(window).width() - $element.outerWidth()) / 2
        }, settings.transitionDuration);

        $element.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: `scale(${settings.scaleFactor})`
        });

        timeoutId = setTimeout(function() {
          zoomOnElement((index + 1) % $elements.length);
        }, settings.maxTime * 1000);
      };

      var zoomOut = function() {
        if (timeoutId) clearTimeout(timeoutId);
        $("[class^='" + settings.watchClass + "']").css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: 'scale(1)'
        });
      };

      $(document).on('DOMNodeInserted', function(e) {
        if ($(e.target).hasClass(settings.watchClass)) {
          zoomOnElement(0); // Start from the first element when a new element is added
        }
      });
    });
  };
}(jQuery));
