import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Map as MapIcon, Search, AlertCircle, Crosshair, Clock, Route as RouteIcon, Loader2 } from 'lucide-react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

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
  const [routeInfo, setRouteInfo] = useState(null);
  const [encodedPolyline, setEncodedPolyline] = useState('');

  // Target city coordinates (San Francisco)
  const defaultCenter = { lat: 37.7749, lng: -122.4194 };
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    // Simulate auto-locating
    const timer = setTimeout(() => {
      setCurrentLocation('123 Main St, Transit Hub (Current)');
      setIsLocating(false);
    }, 1500);
    return () => clearTimeout(timer);
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

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    if (!destination || !window.google) return;

    setIsSearching(true);
    setSearchError('');
    setRouteInfo(null);
    setEncodedPolyline('');

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

      // In a real app, originLatLng would be dynamic.
      const originLatLng = defaultCenter; 

      // 2. Fetch the route from our backend
      const response = await fetch('http://localhost:8000/api/route', {
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
      setEncodedPolyline(data.encodedPolyline);
      setRouteInfo({
        duration: data.duration,
        distanceMeters: data.distanceMeters
      });

    } catch (err) {
      console.error(err);
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-background overflow-hidden">
      
      {/* Input Panel */}
      <div className="w-full lg:w-96 lg:min-w-[24rem] h-auto lg:h-full flex flex-col bg-secondary border-b lg:border-b-0 lg:border-r border-border shadow-2xl z-10 shrink-0">
        
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
        <div className="p-5 flex-grow flex flex-col space-y-6 overflow-y-auto">
          <form onSubmit={handleRouteSearch} className="space-y-5">
            
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
          <div className="mt-8 bg-muted border border-border rounded-lg p-4 flex flex-col space-y-4">
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
                <div className="text-foreground/50 mb-1">Traffic Delay</div>
                <div className="font-mono text-accent font-semibold flex items-center"><span className="mr-1 text-lg">↓</span> 12%</div>
              </div>
              <div className="bg-background rounded-md p-3 border border-border">
                <div className="text-foreground/50 mb-1">Active Incidents</div>
                <div className="font-mono text-destructive font-semibold">3 Reported</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Map - Bottom on Mobile, Right on Desktop */}
      <div className="flex-grow bg-[#0f172a] relative overflow-hidden">
        
        {/* Floating Route Dashboard Card */}
        {routeInfo && (
          <div className="absolute top-4 left-4 lg:left-8 z-10 bg-secondary/95 backdrop-blur-md border border-accent/50 p-4 rounded-xl shadow-2xl min-w-[250px] animate-in slide-in-from-top-4 fade-in duration-300">
            <h3 className="text-foreground font-bold mb-3 flex items-center space-x-2">
              <RouteIcon className="text-accent" size={18} />
              <span>Optimal Route</span>
            </h3>
            <div className="space-y-4 mt-2">
              <div className="flex items-center space-x-3 text-foreground/80">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Clock className="text-blue-400" size={24} />
                </div>
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">Est. Travel Time</div>
                  <div className="font-mono font-bold text-2xl text-foreground">{parseDuration(routeInfo.duration)}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-foreground/80">
                <div className="bg-accent/20 p-2 rounded-lg">
                  <Navigation className="text-accent" size={24} />
                </div>
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">Distance</div>
                  <div className="font-mono font-bold text-xl text-foreground">{parseDistance(routeInfo.distanceMeters)}</div>
                </div>
              </div>
            </div>
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
