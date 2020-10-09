require([
  "esri/Map",
      "esri/views/MapView",
      "esri/Basemap",
      "esri/layers/VectorTileLayer"
    ], function(Map, MapView, Basemap, VectorTileLayer) {
  const app = new Vue({
    el: "#app",
    data: {
      current: {
        isUpdating: false
      },
      config: {
        
      }
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        
        let basemap = new Basemap({
          baseLayers: [
            new VectorTileLayer({
              portalItem: {
                id: "3c54ce8d9d3141ac9505bdd2bb915ced"
              }
            })
          ]
        });
        
        this.map = new Map({
          basemap: "topo-vector"
          //basemap: basemap
        });
  
        this.view = new MapView({
          container: "mapView",
          map: this.map,
          center: [-122, 48], // longitude, latitude
          // ToDo: new in 4.17, constrain to puget sound
          // constraints: {
          //   geometry: park
          // },
        zoom: 8
        });
      }
    }
  });
});