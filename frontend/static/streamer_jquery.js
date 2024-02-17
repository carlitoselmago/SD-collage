(function ($) {
  // Define the plugin name and default options
  $.fn.streamer = function(options) {
    // Merge the user options with the default options
    var settings = $.extend({
      watchClass: "towatch", // The base class for elements to watch
      triggerClass: "trigger", // The class of the elements that trigger the zoom
      maxTime: 5, // The maximum time in seconds to zoom on an element
      scaleFactor: 2, // The scale factor to zoom on an element
      transitionDuration: 500 // The transition duration in milliseconds
    }, options);

    // Return this to maintain chainability
    return this.each(function() {
      var $parent = $(this); // Store a reference to the parent element
      var originalTransform = $parent.css("transform"); // Store the original transform
      var currentIndex = -1; // Current element index
      var timeoutId = null; // Timeout id

      // Function to zoom on an element by index
      var zoomOnElement = function(index) {
        if (timeoutId) clearTimeout(timeoutId); // Clear previous timeout

        var $elements = $parent.find("." + settings.watchClass); // Find elements to watch
        if ($elements.length === 0) {
          zoomOut(); // Zoom out if no elements
          return;
        }

        index = index % $elements.length; // Wrap index
        currentIndex = index; // Update current index

        var $element = $($elements[index]); // Get the target element
        var elOffset = $element.offset(); // Element's offset
        var parentOffset = $parent.offset(); // Parent's offset

        // Calculate the position of the element relative to the parent
        var relTop = elOffset.top - parentOffset.top;
        var relLeft = elOffset.left - parentOffset.left;

        // Adjust translations to center the element
        var translateX = -relLeft + ($parent.width() / 2) - ($element.width() * settings.scaleFactor / 2);
        var translateY = -relTop + ($parent.height() / 2) - ($element.height() * settings.scaleFactor / 2);

        // Apply CSS transformations
        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: `translate(${translateX}px, ${translateY}px) scale(${settings.scaleFactor})`
        });

        // Set timeout to move to the next element
        timeoutId = setTimeout(function () {
          zoomOnElement(currentIndex + 1);
        }, settings.maxTime * 1000);
      };

      // Function to reset zoom
      var zoomOut = function() {
        if (timeoutId) clearTimeout(timeoutId);
        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: originalTransform
        });
      };

      // Listen for clicks on trigger elements to start zoom
      $parent.on('click', '.' + settings.triggerClass, function() {
        var index = $(this).index('.' + settings.triggerClass);
        zoomOnElement(index);
      });

      // Optionally, initialize zoom on the first element
      // zoomOnElement(0); // Uncomment to start zooming on the first element
    });
  };
}(jQuery));
