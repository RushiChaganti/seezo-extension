from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class Vulnerability(BaseModel):
    type: str
    description: str
    severity: str
    location: str

class SensitiveAsset(BaseModel):
    type: str
    description: str
    location: str

class SecurityAnalysisResult(BaseModel):
    """Model for security analysis results."""
    vulnerabilities: List[Vulnerability]
    sensitive_assets: List[SensitiveAsset]
    recommendations: List[str]
    confidence_score: float
    model_used: str
    status: str
    error: Optional[str] = None

    model_config = {
        'protected_namespaces': ()
    }

class AIProvider(ABC):
    """Base class for AI providers."""
    
    @abstractmethod
    async def analyze_security(self, 
                             html_content: str,
                             url: str,
                             context: Optional[Dict[str, Any]] = None) -> SecurityAnalysisResult:
        """Analyze web content for security vulnerabilities and sensitive assets."""
        pass
    
    @abstractmethod
    async def validate_api_key(self) -> bool:
        """Validate the provider's API key."""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the name of the AI provider."""
        pass
    
    @abstractmethod
    def is_local(self) -> bool:
        """Check if the provider processes data locally."""
        pass