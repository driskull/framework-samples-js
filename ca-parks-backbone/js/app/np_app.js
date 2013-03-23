var globals = {
    currentPics: [],
    currentPicCount: 0,
    currentSearch: ''
};

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
  "dojo/text!tpl/loadMore.html",

  
  
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

], function(
connect, array, color, lang, dom, has, parser, domStyle, picsTpl, photoInfoTpl, basemapsTpl, loadMoreTpl, Map, Point, webMercatorUtils, domUtils, esriRequest, sms, sls, UniqueValueRenderer, Graphic, InfoTemplate, GraphicsLayer, BorderContainer, ContentPane, ready) {
    ready(function() {
        $(document).ready(function() {

        
        
        
            var FlickrPhotos = Backbone.View.extend({
                pics: [],
                initialize: function() {
                    this.render();
                },
                render: function() {
                    var template = _.template(picsTpl, { pics: this.pics });
                    this.$el.html(template);
                }
            });
            var myFlickrPhotos = new FlickrPhotos({
                el: $("#photo-list")
            });
            
            
            
            

            var PhotoInfo = Backbone.View.extend({
                loading: false,
                initialize: function() {
                    this.render();
                },
                render: function() {
                    var template = _.template(photoInfoTpl, {
                        loading: this.loading,
                        total: globals.currentPics.length,
                        count: globals.currentPicCount,
                        search: globals.currentSearch
                    });
                    this.$el.html(template);
                }
            });
            var photoListInfo = new PhotoInfo({
                el: $("#photo-list-info")
            });
            
            
            
            
            
            
            var LoadMoreView = Backbone.View.extend({
                visible: false,
                show_more: function() {
                    myFlickrQuery.show_more();
                },
                events: {
                    "click .info": "show_more"
                },
                initialize: function() {
                    this.render();
                },
                render: function() {
                    if (globals.currentPicIndex + 3 < globals.currentPics.length) {
                        this.visible = true;
                    } else {
                        this.visible = false;
                    }
                    var template = _.template(loadMoreTpl, {visible: this.visible});
                    this.$el.html(template);
                }
            });
            var loadMore = new LoadMoreView({
                el: $("#load-more")
            });







            var AppError = Backbone.Model.extend({
                errorHandler: function(error) {
                    console.log("error: ", error);
                }
            });
            var myErrorHandler = new AppError();









            var QueryFlickr = Backbone.Model.extend({
                show_more: function() {
                    globals.currentPicIndex += 3;
                    globals.currentPicCount += 3;
                    this.show(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
                },
                show: function(pics) {
                    myFlickrPhotos.pics = myFlickrPhotos.pics.concat(pics);
                    loadMore.render();
                    photoListInfo.render();
                    myFlickrPhotos.render();
                },
                flickrResults: function(response) {
                    //console.log("flickr stuff! ", response);
                    globals.currentPics = response.photos.photo; // array of objects with photo info
                    if (globals.currentPics.length > 0) {
                        globals.currentPicIndex = 0;
                        globals.currentPicCount = 3;
                        myFlickrPhotos.pics = [];
                        this.show(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
                    } else {
                        globals.currentPicIndex = 0;
                        globals.currentPicCount  = 0;
                    }
                    loadMore.render();
                    photoListInfo.loading = false;
                    photoListInfo.render();
                },
                searchFlickr: function(name, type) {
                    var _self = this;
                    globals.currentSearch = name + " " + type;
                    photoListInfo.loading = true;
                    photoListInfo.render();
                    myFlickrPhotos.pics = [];
                    myFlickrPhotos.render();
                    // example search url
                    // http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=8af7013c3eb758525e4a4d8597cc14ff&tags=lassen&text=lassen+national+park&format=json
                    // callback parameter name is "jsoncallback"
                    esriRequest({
                        url: "http://api.flickr.com/services/rest/",
                        content: {
                            method: "flickr.photos.search",
                            api_key: "3fb6f3bed34f310b5d80e6c3fdca1865",
                            tags: name,
                            text: name + " " + type,
                            per_page: "30",
                            format: "json"
                        },
                        callbackParamName: "jsoncallback"
                    }).then(function(resp) {
                        _self.flickrResults(resp);
                    }, myErrorHandler.errorHandler);
                    app_router.navigate("park/" + encodeURIComponent(name) + '/' + encodeURIComponent(type));
                }
            });
            var myFlickrQuery = new QueryFlickr();









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
                    connect.connect(parksGraphicsLayer, "onClick", function(evt) {
                        var attrs = evt.graphic.attributes;
                        myFlickrQuery.searchFlickr(attrs.Name, attrs.Type);
                    });
                    _.each(parkData, function(park) {
                        if (park.Location) {
                            var parkGeom = new Point(park.Location[1], park.Location[0]);
                            var parkGraphic = new Graphic(parkGeom, null, park, template);
                            parksGraphicsLayer.add(parkGraphic);
                        }
                    });
                },
                init: function() {
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
                    });
                }
            });
            var myNationalParks = new NationalParks();












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










            var AppRouter = Backbone.Router.extend({
                routes: {
                    "park/:query/:query": "viewPark"
                },
                viewPark: function(name, type) {
                    myFlickrQuery.searchFlickr(decodeURIComponent(name), decodeURIComponent(type));
                }
            });
            // Initiate the router
            var app_router = new AppRouter();


            
            



            // Start Backbone history a necessary step for bookmarkable URL's
            Backbone.history.start();
            
            
            
            
            
            // startup map and app
            myNationalParks.init();





        });
    });
});