from typing import Dict, List, Optional, Any
from .base import AIProvider, SecurityAnalysisResult
import google.generativeai as genai
import logging
import json

logger = logging.getLogger(__name__)

class GeminiProvider(AIProvider):
    """Google Gemini provider implementation."""
    
    def __init__(self, model_name: str = "gemini-pro", api_key: Optional[str] = None):
        self.model_name = model_name
        self._client = None
        if api_key:
            genai.configure(api_key=api_key)
            self._client = genai.GenerativeModel(model_name)
        logger.info(f"Initializing GeminiProvider with model: {model_name}")
    
    def get_provider_name(self) -> str:
        return "Gemini"
    
    def is_local(self) -> bool:
        return False
    
    async def validate_api_key(self) -> bool:
        try:
            logger.info("Validating Gemini API key...")
            # Make a simple API call to validate the key
            self._client.generate_content("test")
            return True
        except Exception as e:
            logger.error(f"Failed to validate Gemini API key: {str(e)}")
            return False
    
    async def analyze_security(self,
                             html_content: str,
                             url: str,
                             context: Optional[Dict[str, Any]] = None) -> SecurityAnalysisResult:
        logger.info(f"Starting security analysis for URL: {url}")
        prompt = self._build_security_prompt(html_content, url, context)
        
        try:
            logger.info(f"Sending request to Gemini model: {self.model_name}")
            logger.debug(f"Prompt: {prompt}")
            
            response = self._client.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,  # Low temperature for more consistent results
                    "max_output_tokens": 4000,
                }
            )
            
            logger.info("Received response from Gemini")
            logger.debug(f"Raw response: {response}")
            
            # Parse the response and structure it
            analysis = self._parse_response(response.text)
            logger.info(f"Parsed analysis: {json.dumps(analysis, indent=2)}")
            
            return SecurityAnalysisResult(
                vulnerabilities=analysis.get('vulnerabilities', []),
                sensitive_assets=analysis.get('sensitive_assets', []),
                recommendations=analysis.get('recommendations', []),
                confidence_score=analysis.get('confidence_score', 0.0),
                model_used=self.model_name,
                status=analysis.get('status', 'success'),
                error=analysis.get('error')
            )
        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}", exc_info=True)
            return SecurityAnalysisResult(
                vulnerabilities=[],
                sensitive_assets=[],
                recommendations=[],
                confidence_score=0.0,
                model_used=self.model_name,
                status='error',
                error=str(e)
            )
    
    def _build_security_prompt(self,
                             html_content: str,
                             url: str,
                             context: Optional[Dict[str, Any]] = None) -> str:
        return f"""Analyze the following web content for security vulnerabilities and sensitive assets.
URL: {url}

Content:
{html_content}

Please provide a detailed security analysis in the following JSON format. IMPORTANT: The response must be valid JSON without any comments or additional text:
{{
    "vulnerabilities": [
        {{
            "type": "string",
            "description": "string",
            "severity": "high|medium|low",
            "location": "string"
        }}
    ],
    "sensitive_assets": [
        {{
            "type": "string",
            "description": "string",
            "location": "string"
        }}
    ],
    "recommendations": ["string"],
    "confidence_score": float
}}

Focus on:
1. Input validation vulnerabilities
2. Authentication/Authorization issues
3. Sensitive data exposure
4. CSRF/XSS vulnerabilities
5. Insecure direct object references
6. Security misconfigurations
7. PII and sensitive data exposure
8. Authentication tokens and credentials

CRITICAL INSTRUCTIONS:
1. Your response must be valid JSON only
2. Do not include any comments in the JSON
3. Do not include any text before or after the JSON object
4. Do not include any explanations or notes
5. The confidence_score must be a number between 0 and 1
6. All strings must be properly quoted
7. Do not use trailing commas"""
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        logger.info("Parsing Gemini response")
        try:
            # Try to find JSON in the response
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON object found in response")
            
            json_str = response[start_idx:end_idx]
            logger.debug(f"Extracted JSON string: {json_str}")
            
            parsed = json.loads(json_str)
            logger.info("Successfully parsed JSON response")
            
            # Ensure the response has the required structure
            return {
                "vulnerabilities": parsed.get("vulnerabilities", []),
                "sensitive_assets": parsed.get("sensitive_assets", []),
                "recommendations": parsed.get("recommendations", []),
                "confidence_score": float(parsed.get("confidence_score", 0.0)),
                "status": "success",
                "error": None
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Raw response: {response}")
            return {
                "vulnerabilities": [],
                "sensitive_assets": [],
                "recommendations": [],
                "confidence_score": 0.0,
                "status": "error",
                "error": f"Failed to parse AI response: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {str(e)}")
            return {
                "vulnerabilities": [],
                "sensitive_assets": [],
                "recommendations": [],
                "confidence_score": 0.0,
                "status": "error",
                "error": f"Unexpected error: {str(e)}"
            } 