require([
	"esri/Map",
	"esri/views/MapView",
	"esri/layers/GraphicsLayer",
	"esri/Graphic",
	"esri/geometry/Point"
], function (Map, MapView, GraphicsLayer, Graphic, Point) {
	const app = new Vue({
		el: "#app",
		data: {
			isUpdating: false,
			showingIntrobox: true,
			showingInfobox: false,
			ferriesLayer: null,
			ferriesGraphicsLayer: null,
			selectedFerryGraphicsLayer: null,
			selectedFerryMarker: null,
			selectedFerryMarkerSymbol: {
				type: "simple-marker",
				style: "circle",
				color: [255, 255, 255, 0],
				size: "48px",
				outline: {
					color: [0, 123, 95],
					width: 1
				}
			},
			ferryMarkers: {
				headingEast: {
					type: "picture-marker",
					url: "assets/ferry-heading-east.png",
					width: "18px",
					height: "30px",
					angle: 0
				},
				headingWest: {
					type: "picture-marker",
					url: "assets/ferry-heading-west.png",
					width: "18px",
					height: "30px",
					angle: 0
				}
			},
			config: {
				ferryFeedUrl: "https://www.wsdot.wa.gov/Ferries/API/Vessels/rest/vessellocations",
				ferryFeedParams: "?apiaccesscode={e7533438-5a9f-4dd6-ab8e-65ccdb7685de}&callback=?"
				// old one with cors issues
				//ferryFeedUrl: "/https://www.wsdot.com/ferries/vesselwatch/Vessels.ashx",
				// ToDo: check out terminal info too
				// https://www.wsdot.wa.gov/ferries/api/terminals/rest/help
				// can get wait times, etc
			},
			selectedVessel: {
				attributes: {
					"VesselID": 2,
					"VesselName": "Chelan",
					"Mmsi": 366709770,
					"DepartingTerminalID": 1,
					"DepartingTerminalName": "Anacortes",
					"DepartingTerminalAbbrev": "ANA",
					"ArrivingTerminalID": null,
					"ArrivingTerminalName": null,
					"ArrivingTerminalAbbrev": null,
					"Latitude": 48.50678,
					"Longitude": -122.676408,
					"Speed": 0,
					"Heading": 248,
					"InService": true,
					"AtDock": true,
					"EtaHuman": "",
					"ScheduledDepartureHuman": "",
					"TimeStampHuman": ""
				}
			},
			// these are the data points that come back from the ferry service
			// and we'll use them as the attributes in our graphics
			vessels: [{
				"VesselID": 2,
				"VesselName": "Chelan",
				"Mmsi": 366709770,
				"DepartingTerminalID": 1,
				"DepartingTerminalName": "Anacortes",
				"DepartingTerminalAbbrev": "ANA",
				"ArrivingTerminalID": null,
				"ArrivingTerminalName": null,
				"ArrivingTerminalAbbrev": null,
				"Latitude": 48.50678,
				"Longitude": -122.676408,
				"Speed": 0,
				"Heading": 248,
				"InService": true,
				"AtDock": true,
				"LeftDock": null,
				"Eta": null,
				// formatted by this app
				"EtaHuman": "",
				"EtaBasis": null,
				"ScheduledDeparture": null,
				// formatted by this app
				"ScheduledDepartureHuman": "",
				"OpRouteAbbrev": [
					"ana-sj"
				],
				"VesselPositionNum": 2,
				"SortSeq": 20,
				"ManagedBy": 1,
				"TimeStamp": "/Date(1613446638000-0800)/",
				// we do this
				"TimeStampHuman": "",
				"VesselWatchShutID": 2,
				"VesselWatchShutMsg": "Vessel data temporarily unavailable.",
				"VesselWatchShutFlag": "0",
				"VesselWatchStatus": "0",
				"VesselWatchMsg": ""
			}]
		},
		mounted() {
			this.init();
		},
		methods: {
			init() {
				// custom vector tile basemap
				// ToDo: doesn't look that great just yet
				// let niftyCustomBasemap = new Basemap({
				//   baseLayers: [
				//     new VectorTileLayer({
				//       portalItem: {
				//         id: "3c54ce8d9d3141ac9505bdd2bb915ced"
				//       }
				//     })
				//   ]
				// });

				this.map = new Map({
					basemap: "topo-vector"
					//basemap: niftyCustomBasemap,
				});

				this.view = new MapView({
					container: "mapView",
					map: this.map,
					center: [-122.5, 48],
					constraints: {
						rotationEnabled: false,
						geometry: {
							type: "extent",
							xmin: -123,
							ymin: 47,
							xmax: -122,
							ymax: 49
					  }
					},
					zoom: 8
				});
				this.view.ui.move([ "zoom" ], "bottom-left");

				// the graphics layer that will hold the selected ferry graphic
				this.selectedFerryGraphicsLayer = new GraphicsLayer();
				this.map.add(this.selectedFerryGraphicsLayer);

				this.ferriesGraphicsLayer = new GraphicsLayer();
				this.map.add(this.ferriesGraphicsLayer);		

				// Get the screen point from the view's click event
				this.view.on("click", event => {
					const screenPoint = {
						x: event.x,
						y: event.y
					};

					this.showingIntrobox = false;

					// Search for graphics at the clicked location
					this.view.hitTest(screenPoint).then(response => {
						if (response.results.length) {
							let clickedVessel = response.results.filter(result => {
								// check if the graphic belongs to the layer of interest
								return result.graphic.layer === this.ferriesGraphicsLayer;
							});
							if (clickedVessel.length > 0) {
								let clickedVesselGraphic = clickedVessel[0].graphic;
								this.showingInfobox = true;
								// set to selected
								this.selectedVessel = clickedVesselGraphic;
								// this is the marker that shows under the selected ferry
								this.selectedFerryGraphicsLayer.removeAll();
								this.selectedFerryMarker = new Graphic({
									geometry: clickedVesselGraphic.geometry,
									symbol: this.selectedFerryMarkerSymbol
								});
								this.selectedFerryGraphicsLayer.graphics.add(this.selectedFerryMarker);
							} else {
								// clear select and info box and show intro box
								this.showingInfobox = false;
								this.selectedFerryGraphicsLayer.removeAll();
								this.showingIntrobox = true;
							}
						}
					});
				});

				this.getFerries(false);
				setInterval(() => {
					this.getFerries(true);
				}, 8000);
			},

			getFerries(update) {
				this.isUpdating = true;
				// FETCH doesn't support jsonp\callback but the vessel api requires it
				// so jQuery it is
				$.getJSON(this.config.ferryFeedUrl + this.config.ferryFeedParams, vessels => {
					// if this is an update call find each vessel in our ferries graphics layer
					// and update its position and attributes
					// otherwise this is the first call so create all the ferry vessel graphics
					if (update) {
						// iterate thru all the ferries in the data we just got
						// find the existing graphic (with the same name)
						// and update position, attributes and symbol based on heading
						vessels.forEach(theFerry => {
							let existingFerry = this.ferriesGraphicsLayer.graphics.items.find(f => {
								return f.attributes.VesselName == theFerry.VesselName;
							});
							let pt = new Point({
								latitude: theFerry.Latitude,
								longitude: theFerry.Longitude
							});

							// figure out which symbol to use based on the ferry's heading
							existingFerry.symbol = this.getFerryMarkerSymbol(theFerry.Heading);
							// update position with new lat lon
							existingFerry.geometry = pt;
							// set new attributes (includes ETA, speed, etc.)
							existingFerry.attributes = theFerry;
							existingFerry.attributes.EtaHuman = this.convertToHumanDate(theFerry.Eta);
							existingFerry.attributes.ScheduledDepartureHuman = this.convertToHumanDate(theFerry.ScheduledDeparture);
							existingFerry.attributes.TimeStampHuman = this.convertToHumanDate(theFerry.TimeStamp);
						});
						if (this.showingInfobox) {
							// find and update the selected vessel
							this.selectedVessel = this.ferriesGraphicsLayer.graphics.items.filter(f => {
								return f.attributes.VesselName == this.selectedVessel.attributes.VesselName;
							})[0];
							// update the highlight location too
							this.selectedFerryMarker.geometry = this.selectedVessel.geometry;
						}
					} else {
						// set vessel data and put the ferries on the map
						this.vessels = vessels;

						this.vessels.forEach(ferry => {
							let pt = new Point({
								latitude: ferry.Latitude,
								longitude: ferry.Longitude
							});

							let symbol = this.getFerryMarkerSymbol(ferry.Heading);

							// add formatted dates
							ferry.EtaHuman = this.convertToHumanDate(ferry.Eta);
							ferry.ScheduledDepartureHuman = this.convertToHumanDate(ferry.ScheduledDeparture);
							ferry.TimeStampHuman = this.convertToHumanDate(ferry.TimeStamp);

							let ferryGraphic = new Graphic({
								geometry: pt,
								attributes: ferry,
								symbol: symbol
							});

							this.ferriesGraphicsLayer.graphics.add(ferryGraphic);
						})
					}
					this.isUpdating = false;
				});
			},
			zoomToSelectedFerry() {
				this.view.goTo({
					target: this.selectedVessel,
					zoom: 12
				});
			},
			getFerryMarkerSymbol(heading) {
				// We have two icons defined in our data
				// one for ferrys heading west and another east
				// both oriented correctly
				// so determine which icon to use based on the heading
				// then set the angle of the icon and return it
				if (heading > 0 && heading <= 180) {
					this.ferryMarkers.headingEast.angle = heading;
					return this.ferryMarkers.headingEast;
				} else {
					this.ferryMarkers.headingWest.angle = heading;
					return this.ferryMarkers.headingWest;
				}
			},
			convertToHumanDate(vesselAPIDate) {
				if (vesselAPIDate != null) {
					// e.g. of what is returned from vessels api
					// "/Date(1613446638000-0800)/"
					// need to peel out the epoch time
					let left = vesselAPIDate.split("-")[0];
					let epochString = left.replace("/Date(", "");
					var epochTimestamp = parseInt(epochString);
					let timestamp = new Date(epochTimestamp).toLocaleString('en-US', {
						timeZone: 'America/Los_Angeles'
					});
					// split out just the time
					let time = timestamp.split(",")[1].trim();
					return time;
				} else {
					return "unavailable";
				}
			}
		}
	});
});