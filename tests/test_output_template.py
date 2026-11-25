import unittest

import output_template
from workspace_store import validate_rows


class OutputTemplateTests(unittest.TestCase):
    def test_import_csv_preserves_headers_and_quoted_cells(self):
        grid = output_template.read_import('fields.csv', b'\xef\xbb\xbfYear,Notes\r\n2025,"text, with comma"\r\n')
        self.assertEqual(grid, [['Year', 'Notes'], ['2025', 'text, with comma']])

    def test_strict_rows_are_fixed_when_provided(self):
        template = {'columns': ['Year'], 'rows': [['2025']]}
        with self.assertRaisesRegex(ValueError, 'exactly the predefined'):
            output_template.validate_shape('strict', template, ['Year'], [{}, {}])
        template['rows'] = []
        output_template.validate_shape('strict', template, ['Year'], [{}, {}])

    def test_mixed_can_append_rows_and_keeps_fixed_values(self):
        template = {'columns': ['Year'], 'rows': [['2025']]}
        columns = ['Year', 'Total']
        rows = [
            {'values': ['2025', 100], 'cell_references': [[], ['example']]},
            {'values': ['2024', 80], 'cell_references': [['example'], ['example']]},
        ]
        output_template.validate_shape('mixed', template, columns, rows)
        validate_rows(columns, rows, {'example'}, template['rows'])
        rows[0]['values'][0] = '2023'
        with self.assertRaisesRegex(ValueError, 'fixed template value'):
            validate_rows(columns, rows, {'example'}, template['rows'])
