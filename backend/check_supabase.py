import os
import json
from supabase import create_client

# Load .env
env = {}
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 2)
                env[k] = v.strip('"\'')

url = env.get('SUPABASE_URL')
key = env.get('SUPABASE_KEY')

if not url or not key:
    print("Env missing")
    exit(1)

supabase = create_client(url, key)

try:
    # Try all-lowercase
    print("Testing 'username' and 'password' (lowercase)...")
    try:
        res = supabase.table("users").select("username,password").limit(0).execute()
        print("SUCCESS: Found both columns in lowercase")
    except Exception as e:
        print(f"FAILED: {e}")

    # Try title case
    print("\nTesting 'Username' and 'Password' (TitleCase)...")
    try:
        res = supabase.table("users").select("Username,Password").limit(0).execute()
        print("SUCCESS: Found both columns in TitleCase")
    except Exception as e:
        print(f"FAILED: {e}")

except Exception as e:
    print(f"Generic Failure: {e}")
