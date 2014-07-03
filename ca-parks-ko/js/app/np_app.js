var globals = {};

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
  "esri/geometry/webMercatorUtils",
  "esri/domUtils",
  "esri/request",

  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/renderers/UniqueValueRenderer",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/layers/GraphicsLayer",

  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane"
], function(
connect, array, color, dom, has, parser, domStyle, Map, Point, webMercatorUtils, domUtils, esriRequest, sms, sls, UniqueValueRenderer, Graphic, InfoTemplate, GraphicsLayer) {
    // define() needs to be defined before loading ko
    require(["lib/knockout-2.2.1", "dojo/domReady!"], function(ko) {
        // Here's my data model
        var ViewModel = function() {
                var _self = this;



                this.photoList = ko.observable();
                this.pics = ko.observableArray([]);
                this.showMoreVisible = ko.observable(false);



                this.show_more = function() {
                    globals.currentPicIndex += 3;
                    globals.currentPicCount += 3;
                    _self.showPhotos(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
                };




                this.showPhotos = function(pics) {
                    //console.log("show photos: ", globals.currentPicIndex, pics);
                    _self.showMoreVisible(true);
                    for (var i = 0; i < pics.length; i++) {
                        _self.pics.push(pics[i]);
                    }
                    _self.photoList("Found " + globals.currentPics.length + " photos searching for " + globals.currentSearch + ". Showing " + globals.currentPicCount + ".<br><br>");
                    if (globals.currentPicIndex + 3 < globals.currentPics.length) {
                        _self.showMoreVisible(true);
                    } else {
                        _self.showMoreVisible(false);
                    }
                };




                this.flickrResults = function(response) {
                    //console.log("flickr stuff! ", response);
                    globals.currentPics = response.photos.photo; // array of objects with photo info
                    if (globals.currentPics.length > 0) {
                        globals.currentPicIndex = 0;
                        globals.currentPicCount = 3;
                        _self.showMoreVisible(true);
                        _self.showPhotos(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
                    } else {
                        _self.showMoreVisible(false);
                        _self.photoList("Didn\'t find any photos searching for " + globals.currentSearch + ". Please click another point.");
                    }
                };




                this.searchFlickr = function(evt) {
                    //console.log("search flickr: ", evt.graphic.attributes.Name);
                    var attrs = evt.graphic.attributes;
                    globals.currentSearch = attrs.Name + " " + attrs.Type;
                    _self.pics([]);
                    _self.photoList("Searching flickr for " + globals.currentSearch + " photos.");
                    // example search url
                    // http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=8af7013c3eb758525e4a4d8597cc14ff&tags=lassen&text=lassen+national+park&format=json
                    // callback parameter name is "jsoncallback"
                    esriRequest({
                        url: "https://api.flickr.com/services/rest/",
                        content: {
                            method: "flickr.photos.search",
                            api_key: "3fb6f3bed34f310b5d80e6c3fdca1865",
                            tags: attrs.Name,
                            text: attrs.Name + " " + attrs.Type,
                            per_page: "30",
                            format: "json"
                        },
                        callbackParamName: "jsoncallback"
                    }).then(_self.flickrResults, _self.errorHandler);
                };




                this.errorHandler = function(error) {
                    console.log("error: ", error);
                };




                this.init = function() {
                    _self.photoList("Click on a point on the map to load photos of that park from Flickr.");
                    // prevent flash of unstyled content(FOUC)
                    domStyle.set(dom.byId("main-window"), "visibility", "visible");
                    globals.map = new Map("map", {
                        basemap: "streets",
                        center: [-119.036, 36.621],
                        zoom: 6,
                        logo: false,
                        showAttribution: false
                    });
                    // handle resize of the browser and get natl park data
                    connect.connect(globals.map, "onLoad", function() {
                        esriRequest({
                            url: "data/natl-parks-all.json"
                        }).then(_self.showParks, _self.errorHandler);
                    });

                };



                this.basemapClick = function(data, e){
                // only set the basemap if something different was clicked
                    if (e.target.id !== globals.map.getBasemap()) {
                        globals.map.setBasemap(e.target.id);
                    }
                };




                this.showParks = function(parkData) {
                    //console.log("parks: ", response);
                    var template = new InfoTemplate("${Name} ${Type}", "Total Acreage: ${Total} <br> " + "Federal Acreage: ${Federal} <br> " + "Non-Federal Acreage: ${Non-Federal} <br> " + "Wilderness Acreage: ${Wilderness} <br> " + "Type: ${Type}");
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
                    connect.connect(parksGraphicsLayer, "onClick", _self.searchFlickr);
                    array.forEach(parkData, function(park) {
                        if (park.Location) {
                            var parkGeom = new Point(park.Location[1], park.Location[0]);
                            var parkGraphic = new Graphic(parkGeom, null, park, template);
                            parksGraphicsLayer.add(parkGraphic);
                        }
                    });
                };


                this.init();



            };
        ko.applyBindings(new ViewModel()); // This makes Knockout get to work
    });
});