import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
from sklearn.metrics import mean_squared_error, r2_score
import os

print("🚀 INITIATING CATBOOST PARADIGM SHIFT (GLOBAL V2)...")

# Verify datasets exist before attempting to load
if not os.path.exists("aeolus_master_global_training.csv") or not os.path.exists("aeolus_random_test_samples.csv"):
    print("❌ ERROR: Missing training or testing CSV files!")
    print("Please upload 'aeolus_master_global_training.csv' and 'aeolus_random_test_samples.csv' to this folder.")
    exit(1)

# 1. Load Pre-Engineered Training Data
print("\nLoading aeolus_master_global_training.csv...")
df_train = pd.read_csv("aeolus_master_global_training.csv")

# Safety filters
df_train = df_train[df_train['pm25_coarse_baseline'] >= 0]
df_train = df_train[df_train['pm25_fine_target'] >= 0]

# Re-create cyclical month features
df_train['month_sin'] = np.sin(2 * np.pi * df_train['month'] / 12)
df_train['month_cos'] = np.cos(2 * np.pi * df_train['month'] / 12)

# 2. Load the Generalized Test Data
print("Loading aeolus_random_test_samples.csv...")
df_test = pd.read_csv("aeolus_random_test_samples.csv")

# Safety filters
df_test = df_test[df_test['pm25_coarse_baseline'] >= 0]
df_test = df_test[df_test['pm25_fine_target'] >= 0]

# Re-create cyclical month features
df_test['month_sin'] = np.sin(2 * np.pi * df_test['month'] / 12)
df_test['month_cos'] = np.cos(2 * np.pi * df_test['month'] / 12)

# 3. Define the exact Geography-Blind Features
micro_features = [
    'lat_offset',
    'lon_offset',
    'dist_from_parent',
    'year',
    'month_sin',
    'month_cos',
    'pm25_coarse_baseline'
]

X_train = df_train[micro_features]
y_train = df_train['target_residual']

X_test = df_test[micro_features]
y_test = df_test['target_residual']
actual_fine_test = df_test['pm25_fine_target']

# 4. The CatBoost Engine (Geography-Blind Mode)
model_micro = CatBoostRegressor(
    iterations=2000,
    learning_rate=0.08,
    depth=9,
    loss_function='RMSE',
    l2_leaf_reg=5,
    random_seed=42,
    verbose=200
)

print("\n🧠 Training CatBoost Micro-Model on Gridded Global Data...")
model_micro.fit(X_train, y_train, eval_set=(X_test, y_test), early_stopping_rounds=100)

# 💾 EXPORT FOR THE APP
model_micro.save_model("aeolus_model.cbm")
print("\n💾 MODEL SAVED SUCCESSFULLY AS 'aeolus_model.cbm'")
