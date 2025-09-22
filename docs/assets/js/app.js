var App = {
  data: [],
  mapLayers: [],
  map: null,
  init: function (data, configs) {
    var thiz = this;
    var defaults = {
      localStorageName: "NOSSDB",
      modalElement: null,
      leaflet: {
        element: $("#map"),
        width: "100%",
        height: "400px",
        tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        defaultCenter: [51.505, -0.09],
        defaultZoom: 2,
      },
    };

    this.configs = $.extend(true, defaults, configs);
    this.data = thiz.initData(data);
    this.corruptData = thiz.initCorruptData(data);
    thiz.initLeaflet();
    thiz.initEvents();
  },

  rerenderMap: function () {
    this.renderMapLayers(this.data);
  },

  initEvents: function () {
    var modelElement = App.configs.modalElement;

    $(document).on("click", ".btn-remove-history", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var code = $(this).data("code");
      var findItem = _.find(App.data, { "case_number": code });
      if (findItem) {
        var findLayer = _.find(App.mapLayers, { code: code });
        if (findLayer) {
          App.helpers.removePlaceFromLS(code);
          findLayer["maker"].setIcon(
            App.helpers.leafletIcon("normal", findItem.color)
          );
          modelElement.modal("hide");
        }
      }
    });
  },

  initData: function (data) {
    var thiz = this;
    var result = [];
    if (typeof data == "object") {
      for (var item of data) {
        var lat = item.latitude;
        var Lng = item.longitude;

        if (lat && Lng) {
          // Set sales_time to beginning of the day (midnight) in local time
          // Parse the sales date from the database and convert to local time format for Date()

          var dateStr = item["sales_date"];
          var saleDate;
          
          // Parse date manually to ensure local time interpretation
          if (dateStr.includes('-')) {
            // Handle YYYY-MM-DD format
            var parts = dateStr.split('-');
            saleDate = new Date(parts[0], parts[1] - 1, parts[2]); // Month is 0-indexed
          } else if (dateStr.includes('/')) {
            // Handle MM/DD/YYYY format
            var parts = dateStr.split('/');
            saleDate = new Date(parts[2], parts[0] - 1, parts[1]); // Month is 0-indexed
          } else {
            // Fallback to original parsing
            saleDate = new Date(dateStr);
          }

          saleDate.setHours(0, 0, 0, 0); // Set to beginning of day
          item["sales_time"] = saleDate.getTime();
          result.push(item);
        }
      }

      result = thiz.helpers.calcSpectrumRange(result);
    }
    return result;
  },

  initCorruptData: function (data) {
    var result = [];
    if (typeof data == "object") {
      for (var item of data) {
        var lat = item.latitude;
        var Lng = item.longitude;

        if (!lat || !Lng) {
          result.push(item);
        }
      }
    }
    return result;
  },

  initLeaflet: function () {
    var thiz = this;
    var leafletConf = this.configs.leaflet;
    var element = leafletConf.element;
    var mapWidth = leafletConf.width;
    var mapHeight = leafletConf.height;
    var tileUrl = leafletConf.tileUrl;
    if (element.length) {
      element.css("width", mapWidth);
      element.css("height", mapHeight);

      var centerLatLng = "";
      var zoomLevel = "";
      var mapStorage = thiz.helpers.getLefletMapDataFromLS();
      if (!mapStorage) {
        var centerZoom = thiz.helpers.getCenterZoomLevel(thiz.data);
        if (centerZoom) {
          centerLatLng = [centerZoom.centerLat, centerZoom.centerLong];
          zoomLevel = centerZoom.zoomLevel;
        }
      } else {
        centerLatLng = [mapStorage.lat, mapStorage.lng];
        zoomLevel = mapStorage.zoom;
      }

      var map = L.map("map", {
        zoomControl: false,
        attributionControl: false
      }).setView(centerLatLng, zoomLevel);
      
      // Add zoom control with error handling
      try {
        var zoomControl = L.control.zoom({
          position: 'bottomright'
        });
        zoomControl.addTo(map);
        // console.log('Zoom control added successfully');
      } catch (error) {
        console.error('Error adding Leaflet zoom control:', error);
      }
      
      thiz.map = map;
      L.tileLayer(tileUrl).addTo(map);
      thiz.renderMapLayers(App.data);

      map.on("moveend", function (dragend) {
        var bounds = map.getCenter();
        var zoom = map.getZoom();
        var values = {
          lat: bounds.lat,
          lng: bounds.lng,
          zoom,
        };
        localStorage.setItem("leaflet-map-data", JSON.stringify(values));
      });
    }
  },

  searchData: function (params) {
    /**
     * This function filters the data based on the provided parameters.
     * The params argument should contain:
     * - salesDate: A date range string in the format "MM/DD/YYYY - MM/DD/YYYY"
     * - maxAmount: A string representing the maximum writ amount (can include commas)
     * - minAmount: A string representing the minimum writ amount (can include commas)
     * - terms: A string to search in the terms and conditions
     * - zip: A string or comma-separated list of ZIP codes to search in the address description
     */

    var salesDate = params.salesDate;
    var maxAmount = params.maxAmount ? App.helpers.removeCommaString(params.maxAmount) : 0;
    var minAmount = params.minAmount ? App.helpers.removeCommaString(params.minAmount) : 0;
    var terms = params.terms;
    var zip = params.zip;

    // Convert the salesDate search string to a start and end date for comparison later
    var startDate = "";
    var endDate = "";
    if (salesDate) {
      var datesArr = salesDate.split(" - ");
      if (datesArr.length == 2) {                         // TODO: Handle if datesArr.length != 2
        var _startDate = new Date(datesArr[0])
        var _endDate = new Date(datesArr[1])

        _startDate.setHours(0, 0, 0, 0);    // Set to beginning of the day
        _endDate.setHours(23, 59, 59, 999); // Set to end of the date

        var startTimestamp = _startDate.getTime();
        var endTimestamp = _endDate.getTime();
        
        if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {     // TODO: Handle if timestamps are NaN
          startDate = startTimestamp;
          endDate = endTimestamp;
        }
      }
    }

    // console.log('searchData params:', params);
    // console.log('Processed filter values:', { startDate, endDate, maxAmount, minAmount, terms, zip });

    var result = [];

    // If there are no filters set, return all data
    if (!startDate && !endDate && !maxAmount && !minAmount && !terms && !zip) {
      result = App.data;

    // Otherwise, set up the filters and evaluate each data item
    } else {
      for (var item of App.data) {
        var SalesTime = item["sales_time"];
        var AddressDesc = item["address_description"];
        var TermsConditions = item["terms_and_conditions"];
        var Amount = item["writ_amount"];

        var itemCond = [];

        if (zip && AddressDesc) {
          // TODO: This should be generalized to any search term; use .toLowerCase()
          // Handle multiple ZIP codes separated by commas
          var zipMatched = false;
          var zipCodes = zip.split(',').map(function(z) { return z.trim(); });
          
          for (var i = 0; i < zipCodes.length; i++) {
            if (zipCodes[i]) {
              var zipCheck = AddressDesc.match(new RegExp(zipCodes[i]));
              if (zipCheck !== null) {
                zipMatched = true;
                break;
              }
            }
          }
          
          itemCond.push(zipMatched);
        }

        if (TermsConditions && terms) {
          // TODO: This should be a general search rather than a substring match
          var termsCond = TermsConditions.toLowerCase().indexOf(terms.toLowerCase());
          itemCond.push(termsCond !== -1);
        }

        if (Amount && (maxAmount || minAmount)) {
          // TODO: How is "undefined" amount handled?
          var amountCond = true;    // Defaults to including this item; the following lines determine whether to remove it
          if (maxAmount && !minAmount) {
            amountCond = Amount <= maxAmount;
          } else if (!maxAmount && minAmount) {
            amountCond = Amount >= minAmount;
          } else if (maxAmount && minAmount) {
            amountCond = Amount >= minAmount && Amount <= maxAmount;
          }
          itemCond.push(amountCond);
        }

        if (SalesTime && startDate && endDate) {
          // console.log(SalesTime, startDate, endDate, new Date(SalesTime), new Date(startDate), new Date(endDate));
          var dateCond = SalesTime >= startDate && SalesTime <= endDate;
          itemCond.push(dateCond);
        }

        // Use AND logic: all conditions must be true (or no conditions set)
        var passesFilter = itemCond.length === 0 || itemCond.every(function(cond) { return cond === true; });
        if (passesFilter) {
          result.push(item);
        }
      }
    }
    this.renderMapLayers(result);
    // console.log('Filter result: ' + result.length + ' properties found');
    
    if (result) {
      var centerZoom = this.helpers.getCenterZoomLevel(result);
      if (centerZoom) {
        centerLatLng = [centerZoom.centerLat, centerZoom.centerLong];
        zoomLevel = centerZoom.zoomLevel;
        this.map.setView(centerLatLng, zoomLevel);
      }
    }

    return result.length;
  },

  renderMapLayers: function (data) {
    var thiz = this;
    if (App.mapLayers.length) {
      for (var layer of App.mapLayers) {
        thiz.map.removeLayer(layer["maker"]);
      }
    }

    if (typeof data == "object") {
      for (var item of data) {
        var color = item["color"];
        var code = item["case_number"];
        var latitude = item.latitude;
        var longitude = item.longitude;
        if (latitude && longitude) {
          var isSelected = thiz.helpers.checkPlaceInLS(code);
          var iconType = isSelected ? "checked" : "normal";

          var maker = L.marker([latitude, longitude], {
            icon: App.helpers.leafletIcon(iconType, color),
          }).addTo(thiz.map);
          maker.on("click", thiz.handleClickPlace);

          //delete layer if exsit
          var findLayer = _.find(App.mapLayers, { code });
          if (findLayer) {
            App.mapLayers = App.mapLayers.filter(function (i) {
              if (i.code != code) {
                return i;
              }
            });
          }
          App.mapLayers.push({
            code,
            maker,
          });
        }
      }
    }
  },

  handleClickPlace: function (e) {
    var data = App.data;
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;
    var findItem = _.find(data, { latitude: lat, longitude: lng });
    if (findItem) {
      var code = findItem["case_number"];
      //save to localstorage && checked
      App.helpers.addPlaceToLS(code);
      var icon = App.helpers.leafletIcon("checked", findItem.color);
      e.target.setIcon(icon);

      var AddressDescription = findItem["address_description"];
      var Attorney = findItem["attorney"];
      var CaseTitle = findItem["case_title"];
      // var latitude = findItem["latitude"];
      // var longitude = findItem["longitude"];
      var Picture = findItem["picture_url"];
      var PropertyStatus = findItem["property_status"];
      var SalesDate = findItem["sales_date"];
      var TermsConditions = findItem["terms_and_conditions"];
      var WritAmount = findItem["writ_amount"];

      var modelElement = App.configs.modalElement;
      if (modelElement && modelElement.length) {
        var html = "";
        if (Picture) {
          Picture = Picture.replace("\\", "/");
        } else {
          Picture = "./assets/images/no-image.png";
        }
        html += `<img src='${Picture}' style="max-width:100%" /><hr/>`;
        html += `<p><b>Address/Description</b>: ${AddressDescription}</p>`;
        html += `<p><b>Attorney</b>: ${Attorney}</p>`;
        html += `<p><b>Case Title</b>: ${CaseTitle}</p>`;
        // html += `<p><b>latitude</b>: ${latitude}</p>`;
        // html += `<p><b>longitude</b>: ${longitude}</p>`;
        html += `<p><b>Property Status</b>: ${PropertyStatus}</p>`;
        html += `<p><b>Sales Date</b>: ${SalesDate}</p>`;
        html += `<p><b>Terms and Conditions</b>: ${TermsConditions}</p>`;
        html += `<p><b>Writ Amount</b>: ${WritAmount}</p>`;
        html += `<button class="btn btn-primary btn-remove-history" data-code="${code}">Remove from history</button>`;
        modelElement.find(".modal-body").html(html);
        modelElement.modal("show");

        modelElement.on("hidden.bs.modal", function () {
          modelElement.find(".modal-body").html("");
        });
      }
    }
  },

  removeAllHistory: function () {
    var lsName = this.configs.localStorageName;
    localStorage.removeItem(lsName);
    this.rerenderMap();
  },

  removeMapHistory: function () {
    var lsName = "leaflet-map-data";
    localStorage.removeItem(lsName);
    var centerZoom = this.helpers.getCenterZoomLevel(this.data);
    if (centerZoom) {
      centerLatLng = [centerZoom.centerLat, centerZoom.centerLong];
      zoomLevel = centerZoom.zoomLevel;
      this.map.setView(centerLatLng, zoomLevel);
    }
  },

  helpers: {
    //LS: localStoarge
    calcSpectrumRange: function (data) {
      var thiz = this;
      if (data.length) {
        var times = [];
        data.forEach(item => {
          times.push(item["sales_time"]);
        });

        var maxTime = Math.max.apply(null, times);
        var minTime = Math.min.apply(null, times);
        var length = maxTime - minTime;

        data = data.map((item) => {
          var saleTime = item["sales_time"];
          var spectrumRange = (maxTime - saleTime) / length;  // This is the distance from one of the range to the current value
          var spectrumRangePrecent = spectrumRange; //* 100;  // Use values from 0 - 1
          item["spectrumRange"] = spectrumRange;
          item["spectrumRangePrecent"] = spectrumRangePrecent;
          item["color"] = thiz.numberToColorRgb(spectrumRangePrecent);
          return item;
        });

        return data;
      }
    },

    numberToColorRgb: function (i) {
      // This function sets a single color (rgb) for all markers
      // and scales the intensity based on i.
  
      // var red = Math.floor(255 - (255 * i) / 100);
      // var green = Math.floor((255 * i) / 100);

      // bright pink
      var red = 255;
      var green = 20;
      var blue = 147;

      return "rgb(" + i*red + "," + i*green + "," + i*blue + ")";
    },

    getCenterZoomLevel: function (data) {
      var thiz = this;
      if (data.length) {
        var lats = [];
        var longs = [];
        data.map((loc) => {
          if (loc.latitude && loc.longitude) {
            lats.push(loc.latitude);
            longs.push(loc.longitude);
          }
        });

        if (lats.length && longs.length) {
          var maxLat = Math.max.apply(null, lats);
          var minLat = Math.min.apply(null, lats);
          var maxLong = Math.max.apply(null, longs);
          var minLong = Math.min.apply(null, longs);
          var centerLat = (maxLat + minLat) / 2;
          var centerLong = (minLong + maxLong) / 2;
          var point1 = _.find(data, { longitude: maxLong });
          var point2 = _.find(data, { longitude: minLong });
          let zoomLevel = 16;

          if (point1 && point2) {
            var distance = thiz.calcDistance(
              point2.latitude,
              point2.longitude,
              point1.latitude,
              point1.longitude
            );
            zoomLevel = thiz.calcZoom(distance);
          }
          return {
            centerLat,
            centerLong,
            zoomLevel,
          };
        }
      }
      return false;
    },

    calcDistance: function (lat1, lon1, lat2, lon2) {
      var thiz = this;
      var R = 6371; // km
      var dLat = thiz.toRad(lat2 - lat1);
      var dLon = thiz.toRad(lon2 - lon1);
      var lat1 = thiz.toRad(lat1);
      var lat2 = thiz.toRad(lat2);
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
          Math.sin(dLon / 2) *
          Math.cos(lat1) *
          Math.cos(lat2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c;
      return d;
    },

    toRad: function (Value) {
      return (Value * Math.PI) / 180;
    },

    calcZoom: function (distanceKm) {
      let mines = 2;
      if (window.innerWidth < 768) {
        mines = 3;
      }
      var distances = [];
      distances[0] = 204800;
      distances[1] = 102400;
      distances[2] = 51200;
      distances[3] = 25600;
      distances[4] = 12800;
      distances[5] = 6400;
      distances[6] = 3200;
      distances[7] = 1600;
      distances[8] = 800;
      distances[9] = 400;
      distances[10] = 200;
      distances[11] = 100;
      distances[12] = 50;
      distances[13] = 25;
      distances[14] = 12.5;
      distances[15] = 6.25;
      distances[16] = 3.125;
      distances[17] = 1.5625;
      for (var i = 0; i < distances.length; i++) {
        if (distanceKm >= distances[i]) {
          return i - mines;
        }
      }
      return 18 - mines;
    },

    leafletIcon: function (type = "normal", color = "") {
      var iconSettings = {
        mapIconUrl: `<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178">
                <path style="transform: scale(0.19);fill:{mapIconColor}" d="M343,15.19c-182.59,0-330.27,147.68-330.27,330.27C12.73,593.16,343,958.81,343,958.81s330.27-365.65,330.27-613.35
                C673.27,162.87,525.59,15.19,343,15.19z"/>
              <ellipse style="transform: scale(0.19);fill: #fff;" class="st0" cx="343" cy="327.79" rx="213.23" ry="212.79"/>
              ${
                type != "normal"
                  ? `<path style="transform: scale(0.19);fill: {mapIconColor};" d="M288.9,363l-62.16-57.08l-60.09,59.91L283.98,479l235.36-222.52l-60.5-60.5L288.9,363z"/>`
                  : ""
              }
          </svg>`,
        mapIconColor: color,
      };

      const svgIcon = L.divIcon({
        className: "leaflet-data-marker",
        html: L.Util.template(iconSettings.mapIconUrl, iconSettings),
        iconAnchor: [17, 39],
        iconSize: [30, 35],
        popupAnchor: [7, -35],
      });
      return svgIcon;
    },

    addPlaceToLS: function (code) {
      var lsName = App.configs.localStorageName;
      var lsItems = localStorage.getItem(lsName);
      var arrayItems = [];
      if (lsItems) {
        try {
          arrayItems = JSON.parse(lsItems);
        } catch (err) {}
      }
      if (!arrayItems.includes(code)) {
        arrayItems.push(code);
      }
      var str = JSON.stringify(arrayItems);
      localStorage.setItem(lsName, str);
    },

    getPlacesFromLS: function () {
      var lsName = App.configs.localStorageName;
      var lsItems = localStorage.getItem(lsName);
      var arrayItems = [];
      if (lsItems) {
        try {
          arrayItems = JSON.parse(lsItems);
        } catch (err) {}
      }
      return arrayItems;
    },

    checkPlaceInLS: function (code) {
      var places = this.getPlacesFromLS();
      return places.includes(code);
    },

    removePlaceFromLS: function (code) {
      var lsName = App.configs.localStorageName;
      var places = this.getPlacesFromLS();
      places = places.filter(function (val) {
        if (val != code) {
          return val;
        }
      });
      var str = JSON.stringify(places);
      localStorage.setItem(lsName, str);
    },

    getLefletMapDataFromLS: function () {
      var lsItems = localStorage.getItem("leaflet-map-data");
      try {
        return JSON.parse(lsItems);
      } catch (err) {
        return false;
      }
    },

    removeCommaString: function (str) {
      return str.replace(/[,]+/g, "");
    },
  },
};
