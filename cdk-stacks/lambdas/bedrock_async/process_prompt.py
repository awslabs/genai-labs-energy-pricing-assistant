import os
import boto3
import json
from tools.tool_config import tool_config
from utils.websocket_util import send_websocket_message
from aws_lambda_powertools import Logger, Metrics, Tracer

logger = Logger()
metrics = Metrics()
tracer = Tracer()

TEMPERATURE = 0
MAX_TOKENS = 4096

KNOWLEDGE_BASE_ID = os.environ.get('KNOWLEDGE_BASE_ID')
SELECTED_MODEL_ID = os.environ.get('SELECTED_MODEL_ID')
DOC_DOMAIN = os.getenv("DOC_DOMAIN", "")

retrieval_system_prompt = (
    "You are an assistant for fuel pricing analysts. "
    "Your job is to help users search and get the relevant information/docs from the tools you have access to based on their quesitons. "
    "If you do not have enough information to use a tool correctly, ask a user follow-up questions to get the required inputs. "
)

final_answer_prompt = """
Answer the user's question only based on the information retrieved from the tools. Provide the references to each answer by citing the specific source(s) from the retrieval tools. 
When providing the final answer, strictly follow the markdown format enclosed in the <example></example> tags. Do not include <example> in the response. Make sure to follow the formatting and spacing exactly. 
The references are the hyperlinks with the doc titles. If you don't have any relevant docs, just say "No relevant docs found."

<example>

Company X earned $12 million. [1]  Almost 90% of it was from widget sales. [2]

<details><summary>Reference</summary>

[1] [doc1 title](https://doc1_location.pdf)
[2] [doc2 title](https://doc2_location.pdf)

</details>

</example>
"""

# Initialize Bedrock client
bedrock_client = boto3.client(service_name="bedrock-runtime")
bedrock_agent_client = boto3.client('bedrock-agent-runtime')

@tracer.capture_method
def execute_agent_workflow(history, prompt, connection_id):
    logger.info(history)
    messages = history + [{'role': 'user', 'content': [{'text': prompt}]}]
    stop_reason, response = stream_messages(messages, retrieval_system_prompt, connection_id)
    messages.append(response)

    # Check if there is an invoke function request from Claude
    while stop_reason == "tool_use":
        for content in response['content']:
            if 'toolUse' in content:
                tool = content['toolUse']

                if tool['name'] == 'retrieve_strategy_docs':
                    tool_result = {}
                    
                    # retrieved_docs = GetECSAmisReleases().execute(tool['input']['image_ids'])
                    retrieved_docs = retrieve_relevant_docs(
                        query=tool['input']['query']
                    )
                    tool_result = {
                        "toolUseId": tool['toolUseId'],
                        "content": [{"json": {"release_detail": retrieved_docs}}]
                    }
                    
                    tool_result_message = {
                        "role": "user",
                        "content": [
                            {
                                "toolResult": tool_result
                            }
                        ]
                    }
                    # Add the result info to message array
                    messages.append(tool_result_message)
        #Send the messages, including the tool result, to the model.
        stop_reason, response  = stream_messages(messages, retrieval_system_prompt + " " + final_answer_prompt, connection_id)
        # Add response to message history
        messages.append(response)
    return response['content'][0]['text']

@tracer.capture_method
def stream_messages(messages, system_prompt, connection_id):
    system_prompts = [{"text": system_prompt}]
    inference_config = {"temperature": TEMPERATURE, "maxTokens": MAX_TOKENS}

    response = bedrock_client.converse_stream(
            modelId=SELECTED_MODEL_ID,
            messages=messages,
            system=system_prompts,
            toolConfig=tool_config,
            inferenceConfig = inference_config
        )
    
    stop_reason = ""
 
    message = {}
    content = []
    message['content'] = content
    text = ''
    tool_use = {}
    counter = 0

     #stream the response into a message.
    for chunk in response['stream']:
        if 'messageStart' in chunk:
            message['role'] = chunk['messageStart']['role']
        elif 'contentBlockStart' in chunk:
            tool = chunk['contentBlockStart']['start']['toolUse']
            tool_use['toolUseId'] = tool['toolUseId']
            tool_use['name'] = tool['name']
        elif 'contentBlockDelta' in chunk:
            delta = chunk['contentBlockDelta']['delta']
            if 'toolUse' in delta:
                if 'input' not in tool_use:
                    tool_use['input'] = ''
                tool_use['input'] += delta['toolUse']['input']
            elif 'text' in delta:
                send_websocket_message(connection_id, {
                    'type': 'content_block_delta',
                    'delta': {'text': delta['text']},
                    'message_id': counter
                })
                text += delta['text']

        elif 'contentBlockStop' in chunk:
            if 'input' in tool_use:
                tool_use['input'] = json.loads(tool_use['input'])
                content.append({'toolUse': tool_use})
                tool_use = {}
            else:
                send_websocket_message(connection_id, {
                    'type': 'message_stop',
                })
                content.append({'text': text})
                text = ''
                counter += 1

        elif 'messageStop' in chunk:
            stop_reason = chunk['messageStop']['stopReason']

    return stop_reason, message
    

def chunk_string(string, chunk_size):
    chunks = [string[i:i+chunk_size] for i in range(0, len(string), chunk_size)]
    return chunks

@tracer.capture_method
def stream_pricing_message(messages, connection_id):
    
    stop_reason = ""
 
    message = {}
    content = []
    message['content'] = content
    text = ''
    counter = 0
    
    text = messages
    chunk_size = 3
    chunks = chunk_string(text, chunk_size)

     #stream the response into a message.
    for chunk in chunks:
        send_websocket_message(connection_id, {
            'type': 'content_block_delta',
            'delta': {'text': chunk},
            'message_id': counter
        })
        text += chunk
        counter += 1

    send_websocket_message(connection_id, {
        'type': 'message_stop',
    })
    content.append({'text': text})
    text = ''

    return content

@tracer.capture_method
def retrieve_relevant_docs(query):
    logger.info(f"Retrieving docs for query: {query}")
    vector_search_configuration = { 
         "numberOfResults": 2
      }
    
    retrieval_query ={
        "text": query
    }

    response = bedrock_agent_client.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalConfiguration={
                'vectorSearchConfiguration': vector_search_configuration,
            },
            retrievalQuery=retrieval_query
        )
    
    merged_results = {}

    for result in response["retrievalResults"]:
        if(result["location"]["type"] == "S3"):
            uri = result["location"]["s3Location"]["uri"].replace("s3://", "")
            url = f'https://{DOC_DOMAIN}/{uri.split("/", 1)[1]}'
            result["location"] = url  
            doc_title = url
            if doc_title in merged_results:
                merged_results[doc_title]['content']['text'] += ' ' + result['content']['text']
            else:
                merged_results[doc_title] = {
                    'doc_title': doc_title,
                    'content': result['content'],
                    'location': result['location'],
                }
        elif(result["location"]["type"] == "WEB"):
            url = result["location"]["webLocation"]["url"]
            result["location"] = url  
            doc_title = url
            if doc_title in merged_results:
                merged_results[doc_title]['content']['text'] += ' ' + result['content']['text']
            else:
                merged_results[doc_title] = {
                    'doc_title': doc_title,
                    'content': result['content'],
                    'location': result['location'],
                }
    
    merged_data = {
        'retrievalResults': list(merged_results.values())
    }
    logger.info(merged_data)
    return merged_data


