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
