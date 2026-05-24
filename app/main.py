from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, gemini, maps, firebase, transform, voice, agent

app = FastAPI(title="Ditto Accessibility API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(transform.router)   # /transform  /save-profile  /get-profile
app.include_router(voice.router)       # /voice/tts
app.include_router(agent.router)       # /agent/action
app.include_router(gemini.router)
app.include_router(maps.router)
app.include_router(firebase.router)
