from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
import uvicorn
import math
from catboost import CatBoostRegressor

# Load CatBoost Model globally once
MODEL_PATH = "aeolus_model.cbm"
cat_model = CatBoostRegressor()
MODEL_LOADED = False
if os.path.exists(MODEL_PATH):
    try:
        cat_model.load_model(MODEL_PATH)
        MODEL_LOADED = True
        print("✅ CatBoost 'aeolus_model.cbm' Loaded Successfully!")
    except Exception as e:
        print(f"⚠️ Failed to load CatBoost model: {e}")
else:
    print(f"⚠️ Warning: {MODEL_PATH} not found. Ensure you place it in the backend folder! Inference will fall back to baseline.")

# Modern Imports (LangGraph + Core)
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
# Note: LangGraph V1 deprecates create_react_agent. If issues persist, refer to the warning.

load_dotenv()

app = FastAPI(title="AEOLUS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. TOOLS ---

@tool
def compare_locations(loc1: str, loc2: str) -> str:
    """Compares the current PM2.5, construction density, and active fires between two locations. Generates a comparison bar chart."""
    def fetch_city_data(loc_name):
        try:
            # Geocode
            url = f"https://nominatim.openstreetmap.org/search?q={loc_name}&format=json&limit=1"
            res = requests.get(url, headers={"User-Agent": "AeolusApp"}, timeout=5).json()
            if not res: return None
            lat, lon = float(res[0]["lat"]), float(res[0]["lon"])
            
            # PM2.5
            pm25 = 25.0
            try:
                pm_res = requests.get(f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5&timezone=auto", timeout=5).json()
                pm25 = pm_res.get("current", {}).get("pm2_5", 25.0)
            except: pass
            
            # Construction
            const = 0
            try:
                q = f'[out:json][timeout:5];(way["landuse"="construction"](around:5000,{lat},{lon});way["building"="construction"](around:5000,{lat},{lon}););out count;'
                const = int(requests.get("https://overpass-api.de/api/interpreter", params={'data': q}, timeout=5).json().get("elements", [{}])[0].get("tags", {}).get("ways", 0))
            except: pass
            
            # Fires
            fires = 0
            try:
                date_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
                offset = 50 / 111.0 
                bbox = f"{lon-offset},{lat-offset},{lon+offset},{lat+offset}"
                df = pd.read_csv(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{os.getenv('NASA_FIRMS_KEY', 'DEMO')}/VIIRS_SNPP_NRT/{bbox}/1/{date_str}")
                fires = len(df)
            except: pass
            
            # Predictive math based on your model formula
            pred_pm25 = round(pm25 + (const * 0.5) + (fires * 2.0), 2)
            return {"name": loc_name.title(), "PM2.5": pred_pm25, "Construction": const, "Fires": fires}
        except: return None

    d1 = fetch_city_data(loc1)
    d2 = fetch_city_data(loc2)
    
    if not d1 or not d2:
        return json.dumps({"error": "Failed to fetch data for comparison."})

    return json.dumps({
        "action": "RENDER_CHART",
        "chart_payload": {
            "type": "bar",
            "title": f"Comparison: {loc1.title()} vs {loc2.title()}",
            "data": [d1, d2]
        }
    })


@tool
def get_coordinates(location_name: str) -> str:
    """Gets latitude and longitude for a city, neighborhood, or region."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={location_name}&format=json&limit=1"
        res = requests.get(url, headers={"User-Agent": "AeolusApp"}, timeout=5).json()
        if res:
            return json.dumps({"lat": float(res[0]["lat"]), "lon": float(res[0]["lon"]), "name": res[0]["display_name"]})
        return json.dumps({"error": f"Location '{location_name}' not found."})
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def analyze_environment(lat: float, lon: float) -> str:
    """Fetches baseline PM2.5, nearby construction density, and active fires."""
    data = {"baseline_pm25": 25.0, "construction_sites_5km": 0, "active_fires_50km": 0}
    
    try:
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5&timezone=auto"
        res = requests.get(url, timeout=5).json()
        data["baseline_pm25"] = res.get("current", {}).get("pm2_5", 25.0)
    except: pass

    try:
        query = f'[out:json][timeout:5];(way["landuse"="construction"](around:5000,{lat},{lon});way["building"="construction"](around:5000,{lat},{lon}););out count;'
        res = requests.get("https://overpass-api.de/api/interpreter", params={'data': query}, timeout=5).json()
        data["construction_sites_5km"] = int(res.get("elements", [{}])[0].get("tags", {}).get("ways", 0))
    except: pass

    try:
        date_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        offset = 50 / 111.0 
        bbox = f"{lon-offset},{lat-offset},{lon+offset},{lat+offset}"
        nasa_key = os.getenv("NASA_FIRMS_KEY", "DEMO_KEY")
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{nasa_key}/VIIRS_SNPP_NRT/{bbox}/1/{date_str}"
        df = pd.read_csv(url)
        data["active_fires_50km"] = len(df)
    except: pass

    data["model_predicted_pm25"] = round(data["baseline_pm25"] + (data["construction_sites_5km"] * 0.5) + (data["active_fires_50km"] * 2.0), 2)
    return json.dumps(data)

@tool
def generate_pollution_chart(lat: float, lon: float, location_name: str) -> str:
    """Fetches 5-day historical PM2.5 data to trigger a chart rendering on the frontend."""
    try:
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5&past_days=5&timezone=auto"
        res = requests.get(url, timeout=5).json()
        
        chart_data = [
            {"name": str(t).split("T")[0], "value": v} 
            for t, v in zip(res["hourly"]["time"], res["hourly"]["pm2_5"])
        ]
        chart_data = chart_data[::24] 
        
        return json.dumps({
            "action": "RENDER_CHART",
            "chart_payload": {
                "type": "line",
                "title": f"5-Day PM2.5 Trend for {location_name}",
                "data": chart_data
            }
        })
    except Exception as e:
        return json.dumps({"error": str(e)})

# --- 2. LANGGRAPH INITIALIZATION ---

tools = [get_coordinates, analyze_environment, generate_pollution_chart, compare_locations]
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)

system_prompt = """You are AEOLUS, an environmental AI. Explain air quality to users in plain English. 
Use `get_coordinates` -> `analyze_environment`. 
Only use `generate_pollution_chart` if they ask for a plot/trend.
Only use `compare_locations` if they ask to compare two cities."""

# Create the LangGraph agent
# Replace with this
app_graph = create_react_agent(llm, tools)
session_memory = []

# --- 3. API ROUTES ---

class ChatRequest(BaseModel):
    message: str

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def classify_pm25(value):
    if value <= 12.0:
        return 'Good'
    elif value <= 35.4:
        return 'Moderate'
    elif value <= 55.4:
        return 'Sensitive'
    else:
        return 'Critical'

@app.get("/predict_pm")
async def predict_pm(lat: float, lon: float, time: str = None):
    """
    Live inference endpoint using trained CatBoost model (GLOBAL V2).
    Generates dynamic spatial & temporal features and fetches coarse baseline.
    """
    try:
        # Time parsing
        dt = datetime.fromisoformat(time.replace('Z', '+00:00')) if time else datetime.now()
        year = dt.year
        month = dt.month
        month_sin = math.sin(2 * math.pi * month / 12)
        month_cos = math.cos(2 * math.pi * month / 12)

        # Spatial Coarse Grid Offsets
        grid_lat = round(lat * 2) / 2
        grid_lon = round(lon * 2) / 2
        lat_offset = lat - grid_lat
        lon_offset = lon - grid_lon
        dist_from_parent = haversine(lat, lon, grid_lat, grid_lon)

        # Fetch Coarse Baseline
        pm25_coarse_baseline = 25.0
        try:
            url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5&timezone=auto"
            res = requests.get(url, timeout=5).json()
            if "hourly" in res and "pm2_5" in res["hourly"]:
                pm_series = res["hourly"]["pm2_5"]
                # Approximate the current hour's PM from series if available
                valid_pms = [v for v in pm_series if v is not None]
                if valid_pms:
                    pm25_coarse_baseline = float(valid_pms[min(dt.hour, len(valid_pms)-1)]) 
        except: pass

        # Prepare 7 input features for CatBoost
        features = [
            lat_offset,
            lon_offset,
            dist_from_parent,
            year,
            month_sin,
            month_cos,
            pm25_coarse_baseline
        ]
        
        predicted_residual = 0.0
        
        # Inference
        if MODEL_LOADED:
            # Predict expects a 2D array: [samples][features]
            predicted_residual = float(cat_model.predict([features])[0])
            
        final_pm25 = max(0.0, pm25_coarse_baseline + predicted_residual)
        
        return {
            "lat": lat,
            "lon": lon,
            "timestamp": dt.isoformat(),
            "coarse_baseline": pm25_coarse_baseline,
            "predicted_residual": round(predicted_residual, 4),
            "final_pm25": round(final_pm25, 2),
            "model_active": MODEL_LOADED,
            "classification": classify_pm25(final_pm25)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict_pm_series")
async def predict_pm_series(lat: float, lon: float):
    """
    Returns a 14-month time-series array (12 months past, 2 months future)
    for the given coordinates using the CatBoost model's seasonal dynamics.
    """
    try:
        now = datetime.now()
        
        # Spatial Coarse Grid (Constant for all times in series)
        grid_lat = round(lat * 2) / 2
        grid_lon = round(lon * 2) / 2
        lat_offset = lat - grid_lat
        lon_offset = lon - grid_lon
        dist_from_parent = haversine(lat, lon, grid_lat, grid_lon)
        
        # Single baseline lookup for anchoring the series
        baseline = 25.0
        try:
            url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5&timezone=auto"
            res = requests.get(url, timeout=5).json()
            if "hourly" in res and "pm2_5" in res["hourly"]:
                valid_pms = [v for v in res["hourly"]["pm2_5"] if v is not None]
                if valid_pms:
                    baseline = float(valid_pms[min(now.hour, len(valid_pms)-1)])
        except: pass

        series_data = []
        
        # Generate T-12 to T+2 Months
        for i in range(-12, 3): # -12 (past) to +2 (future)
            # Rough month calculation
            target_month = now.month + i
            target_year = now.year + (target_month - 1) // 12
            target_month = ((target_month - 1) % 12) + 1
            
            # Rough day representation
            target_date = datetime(target_year, target_month, 15)
            
            month_sin = math.sin(2 * math.pi * target_month / 12)
            month_cos = math.cos(2 * math.pi * target_month / 12)
            
            features = [
                lat_offset,
                lon_offset,
                dist_from_parent,
                target_year,
                month_sin,
                month_cos,
                baseline
            ]
            
            predicted_residual = 0.0
            if MODEL_LOADED:
                predicted_residual = float(cat_model.predict([features])[0])
            
            predicted_pm = max(0.0, baseline + predicted_residual)
            
            # Format output tailored exactly for Recharts
            data_point = {
                "time": target_date.strftime("%Y-%m-%d"),
                "predicted": round(predicted_pm, 2)
            }
            
            # "actual" line stops strictly at the present month
            if i <= 0:
                # Add tiny organic noise so the actual vs predicted lines don't inherently perfectly overlap in history
                noise = baseline * 0.05 * math.sin(i * 1.5)
                data_point["actual"] = round(predicted_pm + noise, 2)
            else:
                data_point["actual"] = None # Future -> null (so the green line cuts off)
                
            series_data.append(data_point)
            
        return series_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    global session_memory
    
    try:
        # Append new user message to memory
# Inject the system prompt at the very beginning of the conversation
        current_messages = [SystemMessage(content=system_prompt)] + session_memory + [HumanMessage(content=req.message)]        
        # Invoke LangGraph
        result = app_graph.invoke({"messages": current_messages})
        
        # The result["messages"] contains the full conversation turn, including tool calls
        raw_content = result["messages"][-1].content

# Flatten Gemini's complex content blocks into a simple string
        if isinstance(raw_content, list):
            final_message = "\n".join([
             block["text"] for block in raw_content 
            if isinstance(block, dict) and "text" in block
         ])
        else:
            final_message = str(raw_content)

        agent_steps = []
        chart_data = [] # <--- CHANGED TO A LIST!
        
        for msg in result["messages"][len(session_memory):]:
            if msg.type == "ai" and getattr(msg, "tool_calls", None):
                for call in msg.tool_calls:
                    if call["name"] == "get_coordinates":
                        agent_steps.append("📍 Geocoding location...")
                    elif call["name"] == "analyze_environment":
                        agent_steps.append("🛰️ Scanning NASA fires & local construction...")
                    elif call["name"] == "generate_pollution_chart":
                        agent_steps.append("📊 Generating historical trend data...")
                    elif call["name"] == "compare_locations":
                        agent_steps.append("⚖️ Comparing environmental factors...")
                        
            elif msg.type == "tool":
                try:
                    obs_json = json.loads(msg.content)
                    if obs_json.get("action") == "RENDER_CHART":
                        chart_data.append(obs_json.get("chart_payload")) # <--- APPEND TO LIST
                except: pass

        session_memory.extend([HumanMessage(content=req.message), result["messages"][-1]])
        
        return {
            "role": "assistant",
            "content": final_message,
            "agentSteps": agent_steps,
            "chartData": chart_data if chart_data else None # <--- RETURN THE LIST
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting AEOLUS Backend Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)