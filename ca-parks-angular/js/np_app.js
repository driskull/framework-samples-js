var globals = {};

// AngularJS stuff
globals.caParks = angular.module("CaParks", ["ngResource"]);

globals.caParks.controller("FlickrCtrl", function($scope, $resource) {
  // model for photos from flickr
  $scope.currentPics = [];
  $scope.currentSearch = "";
  $scope.currentTag = "";
  $scope.currentPicIndex = 0;
  $scope.currentPicCount = 3;
  $scope.displayedPhotos = [];
  // set up a resource that can be used to retrieve photos
  $scope.flickr = $resource("http://api.flickr.com/services/rest/", {
    // jsoncallback is what the Flickr API expects for a callback name
    // JSON_CALLBACK tells angular to generate a unique name for the callback
    jsoncallback: "JSON_CALLBACK", 
    method: "flickr.photos.search",
    api_key: "3fb6f3bed34f310b5d80e6c3fdca1865",
    // default to channel islands
    tags: "Channel Islands",
    // tags: $scope.currentTag,
    text: "Channel Islands National Park",
    // text: $scope.currentSearch,
    per_page: "30",
    format: "json"
  }, {
    get: { method: "JSONP"}
  });

  $scope.retrievePhotos = function() {
    // remove previously loaded and displayed photos
    if ( $scope.displayedPhotos.length ) {
      $scope.currentPics = [];
      $scope.displayedPhotos = [];
    }
    // reset counters 
    $scope.currentPicIndex = 0;
    $scope.currentPicCount = 3;
    // retrieve photos, pass in current search term
    $scope.flickr.get({ tags: $scope.currentTag, text: $scope.currentSearch }, function(result) {
      $scope.currentPics = result.photos.photo;
      $scope.displayedPhotos = $scope.currentPics.slice($scope.currentPicIndex, $scope.currentPicCount);
    });
  }

  $scope.loadMore = function() {
    // increment counters
    $scope.currentPicIndex += 3;
    $scope.currentPicCount += 3;
    // slice off photos to display
    for ( var i = $scope.currentPicIndex; i < $scope.currentPicCount; i++ ) {
      $scope.displayedPhotos.push($scope.currentPics.slice(i, i + 1)[0]);
    }
  }
});

require([
  "dojo/_base/connect",
  "dojo/_base/array",
  "dojo/_base/Color",
  "dojo/dom",
  "dojo/has",
  "dojo/parser",
  "dojo/dom-style",
  
  "esri/map",
  "esri/geometry/Point",
  "esri/request",

  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/renderers/UniqueValueRenderer",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/layers/GraphicsLayer",

  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane"
], function (
  connect, array, color, dom, has, parser, domStyle,
  Map, Point, esriRequest,
  sms, sls, UniqueValueRenderer, Graphic, InfoTemplate, GraphicsLayer
) {
  parser.parse();
  
  // prevent flash of unstyled content(FOUC)
  domStyle.set(dom.byId("main-window"), "visibility", "visible");

  globals.map = new Map("map", {
    basemap: "streets",
    center: [-119.036, 36.621],
    zoom: 6,
    logo: false,
    showAttribution: false
  });

  // get natl park data
  connect.connect(globals.map, "onLoad", function() {
    esriRequest({
      url: "data/natl-parks-all.json"
    }).then(showParks, errorHandler);
  });
  
  // event delegation to switch basemaps
  var bmc = dom.byId("basemaps-container");
  connect.connect(bmc, "onclick", function(e) {
    // only set the basemap if something different was clicked
    if ( e.target.id !== globals.map.getBasemap() ) {
      globals.map.setBasemap(e.target.id);
    }
  });

  function showParks(parkData) {
    //console.log("parks: ", response);
    
    var template = new InfoTemplate(
      "${Name} ${Type}", 
      "Total Acreage: ${Total} <br> " +
      "Federal Acreage: ${Federal} <br> " + 
      "Non-Federal Acreage: ${Non-Federal} <br> " +
      "Wilderness Acreage: ${Wilderness} <br> " + 
      "Type: ${Type}"
    );

    var renderer = new UniqueValueRenderer(null, "Type");
    renderer.addValue("National Park", new sms("square", 14, null, new color([50, 205, 50, 0.75])));
    renderer.addValue("National Seashore", new sms("square", 10, null, new color([144, 238, 144, 0.75])));
    renderer.addValue("National Preserve", new sms("square", 10, null, new color([127, 255, 0, 0.75])));
    renderer.addValue("National Recreation Area", new sms("square", 10, null, new color([34, 139, 34, 0.75])));
    renderer.addValue("National Historic Site", new sms("square", 10, null, new color([0, 128, 0, 0.75])));
    renderer.addValue("National Historic Park", new sms("square", 10, null, new color([0, 100, 0, 0.75])));

    var parksGraphicsLayer = new GraphicsLayer({ 
      "id": "parks_graphics", 
      "displayOnPan": !has("ie") 
    });
    parksGraphicsLayer.setRenderer(renderer);
    globals.map.addLayer(parksGraphicsLayer);
    connect.connect(parksGraphicsLayer, "onClick", searchFlickr);
    array.forEach(parkData, function(park) {
      if (park.Location) {
        var parkGeom = new Point(park.Location[1], park.Location[0]);
        var parkGraphic = new Graphic(parkGeom, null, park, template);
        parksGraphicsLayer.add(parkGraphic);
      }
    });
  }

  function searchFlickr(evt) {
    //console.log("search flickr: ", evt.graphic.attributes.Name);
    var attrs = evt.graphic.attributes;
    // update Angular's scope with the search term
    var node = angular.element(dom.byId("load-more"));
    var scope = node.scope();
    scope.currentSearch = attrs.Name + " " + attrs.Type;
    scope.currentTag = attrs.Name;
    // call into Angular to get photos from flickr
    scope.$apply("retrievePhotos()");
  }

  function errorHandler(error) { 
    console.log("error: ", error); 
  }
});
