/**
 * The main solrHeatmapApp module
 */
angular
    .module('SolrHeatmapApp', ['ui.bootstrap']);

/**
 * BackgroundLayer Controller
 */
angular
    .module('SolrHeatmapApp')
    .controller('BackgroundLayerCtrl', ['Map', '$scope', function(MapService, $scope) {

        /**
         *
         */
        $scope.layers = {};
        $scope.selectedLayer = {};

        /**
         *
         */
        $scope.$on('mapReady', function(event, map) {
            $scope.layers = map.getLayers().getArray();
            $scope.selectedLayer = {
                name: $scope.getBackgroundLayers()[0].get('name')
            };
        });

        /**
         *
         */
        $scope.isBackgroundLayer = function(layer) {
            var isBackgroundLayer = false;
            if (layer.get('backgroundLayer')) {
                isBackgroundLayer = true;
            }
            return isBackgroundLayer;
        };

        /**
         *
         */
        $scope.setBackgroundLayer = function(layer) {
            angular.forEach($scope.getBackgroundLayers(), function(bgLayer) {
                if (bgLayer === layer) {
                    layer.setVisible(true);
                    $scope.selectedLayer = {name: layer.get('name')};
                } else {
                    bgLayer.setVisible(false);
                }
            });
        };

        /**
         *
         */
        $scope.getBackgroundLayers = function() {
            var layers = MapService.getMap().getLayers().getArray();

            return layers.filter(function(l) {
                if (l.get('backgroundLayer')) {
                    return true;
                } else {
                    return false;
                }
            });
        };

    }]);

/**
 * DatePickerCtrl Controller
 */
angular.module('SolrHeatmapApp')
    .controller('DatePickerCtrl', ['HeatMapSourceGenerator', '$scope', function(HeatMapSourceGeneratorService, $scope) {

        $scope.initialDateOptions = {
            minDate: new Date('2000-01-01'),
            maxDate: new Date('2016-12-31')
        };

        $scope.dateOptions = {
            minDate: HeatMapSourceGeneratorService.getSearchObj().minDate,
            maxDate: HeatMapSourceGeneratorService.getSearchObj().maxDate,
            startingDay: 1, // Monday
            showWeeks: false
        };

        /**
         * Will be called on click on start datepicker.
         * `minDate` will be reset to the initial value (e.g. 2000-01-01),
         * `maxDate` will be adjusted with the `$scope.dte` value to restrict
         *  it not to be below the `minDate`.
         */
        $scope.openStartDate = function() {
            $scope.startDate.opened = true;
            $scope.dateOptions.minDate = $scope.initialDateOptions.minDate;
            $scope.dateOptions.maxDate = $scope.dte;
        };

        /**
         * Will be called on click on end datepicker.
         * `maxDate` will be reset to the initial value (e.g. 2016-12-31),
         * `minDate` will be adjusted with the `$scope.dts` value to restrict
         *  it not to be bigger than the `maxDate`.
         */
        $scope.openEndDate = function() {
            $scope.endDate.opened = true;
            $scope.dateOptions.maxDate = $scope.initialDateOptions.maxDate;
            $scope.dateOptions.minDate = $scope.dts;
        };

        $scope.startDate = {
            opened: false
        };

        $scope.endDate = {
            opened: false
        };

        /**
         * Set initial values for min and max dates in both of datepicker.
         */
        $scope.setInitialDates = function(){
            $scope.dts = $scope.dateOptions.minDate;
            $scope.dte = $scope.dateOptions.maxDate;
        };

        $scope.setInitialDates();

        /**
         * Will be fired after the start date was chosen.
         */
        $scope.onChangeStartDate = function(){
            $scope.setDateRange($scope.dts, $scope.dte);
            HeatMapSourceGeneratorService.performSearch();
        };

        /**
         * Will be fired after the end date was chosen.
         */
        $scope.onChangeEndDate = function(){
            $scope.setDateRange($scope.dts, $scope.dte);
            HeatMapSourceGeneratorService.performSearch();
        };

        /**
         * Help method that updates `searchObj` of the heatmap with
         * the current min and max dates.
         * @param {Date} minDate date value of the start datepicker
         * @param {Date} maxDate date value of the end datepicker
         */
        $scope.setDateRange = function(minDate, maxDate){
          HeatMapSourceGeneratorService.setMinDate(minDate);
          HeatMapSourceGeneratorService.setMaxDate(maxDate);
        };
    }]);

