import io

from tests.conftest import PDF, auth, png_bytes

DIABETES = {"age": 40, "bmi": 25, "hypertension": 0, "heart_disease": 0, "smoking_history": 0,
            "HbA1c_level": 5, "blood_glucose_level": 100, "gender": 1}


def test_predict_requires_auth(client):
    assert client.post("/predict-diabetes", json=DIABETES).status_code == 401
    assert client.post("/predict", files={"file": ("a.png", png_bytes(), "image/png")}).status_code == 401


def test_image_endpoints_accept_real_images(client):
    h, _ = auth(client, "a@x.com")
    for url in ("/predict", "/predict-skin-defense", "/predict-fracture"):
        r = client.post(url, headers=h, files={"file": ("a.png", png_bytes(), "image/png")})
        assert r.status_code == 200, (url, r.text)


def test_image_endpoints_reject_fake_and_oversized(client):
    h, _ = auth(client, "a@x.com")
    for url in ("/predict", "/predict-skin-defense", "/predict-fracture"):
        assert client.post(url, headers=h, files={"file": ("a.png", b"MZ\x90\x00 not an image", "image/png")}).status_code == 415
        assert client.post(url, headers=h, files={"file": ("a.png", PDF, "image/png")}).status_code == 415
        assert client.post(url, headers=h, files={"file": ("a.png", b"\x89PNG\r\n\x1a\n" + b"0" * 100, "image/png")}).status_code == 400
        assert client.post(url, headers=h, files={"file": ("a.png", b"\xff\xd8\xff" + b"0" * (11 * 1024 * 1024), "image/jpeg")}).status_code == 413


def test_missing_filename_does_not_crash(client):
    h, _ = auth(client, "a@x.com")
    r = client.post("/predict-fracture", headers=h, files={"file": ("", png_bytes(), "image/png")})
    assert r.status_code in (200, 422)


def test_decompression_bomb_dimensions_rejected(client):
    h, _ = auth(client, "a@x.com")
    from PIL import Image
    buf = io.BytesIO(); Image.new("1", (7000, 7000)).save(buf, "PNG")     # 49 Mpx > 40 Mpx limit
    r = client.post("/predict", headers=h, files={"file": ("a.png", buf.getvalue(), "image/png")})
    assert r.status_code == 400


def test_rate_limit_on_predictions_per_user(client):
    h1, _ = auth(client, "a@x.com"); h2, _ = auth(client, "b@x.com")
    codes = [client.post("/predict-diabetes", headers=h1, json=DIABETES).status_code for _ in range(22)]
    assert codes[:20] == [200] * 20 and codes[20] == 429
    r = client.post("/predict-diabetes", headers=h1, json=DIABETES)
    assert "Retry-After" in r.headers
    assert client.post("/predict-diabetes", headers=h2, json=DIABETES).status_code == 200   # per-user


def test_register_rate_limited_per_ip(client):
    codes = [client.post("/register", json={"firstName": "a", "lastName": "b", "email": f"u{i}@x.com",
             "password": "Correct-Horse-Battery-9", "confirmPassword": "Correct-Horse-Battery-9"}).status_code
             for i in range(12)]
    assert codes.count(201) == 10 and codes[-1] == 429


def test_oversized_request_rejected_early(client):
    r = client.post("/register", content=b"x", headers={"Content-Length": str(50 * 1024 * 1024),
                    "Content-Type": "application/json"})
    assert r.status_code == 413
