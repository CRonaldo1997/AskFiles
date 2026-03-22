import requests
import json
import os
import time

JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
TOKEN = "cf4a0b67edaf87887f0f5c1c81e4f5c89e9a4481"
MODEL = "PaddleOCR-VL-1.5"

# Create a small text dummy pdf if it doesn't exist
# We'll just use the dummy.pdf if it's there, otherwise a small text file
file_path = "uploads/6384b1bd-7264-4321-989f-bd8809c13050.pdf"
if not os.path.exists(file_path):
    print(f"Error: {file_path} not found.")
    exit(1)

headers = {
    "Authorization": f"bearer {TOKEN}",
}

optional_payload = {
    "useDocOrientationClassify": False,
    "useDocUnwarping": False,
    "useChartRecognition": False,
}

print(f"Processing file: {file_path}")

try:
    with open(file_path, "rb") as f:
        resp = requests.post(
            JOB_URL, 
            headers=headers,
            data={"model": MODEL, "optionalPayload": json.dumps(optional_payload)},
            files={"file": f}
        )
    
    print(f"Status: {resp.status_code}")
    res_data = resp.json()
    print(f"Response: {json.dumps(res_data, indent=2, ensure_ascii=False)}")
    
    if resp.status_code == 200 and res_data.get("data") and res_data["data"].get("jobId"):
        job_id = res_data["data"]["jobId"]
        print(f"Job ID: {job_id}")
        
        # Poll status
        for _ in range(10):
            print("Polling...")
            r = requests.get(f"{JOB_URL}/{job_id}", headers=headers).json()
            state = r["data"]["state"]
            print(f"State: {state}")
            if state == "done":
                jsonl_url = r["data"]["resultUrl"]["jsonUrl"]
                print(f"JSONL URL: {jsonl_url}")
                # Download
                res = requests.get(jsonl_url)
                print("Content preview:")
                print(res.text[:200])
                break
            elif state == "failed":
                print(f"Failed: {r['data'].get('errorMsg')}")
                break
            time.sleep(2)
    else:
        print("Failed to submit job.")

except Exception as e:
    print(f"Exception: {e}")
