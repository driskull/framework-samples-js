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
], function (
  connect, array, color, dom, has, parser, domStyle,
  Map, 
  Point, webMercatorUtils, domUtils, esriRequest,
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

  // handle resize of the browser and get natl park data
  connect.connect(globals.map, "onLoad", function() {
    esriRequest({
      url: "data/natl-parks-all.json"
    }).then(showParks, errorHandler);
    connect.connect(dom.byId("load-more"), "onclick", show_more);
    domUtils.hide(dom.byId("load-more"));
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
    globals.currentSearch = attrs.Name + " " + attrs.Type;
    dom.byId("photo-list-info").innerHTML = "Searching flickr for " + globals.currentSearch + " photos.";
    dom.byId("photo-list").innerHTML = "";
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
    }).then(flickrResults, errorHandler);
  }

  function flickrResults(response) {
    //console.log("flickr stuff! ", response);
    globals.currentPics = response.photos.photo; // array of objects with photo info
    if (globals.currentPics.length > 0) {
      globals.currentPicIndex = 0;
      globals.currentPicCount = 3;
      domStyle.set(dom.byId("load-more"), "display", "block");
      dom.byId("photo-list-info").innerHTML = "Found " + globals.currentPics.length + " photos searching for " + globals.currentSearch + ". Showing " + globals.currentPicCount + ".<br><br>";
      showPhotos(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount));
    } else {
      domStyle.set(dom.byId("load-more"), "display", "none");
      dom.byId("photo-list-info").innerHTML = "Didn\'t find any photos searching for " + globals.currentSearch + ". Please click another point."
    }
  }

  function showPhotos(pics) {
    //console.log("show photos: ", globals.currentPicIndex, pics);
    domUtils.show(dom.byId("load-more"));
    var photoMarkup = [];
    array.forEach(pics, function(pic) {
      var picUrl = "http://farm" + pic.farm + ".static.flickr.com/" + pic.server + "/" + pic.id + "_" + pic.secret + "_z.jpg";
      var flickrUrl = "http://www.flickr.com/photos/" + pic.owner + "/" + pic.id; 
      photoMarkup.push("<a href=\"" + flickrUrl + "\" target=\"blank\"><img src=\"" + picUrl + "\" width=\"435\" alt=\"" + pic.title + "\" title=\"" + pic.title + "\" /></a>");
    });
    dom.byId("photo-list-info").innerHTML = "Found " + globals.currentPics.length + " photos searching for " + globals.currentSearch + ". Showing " + globals.currentPicCount + ".<br><br>";
    dom.byId("photo-list").innerHTML += photoMarkup.join("<br>");
    if (globals.currentPicIndex + 3 < globals.currentPics.length) {
      dom.byId("load-more").innerHTML = "Load More";
    } else {
      domUtils.hide(dom.byId("load-more"));
    }
  }

  function show_more() {
    globals.currentPicIndex += 3;
    globals.currentPicCount += 3;
    showPhotos(globals.currentPics.slice(globals.currentPicIndex, globals.currentPicCount ));
  }

  function errorHandler(error) { 
    console.log("error: ", error); 
  }
});
