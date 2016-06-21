/**
 * HeatMapSourceGenerator Service
 */
angular
    .module('SolrHeatmapApp')
    .factory('HeatMapSourceGenerator', ['Map', '$rootScope', '$filter', '$http', function(MapService, $rootScope, $filter, $http) {

        var searchObj = {
            yearMin: 2005,
            yearMax: 2016,
            searchText : ''
        };

        var methods = {
            getGeospatialFilter: getGeospatialFilter,
            getTweetsSearchQueryParameters: getTweetsSearchQueryParameters,
            performSearch: performSearch,
            startCsvExport: startCsvExport,
            setSearchText: setSearchText,
            setMinYear: setMinYear,
            setMaxYear: setMaxYear,
            getSearchObj: getSearchObj
        };

        return methods;

        /**
         *
         */
        function setSearchText(val) {
            searchObj.searchText = val;
        }

        /**
         *
         */
        function setMinYear(val) {
            searchObj.yearMin = val;
        }

        /**
         *
         */
        function setMaxYear(val) {
            searchObj.yearMax = val;
        }

        /**
         *
         */
        function getSearchObj(){
            return searchObj;
        }

        /**
         *
         */
        function getGeospatialFilter(){
            var map = MapService.getMap(),
                viewProj = map.getView().getProjection().getCode(),
                extent = map.getView().calculateExtent(map.getSize()),
                extentWgs84 = ol.proj.transformExtent(extent, viewProj, 'EPSG:4326'),
                geoFilter = {};

            if (extent && extentWgs84){

                var minX = extentWgs84[1],
                    maxX = extentWgs84[3],
                    minY = wrapLon(extentWgs84[0]),
                    maxY = wrapLon(extentWgs84[2]);

                geoFilter = {
                    minX: minX,
                    maxX: maxX,
                    minY: minY < maxY ? minY : maxY,
                    maxY: maxY > minY ? maxY : minY
                };
            }

            return geoFilter;
        }

        /**
         *
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
                console.log("An error occured while reading heatmap data");
            });
          }
        }

        /**
         *
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
                    console.log("An error occured while exporting csv data");
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
                "q.time": '['+ reqParamsUi.yearMin + '-01-01 TO ' + reqParamsUi.yearMax + '-01-01]',
                "q.geo": '[' + bounds.minX + ',' + bounds.minY + ' TO ' + bounds.maxX + ',' + bounds.maxY + ']'
            };

           return params;
        }

        /**
         * Wrap longitude to the WGS84 bounds [-90,-180,90,180]
         */
        function wrapLon(value) {
            var worlds = Math.floor((value + 180) / 360);
            return value - (worlds * 360);
        }
    }]);
