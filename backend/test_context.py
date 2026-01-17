
import requests
import time

BASE_URL = "http://localhost:8000/api"

def get_auth_token():
    # Try different credentials or create a new user for testing
    email = "aribasim1@gmail.com"
    password = "Aribasim@123"
    
    # 1. Try Login
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            return res.json()['access_token']
    except:
        pass

    # 2. Signup if login fails
    try:
        res = requests.post(f"{BASE_URL}/auth/signup", json={"email": email, "password": password, "name": "Context Tester"})
        if res.status_code == 200:
            return res.json()['access_token']
    except Exception as e:
        print(f"Auth failed: {e}")
        return None
        
    return None

def get_profile_id(token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        # Get profiles
        res = requests.get(f"{BASE_URL}/profiles", headers=headers)
        profiles = res.json()
        if profiles:
            return profiles[0]['id']
            
        # Create profile if none
        res = requests.post(f"{BASE_URL}/profiles", json={"name": "Test Child", "age": 10}, headers=headers)
        return res.json()['id']
    except Exception as e:
        print(f"Profile fetch failed: {e}")
        return None

def test_analysis(name, profile_id, content_type, content, context=None, expected_safe=True):
    print(f"\n--- Testing: {name} ---")
    payload = {
        "profile_id": profile_id,
        "content_type": content_type,
        "content": content,
        "context": context
    }
    
    try:
        res = requests.post(f"{BASE_URL}/content/analyze", json=payload)
        
        if res.status_code != 200:
            print(f"❌ Error {res.status_code}: {res.text}")
            return

        data = res.json()
        is_safe = data['is_safe']
        reasons = data['reasons']
        
        print(f"Result: Safe={is_safe}")
        print(f"Reasons: {reasons}")
        
        if is_safe == expected_safe:
            print("✅ PASS")
        else:
            print(f"❌ FAIL (Expected Safe={expected_safe}, Got={is_safe})")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

# ================= MAIN FLOW =================
print("Initializing Context Test...")
token = get_auth_token()
if not token:
    print("❌ Could not authenticate.")
    exit(1)

profile_id = get_profile_id(token)
if not profile_id:
    print("❌ Could not get profile.")
    exit(1)

print(f"Using Profile ID: {profile_id}")

# 1. Trusted Domain (Wikipedia - Anatomy)
test_analysis(
    name="Educational Context (Wikipedia)", 
    profile_id=profile_id,
    content_type="text", 
    content="The human penis and vagina are reproductive organs. Anatomy and biology class.", 
    context="https://en.wikipedia.org/wiki/Human_reproduction",
    expected_safe=True
)

# 2. Trusted Domain (WebMD)
test_analysis(
    name="Medical Context (WebMD)", 
    profile_id=profile_id,
    content_type="text", 
    content="Symptoms include pain in the penis or vaginal discharge. Diagnosis requires clinical study.", 
    context="https://www.webmd.com/sexual-conditions",
    expected_safe=True
)

# 3. Explicit Content (Unknown Domain)
test_analysis(
    name="Explicit Content (Unknown Site)", 
    profile_id=profile_id,
    content_type="text", 
    content="Check out this hot video of a penis and vagina. xxx porn.", 
    context="https://unknown-streaming.com",
    expected_safe=False
)

# 4. Search Engine (Google) - Should Allow (Query is safe-ish or handled by logic)
# "sex" on google might be allowed if short/ambiguous, or blocked if explicit.
# Let's test a safe search.
test_analysis(
    name="Search Engine (Safe)",
    profile_id=profile_id,
    content_type="url",
    content="https://www.google.com/search?q=biology+class",
    context="https://www.google.com",
    expected_safe=True
)
