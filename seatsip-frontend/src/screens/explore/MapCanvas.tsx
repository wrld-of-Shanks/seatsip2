import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string;
  category: 'cafe' | 'restaurant' | 'cloud_kitchen';
  lat: number;
  lng: number;
};

type City = {
  lat: number;
  lng: number;
};

type Props = {
  restaurants: Restaurant[];
  city: City;
  selectedId?: string;
  pinColors: Record<Restaurant['category'], string>;
  onSelect: (restaurant: Restaurant) => void;
  onOrder?: (restaurant: Restaurant) => void;
  onGalleryOpen?: () => void;
  onGalleryClose?: () => void;
};

export type MapCanvasHandle = {
  focusRestaurant: (restaurant: Restaurant) => void;
};

const MapCanvas = forwardRef<MapCanvasHandle, Props>(({ restaurants, city, selectedId, pinColors, onSelect, onOrder, onGalleryOpen, onGalleryClose }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedId);

  useImperativeHandle(ref, () => ({
    focusRestaurant: (restaurant) => {
      const js = `focusRestaurant("${restaurant.id}", ${restaurant.lat}, ${restaurant.lng});`;
      webViewRef.current?.injectJavaScript(js);
    },
  }));

  useEffect(() => {
    if (selectedRestaurant) {
      const js = `focusRestaurant("${selectedRestaurant.id}", ${selectedRestaurant.lat}, ${selectedRestaurant.lng});`;
      webViewRef.current?.injectJavaScript(js);
    }
  }, [selectedId, selectedRestaurant]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
      <style>
        html, body, #map {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          background-color: #f5f0eb;
        }
        .maplibregl-ctrl-top-right {
          top: 134px;
          right: 12px;
        }
        .maplibregl-ctrl button {
          width: 34px;
          height: 34px;
        }

        /* Gallery Panel Styles */
        #seatsip-gallery-panel {
          position: absolute;
          inset: 0;
          background: #fff8f5;
          z-index: 10000;
          transform: translateX(100%);
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-overflow-scrolling: touch;
        }
        .gallery-header {
          position: sticky;
          top: 0;
          background: rgba(255, 248, 245, 0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
          z-index: 10;
        }
        .gallery-back-btn, .gallery-heart-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #e8ddd5;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          flex-shrink: 0;
          padding: 0;
        }
        .gallery-title {
          font-size: 16px;
          font-weight: 800;
          color: #1a0e0a;
          flex: 1;
          text-align: center;
          margin: 0 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gallery-grid {
          columns: 2;
          column-gap: 10px;
          padding: 8px 12px 32px;
        }
        .gallery-item {
          break-inside: avoid;
          margin-bottom: 10px;
          border-radius: 16px;
          overflow: hidden;
        }
        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
      <script>
        var MAPTILER_KEY = '5qJr4cBxnkaZ1S4BU1Ua';
        var MAP_STYLE = 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY;

        var BUILDINGS_LAYER = {
          id: 'seatsip-buildings-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          minzoom: 13,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13,
              '#C8A882',
              16,
              '#E8C99A'
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13,
              0,
              13.5,
              ['get', 'render_height']
            ],
            'fill-extrusion-base': ['get', 'render_min_height'],
            'fill-extrusion-opacity': 0.85
          }
        };

        var map = new maplibregl.Map({
          container: 'map',
          style: MAP_STYLE,
          center: [${city.lng}, ${city.lat}],
          zoom: ${selectedRestaurant ? 15.5 : 13.2},
          pitch: 60,
          bearing: -20,
          attributionControl: false
        });

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

        map.on('load', function() {
          if (map.getSource('openmaptiles') && !map.getLayer(BUILDINGS_LAYER.id)) {
            map.addLayer(BUILDINGS_LAYER);
          }
          map.resize();
        });

        map.on('styleimagemissing', function(e) {
          var id = e.id;
          if (!map.hasImage(id)) {
            var size = 16;
            var data = new Uint8Array(size * size * 4);
            for (var i = 0; i < data.length; i += 4) {
              data[i] = 136;     // R
              data[i + 1] = 136; // G  
              data[i + 2] = 136; // B
              data[i + 3] = 255; // A
            }
            map.addImage(id, { width: size, height: size, data: data });
          }
        });

        var markers = {};
        var currentSelectedId = ${selectedId ? `"${selectedId}"` : 'null'};
        var isRingActive = false;

        var GALLERY_IMAGES = [
          { src: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500', alt: 'Cafe interior', ar: '4/3' },
          { src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500', alt: 'Latte art', ar: '3/4' },
          { src: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', alt: 'Pastries', ar: '2/3' },
          { src: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=500', alt: 'Outdoor seating', ar: '1/1' },
          { src: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500', alt: 'Coffee beans', ar: '2/3' }
        ];

        function getMarkerLabel(category) {
          if (category === 'cafe') return 'C';
          if (category === 'restaurant') return 'R';
          return 'K';
        }

        function createMarkerElement(restaurant, color, isSelected) {
          var element = document.createElement('button');
          element.type = 'button';
          element.id = 'marker-' + restaurant.id;
          element.style.width = isSelected ? '42px' : '34px';
          element.style.height = isSelected ? '42px' : '34px';
          element.style.borderRadius = '50%';
          element.style.border = isSelected ? '3px solid #FFFFFF' : '2px solid #FFFFFF';
          element.style.background = color;
          element.style.color = '#FFFFFF';
          element.style.fontWeight = '800';
          element.style.fontSize = isSelected ? '14px' : '12px';
          element.style.boxShadow = isSelected
            ? '0 10px 24px rgba(0,0,0,0.32)'
            : '0 6px 16px rgba(0,0,0,0.24)';
          element.style.cursor = 'pointer';
          element.style.display = 'flex';
          element.style.alignItems = 'center';
          element.style.justifyContent = 'center';
          element.style.transition = 'width 160ms ease, height 160ms ease, box-shadow 160ms ease';
          element.textContent = getMarkerLabel(restaurant.category);

          element.addEventListener('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_RESTAURANT',
              restaurant: restaurant
            }));

            map.flyTo({
              center: [restaurant.lng, restaurant.lat],
              zoom: 16.2,
              pitch: 62,
              bearing: 10,
              duration: 900,
              essential: true
            });
            
            map.once('moveend', function() {
              setupMarkerClick(restaurant.id, restaurant);
            });
          });

          return element;
        }

        function setupMarkerClick(id, restaurant) {
          if (isRingActive) return;
          isRingActive = true;

          var el = document.getElementById('marker-' + id);
          if (!el) {
            isRingActive = false;
            openGallery(restaurant.name, restaurant);
            return;
          }

          var markerParent = el.parentElement;
          if (!markerParent) {
            isRingActive = false;
            openGallery(restaurant.name, restaurant);
            return;
          }
          markerParent.style.overflow = 'visible';

          // Get geometry
          var elRect = el.getBoundingClientRect();
          var parentRect = markerParent.getBoundingClientRect();

          var cx = elRect.left - parentRect.left + elRect.width / 2;
          var cy = elRect.top - parentRect.top + elRect.height / 2;

          var RADIUS = 24;
          var CIRCUMFERENCE = 2 * Math.PI * RADIUS;
          var SVG_SIZE = 80;
          var svgLeft = cx - SVG_SIZE / 2;
          var svgTop = cy - SVG_SIZE / 2;

          var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', String(SVG_SIZE));
          svg.setAttribute('height', String(SVG_SIZE));
          svg.style.cssText = 'position: absolute; top: ' + svgTop + 'px; left: ' + svgLeft + 'px; pointer-events: none; z-index: 99999; overflow: visible;';

          svg.innerHTML = '<circle cx="40" cy="40" r="' + RADIUS + '" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>' +
            '<circle id="seatsip-ring-fill" cx="40" cy="40" r="' + RADIUS + '" fill="none" stroke="#ff7a3d" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + CIRCUMFERENCE + '" stroke-dashoffset="' + CIRCUMFERENCE + '" transform="rotate(-90 40 40)"/>';

          markerParent.appendChild(svg);
          el.style.position = 'relative';
          el.style.zIndex = '100000';

          var ring = svg.querySelector('#seatsip-ring-fill');
          var startTime = performance.now();
          var DURATION = 1200;

          function animate(now) {
            var progress = Math.min((now - startTime) / DURATION, 1);
            if (ring) {
              ring.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - progress)));
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setTimeout(function() {
                if (svg.parentNode) svg.parentNode.removeChild(svg);
                el.style.zIndex = '';
                isRingActive = false;
                openGallery(restaurant.name, restaurant);
              }, 80);
            }
          }

          requestAnimationFrame(animate);
        }

        function openGallery(cafeName, restaurant) {
          if (document.getElementById('seatsip-gallery-panel')) return;

          // Notify React Native that gallery is opening
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GALLERY_OPEN' }));

          var panel = document.createElement('div');
          panel.id = 'seatsip-gallery-panel';
          
          // Header
          var header = document.createElement('div');
          header.className = 'gallery-header';

          // Back button
          var backBtn = document.createElement('button');
          backBtn.className = 'gallery-back-btn';
          backBtn.setAttribute('aria-label', 'Go back');
          backBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>';
          backBtn.addEventListener('click', function() {
            closeGallery(panel);
          });

          // Title
          var title = document.createElement('span');
          title.className = 'gallery-title';
          title.textContent = cafeName;

          // Explore / Book button
          var exploreBtn = document.createElement('button');
          exploreBtn.style.cssText = 'background-color: #6B3F1A; color: #fff; border: none; padding: 10px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; cursor: pointer; margin-right: 8px; font-family: inherit; flex-shrink: 0;';
          exploreBtn.textContent = 'Explore / Book';
          exploreBtn.addEventListener('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'EXPLORE_CAFE',
              restaurant: restaurant
            }));
          });

          // Heart button
          var heartBtn = document.createElement('button');
          heartBtn.className = 'gallery-heart-btn';
          heartBtn.setAttribute('aria-label', 'Save to favourites');
          heartBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e23744" stroke-width="2" stroke-linecap="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>';
          var hearted = false;
          heartBtn.addEventListener('click', function() {
            hearted = !hearted;
            var svgEl = heartBtn.querySelector('svg');
            if (svgEl) {
              svgEl.style.fill = hearted ? '#e23744' : 'none';
            }
          });

          header.appendChild(backBtn);
          header.appendChild(title);
          header.appendChild(exploreBtn);
          header.appendChild(heartBtn);

          // Grid
          var grid = document.createElement('div');
          grid.className = 'gallery-grid';

          GALLERY_IMAGES.forEach(function(img) {
            var item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.aspectRatio = img.ar;

            var imgEl = document.createElement('img');
            imgEl.className = 'gallery-img';
            imgEl.src = img.src;
            imgEl.alt = img.alt;
            imgEl.loading = 'lazy';

            item.appendChild(imgEl);
            grid.appendChild(item);
          });

          panel.appendChild(header);
          panel.appendChild(grid);
          document.body.appendChild(panel);

          // Animate in
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              panel.style.transform = 'translateX(0)';
            });
          });
        }

        function closeGallery(panel) {
          panel.style.transform = 'translateX(100%)';
          
          // Notify React Native that gallery is closing
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GALLERY_CLOSE' }));

          panel.addEventListener('transitionend', function() {
            if (panel.parentNode) panel.parentNode.removeChild(panel);
          }, { once: true });
        }

        function addMarker(restaurant, pinColor, isSelected) {
          var el = createMarkerElement(restaurant, pinColor, isSelected);
          var marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([restaurant.lng, restaurant.lat])
            .addTo(map);

          markers[restaurant.id] = {
            marker: marker,
            element: el,
            restaurant: restaurant,
            color: pinColor
          };
        }

        var restaurantsData = ${JSON.stringify(
          restaurants.map(r => ({
            restaurant: r,
            color: pinColors[r.category] || '#8B5E3C'
          }))
        )};

        restaurantsData.forEach(function(item) {
          addMarker(item.restaurant, item.color, item.restaurant.id === currentSelectedId);
        });

        function updateMarkerStyle(id, isSelected) {
          var markerData = markers[id];
          if (!markerData) return;
          
          var size = isSelected ? 42 : 34;
          var el = markerData.element;
          el.style.width = size + 'px';
          el.style.height = size + 'px';
          el.style.border = isSelected ? '3px solid #FFFFFF' : '2px solid #FFFFFF';
          el.style.fontSize = isSelected ? '14px' : '12px';
          el.style.boxShadow = isSelected ? '0 10px 24px rgba(0,0,0,0.32)' : '0 6px 16px rgba(0,0,0,0.24)';
        }

        function focusRestaurant(id, lat, lng) {
          map.flyTo({
            center: [lng, lat],
            zoom: 16.2,
            pitch: 62,
            bearing: 10,
            duration: 900,
            essential: true
          });
          
          if (currentSelectedId && currentSelectedId !== id) {
            updateMarkerStyle(currentSelectedId, false);
          }
          updateMarkerStyle(id, true);
          currentSelectedId = id;
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'SELECT_RESTAURANT') {
              onSelect(data.restaurant);
            } else if (data.type === 'GALLERY_OPEN') {
              onGalleryOpen?.();
            } else if (data.type === 'GALLERY_CLOSE') {
              onGalleryClose?.();
            } else if (data.type === 'EXPLORE_CAFE') {
              onOrder?.(data.restaurant);
            }
          } catch (e) {
            console.warn('Error parsing webview message:', e);
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapCanvas;
