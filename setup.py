from setuptools import setup, find_packages

setup(
    name="seezo",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.104.1",
        "uvicorn==0.24.0",
        "python-dotenv==1.0.0",
        "pydantic==2.4.2",
        "cryptography==41.0.5",
        "python-jose==3.3.0",
        "beautifulsoup4==4.12.2",
        "selenium==4.15.2",
        "anthropic==0.5.0",
        "google-generativeai==0.3.1",
        "openai==1.3.0",
        "ollama==0.1.6",
        "python-multipart==0.0.6",
        "aiohttp==3.9.1",
        "websockets==12.0",
        "pydantic-settings"
    ],
    entry_points={
        'console_scripts': [
            'seezo=seezo.server:start',
        ],
    },
    author="Seezo Team",
    author_email="team@seezo.dev",
    description="A privacy-first browser security design review tool",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/seezo/seezo",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.11,<3.12",
) 