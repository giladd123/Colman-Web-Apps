from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn, os, uuid, shutil

app = FastAPI()

# CORS configuration (allow local dev origins)
origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR = os.path.join(os.path.dirname(__file__), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

profile_data = [
    {
        "id": "1",
        "name": "Gilad",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Murphy_the_Bigfoot.jpg/250px-Murphy_the_Bigfoot.jpg",
    },
    {
        "id": "2",
        "name": "Shani",
        "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpIlyk4PFJ3QnOpAZL0dgk8e4NxrLsWTTAzw&s",
    },
]


@app.get("/profiles")
def get_profiles():
    return profile_data


@app.post("/profiles")
def add_profile_legacy(profile: dict):
    """Legacy JSON endpoint kept for backward compatibility."""
    if "id" not in profile:
        profile["id"] = str(uuid.uuid4())
    profile_data.append(profile)
    return {"message": "Profile added successfully", "profile": profile}


@app.post("/profile")
async def create_profile(
    name: str = Form(...), image: Optional[UploadFile] = File(None)
):
    """Create profile via multipart form-data (name + optional image file)."""
    img_url = None
    if image:
        ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
        fname = f"{uuid.uuid4()}{ext}"
        dest_path = os.path.join(MEDIA_DIR, fname)
        with open(dest_path, "wb") as out_file:
            shutil.copyfileobj(image.file, out_file)
        img_url = f"/media/{fname}"
    else:
        img_url = "https://via.placeholder.com/250x250?text=Profile"  # default
    new_profile = {"id": str(uuid.uuid4()), "name": name, "image_url": img_url}
    profile_data.append(new_profile)
    return new_profile


@app.put("/profiles/{profile_id}")
async def update_profile(
    profile_id: str, name: str = Form(...), image: Optional[UploadFile] = File(None)
):
    prof = next((p for p in profile_data if p["id"] == profile_id), None)
    if not prof:
        raise HTTPException(status_code=404, detail="Profile not found")
    prof["name"] = name
    if image:
        ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
        fname = f"{uuid.uuid4()}{ext}"
        dest_path = os.path.join(MEDIA_DIR, fname)
        with open(dest_path, "wb") as out_file:
            shutil.copyfileobj(image.file, out_file)
        prof["image_url"] = f"/media/{fname}"
    return prof


@app.delete("/profiles/{profile_id}")
def delete_profile(profile_id: str):
    idx = next((i for i, p in enumerate(profile_data) if p["id"] == profile_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    removed = profile_data.pop(idx)
    return {"message": "Profile deleted", "profile": removed}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
