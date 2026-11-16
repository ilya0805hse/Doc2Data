import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import providers
import server


class ProviderTests(unittest.TestCase):
    def test_request_timeouts_and_overrides(self):
        for protocol, override, expected in [('ollama', None, 600), ('openai', None, 120), ('ollama', '900', 900)]:
            with self.subTest(protocol=protocol, override=override):
                config = providers.update({}, dict(provider=protocol))
                response = {'message': {'content':'ok'}, 'choices':[{'message':{'content':'ok'}}]}
                env = {} if override is None else {'DOCTODATA_OLLAMA_TIMEOUT':override}
                with patch.dict(server.os.environ, env, clear=True), patch.object(server.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(response).encode())) as request:
                    server.provider_call(config, [])
                self.assertEqual(request.call_args.kwargs['timeout'], expected)

    def test_timeout_errors_are_actionable(self):
        for error in [TimeoutError(), server.urllib.error.URLError(TimeoutError())]:
            with self.subTest(error=error), patch.dict(server.os.environ, {}, clear=True), patch.object(server.urllib.request, 'urlopen', side_effect=error):
                with self.assertRaisesRegex(ValueError, '600 seconds.*DOCTODATA_OLLAMA_TIMEOUT'):
                    server.provider_call(providers.normalize({}), [])

    def test_invalid_timeout_rejected_before_request(self):
        for value in ['0', '-1', 'nan', 'inf', 'abc']:
            with self.subTest(value=value), patch.dict(server.os.environ, {'DOCTODATA_OLLAMA_TIMEOUT':value}), patch.object(server.urllib.request, 'urlopen') as request:
                with self.assertRaisesRegex(ValueError, 'positive number'):
                    server.provider_call(providers.normalize({}), [])
                request.assert_not_called()

    def test_legacy_settings_keep_model_url_and_secrets(self):
        config = providers.normalize(dict(provider='openai', model='saved-model', openai_key='secret', ollama_url='http://localhost:9999'))
        self.assertEqual(config['model'], 'saved-model')
        self.assertEqual(config['ollama_url'], 'http://localhost:9999')
        public = providers.public_settings(config)
        self.assertNotIn('secret', json.dumps(public))
        self.assertTrue(next(p for p in public['providers'] if p['id'] == 'openai')['key_set'])
        self.assertEqual(len(public['providers']), 5)

    def test_multiple_custom_profiles_and_blank_key_preservation(self):
        config = providers.update({}, dict(provider='new', name='First', model='one', base_url='http://localhost:9000/v1', api_key='secret'))
        first_id = config['provider']
        config = providers.update(config, dict(provider='new', name='Second', model='two', base_url='https://example.com/v1'))
        self.assertNotEqual(config['provider'], first_id)
        config = providers.update(config, dict(provider=first_id, api_key=''))
        self.assertEqual(config['model'], 'one')
        self.assertEqual(providers.api_key(next(p for p in config['providers'] if p['id'] == first_id)), 'secret')
        config = providers.update(config, dict(provider=first_id, clear_key=True))
        self.assertEqual(next(p for p in config['providers'] if p['id'] == first_id)['api_key'], '')

    def test_invalid_settings_rejected_without_mutation(self):
        original = providers.normalize({})
        for changes in [dict(base_url='file:///tmp/data'), dict(base_url='https://user:pass@example.com'), dict(model=''), dict(protocol='unknown')]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                providers.update(original, dict(provider='ollama', **changes))
        self.assertEqual(original, providers.normalize({}))

    def test_settings_survive_database_reload(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(server, 'DB', Path(directory)/'test.db'):
            config = providers.update({}, dict(provider='new', name='Persisted', model='test', base_url='https://example.com/v1', api_key='secret'))
            with server.connection() as db:
                db.execute('CREATE TABLE settings (id INTEGER PRIMARY KEY, value TEXT)')
                db.execute('INSERT INTO settings VALUES (1, ?)', (json.dumps(config),))
            self.assertEqual(server.settings(), config)
            self.assertNotIn('secret', json.dumps(providers.public_settings(server.settings())))

    def test_custom_openai_request_and_response(self):
        config = providers.update({}, dict(provider='new', name='Custom', model='custom-model', base_url='https://example.com/v1', api_key='secret'))
        message = dict(role='assistant', content='answer')
        with patch.object(server.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps({'choices':[{'message':message}]}).encode())) as request:
            self.assertEqual(server.provider_call(config, [dict(role='user', content='hello')]), message)
        req = request.call_args.args[0]
        self.assertEqual(req.full_url, 'https://example.com/v1/chat/completions')
        self.assertEqual(req.get_header('Authorization'), 'Bearer secret')
        self.assertEqual(json.loads(req.data)['model'], 'custom-model')

    def test_claude_tool_round_trip(self):
        config = providers.update({}, dict(provider='claude', api_key='secret'))
        blocks = [dict(type='tool_use', id='call1', name='search_documents', input={'query':'revenue'}), dict(type='tool_use', id='call2', name='search_documents', input={'query':'cost'})]
        messages = [dict(role='system', content='Extract'), dict(role='user', content='Totals')]
        with patch.object(server.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps({'content':blocks}).encode())) as request:
            answer = server.provider_call(config, messages)
        self.assertEqual(request.call_args.args[0].full_url, 'https://api.anthropic.com/v1/messages')
        messages += [answer, dict(role='tool', tool_call_id='call1', content='[]'), dict(role='tool', tool_call_id='call2', content='[]')]
        payload = providers.anthropic_payload(config['model'], messages, server.TOOLS)
        self.assertEqual(payload['system'], 'Extract')
        self.assertEqual(payload['messages'][-2]['content'], blocks)
        self.assertEqual([b['tool_use_id'] for b in payload['messages'][-1]['content']], ['call1', 'call2'])
        self.assertEqual(payload['tools'][0]['input_schema'], server.TOOLS[0]['function']['parameters'])


