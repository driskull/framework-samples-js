var globals = {};

require([
  "dojo/_base/connect",
  "dojo/_base/array",
  "dojo/_base/Color",
  "dojo/_base/lang",
  "dojo/dom",
  "dojo/has",
  "dojo/parser",
  "dojo/dom-style",

  "dojo/text!tpl/pics.html",
  "dojo/text!tpl/photoInfo.html",
  "dojo/text!tpl/basemaps.html",

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
  "dijit/layout/ContentPane",

  "dojo/ready"
], function (
  connect, array, color, lang, dom, has, parser, domStyle,
  picsTpl, photoInfoTpl, basemapsTpl,
  Map,
  Point, webMercatorUtils, domUtils, esriRequest,
  sms, sls, UniqueValueRenderer, Graphic, InfoTemplate, GraphicsLayer,
  BorderContainer, ContentPane,
  ready
) {
    ready(function() {
         $(document).ready(function() {

            
            var FlickrPhotos = Backbone.View.extend({
                show: function(pics) {
                     domUtils.show(dom.byId("load-more"));
                     
                     // template for each photo
                     var compiledPics = _.template(picsTpl, {
                         pics: pics
                     });
                     
                     // template for results info
                     var compiledInfo = _.template(photoInfoTpl, {
                         total: globals.currentPics.length,
                         count: globals.currentPicCount,
                         search: globals.currentSearch
                     });
                     
                     // place html
                     dom.byId("photo-list-info").innerHTML = compiledInfo;
                     dom.byId("photo-list").innerHTML += compiledPics;
                     
                     // dom manipulation
                     if (globals.currentPicIndex + 3 < globals.currentPics.length) {
                         dom.byId("load-more").innerHTML = "Load More";
                     } else {
                         domUtils.hide(dom.byId("load-more"));
                     }
                 },
                 show_more: function() {
                     globals.currentPicIndex += 3;
                     globals.currentPicCount += 3;
                     this.show(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
                 },
                 events: {
                     "click": "show_more"
                 },
                 initialize: function() {
                     this.render();
                 },
                 render: function() {
                     var template = _.template('Load More', {});
                     this.$el.html(template);
                 }
             });
             var myFlickrPhotos = new FlickrPhotos({
                 el: $("#load-more")
             });
             
             

             var AppError = Backbone.Model.extend({
                 errorHandler: function(error) {
                     console.log("error: ", error);
                 }
             });
             var myErrorHandler = new AppError;
             
             

             var QueryFlickr = Backbone.Model.extend({
                flickrResults: function(response) {
                     //console.log("flickr stuff! ", response);
                     globals.currentPics = response.photos.photo; // array of objects with photo info
                     if (globals.currentPics.length > 0) {
                         globals.currentPicIndex = 0;
                         globals.currentPicCount = 3;
                         domStyle.set(dom.byId("load-more"), "display", "block");
                         dom.byId("photo-list-info").innerHTML = "Found " + globals.currentPics.length + " photos searching for " + globals.currentSearch + ". Showing " + globals.currentPicCount + ".<br><br>";
                         myFlickrPhotos.show(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
                     } else {
                         domStyle.set(dom.byId("load-more"), "display", "none");
                         dom.byId("photo-list-info").innerHTML = "Didn\'t find any photos searching for " + globals.currentSearch + ". Please click another point."
                     }
                 },
                 searchFlickr: function(evt) {
                    var _self = this;
                     //console.log("search flickr: ", evt.graphic.attributes.Name);
                     var attrs = evt.graphic.attributes;
                     globals.currentSearch = attrs.Name + " " + attrs.Type;
                     dom.byId("photo-list-info").innerHTML = "Searching flickr for " + globals.currentSearch + " photos.";
                     dom.byId("photo-list").innerHTML = "";
                     // example search url
                     // http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=8af7013c3eb758525e4a4d8597cc14ff&tags=lassen&text=lassen+national+park&format=json
                     // callback parameter name is "jsoncallback"
                     esriRequest({
                         url: "http://api.flickr.com/services/rest/",
                         content: {
                             method: "flickr.photos.search",
                             api_key: "3fb6f3bed34f310b5d80e6c3fdca1865",
                             tags: attrs.Name,
                             text: attrs.Name + " " + attrs.Type,
                             per_page: "30",
                             format: "json"
                         },
                         callbackParamName: "jsoncallback"
                     }).then(function(resp){
                        _self.flickrResults(resp);
                     }, myErrorHandler.errorHandler);
                 }
             });
             var myFlickrQuery = new QueryFlickr;
             
             
             
             
             
             var NationalParks = Backbone.Model.extend({
                 showParks: function(parkData) {
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
                     connect.connect(parksGraphicsLayer, "onClick", function(evt){
                        myFlickrQuery.searchFlickr(evt);
                     });
                     _.each(parkData, function(park) {
                         if (park.Location) {
                             var parkGeom = new Point(park.Location[1], park.Location[0]);
                             var parkGraphic = new Graphic(parkGeom, null, park, template);
                             parksGraphicsLayer.add(parkGraphic);
                         }
                     });
                 },
                 init: function(){
                    // prevent flash of unstyled content(FOUC)
                     domStyle.set(dom.byId("main-window"), "visibility", "visible");
                     
                     // create map
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
                         }).then(myNationalParks.showParks, myErrorHandler.errorHandler);
                         //connect.connect(dom.byId("load-more"), "onclick", show_more);
                         domUtils.hide(dom.byId("load-more"));
                     });
                 }
             });
             var myNationalParks = new NationalParks;
             
             
             
             var switchBasemap = Backbone.View.extend({
                 switchBM: function(e) {
                     // only set the basemap if something different was clicked
                     if (e.target.id !== globals.map.getBasemap()) {
                         globals.map.setBasemap(e.target.id);
                     }
                 },
                 events: {
                     "click .basemap": "switchBM"
                 },
                 initialize: function() {
                     this.render();
                 },
                 render: function() {
                     var template = _.template(basemapsTpl, {});
                     this.$el.html(template);
                 }
             });
             var switch_basemap = new switchBasemap({
                 el: $("#basemaps-container")
             });
             
             
            // startup map and app
            myNationalParks.init();
             
             
             
             
             
        });
    });
});
