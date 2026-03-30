# from openai import OpenAI
# client = OpenAI(base_url='https://openrouter.ai/api/v1', api_key='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')
# response = client.chat.completions.create(
#     model='meta-llama/llama-3.3-70b-instruct:free',
#     messages=[{'role':'user','content':'hello'}]
# )
# print(response.choices[0].message.content)

from openai import OpenAI
client = OpenAI(base_url='https://openrouter.ai/api/v1',  api_key='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')
response = client.chat.completions.create(
    model='mistralai/mistral-small-3.1-24b-instruct:free',
    messages=[{'role':'user','content':'hello'}]
)
print(response.choices[0].message.content)