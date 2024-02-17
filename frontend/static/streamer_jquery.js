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
      var timeoutId = null;

      var zoomOnElement = function(index) {
        if (timeoutId) clearTimeout(timeoutId);

        var $elements = $parent.find("." + settings.watchClass);
        if ($elements.length === 0) {
          zoomOut();
          return;
        }

        if (index < 0 || index >= $elements.length) {
          index = 0;
        }

        var $element = $($elements[index]);
        var elementOffset = $element.offset();
        var parentOffset = $parent.offset();
        var parentCenterX = $parent.width() / 2;
        var parentCenterY = $parent.height() / 2;

        // Calculate the element's center position
        var elementCenterX = elementOffset.left - parentOffset.left + $element.outerWidth() / 2;
        var elementCenterY = elementOffset.top - parentOffset.top + $element.outerHeight() / 2;

        // Calculate the translation needed to center the element
        var translateX = parentCenterX - elementCenterX;
        var translateY = parentCenterY - elementCenterY;

        // Adjust translation based on the scale factor
        translateX = translateX * settings.scaleFactor - (translateX - translateX / settings.scaleFactor);
        translateY = translateY * settings.scaleFactor - (translateY - translateY / settings.scaleFactor);

        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: `translate(${translateX}px, ${translateY}px) scale(${settings.scaleFactor})`
        });

        timeoutId = setTimeout(function() {
          zoomOnElement((index + 1) % $elements.length);
        }, settings.maxTime * 1000);
      };

      var zoomOut = function() {
        if (timeoutId) clearTimeout(timeoutId);
        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: originalTransform
        });
      };

      var observeDOM = function() {
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length || mutation.removedNodes.length) {
              zoomOnElement(0);
            }
          });
        });

        observer.observe($parent[0], {
          childList: true,
          subtree: true
        });
      };

      observeDOM();
    });
  };
}(jQuery));
