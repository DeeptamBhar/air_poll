import xarray as xr
import pandas as pd
import numpy as np
import os
import glob
import re

# --- 1. CONFIGURATION ---
COARSE_DIR = "coarse_data/*.nc"
FINE_DIR = "fine_data/*.nc"
MAX_ROWS_PER_TILE = 1000  

# 🌍 THE "SHOTGUN GRID" STRATEGY
# We scatter 48 tiny 2x2 degree boxes evenly across the globe.
# This guarantees global diversity but extracts in milliseconds.
REGIONS = []
for lat in range(-75, 85, 30):       # Lats: -75, -45, -15, 15, 45, 75
    for lon in range(-160, 180, 45): # Lons: -160 to 155
        REGIONS.append({
            "name": f"Box_Lat{lat}_Lon{lon}",
            "min_lat": lat, 
            "max_lat": lat + 2.0,    # 🚨 ONLY 2 DEGREES WIDE!
            "min_lon": lon, 
            "max_lon": lon + 2.0
        })

print(f"🌍 Generated {len(REGIONS)} Fast-Extraction Global Boxes.")

def get_file_pairs():
    """Matches Coarse and Fine files by their YYYYMM date."""
    coarse_files = sorted(glob.glob(COARSE_DIR))
    fine_files = sorted(glob.glob(FINE_DIR))
    
    pairs = []
    for c_file in coarse_files:
        match = re.search(r"(\d{6})-\d{6}\.nc$", os.path.basename(c_file))
        if not match: continue
        month_str = match.group(1)
        
        # Find matching fine file
        f_file = next((f for f in fine_files if month_str in f), None)
        if f_file:
            pairs.append((month_str, c_file, f_file))
            
    return pairs

def resolve_target_var(ds):
    for var in ['PM25', 'GWRPM25']:
        if var in ds.data_vars: return var
    raise ValueError("Target PM2.5 variable not found.")

# --- 2. THE PROCESSING ENGINE ---
def process_cascaded_data():
    print("🚀 Initiating Memory-Safe Month-by-Month Pipeline...")

    file_pairs = get_file_pairs()
    print(f"✅ Found {len(file_pairs)} matching months of data.")
    
    all_sampled_data = []

    # 🚨 LOOP 1: Process ONE month at a time to save RAM
    for month_str, c_file, f_file in file_pairs:
        print(f"\n📅 Opening Month: {month_str}...")
        
        month_start = pd.to_datetime(month_str, format="%Y%m")
        coarse_ds = xr.open_dataset(c_file)
        fine_ds = xr.open_dataset(f_file)
        
        c_var = resolve_target_var(coarse_ds)
        f_var = resolve_target_var(fine_ds)

        month_rows = 0

        # 🚨 LOOP 2: Slice the 32 regions for this specific month
        for region in REGIONS:
            try:
                c_reg = coarse_ds.sel(lat=slice(region['min_lat'], region['max_lat']), lon=slice(region['min_lon'], region['max_lon']))
                f_reg = fine_ds.sel(lat=slice(region['min_lat'], region['max_lat']), lon=slice(region['min_lon'], region['max_lon']))

                df_c = c_reg.to_dataframe().reset_index().dropna(subset=[c_var])
                df_f = f_reg.to_dataframe().reset_index().dropna(subset=[f_var])
            except Exception:
                continue # Skip out-of-bounds tiles gracefully

            if df_f.empty or df_c.empty: 
                continue

            df_c.rename(columns={c_var: 'pm25_coarse_baseline'}, inplace=True)
            df_f.rename(columns={f_var: 'pm25_fine_target'}, inplace=True)

            # Drop Oceans and Negative Values
            df_c = df_c[df_c['pm25_coarse_baseline'] >= 0]
            df_f = df_f[df_f['pm25_fine_target'] >= 0]
            
            if df_f.empty or df_c.empty:
                continue

            # Create the 10km "Nametags"
            df_f['lat_parent'] = (np.floor(df_f['lat'] * 10) / 10 + 0.05).round(3)
            df_f['lon_parent'] = (np.floor(df_f['lon'] * 10) / 10 + 0.05).round(3)
            df_c['lat_parent'] = (np.floor(df_c['lat'] * 10) / 10 + 0.05).round(3)
            df_c['lon_parent'] = (np.floor(df_c['lon'] * 10) / 10 + 0.05).round(3)

            # Merge
            df_c['time'] = month_start
            df_f['time'] = month_start
            
            merged = pd.merge(df_f, df_c[['time', 'lat_parent', 'lon_parent', 'pm25_coarse_baseline']], 
                              on=['time', 'lat_parent', 'lon_parent'], how='inner')

            if merged.empty:
                continue

            # Random Downsampling
            sample_size = min(len(merged), MAX_ROWS_PER_TILE)
            if sample_size > 0:
                merged = merged.sample(n=sample_size, random_state=42)
                all_sampled_data.append(merged)
                month_rows += len(merged)

        # Close the NetCDF files to flush the RAM!
        coarse_ds.close()
        fine_ds.close()
        print(f"   ✅ Finished {month_str}. Kept {month_rows} clean land rows.")

    # --- 3. FINAL AGGREGATION & CLEANUP ---
    print("\n🔗 Stitching Global Master Matrix...")
    final_df = pd.concat(all_sampled_data, ignore_index=True)
    final_df = final_df.sample(frac=1.0, random_state=42).reset_index(drop=True)

    print("⚙️ Engineering Geography-Blind Features...")
    final_df['year'] = final_df['time'].dt.year
    final_df['month'] = final_df['time'].dt.month
    final_df['target_residual'] = final_df['pm25_fine_target'] - final_df['pm25_coarse_baseline']

    final_df['lat_offset'] = final_df['lat'] - final_df['lat_parent']
    final_df['lon_offset'] = final_df['lon'] - final_df['lon_parent']
    final_df['dist_from_parent'] = np.sqrt(final_df['lat_offset']**2 + final_df['lon_offset']**2)

    ml_cols = [
        'lat', 'lon', 
        'year', 'month', 
        'pm25_coarse_baseline', 
        'pm25_fine_target', 
        'target_residual',
        'lat_offset', 'lon_offset', 'dist_from_parent'
    ]
    final_df = final_df[ml_cols]

    output_path = "aeolus_master_global_training.csv"
    final_df.to_csv(output_path, index=False)
    print(f"\n🏆 SUCCESS: {len(final_df)} globally distributed rows saved to {output_path}")

if __name__ == "__main__":
    process_cascaded_data()
