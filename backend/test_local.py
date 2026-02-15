import json
from main import process_finviz_data

class MockRequest:
    def __init__(self):
        pass

def test_local_run():
    print("--- Running local test of Cloud Function logic ---")
    try:
        req = MockRequest()
        response, status = process_finviz_data(req)
        print(f"Status: {status}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_local_run()
