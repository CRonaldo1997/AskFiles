import os
from supabase import create_client

env = {}
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                env[k] = v.strip('"\'')

url = env.get('SUPABASE_URL')
key = env.get('SUPABASE_KEY')

supabase = create_client(url, key)

try:
    res = supabase.table("users").select("*").limit(1).execute()
    if res.data:
        print(f"Columns found in users table: {res.data[0].keys()}")
    else:
        print("Users table is empty. No rows to check column names from result.")
        # Let's try to query 'passwd' just in case
        try:
            res = supabase.table("users").select("username,passwd").limit(0).execute()
            print("Found 'passwd' column")
        except:
            print("Did not find 'passwd' column")
except Exception as e:
    print(f"Error checking table: {e}")
