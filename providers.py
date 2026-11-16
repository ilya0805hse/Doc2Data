"""Locally stored provider profiles and protocol adapters."""
import copy
import json
import os
import uuid
import urllib.request
import urllib.error
from urllib.parse import urlsplit, urlencode

PRESETS = [
    dict(id='ollama', name='Ollama (local)', protocol='ollama', base_url='http://localhost:11434', model='qwen3:8b'),
    dict(id='deepseek', name='DeepSeek', protocol='openai', base_url='https://api.deepseek.com', model='deepseek-chat'),
    dict(id='qwen', name='Qwen', protocol='openai', base_url='https://dashscope-intl.aliyuncs.com/compatible-mode/v1', model='qwen-plus'),
    dict(id='openai', name='ChatGPT / OpenAI compatible API', protocol='openai', base_url='https://api.openai.com/v1', model='gpt-4.1-mini'),
    dict(id='claude', name='Claude', protocol='anthropic', base_url='https://api.anthropic.com/v1', model='claude-sonnet-4-5'),
]


def normalize(config):
    config = copy.deepcopy(config)
    if 'providers' not in config:
        config['providers'] = copy.deepcopy(PRESETS)
        for profile in config['providers']:
            profile['api_key'] = config.pop(profile['id'] + '_key', '')
            if profile['id'] == config.get('provider'):
                profile['model'] = config.get('model', profile['model'])
            if profile['id'] == 'ollama':
                profile['base_url'] = config.get('ollama_url', profile['base_url'])
    config.setdefault('provider', 'ollama')
    active = next(p for p in config['providers'] if p['id'] == config['provider'])
    config['model'] = active['model']
    config['ollama_url'] = next(p['base_url'] for p in config['providers'] if p['id'] == 'ollama')
    return config


def api_key(profile):
    env = {'claude': 'ANTHROPIC_API_KEY', 'qwen': 'DASHSCOPE_API_KEY'}.get(profile['id'], profile['id'].upper() + '_API_KEY')
    return profile.get('api_key') or os.environ.get(env, '')


def public_settings(config):
    result = copy.deepcopy(config)
    for profile in result['providers']:
        profile['key_set'] = bool(api_key(profile))
        profile.pop('api_key', None)
    return result


def update(config, body):
    result = normalize(config)
    profile_id = body.get('provider')
    profile = next((p for p in result['providers'] if p['id'] == profile_id), None)
    if profile_id == 'new':
        profile = dict(id='custom-' + uuid.uuid4().hex, name='', protocol='openai', base_url='', model='', api_key='')
        result['providers'].append(profile)
    if profile is None:
        raise ValueError('Unknown provider.')
    for field in ('name', 'protocol', 'base_url', 'model'):
        if field in body:
            if not isinstance(body[field], str):
                raise ValueError('Provider fields must be text.')
            profile[field] = body[field].strip()
    key = body.get('api_key', body.get(profile['id'] + '_key', ''))
    if not isinstance(key, str):
        raise ValueError('API key must be text.')
    if key.strip():
        profile['api_key'] = key.strip()
    if body.get('clear_key'):
        profile['api_key'] = ''
    if profile['id'] == 'ollama' and 'ollama_url' in body:
        profile['base_url'] = str(body['ollama_url']).strip()
    if profile['protocol'] not in ('ollama', 'openai', 'anthropic'):
        raise ValueError('Unknown API format.')
    if not profile['name'] or not profile['model']:
        raise ValueError('Provider name and model are required.')
    url = urlsplit(profile['base_url'])
    if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError('Use an http:// or https:// base URL without credentials, query, or fragment.')
    result['provider'] = profile['id']
    return normalize(result)


def anthropic_payload(model, messages, tools):
    converted = []
    for message in messages:
        role = message['role']
        if role == 'system':
            continue
        if role == 'tool':
            role = 'user'
            content = [dict(type='tool_result', tool_use_id=message['tool_call_id'], content=message['content'])]
        else:
            content = [dict(type='text', text=message['content'])] if message.get('content') else []
            for call in message.get('tool_calls', []):
                args = call['function']['arguments']
                content.append(dict(type='tool_use', id=call['id'], name=call['function']['name'], input=json.loads(args) if isinstance(args, str) else args))
        if converted and converted[-1]['role'] == role:
            converted[-1]['content'].extend(content)
        else:
            converted.append(dict(role=role, content=content))
    return dict(model=model, max_tokens=8192, system='\n'.join(m['content'] for m in messages if m['role'] == 'system'), messages=converted,
                tools=[dict(name=t['function']['name'], description=t['function']['description'], input_schema=t['function']['parameters']) for t in tools])


def discover_models(config, body):
    """Fetch models using a draft connection, without saving or activating it."""
    saved = next((p for p in normalize(config)['providers'] if p['id'] == body.get('provider')), None)
    draft = dict(body, name=body.get('name') or 'Custom provider', model='discovery')
    candidate = update(config, draft)
    profile = next(p for p in candidate['providers'] if p['id'] == candidate['provider'])
    # A saved credential must not silently follow an edited endpoint.
    if saved and api_key(saved) and profile['base_url'].rstrip('/') != saved['base_url'].rstrip('/') and not body.get('api_key', '').strip():
        raise ValueError('Enter an API key again to fetch models from a changed base URL.')
    protocol = profile['protocol']
    key = api_key(profile)
    headers = {'Accept': 'application/json'}
    if key:
        if protocol == 'anthropic':
            headers['x-api-key'] = key
        else:
            headers['Authorization'] = 'Bearer ' + key
    if protocol == 'anthropic':
        headers['anthropic-version'] = '2023-06-01'
    endpoint = profile['base_url'].rstrip('/') + ('/api/tags' if protocol == 'ollama' else '/models')
    names = set()
    cursor = None
    try:
        for page in range(100):
            url = endpoint
            if protocol == 'anthropic':
                url += '?' + urlencode(dict(limit=100, **({'after_id': cursor} if cursor else {})))
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request, timeout=15) as response:
                data = json.load(response)
            items = data.get('models' if protocol == 'ollama' else 'data')
            if not isinstance(items, list):
                raise ValueError('The provider returned an invalid model list.')
            for item in items:
                name = item.get('name' if protocol == 'ollama' else 'id') if isinstance(item, dict) else None
                if isinstance(name, str) and name.strip():
                    names.add(name)
            if protocol != 'anthropic' or not data.get('has_more'):
                return sorted(names)
            next_cursor = data.get('last_id')
            if not next_cursor or next_cursor == cursor:
                raise ValueError('The provider returned an invalid model-list page.')
            cursor = next_cursor
        raise ValueError('The provider model list is too large. Enter a model name manually.')
    except urllib.error.HTTPError as error:
        error.close()
        if error.code in (401, 403):
            raise ValueError('Cannot fetch models: check your API key and account access.') from error
        if error.code in (404, 405):
            raise ValueError('This endpoint does not support model discovery. Check the base URL or enter a model manually.') from error
        raise ValueError(f'Cannot fetch models (HTTP {error.code}). Try again or enter a model manually.') from error
    except (urllib.error.URLError, TimeoutError):
        raise ValueError('Cannot reach the provider. Check the base URL and connection, or enter a model manually.') from None
    except (json.JSONDecodeError, AttributeError):
        raise ValueError('The provider returned an invalid model list. Enter a model manually.') from None