/**
 * Export Controller
 */
angular
    .module('SolrHeatmapApp')
    .controller('ExportCtrl', ['HeatMapSourceGenerator', '$scope', function(HeatMapSourceGeneratorService, $scope) {

        $scope.startExport = function() {
          HeatMapSourceGeneratorService.startCsvExport();
        };
    }]);

/**
 * Main Controller
 */
angular
    .module('SolrHeatmapApp')
    .controller('mainCtrl', ['Map', 'HeatMapSourceGenerator' , '$http', '$scope', '$rootScope', function(MapService, HeatMapSourceGeneratorService, $http, $scope, $rootScope) {
        solrHeatmapApp = this;

       //  get the app config
        $http.get('./config/appConfig.json').
            success(function(data, status, headers, config) {
                if (data && data.mapConfig) {
                    var mapConf = data.mapConfig,
                        appConf = data.appConfig,
                        bopwsConfig = data.bopwsConfig;
                    // create the map with the given config
                    MapService.init({
                        mapConfig: mapConf
                    });
                    solrHeatmapApp.appConfig = appConf;
                    solrHeatmapApp.initMapConf = mapConf;
                    solrHeatmapApp.bopwsConfig = bopwsConfig;
                    // fire event mapReady
                    $rootScope.$broadcast('mapReady', MapService.getMap());

                    MapService.getMap().on('moveend', function(evt){
                      HeatMapSourceGeneratorService.performSearch();
                    });

                    MapService.getMap().getView().on('change:resolution', function(evt){
                      var existingHeatMapLayers = MapService.getLayersBy('name', 'HeatMapLayer');
                      if (existingHeatMapLayers && existingHeatMapLayers.length > 0){
                        var radius = 500 * evt.target.getResolution();
                        var hmLayer = existingHeatMapLayers[0];
                        if (radius > 15) {
                          radius = 15;
                        }
                        hmLayer.setRadius(radius);
                        hmLayer.setBlur(radius*2);
                      }
                    });

                  // Prepared featureInfo (display number of elements)
                  //solrHeatmapApp.map.on('singleclick', MapService.displayFeatureInfo);

                } else {
                    throw 'Could not find the mapConfig';
                }
            }).
            error(function(data, status, headers, config) {
                throw 'Error while loading the config.json';
            });
    }]);

/**
 * ResultCounter Controller
 */
angular
    .module('SolrHeatmapApp')
    .controller('ResultCounterCtrl', ['$scope', function($scope) {

        $scope.$on('setCounter', function(e, data){
          if (data < 1) {
              data = "No results found";
          }
            $scope.counter = data;
        });
    }]);

/**
 * Search Controller
 */
angular
    .module('SolrHeatmapApp')
    .controller('SearchCtrl', ['Map', 'HeatMapSourceGenerator', '$scope', '$http', function(MapService, HeatMapSourceGeneratorService, $scope, $http) {

        /**
         *
         */
        $scope.searchInput = '';
        /**
         *
         */
        $scope.onKeyPress = function($event) {
            // only fire the search if Enter-key (13) is pressed
            if (getKeyboardCodeFromEvent($event) === 13) {
                $scope.doSearch();
            }
        };

        /**
         *
         */
        $scope.doSearch = function() {
            // if no input is given
            // if ($scope.searchInput.length === 0) {
            //    return false;
            // }

          HeatMapSourceGeneratorService.setSearchText($scope.searchInput);
          HeatMapSourceGeneratorService.performSearch();
        };

        $scope.resetSearchInput = function() {
          $scope.searchInput = '';
          HeatMapSourceGeneratorService.setSearchText('');
          HeatMapSourceGeneratorService.performSearch();
        };

        /**
         *
         */
        function getKeyboardCodeFromEvent(keyEvt) {
            return window.event ? keyEvt.keyCode : keyEvt.which;
        }

    }]);

