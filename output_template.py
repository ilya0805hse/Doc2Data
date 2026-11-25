"""Output table templates and local spreadsheet imports."""
import csv
import io
from pathlib import Path
import zipfile

MAX_COLUMNS = 40
MAX_ROWS = 200
MAX_CELL_LENGTH = 1000
MAX_FILE_BYTES = 2 * 1024 * 1024


def validate_template(mode, template):
    if mode == 'vibing':
        return None
    if mode not in ('strict', 'mixed'):
        raise ValueError('Unknown output mode.')
    if not isinstance(template, dict):
        raise ValueError('Set up an output table first.')
    columns, rows = template.get('columns'), template.get('rows')
    if not isinstance(columns, list) or not 1 <= len(columns) <= MAX_COLUMNS:
        raise ValueError(f'Enter between 1 and {MAX_COLUMNS} column headers.')
    if any(not isinstance(name, str) or not name.strip() or len(name) > MAX_CELL_LENGTH for name in columns):
        raise ValueError(f'Enter a name of up to {MAX_CELL_LENGTH} characters for every column.')
    if len({name.strip().casefold() for name in columns}) != len(columns):
        raise ValueError('Use a different name for every column.')
    if not isinstance(rows, list) or len(rows) > MAX_ROWS:
        raise ValueError(f'Use up to {MAX_ROWS} predefined rows.')
    for row in rows:
        if not isinstance(row, list) or len(row) != len(columns):
            raise ValueError('Each template row must match the columns.')
        if any(value is not None and (not isinstance(value, str) or len(value) > MAX_CELL_LENGTH) for value in row):
            raise ValueError(f'Fixed cells must contain text up to {MAX_CELL_LENGTH} characters.')
    return {'columns': columns, 'rows': rows}


def validate_shape(mode, template, columns, rows):
    requested_columns, requested_rows = template['columns'], template['rows']
    if not isinstance(columns, list) or columns[:len(requested_columns)] != requested_columns:
        raise ValueError('Keep the template column names and order exactly as provided.')
    if mode == 'strict' and columns != requested_columns:
        raise ValueError('Strict mode allows only the template columns.')
    if any(not isinstance(name, str) or not name.strip() for name in columns):
        raise ValueError('Every output column needs a name.')
    if len({name.strip().casefold() for name in columns}) != len(columns):
        raise ValueError('Every output column needs a distinct name.')
    if not isinstance(rows, list) or len(rows) < len(requested_rows):
        raise ValueError('Keep all predefined template rows in their original order.')
    if mode == 'strict' and requested_rows and len(rows) != len(requested_rows):
        raise ValueError('Strict mode requires exactly the predefined template rows.')


def read_import(name, raw):
    if len(raw) > MAX_FILE_BYTES:
        raise ValueError('Table imports are limited to 2 MB.')
    suffix = Path(name).suffix.lower()
    if suffix == '.csv':
        source = raw.decode('utf-8-sig')
        return read_grid(csv.reader(io.StringIO(source, newline=''), strict=True))
    if suffix != '.xlsx':
        raise ValueError('Choose a CSV or XLSX file.')

    from openpyxl import load_workbook
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        if sum(item.file_size for item in archive.infolist()) > 20 * 1024 * 1024:
            raise ValueError('The expanded workbook exceeds 20 MB.')
    workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True, keep_links=False)
    try:
        if not workbook.worksheets:
            raise ValueError('The workbook has no worksheets.')
        sheet = workbook.worksheets[0]
        return read_grid(sheet.values)
    finally:
        workbook.close()


def read_grid(source):
    grid = []
    for row in source:
        values = [str(value) if value is not None else '' for value in row]
        while values and not values[-1].strip():
            values.pop()
        if len(grid) > MAX_ROWS or len(values) > MAX_COLUMNS:
            raise ValueError(f'Import up to {MAX_ROWS + 1} rows and {MAX_COLUMNS} columns.')
        if any(len(value) > MAX_CELL_LENGTH for value in values):
            raise ValueError(f'Imported cells may contain up to {MAX_CELL_LENGTH} characters.')
        grid.append(values)
    if not any(grid):
        raise ValueError('The file does not contain a table.')
    return grid
