from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import uvicorn
from .ai.base import SecurityAnalysisResult
from .ai.ollama_provider import OllamaProvider
from .ai.openai_provider import OpenAIProvider
from .ai.anthropic_provider import AnthropicProvider
from .ai.gemini_provider import GeminiProvider
from .config import Settings, get_settings
import json
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(title="Seezo Security Analysis API")

# Configure CORS for browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

class RequestData(BaseModel):
    html_content: str
    url: str
    context: Optional[Dict[str, Any]] = None

class ProviderConfig(BaseModel):
    provider: str
    model_name: Optional[str] = None
    api_key: Optional[str] = None

class AnalysisRequest(BaseModel):
    request: RequestData
    provider_config: ProviderConfig

def get_ai_provider(provider_config: ProviderConfig) -> Any:
    """Get the appropriate AI provider based on configuration."""
    provider = provider_config.provider.lower()
    
    if provider == "ollama":
        return OllamaProvider(model_name=provider_config.model_name or "mistral")
    elif provider == "openai":
        return OpenAIProvider(
            model_name=provider_config.model_name or "gpt-4",
            api_key=provider_config.api_key
        )
    elif provider == "anthropic":
        return AnthropicProvider(
            model_name=provider_config.model_name or "claude-3-opus-20240229",
            api_key=provider_config.api_key
        )
    elif provider == "gemini":
        return GeminiProvider(
            model_name=provider_config.model_name or "gemini-pro",
            api_key=provider_config.api_key
        )
    
    raise HTTPException(status_code=400, detail="Unsupported AI provider")

async def verify_api_key(request: Request):
    """Verify API key from request headers."""
    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != get_settings().api_key:
        logger.warning("Invalid or missing API key")
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key

@app.post("/analyze")
async def analyze_security(
    request: AnalysisRequest,
    api_key: str = Depends(verify_api_key)
):
    """Analyze web content for security vulnerabilities."""
    try:
        logger.info(f"Received analysis request for URL: {request.request.url}")
        logger.info(f"Using provider: {request.provider_config.provider}")
        
        provider = get_ai_provider(request.provider_config)
        if not provider:
            logger.error(f"Provider not found: {request.provider_config.provider}")
            raise HTTPException(status_code=400, detail="Invalid provider")
        
        # Validate provider configuration
        if not await provider.validate_api_key():
            logger.error(f"Provider validation failed: {request.provider_config.provider}")
            raise HTTPException(status_code=400, detail="Invalid provider configuration")
        
        # Perform analysis
        result = await provider.analyze_security(
            request.request.html_content,
            request.request.url,
            request.request.context
        )
        
        logger.info("Analysis completed successfully")
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def get_available_models(
    provider: str = "ollama",
    api_key: str = Depends(verify_api_key),
    provider_key: Optional[str] = Header(None, alias="X-Provider-Key")
):
    """Get list of available models for the specified provider."""
    try:
        logger.info(f"Fetching models for provider: {provider}")
        
        if provider == "ollama":
            provider_config = ProviderConfig(provider=provider)
            provider_instance = get_ai_provider(provider_config)
            models = provider_instance.get_available_models()
            return {"models": models}
            
        elif provider == "openai":
            if not provider_key:
                logger.warning("No OpenAI API key provided")
                return {"models": [
                    "gpt-4",
                    "gpt-4-turbo-preview",
                    "gpt-3.5-turbo",
                    "gpt-3.5-turbo-16k"
                ]}
            try:
                import openai
                openai.api_key = provider_key
                logger.info("Fetching models from OpenAI API")
                response = openai.models.list()
                models = [model.id for model in response.data]
                logger.info(f"Found {len(models)} OpenAI models")
                return {"models": models}
            except Exception as e:
                logger.error(f"Failed to fetch OpenAI models: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch OpenAI models: {str(e)}")
                
        elif provider == "gemini":
            if not provider_key:
                logger.warning("No Gemini API key provided")
                return {"models": [
                    "gemini-pro",
                    "gemini-pro-vision",
                    "gemini-1.0-pro",
                    "gemini-1.0-pro-vision"
                ]}
            try:
                import google.generativeai as genai
                genai.configure(api_key=provider_key)
                logger.info("Fetching models from Gemini API")
                models = genai.list_models()
                gemini_models = [model.name for model in models if "gemini" in model.name.lower()]
                logger.info(f"Found {len(gemini_models)} Gemini models")
                return {"models": gemini_models}
            except Exception as e:
                logger.error(f"Failed to fetch Gemini models: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch Gemini models: {str(e)}")
                
        elif provider == "anthropic":
            # Anthropic doesn't provide a models API, so return default models
            return {
                "models": [
                    "claude-3-opus-20240229",
                    "claude-3-sonnet-20240229",
                    "claude-3-haiku-20240307",
                    "claude-2.1",
                    "claude-2.0",
                    "claude-instant-1.2"
                ]
            }
        else:
            raise HTTPException(status_code=400, detail="Provider does not support model listing")
            
    except Exception as e:
        logger.error(f"Failed to get available models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.get("/api-key")
async def get_api_key():
    """Get the API key from settings."""
    try:
        return {"api_key": get_settings().api_key}
    except Exception as e:
        logger.error(f"Failed to get API key: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def start():
    """Start the FastAPI server."""
    logger.info("Starting Seezo server...")
    uvicorn.run(
        "seezo.server:app",
        host=get_settings().host,
        port=get_settings().port,
        reload=True
    )

if __name__ == "__main__":
    start()