/**
 * HeatMapSourceGenerator Service
 */
angular
    .module('SolrHeatmapApp')
    .factory('HeatMapSourceGenerator', ['Map', '$rootScope', '$filter', '$window', '$http', function(MapService, $rootScope, $filter, $window, $http) {

        var searchObj = {
            minDate: new Date('2000-01-01'),
            maxDate: new Date('2016-12-31'),
            searchText : ''
        };

        var methods = {
            getGeospatialFilter: getGeospatialFilter,
            getTweetsSearchQueryParameters: getTweetsSearchQueryParameters,
            performSearch: performSearch,
            startCsvExport: startCsvExport,
            setSearchText: setSearchText,
            setMinDate: setMinDate,
            setMaxDate: setMaxDate,
            getFormattedDateString: getFormattedDateString,
            getSearchObj: getSearchObj
        };

        return methods;

        /**
         * Set keyword text
         */
        function setSearchText(val) {
            searchObj.searchText = val;
        }

        /**
         * Set start search date
         */
        function setMinDate(val) {
            searchObj.minDate = val;
        }

        /**
         * Set end search date
         */
        function setMaxDate (val) {
            searchObj.maxDate = val;
        }

        /**
         * Returns the complete search object
         */
        function getSearchObj(){
            return searchObj;
        }

        /**
         * Builds geospatial filter depending on the current map extent.
         * This filter will be used later for `q.geo` parameter of the API
         * search or export request.
         */
        function getGeospatialFilter(){
            var map = MapService.getMap(),
                viewProj = map.getView().getProjection().getCode(),
                extent = map.getView().calculateExtent(map.getSize()),
                extentWgs84 = ol.proj.transformExtent(extent, viewProj, 'EPSG:4326'),
                geoFilter = {};

            if (extent && extentWgs84){

              var normalizedExtent = normalize(extentWgs84);

                var minX = normalizedExtent[1],
                    maxX = normalizedExtent[3],
                    minY = normalizedExtent[0],
                    maxY = normalizedExtent[2];

                geoFilter = {
                    minX: minX,
                    maxX: maxX,
                    minY: minY,
                    maxY: maxY
                };
            }

            return geoFilter;
        }

        /**
         * Performs search with the given full configuration / search object.
         */
        function performSearch(){
          var config = {},
              params = this.getTweetsSearchQueryParameters(this.getGeospatialFilter());

         // add additional parameter for the soft maximum of the heatmap grid
        params["a.hm.limit"] = solrHeatmapApp.bopwsConfig.heatmapFacetLimit;

          if (params) {

              config = {
                  url: solrHeatmapApp.appConfig.tweetsSearchBaseUrl,
                  method: 'GET',
                  params: params
              };

            //load the data
            $http(config).
            success(function(data, status, headers, config) {
                // check if we have a heatmap facet and update the map with it
                if (data && data["a.hm"]) {
                    MapService.createOrUpdateHeatMapLayer(data["a.hm"]);
                    // get the count of matches
                    $rootScope.$broadcast('setCounter', data["a.matchDocs"]);
                }
            }).
            error(function(data, status, headers, config) {
                // hide the loading mask
                //angular.element(document.querySelector('.waiting-modal')).modal('hide');
                $window.alert("An error occured while reading heatmap data");
            });
          }
        }

        /**
         * Help method to build the whole params object, that will be used in
         * the API requests.
         */
        function startCsvExport(){
            var config = {},
                params = this.getTweetsSearchQueryParameters(this.getGeospatialFilter());
                // add additional parameter for the number of documents to return
                params["d.docs.limit"] = solrHeatmapApp.bopwsConfig.csvDocsLimit;

            if (params) {
                config = {
                    url: solrHeatmapApp.appConfig.tweetsExportBaseUrl,
                    method: 'GET',
                    params: params
                };

                //start the export
                $http(config).
                success(function(data, status, headers, config) {
                    var anchor = angular.element('<a/>');
                    anchor.css({display: 'none'}); // Make sure it's not visible
                    angular.element(document.body).append(anchor); // Attach to document
                    anchor.attr({
                        href: 'data:attachment/csv;charset=utf-8,' + encodeURI(data),
                        target: '_blank',
                       download: 'bop_export.csv'
                    })[0].click();
                    anchor.remove(); // Clean it up afterwards
                }).
                error(function(data, status, headers, config) {
                    $window.alert("An error occured while exporting csv data");
                });
            }
        }

        /**
         *
         */
        function getTweetsSearchQueryParameters(bounds) {

            // get keyword and time range
            var reqParamsUi = this.getSearchObj(),
                keyword;

            if (reqParamsUi.searchText.length === 0){
                keyword = '*';
            } else {
                keyword = reqParamsUi.searchText;
            }

            var params = {
                "q.text": keyword,
                "q.time": '[' + this.getFormattedDateString(reqParamsUi.minDate) + ' TO ' + this.getFormattedDateString(reqParamsUi.maxDate) + ']',
                "q.geo": '[' + bounds.minX + ',' + bounds.minY + ' TO ' + bounds.maxX + ',' + bounds.maxY + ']'
            };

           return params;
        }

        /**
         * Determines whether passed longitude is outside of the range `-180` and
         * `+180`.
         *
         * @param {number} lon The longitude to check.
         * @return {boolean} Whether the longitude is outside of the range `-180` and
         *   `+180`.
         */
        function outsideLonRange(lon) {
            return lon < -180 || lon > 180;
        }

        /**
         * Determines whether passed latitude is outside of the range `-90` and `+90`.
         *
         * @param {number} lat The longitude to check.
         * @return {boolean} Whether the latitude is outside of the range `-90` and
         *   `+90`.
         */
        function outsideLatRange(lat) {
            return lat < -90 || lat > 90;
        }

        /**
         * Clamps given longitude to be inside the allowed range from `-180` to `+180`.
         *
         * @param {number} lon The longitude to fit / clamp.
         * @return {number} The fitted / clamped longitude.
         */
        function clampLon(lon) {
            return clamp(lon, -180, 180);
        }

        /**
         * Clamps given latitude to be inside the allowed range from `-90` to `+90`.
         *
         * @param {number} lat The latitude to fit / clamp.
         * @return {number} The fitted / clamped latitude.
         */
        function clampLat(lat) {
            return clamp(lat, -90, 90);
        }

        /**
         * Clamps given number `num` to be inside the allowed range from `min` to `max`.
         * Will also work as expected if `max` and `min` are accidently swapped.
         *
         * @param {number} num The number to clamp.
         * @param {number} min The minimum allowed number.
         * @param {number} max The maximim allowed number.
         * @return {number} The clamped number.
         */
        function clamp(num, min, max) {
            if (max < min) {
                var tmp = min;
                min = max;
                max = tmp;
            }
            return Math.min(Math.max(min, num), max);
        }

        /**
         * Normalizes an `EPSG:4326` extent which may stem from multiple worlds so that
         * the returned extent always is within the bounds of the one true `EPSG:4326`
         * world extent `[-180, -90, 180, 90]`.
         *
         * Examples:
         *
         *     // valid world in, returned as-is:
         *     normalize([-180, -90, 180, 90])  // => [-180, -90, 180, 90]
         *
         *     // valid extent in world in, returned as-is:
         *     normalize([-160, -70, 150, 70])  // => [-160, -70, 150, 70]
         *
         *     // shifted one degree westwards, returns one-true world:
         *     normalize([-181, -90, 179, 90])  // => [-180, -90, 180, 90]
         *
         *     // shifted one degree eastwards, returns one-true world:
         *     normalize([-179, -90, 181, 90])  // => [-180, -90, 180, 90]);
         *
         *     // shifted more than one world westwards, returns one-true world:
         *     normalize([-720, -90, -360, 90]) // => [-180, -90, 180, 90]);
         *
         *     // shifted to the south, returns one-true world:
         *     normalize([-180, -91, 180, 89])  // =>   [-180, -90, 180, 90]);
         *
         *     // multiple worlds, returns one-true world:
         *     normalize([-360, -90, 180, 90])  // =>   [-180, -90, 180, 90]);
         *
         *     // multiple worlds, returns one-true world:
         *     normalize([-360, -180, 180, 90]) // =>  [-180, -90, 180, 90]);
         *
         * @param {Array<number>} extent Extent to normalize: [minx, miny, maxx, maxy].
         * @return {Array<number>} extent Normalized extent: [minx, miny, maxx, maxy].
         */
        function normalize(extent) {
            var minX = extent[0];
            var minY = extent[1];
            var maxX = extent[2];
            var maxY = extent[3];
            var width = Math.min(maxX - minX, 360);
            var height = Math.min(maxY - minY, 180);

            if (outsideLonRange(minX)) {
                minX = clampLon(minX);
                maxX = minX + width;
            } else if (outsideLonRange(maxX)) {
                maxX = clampLon(maxX);
                minX = maxX - width;
            }

            if (outsideLatRange(minY)) {
                minY = clampLat(minY);
                maxY = minY + height;
            } else if (outsideLatRange(maxY)) {
                maxY = clampLat(maxY);
                minY = maxY - height;
            }

            return [minX, minY, maxX, maxY];
        }

        /**
         * Returns the formatted date object that can be parsed by API.
         * @param {Date} date full date object (e.g. 'Sat Jan 01 2000 01:00:00 GMT+0100 (CET))
         * @return {String} formatted date as string (e.g. '2000-01-01')
         */
         function getFormattedDateString(date){
             return date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
         }
    }]);

