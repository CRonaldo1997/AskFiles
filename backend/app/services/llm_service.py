from openai import AsyncOpenAI
import httpx
from fastapi import HTTPException

class LLMService:
    async def ask_question_stream(
        self,
        api_url: str,
        api_key: str,
        model_name: str,
        messages: list
    ):
        base_url = api_url
        if "/chat/completions" in api_url:
            base_url = api_url.split("/chat/completions")[0]
        elif "/v1" in api_url:
            base_url = api_url.split("/v1")[0]
            
        print(f"DEBUG: Initializing AsyncOpenAI for Stream with base_url={base_url}")
        
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        
        try:
            print(f"DEBUG: calling completions.create for model {model_name}")
            stream = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=1.0,
                stream=True,
                timeout=60.0,
                extra_body={
                    "thinking": {
                        "type": "disabled"
                    }
                }
            )
            print("DEBUG: completions.create returned stream object")
            
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                        
        except Exception as e:
            print(f"ERROR: LLM Stream call failed: {str(e)}")
            yield f"Error: {str(e)}"
        finally:
            await client.close()

    async def ask_question(
        self,
        api_url: str,
        api_key: str,
        model_name: str,
        messages: list = None,
        **kwargs
    ) -> str:
        print(f"DEBUG: ask_question called with kwargs={kwargs}")
        
        # If model.py passed system_prompt/user_content, convert them to messages if messages is None
        if messages is None:
            system_prompt = kwargs.get("system_prompt", "You are a helpful assistant.")
            user_content = kwargs.get("user_content", "Hello")
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ]
        
        # Consistent with user's sample: GLM-5 often needs the base URL to be exactly the parent path
        # If the user provides a full completions endpoint, extract the base part
        base_url = api_url
        if "/chat/completions" in api_url:
            base_url = api_url.split("/chat/completions")[0]
        elif "/v1" in api_url:
            base_url = api_url.split("/v1")[0]
            
        print(f"DEBUG: Initializing AsyncOpenAI with base_url={base_url}")
        
        # Use httpx client with verify=False if needed (sometimes local proxies cause issues)
        # But we'll try default first for better security
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        
        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=1.0, # As per sample
                timeout=60.0,
                extra_body={
                    "thinking": {
                        "type": "disabled"
                    }
                }
            )
            
            answer = response.choices[0].message.content
            if not answer:
                raise Exception("Bot returned an empty response")
            return answer
            
        except Exception as e:
            print(f"ERROR: LLM API call failed: {str(e)}")
            raise Exception(f"大模型接口请求失败: {str(e)}")
        finally:
            await client.close()

llm_service = LLMService()
