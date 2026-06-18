import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

let _maplibregl: any;
async function getMaplibregl() {
  if (!_maplibregl) {
    const scriptUrl = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
    const styleUrl = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
    if (!document.querySelector(`link[href="${styleUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = styleUrl;
      document.head.appendChild(link);
    }
    if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load maplibre-gl from CDN'));
        document.head.appendChild(script);
      });
    }
    _maplibregl = (window as any).maplibregl;
  }
  return _maplibregl;
}

const MAPTILER_KEY = '5qJr4cBxnkaZ1S4BU1Ua';
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
const DEFAULT_ZOOM = 13.2;

type Restaurant = {
  id: string;
  name: string;
  category: 'cafe' | 'restaurant' | 'cloud_kitchen';
  lat: number;
  lng: number;
};

type City = {
  name: string;
  lat: number;
  lng: number;
  zoom_level?: number;
};

type Props = {
  restaurants: Restaurant[];
  city: City;
  selectedId?: string;
  pinColors: Record<Restaurant['category'], string>;
  onSelect: (restaurant: Restaurant) => void;
  onGalleryOpen?: () => void;
  onGalleryClose?: () => void;
};

export type MapCanvasHandle = {
  focusRestaurant: (restaurant: Restaurant) => void;
};

const BUILDINGS_LAYER = {
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
      '#E8C99A',
    ],
    'fill-extrusion-height': [
      'interpolate',
      ['linear'],
      ['zoom'],
      13,
      0,
      13.5,
      ['get', 'render_height'],
    ],
    'fill-extrusion-base': ['get', 'render_min_height'],
    'fill-extrusion-opacity': 0.85,
  },
} as const;

function markerLabel(category: Restaurant['category']) {
  if (category === 'cafe') return 'C';
  if (category === 'restaurant') return 'R';
  return 'K';
}

// ─── Gallery images for the masonry panel ───────────────────────────────────
const GALLERY_IMAGES = [
  { src: require('../../assets/images/home_hero.jpg'), alt: 'Cafe interior', ar: '4/3' },
  { src: require('../../assets/images/brew_banner.png'), alt: 'Latte art', ar: '3/4' },
  { src: require('../../assets/images/dessert_banner.png'), alt: 'Pastries', ar: '2/3' },
  { src: require('../../assets/images/food_banner.png'), alt: 'Outdoor seating', ar: '1/1' },
  { src: require('../../assets/images/matcha_banner.png'), alt: 'Coffee beans', ar: '2/3' },
];

/**
 * setupMarkerClick — wraps the marker button in a relative-positioned div,
 * appends the SVG ring as a sibling, animates it with rAF, then opens the
 * gallery panel. MapLibre's internal translate transform on the marker
 * element is preserved because we only touch the parent wrapper.
 */
function setupMarkerClick(
  el: HTMLElement,
  mapContainer: HTMLElement,
  map: any | null,
  restaurant: Restaurant,
  onGalleryOpen?: () => void,
  onGalleryClose?: () => void,
) {
  const RADIUS = 24;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  // Guard: prevent double-click during animation
  if ((el as any).__ringActive) return;
  (el as any).__ringActive = true;

  function startRing() {
    // Step 1: Make sure the marker's parent doesn't clip the ring
    const markerParent = el.parentElement!;
    markerParent.style.overflow = 'visible';

    // Step 2: Calculate marker center relative to its parent using
    // getBoundingClientRect — this accounts for MapLibre's CSS transforms
    const elRect = el.getBoundingClientRect();
    const parentRect = markerParent.getBoundingClientRect();

    const cx = elRect.left - parentRect.left + elRect.width / 2;
    const cy = elRect.top - parentRect.top + elRect.height / 2;

    // Step 3: Size the SVG around the center point so the ring is
    // perfectly centered over the marker regardless of its map position
    const SVG_SIZE = 80;
    const svgLeft = cx - SVG_SIZE / 2;
    const svgTop  = cy - SVG_SIZE / 2;

    // Step 4: Build the SVG — innerHTML once, no duplicate appends, no
    // manual createElementNS for circles (avoids wipe bug)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(SVG_SIZE));
    svg.setAttribute('height', String(SVG_SIZE));
    svg.style.cssText = `
      position: absolute;
      top: ${svgTop}px;
      left: ${svgLeft}px;
      pointer-events: none;
      z-index: 99999;
      overflow: visible;
    `;

    svg.innerHTML = `
      <circle cx="40" cy="40" r="${RADIUS}" fill="none"
        stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
      <circle id="seatsip-ring-fill"
        cx="40" cy="40" r="${RADIUS}" fill="none"
        stroke="#ff7a3d" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${CIRCUMFERENCE}"
        stroke-dashoffset="${CIRCUMFERENCE}"
        transform="rotate(-90 40 40)"/>
    `;

    // Step 5: Append SVG as sibling — never wrap or move el
    markerParent.appendChild(svg);

    // Step 6: Keep the marker button on top of the ring
    el.style.position = 'relative';
    el.style.zIndex   = '100000';

    const ring = svg.querySelector('#seatsip-ring-fill') as SVGCircleElement | null;

    // Step 7: Animate with rAF — no CSS transitions, no fights with
    // MapLibre's internal transform handling
    const startTime = performance.now();
    const DURATION  = 1400;

    function animate(now: number) {
      const progress = Math.min((now - startTime) / DURATION, 1);

      ring?.setAttribute(
        'stroke-dashoffset',
        String(CIRCUMFERENCE * (1 - progress)),
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Brief pause so the user sees the completed ring
        setTimeout(() => {
          svg.parentNode?.removeChild(svg);
          el.style.zIndex = '';
          (el as any).__ringActive = false;
          openGallery(mapContainer, restaurant.name, onGalleryOpen, onGalleryClose);
        }, 80);
      }
    }

    requestAnimationFrame(animate);
  }

  // Fly to the marker first, then start the ring animation
  if (map) {
    map.flyTo({
      center: [restaurant.lng, restaurant.lat],
      zoom: 16.2,
      pitch: 62,
      bearing: 10,
      duration: 900,
      essential: true,
    });
    map.once('moveend', startRing);
  } else {
    startRing();
  }
}

/**
 * openGallery — creates the full-screen gallery panel, appends it to the
 * map container div (not document.body), then triggers the slide-in via
 * a single rAF so the browser paints the initial translateX(100%) first.
 */
function openGallery(
  mapContainer: HTMLElement,
  cafeName: string,
  onGalleryOpen?: () => void,
  onGalleryClose?: () => void,
) {
  // Prevent duplicate panels
  if (mapContainer.querySelector('#seatsip-gallery-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'seatsip-gallery-panel';
  Object.assign(panel.style, {
    position: 'absolute',
    inset: '0',
    background: '#fff8f5',
    zIndex: '100',
    transform: 'translateX(100%)',
    transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
    overflowY: 'auto',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  });

  // ── Sticky header ────────────────────────────────────────────────────────
  const header = document.createElement('div');
  Object.assign(header.style, {
    position: 'sticky',
    top: '0',
    background: 'rgba(255,248,245,0.92)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
    zIndex: '10',
  });

  // Back button
  const backBtn = document.createElement('button');
  backBtn.id = 'seatsip-gallery-back';
  backBtn.setAttribute('aria-label', 'Go back');
  Object.assign(backBtn.style, {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#fff',
    border: '1px solid #e8ddd5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    flexShrink: '0',
  });
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>`;
  backBtn.addEventListener('click', () => closeGallery(panel, onGalleryClose));

  // Title
  const title = document.createElement('span');
  Object.assign(title.style, {
    fontSize: '16px',
    fontWeight: '800',
    color: '#1a0e0a',
    flex: '1',
    textAlign: 'center',
    margin: '0 8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });
  title.textContent = cafeName;

  // Heart button
  const heartBtn = document.createElement('button');
  heartBtn.setAttribute('aria-label', 'Save to favourites');
  Object.assign(heartBtn.style, {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#fff',
    border: '1px solid #e8ddd5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    flexShrink: '0',
  });
  heartBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e23744" stroke-width="2" stroke-linecap="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>`;
  let hearted = false;
  heartBtn.addEventListener('click', () => {
    hearted = !hearted;
    heartBtn.querySelector('svg')!.style.fill = hearted ? '#e23744' : 'none';
  });

  header.appendChild(backBtn);
  header.appendChild(title);
  header.appendChild(heartBtn);

  // ── Masonry grid ─────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  Object.assign(grid.style, {
    columns: '2',
    columnGap: '10px',
    padding: '8px 12px 32px',
  });

  GALLERY_IMAGES.forEach((img) => {
    const item = document.createElement('div');
    Object.assign(item.style, {
      breakInside: 'avoid',
      marginBottom: '10px',
      borderRadius: '16px',
      overflow: 'hidden',
      aspectRatio: img.ar,
    });

    const imgEl = document.createElement('img');
    imgEl.src = img.src;
    imgEl.alt = img.alt;
    imgEl.loading = 'lazy';
    Object.assign(imgEl.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    });

    item.appendChild(imgEl);
    grid.appendChild(item);
  });

  panel.appendChild(header);
  panel.appendChild(grid);
  mapContainer.appendChild(panel);

  // 6. Trigger slide-in: one rAF so the browser paints the initial
  //    translateX(100%) state before we set translateX(0).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
      onGalleryOpen?.();
    });
  });
}

/**
 * closeGallery — slides the panel back out to the right, then removes it
 * from the DOM once the CSS transition ends.
 */
function closeGallery(panel: HTMLElement, onGalleryClose?: () => void) {
  panel.style.transform = 'translateX(100%)';
  panel.addEventListener(
    'transitionend',
    () => {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
      onGalleryClose?.();
    },
    { once: true },
  );
}

function createMarkerElement(
  restaurant: Restaurant,
  color: string,
  selected: boolean,
  mapContainer: HTMLElement | null,
  map: any | null,
  onSelect: (restaurant: Restaurant) => void,
  onGalleryOpen?: () => void,
  onGalleryClose?: () => void,
) {
  const element = document.createElement('button');
  element.type = 'button';
  element.setAttribute('aria-label', restaurant.name);
  element.style.width = selected ? '42px' : '34px';
  element.style.height = selected ? '42px' : '34px';
  element.style.borderRadius = '50%';
  element.style.border = selected ? '3px solid #FFFFFF' : '2px solid #FFFFFF';
  element.style.background = color;
  element.style.color = '#FFFFFF';
  element.style.fontWeight = '800';
  element.style.fontSize = selected ? '14px' : '12px';
  element.style.boxShadow = selected
    ? '0 10px 24px rgba(0,0,0,0.32)'
    : '0 6px 16px rgba(0,0,0,0.24)';
  element.style.cursor = 'pointer';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.transition = 'width 160ms ease, height 160ms ease, box-shadow 160ms ease';
  element.textContent = markerLabel(restaurant.category);

  element.addEventListener('click', () => {
    if (mapContainer) {
      setupMarkerClick(element, mapContainer, map, restaurant, onGalleryOpen, onGalleryClose);
    }
  });

  return element;
}

const MapCanvas = forwardRef<MapCanvasHandle, Props>(({ restaurants, city, selectedId, pinColors, onSelect, onGalleryOpen, onGalleryClose }, ref) => {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const onGalleryOpenRef = useRef(onGalleryOpen);
  const onGalleryCloseRef = useRef(onGalleryClose);

  onSelectRef.current = onSelect;
  onGalleryOpenRef.current = onGalleryOpen;
  onGalleryCloseRef.current = onGalleryClose;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cleanupFns: (() => void)[] = [];
    const addCleanup = (fn: () => void) => { cleanupFns.push(fn); };

    (async () => {
      const ml = await getMaplibregl();

      container.style.width = '100%';
      container.style.height = '100%';
      container.style.position = 'absolute';
      container.style.inset = '0';

      const controlStyle = document.createElement('style');
      controlStyle.textContent = `
        .maplibregl-ctrl-top-right {
          top: 134px;
          right: 12px;
        }
        .maplibregl-ctrl-bottom-right {
          bottom: 228px;
          right: 12px;
        }
        .maplibregl-ctrl button {
          width: 34px;
          height: 34px;
        }
      `;
      document.head.appendChild(controlStyle);
      addCleanup(() => controlStyle.remove());

      const map = new ml.Map({
        container,
        style: MAP_STYLE,
        center: [city.lng, city.lat],
        zoom: Math.max(DEFAULT_ZOOM, city.zoom_level || DEFAULT_ZOOM),
        pitch: 60,
        bearing: -20,
        attributionControl: false,
      });

      map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      if (map.getSource('openmaptiles') && !map.getLayer(BUILDINGS_LAYER.id)) {
        map.addLayer(BUILDINGS_LAYER as any);
      }
      map.resize();
    });

    // Handle missing images to prevent errors and fix SDF/non-SDF mixing
    map.on('styleimagemissing', (e) => {
      // Add a simple placeholder for missing images
      const id = e.id;
      if (!map.hasImage(id)) {
        // Create image data to avoid SDF/non-SDF mixing
        const size = 16;
        const data = new Uint8Array(size * size * 4);
        // Fill with gray color (RGBA)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 136;     // R
          data[i + 1] = 136; // G  
          data[i + 2] = 136; // B
          data[i + 3] = 255; // A
        }
        map.addImage(id, { width: size, height: size, data });
      }
    });

    mapRef.current = map;

    const resizeMap = () => map.resize();
    window.requestAnimationFrame(resizeMap);
    window.setTimeout(resizeMap, 250);
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(container);
    addCleanup(() => resizeObserver.disconnect());
    addCleanup(() => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    });
  })();

    return () => { cleanupFns.forEach(fn => fn()); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [city.lng, city.lat],
      zoom: Math.max(DEFAULT_ZOOM, city.zoom_level || DEFAULT_ZOOM),
      pitch: 60,
      bearing: -20,
      duration: 1200,
      essential: true,
    });
  }, [city]);

  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      if (!map) return;

      const ml = await getMaplibregl();

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = restaurants.map((restaurant) => {
        const element = createMarkerElement(
          restaurant,
          pinColors[restaurant.category],
          restaurant.id === selectedId,
          containerRef.current,
          mapRef.current,
          onSelectRef.current,
          onGalleryOpenRef.current,
          onGalleryCloseRef.current,
        );

        return new ml.Marker({ element, anchor: 'center' })
          .setLngLat([restaurant.lng, restaurant.lat])
          .addTo(map);
      });
    })();
  }, [restaurants, selectedId, pinColors]);

  useImperativeHandle(ref, () => ({
    focusRestaurant: (restaurant) => {
      mapRef.current?.flyTo({
        center: [restaurant.lng, restaurant.lat],
        zoom: 16.2,
        pitch: 62,
        bearing: 10,
        duration: 900,
        essential: true,
      });
    },
  }));

  return <View ref={containerRef} testID="maplibre-web-map" style={styles.map} />;
});

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
    minHeight: 560,
  },
});

export default MapCanvas;
