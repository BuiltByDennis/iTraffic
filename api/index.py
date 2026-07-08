import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
from dotenv import load_dotenv

# Load from project root .env so we share the same API key as frontend
load_dotenv(dotenv_path="../.env")

app = FastAPI(title="iTraffic Routing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_MAPS_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY")

class LatLng(BaseModel):
    lat: float
    lng: float

class RouteRequest(BaseModel):
    origin: LatLng
    destination: LatLng

@app.post("/api/route")
async def get_route(req: RouteRequest):
    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == "your_api_key_here":
        raise HTTPException(
            status_code=500, 
            detail="Google Maps API key not configured properly. Please update the .env file."
        )
        
    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        # Restrict the response to exactly what we need to minimize latency
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline"
    }
    
    payload = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": req.origin.lat,
                    "longitude": req.origin.lng
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": req.destination.lat,
                    "longitude": req.destination.lng
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
        "computeAlternativeRoutes": False
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            if "routes" not in data or len(data["routes"]) == 0:
                raise HTTPException(status_code=404, detail="No route found between these locations.")
                
            route = data["routes"][0]
            
            return {
                "duration": route.get("duration"),
                "staticDuration": route.get("staticDuration"),
                "distanceMeters": route.get("distanceMeters"),
                "encodedPolyline": route.get("polyline", {}).get("encodedPolyline")
            }
            
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail=f"Google API Error: {exc.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
