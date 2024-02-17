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
          index = 0; // Reset index to 0 if out of bounds
        }

        var $element = $($elements[index]);
        var elementOffset = $element.offset();
        var parentOffset = $parent.offset();

        // Calculate the new translation values to center the element
        var centerX = (parentOffset.left + $parent.width() / 2) - (elementOffset.left + $element.outerWidth() / 2);
        var centerY = (parentOffset.top + $parent.height() / 2) - (elementOffset.top + $element.outerHeight() / 2);

        // Adjust translations based on the scaleFactor
        var adjustedX = centerX * settings.scaleFactor;
        var adjustedY = centerY * settings.scaleFactor;

        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: `translate(${adjustedX}px, ${adjustedY}px) scale(${settings.scaleFactor})`
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
              zoomOnElement(0); // Start from the first element when new elements are added
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
