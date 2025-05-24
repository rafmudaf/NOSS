$(document).ready(function () {
  $(document).on("keypress , paste", ".number-separator", function (e) {
    if (/^-?\d*[,.]?(\d{0,3},)*(\d{3},)?\d{0,3}$/.test(e.key)) {
      $(".number-separator").on("input", function () {
        e.target.value = numberSeparator(e.target.value);
      });
    } else {
      e.preventDefault();
      return false;
    }
  });

  $('input[name="salesDate"]')
    .daterangepicker({
      autoUpdateInput: false,
    })
    .on("apply.daterangepicker", function (ev, picker) {
      var startDate = picker.startDate.format("MM/DD/YYYY");
      var endDate = picker.endDate.format("MM/DD/YYYY");
      $(this).val(startDate + " - " + endDate);
    })
    .on("cancel.daterangepicker", function (ev, picker) {
      $(this).val("");
    });

  $("#filters-form").on("submit", function (e) {
    e.preventDefault();
    var filters = {
      salesDate: $('input[name="salesDate"]').val(),
      maxAmount: $('input[name="maxAmount"]').val(),
      minAmount: $('input[name="minAmount"]').val(),
      terms: $('input[name="terms"]').val(),
      zip: $('input[name="zip"]').val(),
    };
    //filters
    var result = App.searchData(filters);
    $("#result-filtered").html(result);
    $("#filters-modal").modal("hide");
    
    // Update filter tags
    updateFilterTags(filters);
  });

  // Clear all filters
  $("#clear-filters").on("click", function() {
    clearAllFilters();
  });

  $("#remove-all-history").click(function () {
    App.removeAllHistory();
    $("#settings-modal").modal("hide");
  });

  $("#remove-map-storage").click(function () {
    App.removeMapHistory();
    $("#settings-modal").modal("hide");
  });
});

function numberSeparator(Number) {
  var commaCounter = 10;
  Number += "";
  for (var i = 0; i < commaCounter; i++) {
    Number = Number.replace(",", "");
  }
  x = Number.split(".");
  y = x[0];
  z = x.length > 1 ? "." + x[1] : "";
  var rgx = /(\d+)(\d{3})/;

  while (rgx.test(y)) {
    y = y.replace(rgx, "$1" + "," + "$2");
  }
  commaCounter++;
  return y + z;
}

// Function to update filter tags
function updateFilterTags(filters) {
  const filterTags = $("#filter-tags");
  filterTags.empty();
  
  let hasFilters = false;
  
  // Helper function to create a filter tag
  function createFilterTag(label, value, filterType) {
    if (value) {
      hasFilters = true;
      const tag = $(`<span class="badge bg-secondary me-2 mb-1">
        ${label}: ${value}
        <button type="button" class="btn-close btn-close-white ms-1" style="font-size: 0.5rem;" data-filter="${filterType}"></button>
      </span>`);
      
      // Add click handler to remove individual filter
      tag.find(".btn-close").on("click", function() {
        const filterType = $(this).data("filter");
        removeFilter(filterType);
      });
      
      filterTags.append(tag);
    }
  }
  
  // Create tags for each filter type
  if (filters.salesDate) {
    createFilterTag("Date Range", filters.salesDate, "salesDate");
  }
  if (filters.minAmount) {
    createFilterTag("Min Amount", "$" + filters.minAmount, "minAmount");
  }
  if (filters.maxAmount) {
    createFilterTag("Max Amount", "$" + filters.maxAmount, "maxAmount");
  }
  if (filters.terms) {
    createFilterTag("Terms", filters.terms, "terms");
  }
  if (filters.zip) {
    createFilterTag("Zip", filters.zip, "zip");
  }
  
  // Show/hide clear all button
  $("#clear-filters").toggle(hasFilters);
}

// Function to remove a specific filter
function removeFilter(filterType) {
  // Clear the corresponding input
  $(`input[name="${filterType}"]`).val("");
  
  // Get current filters
  const filters = {
    salesDate: $('input[name="salesDate"]').val(),
    maxAmount: $('input[name="maxAmount"]').val(),
    minAmount: $('input[name="minAmount"]').val(),
    terms: $('input[name="terms"]').val(),
    zip: $('input[name="zip"]').val(),
  };
  
  // Update the map with remaining filters
  const result = App.searchData(filters);
  $("#result-filtered").html(result);
  
  // Update filter tags
  updateFilterTags(filters);
}

// Function to clear all filters
function clearAllFilters() {
  // Clear all filter inputs
  $("#filters-form input").val("");
  
  // Reset the map to show all data
  const result = App.searchData({});
  $("#result-filtered").html(result);
  
  // Clear filter tags
  $("#filter-tags").empty();
  $("#clear-filters").hide();
}