/**
 * Map Service
 */
angular
    .module('SolrHeatmapApp')
    .factory('Map', ['$rootScope', '$filter', '$http', function($rootScope, $filter, $http) {

        var map = {},
            defaults = {
                renderer: 'canvas',
                view: {
                    center: [0 ,0],
                    projection: 'EPSG:3857',
                    zoom: 2
                }
            };

        var ms = {
            //map: map,
            init: init,
            getMap: getMap,
            getLayersBy: getLayersBy,
            getInteractionsByClass: getInteractionsByClass,
            getInteractionsByType: getInteractionsByType,
            displayFeatureInfo: displayFeatureInfo,
            createOrUpdateHeatMapLayer: createOrUpdateHeatMapLayer,
            createHeatMapSource: createHeatMapSource,
            heatmapMinMax: heatmapMinMax,
            rescaleHeatmapValue: rescaleHeatmapValue
        };

        return ms;

        /**
         *
         */
        function init(config) {
            var viewConfig = angular.extend(defaults.view, config.mapConfig.view),
                rendererConfig = angular.extend(defaults.renderer, config.mapConfig.renderer),
                layerConfig = config.mapConfig.layers;

            map = new ol.Map({
                controls: ol.control.defaults().extend([
                    new ol.control.ScaleLine(),
                    new ol.control.ZoomSlider()
                ]),
                interactions: ol.interaction.defaults(),
                layers: buildMapLayers(layerConfig),
                renderer: angular.isString(rendererConfig) ? rendererConfig :
                    undefined,
                target: 'map',
                view: new ol.View({
                    center: angular.isArray(viewConfig.center) ?
                            viewConfig.center : undefined,
                    maxZoom: angular.isNumber(viewConfig.maxZoom) ?
                            viewConfig.maxZoom : undefined,
                    minZoom: angular.isNumber(viewConfig.minZoom) ?
                            viewConfig.minZoom : undefined,
                    projection: angular.isString(viewConfig.projection) ?
                            viewConfig.projection : undefined,
                    resolution: angular.isString(viewConfig.resolution) ?
                            viewConfig.resolution : undefined,
                    resolutions: angular.isArray(viewConfig.resolutions) ?
                            viewConfig.resolutions : undefined,
                    rotation: angular.isNumber(viewConfig.rotation) ?
                            viewConfig.rotation : undefined,
                    zoom: angular.isNumber(viewConfig.zoom) ?
                            viewConfig.zoom : undefined,
                    zoomFactor: angular.isNumber(viewConfig.zoomFactor) ?
                            viewConfig.zoomFactor : undefined
                })
            });
        }

        /**
         *
         */
        function buildMapLayers(layerConfig) {
            var layer,
                layers = [];

            if (angular.isArray(layerConfig)) {
                angular.forEach(layerConfig, function(conf) {
                    if (conf.type === 'TileWMS') {
                        layer = new ol.layer.Tile({
                            name: conf.name,
                            backgroundLayer: conf.backgroundLayer,
                            displayInLayerPanel: conf.displayInLayerPanel,
                            source: new ol.source.TileWMS({
                                attributions: [new ol.Attribution({
                                    html: conf.attribution
                                })],
                                crossOrigin: conf.crossOrigin,
                                logo: conf.logo,
                                params: conf.params,
                                ratio: conf.ratio,
                                resolutions: conf.resoltions,
                                url: conf.url
                            }),
                            opacity: conf.opacity,
                            visible: conf.visible
                        });
                    }
                    if (conf.type === 'ImageWMS') {
                        layer = new ol.layer.Image({
                            name: conf.name,
                            backgroundLayer: conf.backgroundLayer,
                            displayInLayerPanel: conf.displayInLayerPanel,
                            source: new ol.source.ImageWMS({
                                attributions: [new ol.Attribution({
                                    html: conf.attribution
                                })],
                                crossOrigin: conf.crossOrigin,
                                logo: conf.logo,
                                params: conf.params,
                                resolutions: conf.resoltions,
                                url: conf.url,
                            }),
                            opacity: conf.opacity,
                            visible: conf.visible
                        });
                    }
                    layers.push(layer);
                });
            }
            return layers;
        }

        /**
         *
         */
        function getLayersBy(key, value) {
            var layers = this.getMap().getLayers().getArray();
            return $filter('filter')(layers, function(layer) {
                return layer.get(key) === value;
            });
        }

        /**
         *
         */
        function getInteractionsByClass(value) {
            var interactions = solrHeatmapApp.map.getInteractions().getArray();
            return $filter('filter')(interactions, function(interaction) {
                return interaction instanceof value;
            });
        }

        /**
         *
         */
        function getInteractionsByType(interactions, type) {
            return $filter('filter')(interactions, function(interaction) {
                return interaction.type_ === type;
            });
        }

        /**
         *
         */
        function getMap() {
            return map;
        }

        /**
         *
         */
        function displayFeatureInfo(evt) {
            var coord = evt.coordinate,
                feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
                    return feature;
                }),
                msg = '',
                evtCnt = 0,
                lyrCnt = 0;

            // the popup element
            var container = document.getElementById('popup');
            var content = document.getElementById('popup-content');
            var closer = document.getElementById('popup-closer');

            closer.onclick = function() {
                overlay.setPosition(undefined);
                closer.blur();
                return false;
            };

            // create an overlay
            var overlay = new ol.Overlay({
                element: container,
                autoPan: true,
                autoPanAnimation: {
                  duration: 250
                }
            });

            // remove any existing overlay before adding a new one
            map.getOverlays().clear();
            map.addOverlay(overlay);

            if (feature) {
              var data = feature.get('origVal');
              if (data) {
                   $rootScope.$broadcast('featureInfoLoaded', data);
              }
            }

            $rootScope.$on('featureInfoLoaded', function(evt, data) {
               msg += '<h5>Number of elements: </h5>' + data;
               content.innerHTML = msg;
               var overlay = solrHeatmapApp.map.getOverlays().getArray()[0];
               if (overlay) {
                 overlay.setPosition(coord);
               }
           });

        }

        function createOrUpdateHeatMapLayer(data) {
          var olVecSrc = this.createHeatMapSource(data),
              existingHeatMapLayers = this.getLayersBy('name', 'HeatMapLayer'),
              newHeatMapLayer;
          if (existingHeatMapLayers && existingHeatMapLayers.length > 0){
              var currHeatmapLayer = existingHeatMapLayers[0];
              // Update layer source
              var layerSrc = currHeatmapLayer.getSource();
              if (layerSrc){
                layerSrc.clear();
              }
              currHeatmapLayer.setSource(olVecSrc);
          } else {
            newHeatMapLayer = new ol.layer.Heatmap({
             name: 'HeatMapLayer',
             source: olVecSrc,
             radius: 10,
             //opacity: 0.25
           });
            map.addLayer(newHeatMapLayer);
          }
        }

        /*
         *
         */
        function createHeatMapSource(hmParams) {

            var counts_ints2D = hmParams.counts_ints2D,
                gridLevel = hmParams.gridLevel,
                gridColumns = hmParams.columns,
                gridRows = hmParams.rows,
                minX = hmParams.minX,
                minY = hmParams.minY,
                maxX = hmParams.maxX,
                maxY = hmParams.maxY,
                hmProjection = hmParams.projection,
                dx = maxX - minX,
                dy = maxY - minY,
                sx = dx / gridColumns,
                sy = dy / gridRows,
                olFeatures = [],
                map = this.getMap(),
                minMaxValue,
                sumOfAllVals = 0;

            if (!counts_ints2D) {
              return null;
            }
            minMaxValue = this.heatmapMinMax(counts_ints2D, gridRows, gridColumns);
            for (var i = 0 ; i < gridRows ; i++){
              for (var j = 0 ; j < gridColumns ; j++){
                  var hmVal = counts_ints2D[counts_ints2D.length - i - 1][j],
                      lon,
                      lat,
                      feat,
                      coords;

                  if (hmVal && hmVal !== null){
                    lat = minY + i*sy + (0.5 * sy);
                    lon = minX + j*sx + (0.5 * sx);
                    coords = ol.proj.transform(
                      [lon, lat],
                      hmProjection,
                      map.getView().getProjection().getCode()
                    );

                    feat = new ol.Feature({
                      geometry: new ol.geom.Point(coords)
                    });

                    // needs to be rescaled.
                    var scaledValue = this.rescaleHeatmapValue(hmVal, minMaxValue);
                    feat.set('weight',  scaledValue);
                    feat.set('origVal', hmVal);

                    olFeatures.push(feat);
                  }
              }
            }

            olVecSrc = new ol.source.Vector({
              features: olFeatures,
              useSpatialIndex: true
            });
            return olVecSrc;

        }

        function heatmapMinMax(heatmap, stepsLatitude, stepsLongitude){
          var max = -1;
          var min = Number.MAX_VALUE;
          for (var i = 0 ; i < stepsLatitude ; i++){
            var currentRow = heatmap[i];
            if (currentRow === null){
              heatmap[i] = currentRow = [];
            }
            for (var j = 0 ; j < stepsLongitude ; j++){
              if (currentRow[j] === null){
                currentRow[j] = -1;
              }

              if (currentRow[j] > max){
                max = currentRow[j];
              }

              if (currentRow[j] < min && currentRow[j] > -1){
                min = currentRow[j];
              }
            }
          }
          return [min, max];
        }

        function rescaleHeatmapValue(value, minMaxValue){
          if (value === null){
            return 0;
          }

          if (value == -1){
            return -1;
          }

          if (value === 0){
            return 0;
          }

          if ((minMaxValue[1] - minMaxValue[0]) === 0){
            return 0;
          }

          return (value - minMaxValue[0]) / (minMaxValue[1] - minMaxValue[0]) ;
        }

    }]);
