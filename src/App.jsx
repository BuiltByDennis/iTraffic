import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Map as MapIcon, Search, AlertCircle, Crosshair, Clock, Route as RouteIcon, Loader2 } from 'lucide-react';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';

// Component to handle the Traffic Layer
const TrafficLayerHandler = ({ showTraffic }) => {
  const map = useMap();
  const trafficLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google) return;
    
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }
    
    if (showTraffic) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, showTraffic]);

  return null;
};

// Component to handle the Polyline drawing
const PolylineHandler = ({ encodedPolyline }) => {
  const map = useMap();
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google) return;

    if (!encodedPolyline) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      return;
    }

    if (!polylineRef.current) {
      polylineRef.current = new window.google.maps.Polyline({
        strokeColor: '#3b82f6', // Prominent blue
        strokeOpacity: 0.9,
        strokeWeight: 6,
      });
    }

    try {
      const path = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
      polylineRef.current.setPath(path);
      polylineRef.current.setMap(map);

      // Fit map to polyline bounds
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(latLng => bounds.extend(latLng));
      map.fitBounds(bounds, { padding: 40 });
    } catch (e) {
      console.error("Failed to decode polyline", e);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, encodedPolyline]);

  return null;
};

export default function App() {
  const [currentLocation, setCurrentLocation] = useState('Locating...');
  const [destination, setDestination] = useState('');
  const [isLocating, setIsLocating] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  
  // Routing State
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [routeAlternatives, setRouteAlternatives] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const currentRoute = routeAlternatives ? routeAlternatives[selectedRouteIndex] : null;
  const encodedPolyline = currentRoute ? currentRoute.encodedPolyline : '';

  // Target city coordinates (Tarkwa, Ghana)
  const defaultCenter = { lat: 5.3018, lng: -1.9930 };
  const [originLatLng, setOriginLatLng] = useState(defaultCenter);
  const [busPosition, setBusPosition] = useState(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setOriginLatLng(newPos);
          setBusPosition(newPos);
          setIsLocating((prev) => {
            if (prev) setCurrentLocation('Live GPS Active');
            return false;
          });
        },
        (error) => {
          console.warn("Geolocation failed", error);
          setCurrentLocation('Location access denied (Using Tarkwa)');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setCurrentLocation('Geolocation not supported');
      setIsLocating(false);
    }
  }, []);

  const parseDuration = (durationStr) => {
    if (!durationStr) return 'N/A';
    const seconds = parseInt(durationStr.replace('s', ''), 10);
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const parseDistance = (meters) => {
    if (!meters) return 'N/A';
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const calculateDelay = (durationStr, staticDurationStr) => {
    if (!durationStr || !staticDurationStr) return '0m';
    const durSec = parseInt(durationStr.replace('s', ''), 10);
    const staticSec = parseInt(staticDurationStr.replace('s', ''), 10);
    const delayMins = Math.round(Math.max(0, durSec - staticSec) / 60);
    return `${delayMins}m`;
  };

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    if (!destination || !window.google) return;

    setIsSearching(true);
    setSearchError('');
    setRouteAlternatives(null);
    setSelectedRouteIndex(0);
    setIsNavigating(false);

    try {
      // 1. Geocode the text destination
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: destination }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error('Could not locate destination on map.'));
          }
        });
      });

      const destLatLng = {
        lat: geocodeResult.lat(),
        lng: geocodeResult.lng()
      };

      // Origin is now dynamically using HTML5 Geolocation state (originLatLng)

      // 2. Fetch the route from our backend
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin: originLatLng,
          destination: destLatLng
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch route');
      }

      const data = await response.json();
      
      // 3. Update state to trigger drawing & UI
      setRouteAlternatives(data.routes);
      setSelectedRouteIndex(0);

    } catch (err) {
      console.error(err);
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-background overflow-hidden">
      
      {/* Input Panel */}
      <div className={`w-full lg:w-96 lg:min-w-[24rem] h-[50dvh] lg:h-full flex flex-col bg-secondary border-b lg:border-b-0 lg:border-r border-border shadow-2xl z-10 shrink-0 ${isNavigating ? 'hidden lg:flex' : ''}`}>
        
        {/* Header */}
        <div className="p-4 bg-primary text-on-primary flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="bg-accent/20 p-2 rounded-lg">
              <Navigation className="text-accent" size={24} />
            </div>
            <h1 className="text-xl font-bold font-mono tracking-wide">iTraffic<span className="text-accent">Ops</span></h1>
          </div>
          <div className="flex items-center space-x-2 text-sm bg-accent/10 text-accent px-3 py-1 rounded-full border border-accent/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="font-medium">Online</span>
          </div>
        </div>

        {/* Routing Form */}
        <div className="p-4 lg:p-5 flex-grow flex flex-col space-y-4 lg:space-y-6 overflow-y-auto">
          <form onSubmit={handleRouteSearch} className="space-y-4 lg:space-y-5 shrink-0">
            
            {/* Current Location */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center space-x-2">
                <Crosshair size={16} className="text-accent" />
                <span>Current Location</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={currentLocation}
                  readOnly
                  className={`w-full bg-muted border ${isLocating ? 'border-accent/50 animate-pulse text-foreground/50' : 'border-border text-foreground'} rounded-lg py-3 px-4 pl-10 focus-ring cursor-not-allowed`}
                />
                <MapPin className="absolute left-3 top-3.5 text-foreground/50" size={18} />
                {isLocating && (
                  <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center space-x-2">
                <MapIcon size={16} className="text-destructive" />
                <span>Destination</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Enter stop or address... (e.g. Oakland, CA)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-lg py-3 px-4 pl-10 focus-ring placeholder:text-foreground/30 transition-colors"
                />
                <Search className="absolute left-3 top-3.5 text-foreground/50" size={18} />
              </div>
            </div>

            {/* Error Message */}
            {searchError && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive text-sm p-3 rounded-lg flex items-start space-x-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={!destination || isSearching}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary font-bold py-4 rounded-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98] focus-ring shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_25px_rgba(34,197,94,0.25)]"
            >
              {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
              <span className="text-lg">{isSearching ? 'Routing...' : 'Find Fastest Route'}</span>
            </button>
          </form>

          {/* Quick Actions / Info */}
          <div className="mt-2 lg:mt-8 bg-muted border border-border rounded-lg p-3 lg:p-4 flex flex-col space-y-3 lg:space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>Route Intelligence</span>
              </h3>
              
              {/* Traffic Toggle */}
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={showTraffic}
                    onChange={() => setShowTraffic(!showTraffic)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showTraffic ? 'bg-accent' : 'bg-border'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showTraffic ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-medium text-foreground">
                  Show Live Traffic
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-background rounded-md p-3 border border-border">
                <div className="text-foreground/50 mb-1">Route Delay</div>
                <div className={`font-mono font-semibold flex items-center ${currentRoute && calculateDelay(currentRoute.duration, currentRoute.staticDuration) !== '0m' ? 'text-destructive' : 'text-accent'}`}>
                  <span className="mr-1 text-lg">{currentRoute && calculateDelay(currentRoute.duration, currentRoute.staticDuration) !== '0m' ? '↑' : '↓'}</span> 
                  {currentRoute ? calculateDelay(currentRoute.duration, currentRoute.staticDuration) : '0m'}
                </div>
              </div>
              <div className="bg-background rounded-md p-3 border border-border">
                <div className="text-foreground/50 mb-1">Algorithm</div>
                <div className="font-mono text-accent font-semibold">Shortest Path</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Map - Bottom on Mobile, Right on Desktop */}
      <div className="flex-grow bg-[#0f172a] relative overflow-hidden">
        
        {/* Floating Route Dashboard Card */}
        {routeAlternatives && routeAlternatives.length > 0 && !isNavigating && (
          <div className="absolute top-2 left-2 right-2 lg:top-4 lg:left-8 lg:right-auto z-10 bg-secondary/95 backdrop-blur-md border border-accent/50 p-3 lg:p-4 rounded-xl shadow-2xl lg:min-w-[320px] animate-in slide-in-from-top-2 fade-in duration-300 max-h-[45dvh] lg:max-h-[80dvh] flex flex-col">
            <h3 className="text-foreground font-bold mb-3 flex items-center space-x-2 shrink-0">
              <RouteIcon className="text-accent" size={18} />
              <span>Available Routes</span>
            </h3>
            <div className="space-y-3 mt-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full pb-2">
              {routeAlternatives.map((route, index) => {
                const isSelected = selectedRouteIndex === index;
                const delay = calculateDelay(route.duration, route.staticDuration);
                return (
                  <div 
                    key={index}
                    onClick={() => setSelectedRouteIndex(index)}
                    className={`cursor-pointer border p-3 rounded-lg transition-all ${isSelected ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-border bg-background hover:border-accent/50'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-foreground">Route {index + 1} {index === 0 && <span className="text-xs ml-2 bg-accent/20 text-accent px-2 py-0.5 rounded-full">Fastest</span>}</div>
                      <div className="text-xs text-foreground/50">{parseDistance(route.distanceMeters)}</div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Clock size={14} className={isSelected ? "text-accent" : "text-foreground/50"} />
                        <span className="font-mono">{parseDuration(route.duration)}</span>
                      </div>
                      {delay !== '0m' && (
                        <div className="flex items-center space-x-1 text-destructive">
                          <AlertCircle size={14} />
                          <span>+{delay} traffic</span>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsNavigating(true); }}
                        className="w-full mt-3 bg-accent hover:bg-accent/90 text-primary font-bold py-2 rounded-lg flex items-center justify-center space-x-2 transition-transform active:scale-95"
                      >
                        <Navigation size={16} />
                        <span>Start Navigation</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Navigation Header */}
        {isNavigating && currentRoute && (
          <div className="absolute top-4 left-4 right-4 lg:left-8 lg:right-auto z-10 bg-primary/95 backdrop-blur-md text-on-primary border border-accent/30 p-4 rounded-xl shadow-2xl flex flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center space-x-3">
              <div className="bg-accent/20 p-2 rounded-full shrink-0">
                <Navigation className="text-accent" size={20} />
              </div>
              <div className="flex flex-col">
                <div className="font-bold text-base leading-tight">Navigating</div>
                <div className="text-xs opacity-80">{parseDuration(currentRoute.duration)} • {parseDistance(currentRoute.distanceMeters)}</div>
              </div>
            </div>
            <button 
              onClick={() => setIsNavigating(false)}
              className="px-4 py-2 bg-destructive/90 hover:bg-destructive text-white rounded-lg font-bold text-xs transition-colors shrink-0"
            >
              Exit
            </button>
          </div>
        )}

        {/* API Provider loads the SDK including geometry libraries for decoding polylines and geocoding */}
        <APIProvider apiKey={apiKey} libraries={['geometry', 'places']}>
          <Map 
            defaultZoom={13} 
            defaultCenter={defaultCenter}
            disableDefaultUI={true}
            mapId="DEMO_MAP_ID"
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <TrafficLayerHandler showTraffic={showTraffic} />
            <PolylineHandler encodedPolyline={encodedPolyline} />
            {busPosition && (
              <AdvancedMarker position={busPosition}>
                <div className="text-4xl filter drop-shadow-md transition-transform duration-1000 ease-linear">🚌</div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>

        {/* Missing API Key Warning Overlay */}
        {!apiKey && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-secondary/90 border border-destructive/50 p-6 rounded-xl max-w-md text-center shadow-2xl">
              <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">API Key Required</h2>
              <p className="text-foreground/70 text-sm">
                The Google Maps API key is currently missing. Please add <code className="bg-background px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-background px-1 py-0.5 rounded">.env</code> file.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
