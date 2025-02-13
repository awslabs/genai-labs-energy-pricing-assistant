tool_config = {
    "toolChoice": {"auto": {}},
    "tools": [
        {
            "toolSpec": {
                "name": "retrieve_strategy_docs",
                "description": "Retrieves relevant pricing strategy documents based on query and the filter.",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query for relevant documents.",
                            }                            
                        },
                        "required": ["query"],
                    },
                },
            },
        },
    ]
}