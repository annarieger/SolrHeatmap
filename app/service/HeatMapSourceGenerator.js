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