class ModelDiscoveryTests(unittest.TestCase):
    def test_saved_deepseek_key_and_normalized_model_list(self):
        config = providers.update({}, dict(provider='deepseek', api_key='saved-secret'))
        with patch.object(providers.urllib.request, 'urlopen', return_value=io.BytesIO(b'{"data":[{"id":"reasoner"},{"id":"chat"},{"id":"chat"}]}')) as request:
            self.assertEqual(providers.discover_models(config, {'provider':'deepseek'}), ['chat', 'reasoner'])
        req = request.call_args.args[0]
        self.assertEqual(req.full_url, 'https://api.deepseek.com/models')
        self.assertEqual(req.get_header('Authorization'), 'Bearer saved-secret')
        self.assertEqual(config['provider'], 'deepseek')

    def test_unsaved_key_and_blank_model_do_not_change_settings(self):
        config = providers.normalize({})
        original = json.dumps(config)
        with patch.object(providers.urllib.request, 'urlopen', return_value=io.BytesIO(b'{"data":[{"id":"chat"}]}')) as request:
            providers.discover_models(config, dict(provider='new', base_url='https://example.com/v1', api_key='draft-secret', model=''))
        self.assertEqual(request.call_args.args[0].get_header('Authorization'), 'Bearer draft-secret')
        self.assertEqual(json.dumps(config), original)

    def test_saved_key_does_not_follow_changed_endpoint(self):
        config = providers.update({}, dict(provider='deepseek', api_key='saved-secret'))
        with patch.object(providers.urllib.request, 'urlopen') as request, self.assertRaisesRegex(ValueError, 'changed base URL'):
            providers.discover_models(config, dict(provider='deepseek', base_url='https://example.com/v1'))
        request.assert_not_called()

    def test_ollama_and_claude_discovery(self):
        with patch.object(providers.urllib.request, 'urlopen', return_value=io.BytesIO(b'{"models":[{"name":"local-model"}]}')) as request:
            self.assertEqual(providers.discover_models({}, {'provider':'ollama'}), ['local-model'])
        self.assertTrue(request.call_args.args[0].full_url.endswith('/api/tags'))
        responses = [io.BytesIO(b'{"data":[{"id":"claude-a"}],"has_more":true,"last_id":"claude-a"}'), io.BytesIO(b'{"data":[{"id":"claude-b"}],"has_more":false}')]
        with patch.object(providers.urllib.request, 'urlopen', side_effect=responses) as request:
            self.assertEqual(providers.discover_models({}, dict(provider='claude', api_key='test')), ['claude-a','claude-b'])
        req = request.call_args.args[0]
        self.assertIn('after_id=claude-a', req.full_url)
        self.assertEqual(req.get_header('X-api-key'), 'test')

    def test_empty_invalid_and_failed_responses(self):
        for raw, expected in [(b'{"data":[]}', []), (b'{}', None), (b'not json', None)]:
            with self.subTest(raw=raw), patch.object(providers.urllib.request, 'urlopen', return_value=io.BytesIO(raw)):
                if expected is not None:
                    self.assertEqual(providers.discover_models({}, {'provider':'deepseek'}), expected)
                else:
                    with self.assertRaisesRegex(ValueError, 'invalid model list'):
                        providers.discover_models({}, {'provider':'deepseek'})
        for error, message in [(providers.urllib.error.HTTPError('https://example.com',401,'secret',{},None),'API key'), (providers.urllib.error.HTTPError('https://example.com',404,'secret',{},None),'does not support'), (TimeoutError(),'Cannot reach')]:
            with self.subTest(error=error), patch.object(providers.urllib.request, 'urlopen', side_effect=error), self.assertRaisesRegex(ValueError, message):
                providers.discover_models({}, {'provider':'deepseek'})
